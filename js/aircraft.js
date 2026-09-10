const Aircraft = {
    configs: {
        cessna: {
            name: 'CESSNA 172',
            mass: 1043,
            wingArea: 16.2,
            maxLiftCoeff: 1.2,
            dragCoeff: 0.027,
            maxThrust: 5000,
            pitchRate: 1.2,
            rollRate: 1.8,
            yawRate: 0.8,
            fuelCapacity: 200,
            fuelBurn: 0.05
        },
        f16: {
            name: 'F-16 FIGHTER',
            mass: 8570,
            wingArea: 27.87,
            maxLiftCoeff: 1.8,
            dragCoeff: 0.015,
            maxThrust: 76000,
            pitchRate: 3.5,
            rollRate: 5.0,
            yawRate: 2.0,
            fuelCapacity: 3200,
            fuelBurn: 0.8
        },
        boeing: {
            name: 'BOEING 747',
            mass: 180000,
            wingArea: 541.2,
            maxLiftCoeff: 2.5,
            dragCoeff: 0.032,
            maxThrust: 400000,
            pitchRate: 0.6,
            rollRate: 0.8,
            yawRate: 0.4,
            fuelCapacity: 200000,
            fuelBurn: 4.0
        }
    },

    current: null,
    modelMatrices: [],

    init(type = 'cessna') {
        this.current = type;
        this.config = this.configs[type];
        this.state = {
            position: Vec3.create(0, 200, 0),
            velocity: Vec3.create(0, 0, 30),
            pitch: 0,
            roll: 0,
            yaw: 0,
            throttle: 0.5,
            flaps: 0,
            gear: true,
            brake: false,
            crashed: false,
            airspeed: 0,
            altitude: 0,
            verticalSpeed: 0,
            heading: 0,
            gForce: 1.0,
            fuel: this.configs[type].fuelCapacity,
            pitchInput: 0,
            rollInput: 0,
            rudderInput: 0
        };

        this.modelMatrices = [];
    },

    getModelMatrix() {
        const m = Mat4.create();
        Mat4.translate(m, this.state.position);
        Mat4.rotateY(m, this.state.yaw);
        Mat4.rotateX(m, this.state.pitch);
        Mat4.rotateZ(m, this.state.roll);
        return m;
    },

    getWingTipPositions() {
        const m = this.getModelMatrix();
        const wingspan = this.current === 'boeing' ? 60 : this.current === 'f16' ? 30 : 12;
        return {
            left: Vec3.transformMat4({ x: -wingspan / 2, y: 0, z: 0 }, m),
            right: Vec3.transformMat4({ x: wingspan / 2, y: 0, z: 0 }, m)
        };
    },

    getViewPosition() {
        const m = this.getModelMatrix();
        return Vec3.transformMat4({ x: 0, y: 2, z: -5 }, m);
    },

    getForward() {
        const m = this.getModelMatrix();
        return Vec3.normalize(Vec3.sub(
            Vec3.transformMat4({ x: 0, y: 0, z: 10 }, m),
            Vec3.transformMat4({ x: 0, y: 0, z: 0 }, m)
        ));
    }
};
