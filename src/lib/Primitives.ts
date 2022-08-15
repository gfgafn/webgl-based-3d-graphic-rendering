import { vec2, vec3, vec4 } from '@tlaukkan/tsm';
import { MathHelper } from '../common/math/MathHelper';
import { GLAttribBits, GLAttribState } from '../webgl/WebGLAttribState';
import { GLStaticMesh } from '../webgl/WebGLMesh';

export class GeometryData {
    // 输入顶点属性数据
    positions: vec3[] = [];
    uvs: vec2[] = [];
    normals: vec3[] = [];
    colors: vec4[] = [];
    tangents: vec4[] = [];
    indices: number[] = [];

    makeStaticVAO(
        gl: WebGLRenderingContext,
        needNormals: boolean = false,
        needUV: boolean = true,
    ): GLStaticMesh {
        let bits: GLAttribBits = this.getAttribBits();
        if (needNormals === false) {
            bits &= ~GLAttribState.NORMAL_BIT;
        }
        if (needUV === false) {
            bits &= ~GLAttribState.TEXCOORD_BIT;
        }

        const stride: number = GLAttribState.getVertexByteStride(bits);
        const step: number = stride / Float32Array.BYTES_PER_ELEMENT;
        const arrayBuffer: ArrayBuffer = new ArrayBuffer(stride * this.positions.length);
        const buffer = new Float32Array(arrayBuffer);
        for (let i: number = 0; i < this.positions.length; i++) {
            // 位置
            const j: number = i * step;
            let idx: number = 0;
            buffer[j + idx++] = this.positions[i].x;
            buffer[j + idx++] = this.positions[i].y;
            buffer[j + idx++] = this.positions[i].z;
            //法线(用了bits后，不能用length来判断了!!!)
            if (bits & GLAttribState.NORMAL_BIT) {
                buffer[j + idx++] = this.normals[i].x;
                buffer[j + idx++] = this.normals[i].y;
                buffer[j + idx++] = this.normals[i].z;
            }
            //纹理
            if (bits & GLAttribState.TEXCOORD_BIT) {
                buffer[j + idx++] = this.uvs[i].x;
                buffer[j + idx++] = this.uvs[i].y;
            }
            //颜色
            if (bits & GLAttribState.COLOR_BIT) {
                buffer[j + idx++] = this.colors[i].x;
                buffer[j + idx++] = this.colors[i].y;
                buffer[j + idx++] = this.colors[i].z;
                buffer[j + idx++] = this.colors[i].w;
            }
            //切线
            if (bits & GLAttribState.TANGENT_BIT) {
                buffer[j + idx++] = this.tangents[i].x;
                buffer[j + idx++] = this.tangents[i].y;
                buffer[j + idx++] = this.tangents[i].z;
                buffer[j + idx++] = this.tangents[i].w;
            }
        }
        const mesh: GLStaticMesh = new GLStaticMesh(
            gl,
            bits,
            buffer,
            this.indices.length > 0 ? new Uint16Array(this.indices) : null,
        );
        this.buildBoundingBoxTo(mesh.mins, mesh.maxs);
        return mesh;
    }

    buildBoundingBoxTo(mins: vec3, maxs: vec3): void {
        for (let i: number = 0; i < this.positions.length; i++) {
            MathHelper.boundBoxAddPoint(this.positions[i], mins, maxs);
        }
    }

    getAttribBits(): GLAttribBits {
        if (this.positions.length === 0) {
            throw new Error('必须要有顶数据!!!');
        }

        let bits: GLAttribBits = GLAttribState.POSITION_BIT;
        if (this.uvs.length > 0) {
            bits |= GLAttribState.TEXCOORD_BIT;
        }
        if (this.normals.length > 0) {
            bits |= GLAttribState.NORMAL_BIT;
        }
        if (this.colors.length > 0) {
            bits |= GLAttribState.COLOR_BIT;
        }
        if (this.tangents.length > 0) {
            bits |= GLAttribState.TANGENT_BIT;
        }
        return bits;
    }
}

