import { Vec3 } from './math3d.js';

export const Weather = {
    current: 'clear',
    particles: [],
    lightning: { active: false, timer: 0, flash: 0 },
    wind: Vec3.create(0, 0, 0),

    init(type = 'clear') {
        this.current = type;
        this.particles = [];
        this.wind = Vec3.create(0, 0, 0);

        switch (type) {
            case 'storm':
                this.wind = Vec3.create(
                    (Math.random() - 0.5) * 10,
                    0,
                    (Math.random() - 0.5) * 10
                );
                break;
            case 'cloudy':
                this.wind = Vec3.create(
                    (Math.random() - 0.5) * 5,
                    0,
                    (Math.random() - 0.5) * 5
                );
                break;
        }
    },

    update(dt, cameraPos) {
        if (this.current === 'storm') {
            this.updateStorm(dt, cameraPos);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.position = Vec3.add(p.position, Vec3.scale(p.velocity, dt));
        }

        this.wind.x += (Math.random() - 0.5) * dt * 2;
        this.wind.z += (Math.random() - 0.5) * dt * 2;
        const damping = Math.pow(0.99, dt * 60);
        this.wind.x *= damping;
        this.wind.z *= damping;
    },

    updateStorm(dt, cameraPos) {
        if (Math.random() < dt * 3) {
            this.spawnRain(cameraPos);
        }

        this.lightning.timer -= dt;
        if (this.lightning.timer <= 0) {
            if (Math.random() < 0.02) {
                this.lightning.active = true;
                this.lightning.flash = 0.5;
                this.lightning.timer = 5 + Math.random() * 10;
            }
        }

        if (this.lightning.flash > 0) {
            this.lightning.flash -= dt * 2;
        } else {
            this.lightning.active = false;
        }
    },

    spawnRain(cameraPos) {
        const spread = 100;
        const pos = Vec3.create(
            cameraPos.x + (Math.random() - 0.5) * spread,
            cameraPos.y + 50 + Math.random() * 30,
            cameraPos.z + (Math.random() - 0.5) * spread
        );

        this.particles.push({
            position: pos,
            velocity: Vec3.create(
                this.wind.x * 0.5,
                -30 - Math.random() * 10,
                this.wind.z * 0.5
            ),
            life: 2 + Math.random(),
            size: 0.3 + Math.random() * 0.3
        });
    },

    getLightningColor() {
        if (!this.lightning.active) return null;
        const f = this.lightning.flash;
        return [f, f, f * 0.9];
    },

    getWind() {
        return this.wind;
    }
};
