
export class AlwaysOnAudioService {
    constructor() {
        this.isListening = false;
        this.mode = 'passive';
    }

    start(mode = 'passive') {
        this.isListening = true;
        this.mode = mode;
        console.log(`[AudioService] Started in ${mode} mode`);
        return true;
    }

    stop() {
        this.isListening = false;
        console.log('[AudioService] Stopped');
        return true;
    }

    getStatus() {
        return {
            isListening: this.isListening,
            mode: this.mode
        };
    }
}

export const alwaysOnAudioService = new AlwaysOnAudioService();
export default alwaysOnAudioService;
