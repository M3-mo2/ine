const Game = {
    state: 'loading',
    selectedAircraft: 'cessna',
    selectedWeather: 'clear',
    paused: false,
    lastTime: 0,
    fps: 0,
    frameCount: 0,
    fpsTimer: 0,
    minimapFrame: 0,

    terrainProgram: null,
    waterProgram: null,
    skyProgram: null,
    particleProgram: null,

    async init() {
        this.updateLoadingBar(10, 'Initializing renderer...');
        Renderer.init();

        this.updateLoadingBar(20, 'Compiling shaders...');
        this.terrainProgram = Renderer.createProgram(
            ShaderSource.terrainVertex,
            ShaderSource.terrainFragment
        );
        this.waterProgram = Renderer.createProgram(
            ShaderSource.waterVertex,
            ShaderSource.waterFragment
        );
        this.skyProgram = Renderer.createProgram(
            ShaderSource.skyVertex,
            ShaderSource.skyFragment
        );
        this.particleProgram = Renderer.createProgram(
            ShaderSource.particleVertex,
            ShaderSource.particleFragment
        );

        if (!this.terrainProgram || !this.waterProgram || !this.skyProgram || !this.particleProgram) {
            throw new Error('Failed to compile one or more shader programs');
        }

        this.updateLoadingBar(40, 'Generating terrain...');
        await this.sleep(100);
        Terrain.update(0, 0);

        this.updateLoadingBar(60, 'Creating sky...');
        Renderer.createSkybox();

        this.updateLoadingBar(70, 'Creating water...');
        Renderer.createWaterPlane();

        this.updateLoadingBar(80, 'Initializing HUD...');
        HUD.init();

        this.updateLoadingBar(90, 'Setting up controls...');
        Input.init();
        Camera.init();
        Atmosphere.init();

        this.updateLoadingBar(100, 'Ready!');
        await this.sleep(500);

        this.state = 'menu';
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('menu-screen').style.display = 'flex';
        this.setupMenuListeners();
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    updateLoadingBar(percent, text) {
        document.getElementById('loading-bar').style.width = percent + '%';
        document.getElementById('loading-text').textContent = text;
    },

    setupMenuListeners() {
        document.querySelectorAll('.aircraft-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.aircraft-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedAircraft = e.target.dataset.aircraft;
            });
        });

        document.querySelectorAll('.weather-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedWeather = e.target.dataset.weather;
            });
        });

        document.getElementById('btn-free-flight').addEventListener('click', () => this.startFlight());
        document.getElementById('btn-landing-challenge').addEventListener('click', () => this.startFlight());
        document.getElementById('btn-circuit').addEventListener('click', () => this.startFlight());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
    },

    startFlight() {
        Aircraft.init(this.selectedAircraft);
        Weather.init(this.selectedWeather);
        Terrain.update(Aircraft.state.position.x, Aircraft.state.position.z);

        this.state = 'flying';
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('pause-overlay').style.display = 'none';

        AudioEngine.init();
        AudioEngine.resume();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    },

    gameLoop(timestamp) {
        if (this.state !== 'flying') return;

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.frameCount++;
        this.fpsTimer += dt;
        if (this.fpsTimer >= 1) {
            this.fps = Math.round(this.frameCount / this.fpsTimer);
            this.frameCount = 0;
            this.fpsTimer = 0;
            document.getElementById('fps-counter').textContent = `FPS: ${this.fps}`;
        }

        if (!this.paused) {
            this.update(dt);
        }

        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    },

    update(dt) {
        const state = Aircraft.state;

        state.pitchInput = Input.getPitch();
        state.rollInput = Input.getRoll();
        state.rudderInput = Input.getRudder();

        state.throttle = Math.max(0, Math.min(1, state.throttle + Input.getThrottle() * dt * 0.5));

        if (Input.isFlapsToggle()) {
            state.flaps = state.flaps > 0 ? 0 : 0.3;
        }

        if (Input.isGearToggle()) {
            state.gear = !state.gear;
        }

        state.brake = Input.isBrake();

        Physics.update(Aircraft, dt);

        Terrain.update(state.position.x, state.position.z);
        Weather.update(dt, state.position);
        Atmosphere.update(dt, this.selectedWeather);
        Camera.update(dt);

        AudioEngine.update(state);

        Input.resetMouse();
    },

    render() {
        const gl = Renderer.gl;
        const projectionMatrix = Camera.getProjectionMatrix();
        const viewMatrix = Camera.getViewMatrix();
        const cameraPos = Camera.position;
        const sunDir = Atmosphere.sunDir;
        const fogColor = Atmosphere.fogColor;
        const fogDensity = Atmosphere.fogDensity;

        const lightningColor = Weather.getLightningColor();
        const finalFogColor = lightningColor || fogColor;

        Renderer.clear(finalFogColor);

        Renderer.renderSky(
            this.skyProgram, viewMatrix, projectionMatrix,
            sunDir, Atmosphere.time, Atmosphere.cloudDensity, finalFogColor, Atmosphere.sunColor
        );

        gl.useProgram(this.terrainProgram);
        gl.uniformMatrix4fv(Renderer.getUniformLocation(this.terrainProgram, 'uProjection'), false, projectionMatrix);
        gl.uniformMatrix4fv(Renderer.getUniformLocation(this.terrainProgram, 'uView'), false, viewMatrix);
        gl.uniformMatrix4fv(Renderer.getUniformLocation(this.terrainProgram, 'uModel'), false, Mat4.create());
        gl.uniform3fv(Renderer.getUniformLocation(this.terrainProgram, 'uSunDir'), sunDir);
        gl.uniform3fv(Renderer.getUniformLocation(this.terrainProgram, 'uSunColor'), Atmosphere.sunColor);
        gl.uniform3fv(Renderer.getUniformLocation(this.terrainProgram, 'uAmbientColor'), Atmosphere.ambientColor);
        gl.uniform3fv(Renderer.getUniformLocation(this.terrainProgram, 'uFogColor'), finalFogColor);
        gl.uniform1f(Renderer.getUniformLocation(this.terrainProgram, 'uFogDensity'), fogDensity);
        gl.uniform1f(Renderer.getUniformLocation(this.terrainProgram, 'uTime'), Atmosphere.time);
        gl.uniform3fv(Renderer.getUniformLocation(this.terrainProgram, 'uCameraPos'), cameraPos);
        gl.uniform1f(Renderer.getUniformLocation(this.terrainProgram, 'uWaterLevel'), Terrain.waterLevel);

        Terrain.render(this.terrainProgram);

        gl.useProgram(this.waterProgram);
        Renderer.renderWater(
            this.waterProgram, viewMatrix, projectionMatrix,
            sunDir, Atmosphere.time, cameraPos, finalFogColor, fogDensity, Atmosphere.sunColor
        );

        if (Weather.particles.length > 0 && this.particleProgram) {
            Renderer.renderParticles(
                this.particleProgram, Weather.particles,
                viewMatrix, projectionMatrix
            );
        }

        this.renderMinimap();

        HUD.drawHUD(Aircraft.state);
    },

    minimapCache: null,
    minimapLastPx: 0,
    minimapLastPz: 0,

    renderMinimap() {
        this.minimapFrame++;
        const canvas = document.getElementById('minimap-canvas');
        const ctx = canvas.getContext('2d');
        const size = 200;
        const scale = 0.1;

        const px = Aircraft.state.position.x;
        const pz = Aircraft.state.position.z;
        const heading = Aircraft.state.heading;

        if (!this.minimapCache || this.minimapFrame % 5 === 0 || Math.abs(px - this.minimapLastPx) > 5 || Math.abs(pz - this.minimapLastPz) > 5) {
            ctx.fillStyle = 'rgba(0,20,40,0.9)';
            ctx.fillRect(0, 0, size, size);

            for (let y = 0; y < size; y += 4) {
                for (let x = 0; x < size; x += 4) {
                    const wx = px + (x - size / 2) / scale;
                    const wz = pz + (y - size / 2) / scale;
                    const h = Terrain.getHeight(wx, wz);

                    if (h < Terrain.waterLevel) {
                        ctx.fillStyle = 'rgba(20,60,120,0.8)';
                    } else if (h < Terrain.waterLevel + 30) {
                        ctx.fillStyle = `rgb(40,${80 + h},30)`;
                    } else if (h < Terrain.waterLevel + 100) {
                        ctx.fillStyle = `rgb(${60 + h / 2},${70 + h / 3},40)`;
                    } else {
                        ctx.fillStyle = `rgb(${120 + h / 3},${110 + h / 3},${100 + h / 3})`;
                    }
                    ctx.fillRect(x, y, 4, 4);
                }
            }
            this.minimapCache = ctx.getImageData(0, 0, size, size);
            this.minimapLastPx = px;
            this.minimapLastPz = pz;
        } else {
            ctx.putImageData(this.minimapCache, 0, 0);
        }

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(heading * Math.PI / 180);

        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-5, 6);
        ctx.lineTo(0, 3);
        ctx.lineTo(5, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        ctx.strokeStyle = 'rgba(0,212,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, size, size);
    },

    togglePause() {
        this.paused = !this.paused;
        document.getElementById('pause-overlay').style.display = this.paused ? 'flex' : 'none';
        if (this.paused && AudioEngine.ctx) {
            AudioEngine.ctx.suspend();
        } else if (!this.paused && AudioEngine.ctx) {
            AudioEngine.ctx.resume();
        }
    },

    quitToMenu() {
        this.paused = false;
        this.state = 'menu';
        document.getElementById('pause-overlay').style.display = 'none';
        document.getElementById('menu-screen').style.display = 'flex';
        AudioEngine.destroy();
    }
};

window.addEventListener('load', () => {
    Game.init().catch(err => {
        console.error('Failed to initialize:', err);
        document.getElementById('loading-text').textContent = 'Error: ' + err.message;
    });
});
