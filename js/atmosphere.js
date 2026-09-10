const Atmosphere = {
    time: 0,
    sunAngle: 0.8,
    sunDir: [0, 1, 0],
    sunColor: [1, 0.95, 0.8],
    ambientColor: [0.2, 0.25, 0.35],
    fogColor: [0.6, 0.7, 0.85],
    fogDensity: 0.000003,
    skyColor: [0.4, 0.65, 0.95],
    cloudDensity: 0.3,

    init() {
        this.time = 0;
    },

    update(dt, weather) {
        this.time += dt;

        this.sunAngle += dt * 0.02;
        if (this.sunAngle > Math.PI * 2) this.sunAngle -= Math.PI * 2;

        const sunHeight = Math.sin(this.sunAngle);

        this.sunDir = [
            Math.cos(this.sunAngle) * 0.7,
            sunHeight,
            Math.sin(this.sunAngle) * 0.3
        ];

        const dayFactor = Math.max(0, Math.min(1, sunHeight * 2 + 0.3));

        switch (weather) {
            case 'clear':
                this.cloudDensity = 0.2 + Math.sin(this.time * 0.1) * 0.05;
                this.fogDensity = 0.000003;
                this.fogColor = [
                    0.4 * dayFactor + 0.1,
                    0.5 * dayFactor + 0.1,
                    0.7 * dayFactor + 0.2
                ];
                this.sunColor = [
                    1.0 * dayFactor + 0.1,
                    0.95 * dayFactor + 0.05,
                    0.8 * dayFactor
                ];
                this.ambientColor = [
                    0.15 * dayFactor + 0.05,
                    0.18 * dayFactor + 0.05,
                    0.25 * dayFactor + 0.08
                ];
                break;

            case 'cloudy':
                this.cloudDensity = 0.7 + Math.sin(this.time * 0.15) * 0.1;
                this.fogDensity = 0.000008;
                this.fogColor = [0.5, 0.55, 0.65];
                this.sunColor = [0.6, 0.58, 0.55];
                this.ambientColor = [0.2, 0.22, 0.28];
                break;

            case 'storm':
                this.cloudDensity = 0.95 + Math.sin(this.time * 0.2) * 0.05;
                this.fogDensity = 0.00002;
                this.fogColor = [0.3, 0.32, 0.38];
                this.sunColor = [0.3, 0.28, 0.25];
                this.ambientColor = [0.12, 0.13, 0.18];
                break;

            case 'fog':
                this.cloudDensity = 0.4;
                this.fogDensity = 0.00005;
                this.fogColor = [0.7, 0.72, 0.75];
                this.sunColor = [0.5, 0.5, 0.5];
                this.ambientColor = [0.25, 0.25, 0.28];
                break;
        }
    }
};
