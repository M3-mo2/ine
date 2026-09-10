const Noise = {
    permutation: null,

    init(seed = 42) {
        this.permutation = new Uint8Array(512);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;

        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 16807 + 0) % 2147483647;
            const j = s % (i + 1);
            [p[i], p[j]] = [p[j], p[i]];
        }

        for (let i = 0; i < 512; i++) {
            this.permutation[i] = p[i & 255];
        }
    },

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    },

    lerp(a, b, t) {
        return a + t * (b - a);
    },

    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    },

    perlin2D(x, y) {
        if (!this.permutation) this.init();

        const xi = Math.floor(x) & 255;
        const yi = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const u = this.fade(xf);
        const v = this.fade(yf);

        const p = this.permutation;
        const aa = p[p[xi] + yi];
        const ab = p[p[xi] + yi + 1];
        const ba = p[p[xi + 1] + yi];
        const bb = p[p[xi + 1] + yi + 1];

        return this.lerp(
            this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
            this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
            v
        );
    },

    fbm(x, y, octaves = 6, lacunarity = 2.0, gain = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.perlin2D(x * frequency, y * frequency);
            maxValue += amplitude;
            amplitude *= gain;
            frequency *= lacunarity;
        }

        return value / maxValue;
    },

    ridged(x, y, octaves = 6) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let weight = 1;

        for (let i = 0; i < octaves; i++) {
            let signal = Math.abs(this.perlin2D(x * frequency, y * frequency));
            signal = 1.0 - signal;
            signal *= signal;
            signal *= weight;
            weight = Math.min(1, Math.max(0, signal * 2));
            value += signal * amplitude;
            amplitude *= 0.5;
            frequency *= 2.1;
        }

        return value;
    }
};

Noise.init(42);
