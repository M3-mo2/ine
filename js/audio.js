export const AudioEngine = {
    ctx: null,
    engineNode: null,
    windNode: null,
    masterGain: null,
    engineGain: null,
    windGain: null,
    initialized: false,

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);

            this.createEngineSound();
            this.createWindSound();

            this.initialized = true;
        } catch (e) {
            console.log('Audio not available');
        }
    },

    createEngineSound() {
        const ctx = this.ctx;

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 80;

        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = 40;

        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.value = 120;

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5;

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 3;
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);

        this.engineGain = ctx.createGain();
        this.engineGain.gain.value = 0.15;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 2;

        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        osc1.start();
        osc2.start();
        osc3.start();
        lfo.start();

        this.engineOsc = { osc1, osc2, osc3, lfo, filter };
    },

    createWindSound() {
        const ctx = this.ctx;
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 0.5;

        this.windGain = ctx.createGain();
        this.windGain.gain.value = 0;

        noise.connect(filter);
        filter.connect(this.windGain);
        this.windGain.connect(this.masterGain);

        noise.start();
        this.windNode = { noise, filter };
    },

    update(state) {
        if (!this.initialized || !this.engineOsc) return;

        const throttle = state.throttle;
        const airspeed = state.airspeed;

        const rpm = 80 + throttle * 220;
        this.engineOsc.osc1.frequency.setTargetAtTime(rpm * 1.0, this.ctx.currentTime, 0.1);
        this.engineOsc.osc2.frequency.setTargetAtTime(rpm * 0.5, this.ctx.currentTime, 0.1);
        this.engineOsc.osc3.frequency.setTargetAtTime(rpm * 1.5, this.ctx.currentTime, 0.1);

        this.engineOsc.lfo.frequency.setTargetAtTime(3 + throttle * 8, this.ctx.currentTime, 0.1);
        this.engineOsc.filter.frequency.setTargetAtTime(200 + throttle * 600, this.ctx.currentTime, 0.1);

        this.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.2, this.ctx.currentTime, 0.1);

        const windVolume = Math.min(0.3, airspeed / 200 * 0.3);
        this.windGain.gain.setTargetAtTime(windVolume, this.ctx.currentTime, 0.1);
        if (this.windNode) {
            this.windNode.filter.frequency.setTargetAtTime(400 + airspeed * 10, this.ctx.currentTime, 0.1);
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
};
