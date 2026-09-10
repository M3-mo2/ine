import { Vec3 } from './math3d.js';
import { Terrain } from './terrain.js';

export const Physics = {
    gravity: 9.81,
    airDensity: 1.225,

    calculateLift(area, cl, velocity) {
        return 0.5 * this.airDensity * velocity * velocity * area * cl;
    },

    calculateDrag(cd, velocity) {
        return 0.5 * this.airDensity * velocity * velocity * cd;
    },

    update(aircraft, dt) {
        const state = aircraft.state;
        const config = aircraft.config;

        const airspeed = Vec3.length(state.velocity);
        const trueAirspeed = Math.max(airspeed, 0.1);

        const wingArea = config.wingArea;
        const maxLiftCoeff = config.maxLiftCoeff;
        const dragCoeff = config.dragCoeff;
        const maxThrust = config.maxThrust;
        const mass = config.mass;

        const aoa = state.pitch;
        const cl = maxLiftCoeff * Math.sin(aoa * 2) * (1 + state.flaps * 0.3);
        const liftForce = this.calculateLift(wingArea, cl, trueAirspeed);

        const inducedDrag = dragCoeff + 0.02 * cl * cl;
        const totalDrag = this.calculateDrag(inducedDrag, trueAirspeed);

        const thrustMag = state.throttle * maxThrust;

        const forward = {
            x: Math.sin(state.yaw) * Math.cos(state.pitch),
            y: Math.sin(state.pitch),
            z: Math.cos(state.yaw) * Math.cos(state.pitch)
        };

        const up = { x: 0, y: 1, z: 0 };
        const right = Vec3.cross(forward, up);

        const thrust = Vec3.scale(forward, thrustMag);
        const lift = Vec3.scale({ x: 0, y: 1, z: 0 }, liftForce);
        const drag = Vec3.scale(Vec3.normalize(Vec3.scale(state.velocity, -1)), totalDrag);
        const gravity = { x: 0, y: -this.gravity * mass, z: 0 };

        let totalForce = Vec3.add(thrust, lift);
        Vec3.addMut(totalForce, drag);
        Vec3.addMut(totalForce, gravity);

        if (state.gear) {
            const groundDrag = Vec3.scale(Vec3.normalize(Vec3.scale(state.velocity, -1)), trueAirspeed * 15);
            Vec3.addMut(totalForce, groundDrag);
        }

        const acceleration = Vec3.scale(totalForce, 1.0 / mass);
        state.velocity = Vec3.add(state.velocity, Vec3.scale(acceleration, dt));

        const controlAuthority = Math.min(trueAirspeed / 30, 1.0);
        const pitchRate = state.pitchInput * config.pitchRate * controlAuthority;
        const rollRate = state.rollInput * config.rollRate * controlAuthority;
        const yawRate = state.rudderInput * config.yawRate * controlAuthority;

        state.pitch += pitchRate * dt;
        state.roll += rollRate * dt;
        state.yaw += yawRate * dt;

        state.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, state.pitch));

        if (state.flaps > 0) {
            const maxSpeedForFlaps = 80;
            if (trueAirspeed > maxSpeedForFlaps) {
                state.flaps = Math.max(0, state.flaps - dt * 0.5);
            }
        }

        state.position = Vec3.add(state.position, Vec3.scale(state.velocity, dt));

        const groundHeight = Terrain.getHeight(state.position.x, state.position.z) + 2;
        if (state.position.y < groundHeight) {
            state.position.y = groundHeight;

            if (airspeed < 40 && Math.abs(state.pitch) < 0.3 && Math.abs(state.roll) < 0.3) {
                state.velocity = Vec3.scale(state.velocity, 0.95);
                if (trueAirspeed < 5) {
                    state.velocity = { x: 0, y: 0, z: 0 };
                }
            } else {
                const crashForce = Vec3.scale(state.velocity, -0.3);
                state.velocity = Vec3.add(state.velocity, crashForce);

                if (trueAirspeed > 60) {
                    state.crashed = true;
                }
            }
        }

        state.airspeed = trueAirspeed * 1.944;
        state.altitude = state.position.y;
        state.verticalSpeed = state.velocity.y * 196.85;
        state.heading = ((state.yaw * 180 / Math.PI) % 360 + 360) % 360;
        state.gForce = 1.0 + acceleration.y / this.gravity;
    }
};
