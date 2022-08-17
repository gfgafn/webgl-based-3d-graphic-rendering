import { vec4, vec3, mat4 } from '@tlaukkan/tsm';
import { epsilon } from '@tlaukkan/tsm/dist/constants';

export class vec3Adapter {
    static v0: vec3 = new vec3([0, 0, 0]);
}

export class vec4Adapter {
    static red: vec4 = new vec4([1.0, 0.0, 0.0, 1.0]);
    static green: vec4 = new vec4([0.0, 1.0, 0.0, 1.0]);
    static blue: vec4 = new vec4([0.0, 0.0, 1.0, 1.0]);
    static black: vec4 = new vec4([0, 0, 0, 0]);
}

export class mat4Adapter {
    static m0 = new mat4().setIdentity();
    static m1 = new mat4().setIdentity();

    static perspective(fov: number, aspect: number, near: number, far: number): mat4 {
        return mat4.perspective(((0.5 * 360) / Math.PI) * fov, aspect, near, far);
    }
}

export class tsmAdapter {
    static EPSILON: typeof epsilon = epsilon;
}
