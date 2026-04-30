import mqtt from 'mqtt';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class GenericMqttProvider extends EventEmitter {
  constructor(driverDefinition) {
    super();
    this.name = driverDefinition.id;
    this.driver = driverDefinition;
    this.client = null;
    this.isConnected = false;
    this.devices = new Map();
  }

  async connect(targetIp = null) {
    // If targetIp is provided, we strictly connect there (Specific Mode)
    // If not, we might be in discovery mode (not handled by this generic provider yet)
    
    // For standard TV control, we might need to know the IP *before* connecting if using TLS
    // But the manager might pass the IP via 'controlDevice'.
    
    // HOWEVER, for Hisense logic, we connect ONCE to a specific IP.
    if (!targetIp && this.driver.connection.host) targetIp = this.driver.connection.host;
    
    if (!targetIp) {
      console.warn(`[GENERIC_MQTT:${this.name}] No IP provided for connection.`);
      return false;
    }

    const { protocol, port, tls, auth, options } = this.driver.connection;
    const protocolPrefix = protocol === 'mqtt' && tls ? 'mqtts' : 'mqtt';
    const brokerUrl = `${protocolPrefix}://${targetIp}:${port}`;

    console.log(`[GENERIC_MQTT:${this.name}] Connecting to ${brokerUrl}...`);

    let mqttOptions = { ...options };
    
    if (auth) {
      mqttOptions.username = auth.username;
      mqttOptions.password = auth.password;
    }

    if (tls) {
      mqttOptions.rejectUnauthorized = tls.rejectUnauthorized;
      if (tls.certPath && tls.keyPath) {
        try {
           const certAbs = path.resolve(process.cwd(), tls.certPath);
           const keyAbs = path.resolve(process.cwd(), tls.keyPath);
           if (fs.existsSync(certAbs) && fs.existsSync(keyAbs)) {
             mqttOptions.cert = fs.readFileSync(certAbs);
             mqttOptions.key = fs.readFileSync(keyAbs);
           }
        } catch (e) {
           console.error(`[GENERIC_MQTT:${this.name}] Cert load failed:`, e);
        }
      }
    }

    // Handshake Randomization if needed (from legacy code)
    if (!mqttOptions.clientId) {
      mqttOptions.clientId = `luca_${Math.random().toString(16).slice(2, 8)}`;
    }

    try {
      this.client = mqtt.connect(brokerUrl, mqttOptions);

      this.client.on('connect', () => {
        console.log(`[GENERIC_MQTT:${this.name}] Connected to ${targetIp}`);
        this.isConnected = true;
        this.subscribeTopics();
        
        // Register the device itself as "Online"
        this.registerSelf(targetIp);
        this.emit('authenticated', true);
      });

      this.client.on('error', (err) => {
        console.error(`[GENERIC_MQTT:${this.name}] Error:`, err.message);
        this.isConnected = false;
      });
      
      this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message);
      });

      return true;
    } catch (e) {
      console.error(`[GENERIC_MQTT:${this.name}] Connection failed:`, e);
      return false;
    }
  }

  subscribeTopics() {
    // Subscribe to state topics from 'topics' definition
    const topicMap = this.driver.topics;
    if (topicMap.state) {
        this.client.subscribe(topicMap.state, (err) => {
            if (!err) console.log(`[GENERIC_MQTT:${this.name}] Subscribed to state: ${topicMap.state}`);
        });
    }
    // Also subscribe to any wildcard if defined manually in "options" or "topics"
  }
  
  handleMessage() {
     // console.log(`[GENERIC_MQTT:${this.name}] Msg: ${topic} -> ${message.toString()}`);
     // If we had response parsing logic in JSON, we'd apply it here.
  }

  registerSelf(ip) {
    // Unlike HA which returns 100 devices, this Driver usually represents ONE device type.
    // So we register "The TV at IP X"
    const deviceId = `${this.name}_${ip.replace(/\./g, '_')}`;
    const device = {
        id: deviceId,
        name: `${this.driver.name} (${ip})`,
        type: this.driver.category || "SMART_TV",
        isOn: false, // Updated via state later
        status: "online",
        providerId: this.name,
        attributes: { ip }
    };
    this.devices.set(deviceId, device);
    this.emit('device_updated', device);
  }

  getDevices() {
    return Array.from(this.devices.values());
  }

  async controlDevice(deviceId, action, params = {}) {
     if (!this.client || !this.isConnected) {
         // Try auto-reconnect if IP is known
         const device = this.devices.get(deviceId);
         if (device && device.attributes.ip) {
             await this.connect(device.attributes.ip);
             // wait a bit
             await new Promise(r => setTimeout(r, 200));
         } else {
             return false; 
         }
     }

     const commandDef = this.driver.mappings[action];
     
     if (!commandDef) {
         console.warn(`[GENERIC_MQTT:${this.name}] No mapping for action: ${action}`);
         return false;
     }

     if (commandDef.type === 'publish') {
         // Resolve topic variable if it starts with $
         let topic = commandDef.topic;
         if (topic.startsWith('$')) {
             const key = topic.substring(1); // e.g., 'command' from '$command'
             topic = this.driver.topics[key];
         }
         
         if (!topic) {
             console.error(`[GENERIC_MQTT:${this.name}] Topic not found for alias: ${commandDef.topic}`);
             return false;
         }

         let payload = commandDef.payload;
         
         // Templating Resolution (Simple {{value}} replacement)
         // If payload is "", we send empty buffer or string
         if (payload) {
             // Deep clone to avoid mutating the driver definition
             let payloadStr = JSON.stringify(payload);
             
             // Replace {{value}} with params.value or params.sourceid etc
             if (payloadStr.includes('{{value}}')) {
                 const value = params.value || params.sourceid || params.text;
                 payloadStr = payloadStr.replace('{{value}}', value);
             }
             
             payload = JSON.parse(payloadStr);
         }
         
         // Convert to string for MQTT
         const message = (typeof payload === 'object') ? JSON.stringify(payload) : String(payload);
         
         this.client.publish(topic, message);
         console.log(`[GENERIC_MQTT:${this.name}] Sent ${action} to ${topic}`);
         return true;
     }
     
     return false;
  }
}
