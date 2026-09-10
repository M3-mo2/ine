const Renderer = {
    gl: null,
    canvas: null,
    width: 0,
    height: 0,

    init() {
        this.canvas = document.getElementById('gl-canvas');
        this.resize();

        this.gl = this.canvas.getContext('webgl', {
            antialias: true,
            alpha: false,
            depth: true,
            stencil: false,
            powerPreference: 'high-performance'
        });

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (this.gl) {
            this.gl.viewport(0, 0, this.width, this.height);
        }
    },

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    },

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vs = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fs = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);

        if (!vs || !fs) return null;

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program error:', gl.getProgramInfoLog(program));
            return null;
        }

        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return program;
    },

    createBuffer(data) {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    },

    createIndexBuffer(data) {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    },

    createSkybox() {
        const vertices = new Float32Array([
            -1,  1,  1,  -1, -1,  1,   1, -1,  1,   1,  1,  1,
            -1,  1, -1,  -1, -1, -1,   1, -1, -1,   1,  1, -1,
            -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
            -1, -1, -1,  -1, -1,  1,   1, -1,  1,   1, -1, -1,
            -1,  1,  1,  -1, -1,  1,  -1, -1, -1,  -1,  1, -1,
             1,  1,  1,   1, -1,  1,   1, -1, -1,   1,  1, -1
        ]);

        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3,
            4, 6, 5, 4, 7, 6,
            8, 9, 10, 8, 10, 11,
            12, 14, 13, 12, 15, 14,
            16, 17, 18, 16, 18, 19,
            20, 22, 21, 20, 23, 22
        ]);

        this.skyVertexBuffer = this.createBuffer(vertices);
        this.skyIndexBuffer = this.createIndexBuffer(indices);
    },

    createWaterPlane() {
        const size = Terrain.CHUNK_SIZE * (Terrain.VIEW_DISTANCE + 1) * 2;
        const res = 64;
        const step = size / res;

        const vertices = [];
        const texCoords = [];
        const indices = [];

        for (let z = 0; z <= res; z++) {
            for (let x = 0; x <= res; x++) {
                vertices.push(
                    -size / 2 + x * step,
                    Terrain.waterLevel,
                    -size / 2 + z * step
                );
                texCoords.push(x / res * 10, z / res * 10);
            }
        }

        for (let z = 0; z < res; z++) {
            for (let x = 0; x < res; x++) {
                const i = z * (res + 1) + x;
                indices.push(i, i + res + 1, i + 1);
                indices.push(i + 1, i + res + 1, i + res + 2);
            }
        }

        this.waterVertexBuffer = this.createBuffer(new Float32Array(vertices));
        this.waterTexCoordBuffer = this.createBuffer(new Float32Array(texCoords));
        this.waterIndexBuffer = this.createIndexBuffer(new Uint32Array(indices));
        this.waterIndexCount = indices.length;
    },

    renderSky(program, viewMatrix, projectionMatrix, sunDir, time, cloudDensity, fogColor) {
        const gl = this.gl;

        gl.depthMask(false);
        gl.cullFace(gl.FRONT);

        gl.useProgram(program);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, viewMatrix);
        gl.uniform3fv(gl.getUniformLocation(program, 'uSunDir'), sunDir);
        gl.uniform3fv(gl.getUniformLocation(program, 'uSkyColor'), [0.4, 0.65, 0.95]);
        gl.uniform3fv(gl.getUniformLocation(program, 'uSunColor'), [1.0, 0.95, 0.8]);
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), time);
        gl.uniform1f(gl.getUniformLocation(program, 'uCloudDensity'), cloudDensity);
        gl.uniform3fv(gl.getUniformLocation(program, 'uFogColor'), fogColor);

        const aPosition = gl.getAttribLocation(program, 'aPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.skyVertexBuffer);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.skyIndexBuffer);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

        gl.depthMask(true);
        gl.cullFace(gl.BACK);
    },

    renderWater(program, viewMatrix, projectionMatrix, sunDir, time, cameraPos, fogColor, fogDensity) {
        const gl = this.gl;

        gl.useProgram(program);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, Mat4.create());
        gl.uniform3fv(gl.getUniformLocation(program, 'uSunDir'), sunDir);
        gl.uniform3fv(gl.getUniformLocation(program, 'uSunColor'), [1.0, 0.95, 0.8]);
        gl.uniform3fv(gl.getUniformLocation(program, 'uFogColor'), fogColor);
        gl.uniform1f(gl.getUniformLocation(program, 'uFogDensity'), fogDensity);
        gl.uniform3fv(gl.getUniformLocation(program, 'uCameraPos'), cameraPos);
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), time);

        const aPosition = gl.getAttribLocation(program, 'aPosition');
        const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');

        gl.bindBuffer(gl.ARRAY_BUFFER, this.waterVertexBuffer);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.waterTexCoordBuffer);
        gl.enableVertexAttribArray(aTexCoord);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.waterIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.waterIndexCount, gl.UNSIGNED_INT, 0);
    },

    renderParticles(program, particles, viewMatrix, projectionMatrix) {
        const gl = this.gl;
        if (!particles || particles.length === 0) return;

        gl.useProgram(program);
        gl.depthMask(false);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, viewMatrix);

        const positions = [];
        const sizes = [];
        const alphas = [];

        for (const p of particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
            sizes.push(p.size || 1);
            alphas.push(Math.min(1, p.life));
        }

        const posBuffer = this.createBuffer(new Float32Array(positions));
        const sizeBuffer = this.createBuffer(new Float32Array(sizes));
        const alphaBuffer = this.createBuffer(new Float32Array(alphas));

        const aPosition = gl.getAttribLocation(program, 'aPosition');
        const aSize = gl.getAttribLocation(program, 'aSize');
        const aAlpha = gl.getAttribLocation(program, 'aAlpha');

        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
        gl.enableVertexAttribArray(aSize);
        gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer);
        gl.enableVertexAttribArray(aAlpha);
        gl.vertexAttribPointer(aAlpha, 1, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.POINTS, 0, particles.length);

        gl.depthMask(true);

        gl.deleteBuffer(posBuffer);
        gl.deleteBuffer(sizeBuffer);
        gl.deleteBuffer(alphaBuffer);
    },

    clear(fogColor) {
        const gl = this.gl;
        gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
};
