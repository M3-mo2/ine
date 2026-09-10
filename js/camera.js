const Camera = {
    position: Vec3.create(0, 200, -10),
    target: Vec3.create(0, 200, 0),
    up: Vec3.create(0, 1, 0),
    fov: 70 * Math.PI / 180,
    near: 0.5,
    far: 15000,
    viewMode: 0,
    views: ['cockpit', 'chase', 'tower', 'flyby'],

    init() {
        this.viewMode = 0;
    },

    toggleView() {
        this.viewMode = (this.viewMode + 1) % this.views.length;
    },

    getViewName() {
        return this.views[this.viewMode];
    },

    update(dt) {
        const state = Aircraft.state;
        const aircraftModel = Aircraft.getModelMatrix();

        switch (this.views[this.viewMode]) {
            case 'cockpit':
                this.position = Vec3.transformMat4({ x: 0, y: 2.5, z: -3 }, aircraftModel);
                const lookTarget = Vec3.transformMat4({ x: 0, y: 2, z: 20 }, aircraftModel);
                this.target = lookTarget;
                this.up = Vec3.normalize(Vec3.sub(
                    Vec3.transformMat4({ x: 0, y: 10, z: 0 }, aircraftModel),
                    this.position
                ));
                break;

            case 'chase':
                const offset = Vec3.transformMat4({ x: 0, y: 8, z: -25 }, aircraftModel);
                this.position = Vec3.lerp(this.position, offset, dt * 3);
                this.target = Vec3.lerp(this.target, state.position, dt * 5);
                this.up = { x: 0, y: 1, z: 0 };
                break;

            case 'tower':
                const towerPos = Vec3.create(
                    Math.sin(state.heading * Math.PI / 180) * 100,
                    50,
                    Math.cos(state.heading * Math.PI / 180) * 100
                );
                this.position = towerPos;
                this.target = state.position;
                this.up = { x: 0, y: 1, z: 0 };
                break;

            case 'flyby':
                const fbAngle = state.heading + Math.PI / 2;
                const fbDist = 100;
                this.position = Vec3.create(
                    state.position.x + Math.cos(fbAngle) * fbDist,
                    state.position.y + 10,
                    state.position.z + Math.sin(fbAngle) * fbDist
                );
                this.target = state.position;
                this.up = { x: 0, y: 1, z: 0 };
                break;
        }
    },

    getProjectionMatrix() {
        return Mat4.perspective(
            this.fov,
            Renderer.width / Renderer.height,
            this.near,
            this.far
        );
    },

    getViewMatrix() {
        return Mat4.lookAt(this.position, this.target, this.up);
    }
};
