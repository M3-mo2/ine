const HUD = {
    canvas: null,
    ctx: null,

    init() {
        this.canvas = document.getElementById('hud-canvas');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx = this.canvas.getContext('2d');
    },

    drawAttitudeIndicator(state) {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const size = 160;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(state.roll);

        const pitchOffset = state.pitch * 100;

        ctx.fillStyle = '#3366cc';
        ctx.fillRect(-size * 2, -size * 2 + pitchOffset, size * 4, size * 2);

        ctx.fillStyle = '#664422';
        ctx.fillRect(-size * 2, pitchOffset, size * 4, size * 2);

        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;

        for (let i = -90; i <= 90; i += 10) {
            if (i === 0) continue;
            const y = pitchOffset - i * (size / 45);
            const w = (Math.abs(i) % 30 === 0) ? 60 : 30;

            ctx.beginPath();
            ctx.moveTo(-w, y);
            ctx.lineTo(w, y);
            ctx.stroke();

            if (Math.abs(i) % 30 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(Math.abs(i).toString(), -w - 5, y + 3);
                ctx.textAlign = 'left';
                ctx.fillText(Math.abs(i).toString(), w + 5, y + 3);
            }
        }

        ctx.restore();

        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(cx - 80, cy);
        ctx.lineTo(cx - 30, cy);
        ctx.lineTo(cx - 20, cy + 10);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + 80, cy);
        ctx.lineTo(cx + 30, cy);
        ctx.lineTo(cx + 20, cy + 10);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-state.roll);

        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(-size + 20, 0);
        ctx.moveTo(size, 0);
        ctx.lineTo(size - 20, 0);
        ctx.stroke();

        for (let i = 0; i < 360; i += 30) {
            const angle = (i - 90) * Math.PI / 180;
            const inner = size - 10;
            const outer = size;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.stroke();
        }

        ctx.restore();
    },

    drawAirspeedIndicator(state) {
        const ctx = this.ctx;
        const x = 100;
        const y = this.canvas.height / 2;
        const radius = 70;

        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,212,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for (let spd = 0; spd <= 200; spd += 20) {
            const angle = ((spd / 200) * 270 - 135) * Math.PI / 180;
            const inner = radius - 15;
            const outer = radius - 5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(spd.toString(), Math.cos(angle) * (radius - 25), Math.sin(angle) * (radius - 25) + 3);
        }

        const needleAngle = ((state.airspeed / 200) * 270 - 135) * Math.PI / 180;
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(needleAngle) * (radius - 20), Math.sin(needleAngle) * (radius - 20));
        ctx.stroke();

        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(state.airspeed), 0, 25);

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '8px monospace';
        ctx.fillText('AIRSPEED', 0, 38);

        ctx.restore();
    },

    drawAltimeter(state) {
        const ctx = this.ctx;
        const x = this.canvas.width - 100;
        const y = this.canvas.height / 2;
        const radius = 70;

        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,212,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        for (let alt = 0; alt <= 10; alt++) {
            const angle = ((alt / 10) * 360 - 90) * Math.PI / 180;
            const inner = radius - 15;
            const outer = radius - 5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.stroke();
        }

        const altFt = state.altitude * 3.28084;
        const needleAngle = ((altFt / 1000 % 10) / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(needleAngle) * (radius - 20), Math.sin(needleAngle) * (radius - 20));
        ctx.stroke();

        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(altFt).toString(), 0, 25);

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '8px monospace';
        ctx.fillText('ALTITUDE FT', 0, 38);

        ctx.restore();
    },

    drawVSI(state) {
        const ctx = this.ctx;
        const x = this.canvas.width - 180;
        const cy = this.canvas.height / 2;
        const height = 120;
        const width = 20;

        ctx.save();
        ctx.translate(x, cy);

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.strokeStyle = 'rgba(0,212,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-width / 2, -height / 2, width, height);

        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(-width / 2, 0);
        ctx.lineTo(width / 2, 0);
        ctx.stroke();

        const vsFpm = state.verticalSpeed;
        const clampedVS = Math.max(-2000, Math.min(2000, vsFpm));
        const indicatorY = -(clampedVS / 2000) * (height / 2 - 10);

        ctx.fillStyle = clampedVS > 0 ? '#00ff88' : '#ff4444';
        ctx.fillRect(-width / 2 + 2, Math.min(0, indicatorY), width - 4, Math.abs(indicatorY));

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VS', 0, height / 2 + 15);
        ctx.fillText(Math.round(vsFpm).toString(), 0, height / 2 + 28);

        ctx.restore();
    },

    drawCompass(state) {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const y = 80;
        const width = 200;
        const height = 30;

        ctx.save();
        ctx.translate(cx, y);

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.strokeStyle = 'rgba(0,212,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-width / 2, -height / 2, width, height);

        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -height / 2 - 5);
        ctx.lineTo(0, -height / 2);
        ctx.stroke();

        const heading = state.heading;
        const pixelsPerDegree = width / 60;

        ctx.save();
        ctx.beginPath();
        ctx.rect(-width / 2, -height / 2, width, height);
        ctx.clip();

        for (let i = -60; i <= 60; i += 5) {
            const deg = ((heading + i) % 360 + 360) % 360;
            const x = i * pixelsPerDegree;

            if (deg % 30 === 0) {
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath();
                ctx.moveTo(x, -height / 2);
                ctx.lineTo(x, -height / 2 + 10);
                ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                const labels = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
                ctx.fillText(labels[deg] || deg.toString(), x, height / 2 - 5);
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.moveTo(x, -height / 2);
                ctx.lineTo(x, -height / 2 + 5);
                ctx.stroke();
            }
        }
        ctx.restore();

        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(heading).toString().padStart(3, '0'), 0, 5);

        ctx.restore();
    },

    drawHUD(state) {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawAttitudeIndicator(state);
        this.drawAirspeedIndicator(state);
        this.drawAltimeter(state);
        this.drawVSI(state);
        this.drawCompass(state);

        ctx.fillStyle = 'rgba(0,212,255,0.7)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';

        const info = [
            `THROTTLE: ${Math.round(state.throttle * 100)}%`,
            `FLAPS: ${Math.round(state.flaps * 100)}%`,
            `GEAR: ${state.gear ? 'DOWN' : 'UP'}`,
            `G-FORCE: ${state.gForce.toFixed(1)}`,
            `VS: ${Math.round(state.verticalSpeed)} fpm`
        ];

        info.forEach((text, i) => {
            ctx.fillText(text, 20, this.canvas.height - 100 + i * 18);
        });

        if (state.crashed) {
            ctx.fillStyle = 'rgba(255,0,0,0.8)';
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('CRASHED', cx, cy);
            ctx.font = '16px monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText('Press R to restart', cx, cy + 40);
        }
    }
};
