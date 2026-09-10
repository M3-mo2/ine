import { Vec3 } from './math3d.js';
import { Noise } from './noise.js';
import { Renderer } from './renderer.js';

export const Terrain = {
    CHUNK_SIZE: 256,
    CHUNK_RESOLUTION: 128,
    VIEW_DISTANCE: 5,
    waterLevel: 0,

    chunks: new Map(),
    pendingChunks: new Set(),
    pendingBatch: [],
    worker: null,
    batchTimeout: null,
    BATCH_DELAY: 16,
    MAX_CHUNKS_PER_FRAME: 3,

    init() {
        this.worker = new Worker(new URL('./terrain-worker.js', import.meta.url), { type: 'module' });
        this.worker.onmessage = (e) => this.onWorkerMessage(e);
        this.worker.onerror = (e) => console.error('Terrain worker error:', e);
    },

    onWorkerMessage(e) {
        const { type, results } = e.data;
        if (type === 'generated') {
            for (const data of results) {
                this.createChunkFromData(data);
            }
        }
    },

    createChunkFromData(data) {
        const { cx, cz, vertices, normals, texCoords, indices, indexCount } = data;
        const key = `${cx},${cz}`;

        this.pendingChunks.delete(key);

        const chunk = {
            cx, cz,
            vertexBuffer: Renderer.createBuffer(vertices),
            normalBuffer: Renderer.createBuffer(normals),
            texCoordBuffer: Renderer.createBuffer(texCoords),
            indexBuffer: Renderer.createIndexBuffer(indices),
            indexCount,
            vao: null,
            ready: true
        };

        this.chunks.set(key, chunk);
    },

    queueChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (this.chunks.has(key) || this.pendingChunks.has(key)) return;

        this.pendingChunks.add(key);
        this.pendingBatch.push({ cx, cz });

        if (!this.batchTimeout) {
            this.batchTimeout = setTimeout(() => this.flushBatch(), this.BATCH_DELAY);
        }
    },

    flushBatch() {
        this.batchTimeout = null;
        if (this.pendingBatch.length === 0) return;

        const batch = this.pendingBatch.splice(0, 20);
        this.worker.postMessage({ type: 'generate', chunks: batch });
    },

    getHeight(worldX, worldZ) {
        const scale = 0.003;
        let h = 0;

        h += Noise.fbm(worldX * scale, worldZ * scale, 6, 2.0, 0.5) * 120;
        h += Noise.ridged(worldX * scale * 0.5, worldZ * scale * 0.5, 5) * 80;

        const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ) * 0.001;
        const edgeFalloff = Math.max(0, 1.0 - distFromCenter * 0.3);
        h *= edgeFalloff;

        if (h < this.waterLevel) {
            h = this.waterLevel - 2 + (h - this.waterLevel + 2) * 0.2;
        }

        return h;
    },

    getNormal(x, z, size = 2) {
        const hL = this.getHeight(x - size, z);
        const hR = this.getHeight(x + size, z);
        const hD = this.getHeight(x, z - size);
        const hU = this.getHeight(x, z + size);
        return Vec3.normalize({ x: hL - hR, y: 2 * size, z: hD - hU });
    },

    generateChunkSync(cx, cz) {
        const key = `${cx},${cz}`;
        if (this.chunks.has(key)) return this.chunks.get(key);

        const res = this.CHUNK_RESOLUTION;
        const size = this.CHUNK_SIZE;
        const step = size / res;

        const vertices = [];
        const normals = [];
        const texCoords = [];
        const indices = [];

        for (let z = 0; z <= res; z++) {
            for (let x = 0; x <= res; x++) {
                const wx = cx * size + x * step;
                const wz = cz * size + z * step;
                const wy = this.getHeight(wx, wz);
                const n = this.getNormal(wx, wz);

                vertices.push(wx, wy, wz);
                normals.push(n.x, n.y, n.z);
                texCoords.push(x / res, z / res);
            }
        }

        for (let z = 0; z < res; z++) {
            for (let x = 0; x < res; x++) {
                const i = z * (res + 1) + x;
                indices.push(i, i + res + 1, i + 1);
                indices.push(i + 1, i + res + 1, i + res + 2);
            }
        }

        const chunk = {
            cx, cz,
            vertexBuffer: null,
            normalBuffer: null,
            texCoordBuffer: null,
            indexBuffer: null,
            indexCount: indices.length,
            vao: null,
            ready: true
        };

        chunk.vertexBuffer = Renderer.createBuffer(new Float32Array(vertices));
        chunk.normalBuffer = Renderer.createBuffer(new Float32Array(normals));
        chunk.texCoordBuffer = Renderer.createBuffer(new Float32Array(texCoords));
        chunk.indexBuffer = Renderer.createIndexBuffer(new Uint32Array(indices));

        this.chunks.set(key, chunk);
        return chunk;
    },

    update(playerX, playerZ) {
        const cx = Math.floor(playerX / this.CHUNK_SIZE);
        const cz = Math.floor(playerZ / this.CHUNK_SIZE);

        const needed = new Set();
        for (let dz = -this.VIEW_DISTANCE; dz <= this.VIEW_DISTANCE; dz++) {
            for (let dx = -this.VIEW_DISTANCE; dx <= this.VIEW_DISTANCE; dx++) {
                needed.add(`${cx + dx},${cz + dz}`);
            }
        }

        for (const key of this.chunks.keys()) {
            if (!needed.has(key)) {
                const chunk = this.chunks.get(key);
                if (chunk.vertexBuffer) Renderer.gl.deleteBuffer(chunk.vertexBuffer);
                if (chunk.normalBuffer) Renderer.gl.deleteBuffer(chunk.normalBuffer);
                if (chunk.texCoordBuffer) Renderer.gl.deleteBuffer(chunk.texCoordBuffer);
                if (chunk.indexBuffer) Renderer.gl.deleteBuffer(chunk.indexBuffer);
                this.chunks.delete(key);
            }
        }

        for (const key of this.pendingChunks) {
            if (!needed.has(key)) {
                this.pendingChunks.delete(key);
            }
        }

        let queued = 0;
        for (let dz = -this.VIEW_DISTANCE; dz <= this.VIEW_DISTANCE; dz++) {
            for (let dx = -this.VIEW_DISTANCE; dx <= this.VIEW_DISTANCE; dx++) {
                const key = `${cx + dx},${cz + dz}`;
                if (!this.chunks.has(key) && !this.pendingChunks.has(key)) {
                    if (queued < this.MAX_CHUNKS_PER_FRAME) {
                        this.generateChunkSync(cx + dx, cz + dz);
                        queued++;
                    } else {
                        this.queueChunk(cx + dx, cz + dz);
                    }
                }
            }
        }
    },

    render(program) {
        const gl = Renderer.gl;

        const aPosition = Renderer.getAttribLocation(program, 'aPosition');
        const aNormal = Renderer.getAttribLocation(program, 'aNormal');
        const aTexCoord = Renderer.getAttribLocation(program, 'aTexCoord');

        for (const chunk of this.chunks.values()) {
            if (!chunk.ready) continue;

            gl.bindBuffer(gl.ARRAY_BUFFER, chunk.vertexBuffer);
            gl.enableVertexAttribArray(aPosition);
            gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, chunk.normalBuffer);
            gl.enableVertexAttribArray(aNormal);
            gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, chunk.texCoordBuffer);
            gl.enableVertexAttribArray(aTexCoord);
            gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunk.indexBuffer);
            gl.drawElements(gl.TRIANGLES, chunk.indexCount, gl.UNSIGNED_INT, 0);
        }
    }
};
