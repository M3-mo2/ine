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

const CHUNK_SIZE = 256;
const CHUNK_RESOLUTION = 128;
const WATER_LEVEL = 0;

function getHeight(worldX, worldZ) {
    const scale = 0.003;
    let h = 0;

    h += Noise.fbm(worldX * scale, worldZ * scale, 6, 2.0, 0.5) * 120;
    h += Noise.ridged(worldX * scale * 0.5, worldZ * scale * 0.5, 5) * 80;

    const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ) * 0.001;
    const edgeFalloff = Math.max(0, 1.0 - distFromCenter * 0.3);
    h *= edgeFalloff;

    if (h < WATER_LEVEL) {
        h = WATER_LEVEL - 2 + (h - WATER_LEVEL + 2) * 0.2;
    }

    return h;
}

function getNormal(x, z, size = 2) {
    const hL = getHeight(x - size, z);
    const hR = getHeight(x + size, z);
    const hD = getHeight(x, z - size);
    const hU = getHeight(x, z + size);
    const len = Math.sqrt((hL - hR) * (hL - hR) + 4 * size * size + (hD - hU) * (hD - hU));
    return {
        x: (hL - hR) / len,
        y: (2 * size) / len,
        z: (hD - hU) / len
    };
}

function generateChunkData(cx, cz) {
    const res = CHUNK_RESOLUTION;
    const size = CHUNK_SIZE;
    const step = size / res;

    const vertexCount = (res + 1) * (res + 1);
    const vertices = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const texCoords = new Float32Array(vertexCount * 2);

    let vi = 0, ni = 0, ti = 0;
    for (let z = 0; z <= res; z++) {
        for (let x = 0; x <= res; x++) {
            const wx = cx * size + x * step;
            const wz = cz * size + z * step;
            const wy = getHeight(wx, wz);
            const n = getNormal(wx, wz);

            vertices[vi++] = wx;
            vertices[vi++] = wy;
            vertices[vi++] = wz;
            normals[ni++] = n.x;
            normals[ni++] = n.y;
            normals[ni++] = n.z;
            texCoords[ti++] = x / res;
            texCoords[ti++] = z / res;
        }
    }

    const indexCount = res * res * 6;
    const indices = new Uint32Array(indexCount);
    let ii = 0;
    for (let z = 0; z < res; z++) {
        for (let x = 0; x < res; x++) {
            const i = z * (res + 1) + x;
            indices[ii++] = i;
            indices[ii++] = i + res + 1;
            indices[ii++] = i + 1;
            indices[ii++] = i + 1;
            indices[ii++] = i + res + 1;
            indices[ii++] = i + res + 2;
        }
    }

    return { cx, cz, vertices, normals, texCoords, indices, indexCount };
}

self.onmessage = function(e) {
    const { type, chunks } = e.data;

    if (type === 'generate') {
        const results = [];
        for (const { cx, cz } of chunks) {
            results.push(generateChunkData(cx, cz));
        }
        self.postMessage({ type: 'generated', results });
    }
};
