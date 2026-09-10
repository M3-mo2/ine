const Vec3 = {
    create(x = 0, y = 0, z = 0) {
        return { x, y, z };
    },
    add(a, b) {
        return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    },
    sub(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },
    scale(v, s) {
        return { x: v.x * s, y: v.y * s, z: v.z * s };
    },
    dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    },
    cross(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    },
    length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    },
    normalize(v) {
        const len = Vec3.length(v);
        if (len < 0.00001) return { x: 0, y: 0, z: 0 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    },
    lerp(a, b, t) {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t
        };
    },
    rotateX(v, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
    },
    rotateY(v, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
    },
    rotateZ(v, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return { x: v.x * c - v.y * s, y: v.x * s + v.y * c, z: v.z };
    },
    transformMat4(v, m) {
        const w = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15];
        return {
            x: (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) / w,
            y: (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) / w,
            z: (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) / w
        };
    }
};

const Mat4 = {
    create() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },
    perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        const out = new Float32Array(16);
        out[0] = f / aspect;
        out[5] = f;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[14] = 2 * far * near * nf;
        return out;
    },
    lookAt(eye, target, up) {
        const z = Vec3.normalize(Vec3.sub(eye, target));
        const x = Vec3.normalize(Vec3.cross(up, z));
        const y = Vec3.cross(z, x);
        const out = new Float32Array(16);
        out[0] = x.x; out[1] = y.x; out[2] = z.x; out[3] = 0;
        out[4] = x.y; out[5] = y.y; out[6] = z.y; out[7] = 0;
        out[8] = x.z; out[9] = y.z; out[10] = z.z; out[11] = 0;
        out[12] = -Vec3.dot(x, eye);
        out[13] = -Vec3.dot(y, eye);
        out[14] = -Vec3.dot(z, eye);
        out[15] = 1;
        return out;
    },
    multiply(a, b) {
        const out = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                out[j * 4 + i] =
                    a[i] * b[j * 4] +
                    a[4 + i] * b[j * 4 + 1] +
                    a[8 + i] * b[j * 4 + 2] +
                    a[12 + i] * b[j * 4 + 3];
            }
        }
        return out;
    },
    translate(out, v) {
        out[12] += v.x;
        out[13] += v.y;
        out[14] += v.z;
        return out;
    },
    rotateY(out, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const m0 = out[0], m1 = out[1], m2 = out[2], m3 = out[3];
        const m8 = out[8], m9 = out[9], m10 = out[10], m11 = out[11];
        out[0] = m0 * c + m8 * s;
        out[1] = m1 * c + m9 * s;
        out[2] = m2 * c + m10 * s;
        out[3] = m3 * c + m11 * s;
        out[8] = m8 * c - m0 * s;
        out[9] = m9 * c - m1 * s;
        out[10] = m10 * c - m2 * s;
        out[11] = m11 * c - m3 * s;
        return out;
    },
    rotateX(out, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const m4 = out[4], m5 = out[5], m6 = out[6], m7 = out[7];
        const m8 = out[8], m9 = out[9], m10 = out[10], m11 = out[11];
        out[4] = m4 * c + m8 * s;
        out[5] = m5 * c + m9 * s;
        out[6] = m6 * c + m10 * s;
        out[7] = m7 * c + m11 * s;
        out[8] = m8 * c - m4 * s;
        out[9] = m9 * c - m5 * s;
        out[10] = m10 * c - m6 * s;
        out[11] = m11 * c - m7 * s;
        return out;
    },
    rotateZ(out, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const m0 = out[0], m1 = out[1], m2 = out[2], m3 = out[3];
        const m4 = out[4], m5 = out[5], m6 = out[6], m7 = out[7];
        out[0] = m0 * c + m4 * s;
        out[1] = m1 * c + m5 * s;
        out[2] = m2 * c + m6 * s;
        out[3] = m3 * c + m7 * s;
        out[4] = m4 * c - m0 * s;
        out[5] = m5 * c - m1 * s;
        out[6] = m6 * c - m2 * s;
        out[7] = m7 * c - m3 * s;
        return out;
    }
};