export class Cube {
    /**
     * ```plaintext
     *    /3--------/7
     *   / |       / |
     *  /  |      /  |
     * 1---|-----5   |
     * |  /2- - -|- -6
     * | /       |  /
     * |/        | /
     * 0---------4/
     * ```
     */
    constructor(
        public halfWidth: number = 0.2,
        public halfHeight: number = 0.2,
        public halfDepth: number = 0.2,
    ) {
        this.halfWidth = halfWidth;
        this.halfHeight = halfHeight;
        this.halfDepth = halfDepth;
    }

    makeGeometryDataWithTextureCooord(): GeometryData {
        const data: GeometryData = new GeometryData();
        data.positions = [
            new vec3([-this.halfWidth, -this.halfHeight, this.halfDepth]), // 0
            new vec3([this.halfWidth, -this.halfHeight, this.halfDepth]), // 4
            new vec3([this.halfWidth, this.halfHeight, this.halfDepth]), // 5
        ];
        data.uvs = [new vec2([0, 0]), new vec2([1, 0]), new vec2([1, 1])];
        return data;
    }

    makeGeometryData(): GeometryData {
        const data: GeometryData = new GeometryData();
        data.positions.push(
            new vec3([-this.halfWidth, -this.halfHeight, this.halfDepth]),
        ); // 0
        data.uvs.push(new vec2([1, 0]));

        data.positions.push(new vec3([-this.halfWidth, this.halfHeight, this.halfDepth])); // 1
        data.uvs.push(new vec2([1, 1]));

        data.positions.push(
            new vec3([-this.halfWidth, -this.halfHeight, -this.halfDepth]),
        ); // 2
        data.uvs.push(new vec2([0, 0]));

        data.positions.push(
            new vec3([-this.halfWidth, this.halfHeight, -this.halfDepth]),
        ); // 3
        data.uvs.push(new vec2([0, 1]));

        data.positions.push(new vec3([this.halfWidth, -this.halfHeight, this.halfDepth])); // 4
        data.uvs.push(new vec2([0, 0]));

        data.positions.push(new vec3([this.halfWidth, this.halfHeight, this.halfDepth])); // 5
        data.uvs.push(new vec2([0, 1]));

        data.positions.push(
            new vec3([this.halfWidth, -this.halfHeight, -this.halfDepth]),
        ); // 6
        data.uvs.push(new vec2([1, 0]));

        data.positions.push(new vec3([this.halfWidth, this.halfHeight, -this.halfDepth])); // 7
        data.uvs.push(new vec2([1, 1]));

        // 法线朝外
        data.indices.push(0, 1, 3, 0, 3, 2); // 左面
        data.indices.push(3, 7, 6, 3, 6, 2); // 后面
        data.indices.push(6, 7, 5, 6, 5, 4); // 右面
        data.indices.push(5, 1, 0, 5, 0, 4); // 前面
        data.indices.push(1, 5, 7, 1, 7, 3); // 上面
        data.indices.push(2, 6, 4, 2, 4, 0); // 下面
        return data;
    }
}

export class GridPlane {
    constructor(
        public sx: number = 10,
        public sy: number = 10,
        public nx: number = 10,
        public ny: number = 10,
    ) {
        this.sx = sx;
        this.sy = sy;
        this.nx = nx;
        this.ny = ny;
    }

    makeGeometryData(): GeometryData {
        const data: GeometryData = new GeometryData();
        for (let iy: number = 0; iy <= this.ny; iy++) {
            for (let ix: number = 0; ix <= this.nx; ix++) {
                const u: number = ix / this.nx;
                const v: number = iy / this.ny;
                const x: number = -this.sx / 2 + u * this.sx; // starts on the left
                const y: number = this.sy / 2 - v * this.sy; // starts at the top
                data.positions.push(new vec3([x, y, 0]));
                data.uvs.push(new vec2([u, 1.0 - v]));
                data.normals.push(new vec3([0, 0, 1]));
                if (iy < this.ny && ix < this.nx) {
                    {
                        data.indices.push(
                            iy * (this.nx + 1) + ix,
                            (iy + 1) * (this.nx + 1) + ix + 1,
                            iy * (this.nx + 1) + ix + 1,
                        );
                        data.indices.push(
                            (iy + 1) * (this.nx + 1) + ix + 1,
                            iy * (this.nx + 1) + ix,
                            (iy + 1) * (this.nx + 1) + ix,
                        );
                    }
                }
            }
        }
        return data;
    }
}
