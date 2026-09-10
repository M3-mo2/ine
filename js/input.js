const Input = {
    keys: {},
    mouse: { x: 0, y: 0, dx: 0, dy: 0 },
    initialized: false,

    simKeys: new Set([
        'Escape', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'KeyQ', 'KeyE', 'KeyR', 'KeyV', 'KeyG', 'KeyB',
        'Space', 'ShiftLeft', 'ShiftRight',
        'ControlLeft', 'ControlRight',
        'Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract'
    ]),

    init() {
        if (this.initialized) return;
        this.initialized = true;

        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') {
                if (Game.state === 'flying') {
                    Game.togglePause();
                }
            }
            if (e.code === 'KeyR' && Aircraft.state && Aircraft.state.crashed) {
                Aircraft.init(Aircraft.current);
                Aircraft.state.position = Vec3.create(0, 200, 0);
                Aircraft.state.velocity = Vec3.create(0, 0, 30);
            }
            if (e.code === 'KeyV') {
                Camera.toggleView();
            }
            if (this.simKeys.has(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (this.simKeys.has(e.code)) {
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.mouse.dx += e.movementX;
                this.mouse.dy += e.movementY;
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (Game.state === 'flying' && !document.pointerLockElement) {
                Renderer.canvas.requestPointerLock();
            }
        });
    },

    getPitch() {
        let pitch = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) pitch -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) pitch += 1;
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) pitch -= 1;
        if (this.keys['ControlLeft'] || this.keys['ControlRight']) pitch += 1;
        return pitch;
    },

    getRoll() {
        let roll = 0;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) roll += 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) roll -= 1;
        return roll;
    },

    getThrottle() {
        let throttle = 0;
        if (this.keys['Equal'] || this.keys['NumpadAdd']) throttle += 1;
        if (this.keys['Minus'] || this.keys['NumpadSubtract']) throttle -= 1;
        return throttle;
    },

    getRudder() {
        let rudder = 0;
        if (this.keys['KeyQ']) rudder += 1;
        if (this.keys['KeyE']) rudder -= 1;
        return rudder;
    },

    isFlapsToggle() {
        if (this.keys['Space']) {
            this.keys['Space'] = false;
            return true;
        }
        return false;
    },

    isGearToggle() {
        if (this.keys['KeyG']) {
            this.keys['KeyG'] = false;
            return true;
        }
        return false;
    },

    isBrake() {
        return this.keys['KeyB'] || false;
    },

    resetMouse() {
        this.mouse.dx = 0;
        this.mouse.dy = 0;
    }
};
