import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

export const scanLocalDevicesTool: FunctionDeclaration = {
  name: "scanLocalDevices",
  description:
    "Scan the local network for connected devices. Returns a list of IP addresses, Hostnames, and open ports. Use this to discover new hardware to control.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      scanType: {
        type: SchemaType.STRING,
        enum: ["FAST_DISCOVERY", "FULL_PORT_SCAN"], format: "enum",
        description: "FAST: mDNS/UPnP only. FULL: TCP connect scan (slower).",
      },
      targetSubnet: {
        type: SchemaType.STRING,
        description:
          "Optional subnet (e.g. '192.168.1.0/24'). Defaults to local.",
      },
    },
  },
};

export const researchDeviceProtocolTool: FunctionDeclaration = {
  name: "researchDeviceProtocol",
  description:
    "Research how to control a specific device by brand/model. This tool simulates a 'developer search' to find API docs, Curl commands, or libraries.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      brand: {
        type: SchemaType.STRING,
        description: "Device brand (e.g. 'Phillips', 'Shelly', 'LG').",
      },
      model: { type: SchemaType.STRING, description: "Model number or name." },
      category: {
        type: SchemaType.STRING,
        enum: [
          "LIGHT",
          "SWITCH",
          "SENSOR",
          "CAMERA",
          "APPLIANCE",
          "TV",
          "SPEAKER",
        ], format: "enum",
      },
    },
    required: ["brand", "category"],
  },
};

export const generateDeviceDriverTool: FunctionDeclaration = {
  name: "generateDeviceDriver",
  description:
    "Generate and save a robust control driver for a device. This persists the research into a reusable JSON driver file.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      deviceName: {
        type: SchemaType.STRING,
        description: "Friendly name (e.g. 'Kitchen_LEDs').",
      },
      protocol: {
        type: SchemaType.STRING,
        enum: ["HTTP", "TCP", "UDP", "MQTT", "BLE"], format: "enum",
      },
      definition: {
        type: SchemaType.STRING, // schema: DeviceDriverDefinition
        description:
          "Stringified JSON definition of the driver (endpoints, payloads, methods).",
      },
    },
    required: ["deviceName", "protocol", "definition"],
  },
};

export const executeDeviceCommandTool: FunctionDeclaration = {
  name: "executeDeviceCommand",
  description:
    "Execute a control command on an IoT device. Can use a cached driver OR a raw raw network request.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      target: { type: SchemaType.STRING, description: "IP address or Device ID." },
      command: {
        type: SchemaType.STRING,
        description: "High-level command (e.g. 'TURN_ON', 'SET_COLOR').",
      },
      rawPayload: {
        type: SchemaType.STRING,
        description: "Optional: Raw packet data if constructing JIT.",
      },
      protocol: {
        type: SchemaType.STRING,
        enum: ["HTTP", "TCP", "UDP", "MQTT"], format: "enum",
        description: "Network transport protocol.",
      },
      port: { type: SchemaType.NUMBER, description: "Target port." },
    },
    required: ["target", "command"],
  },
};
