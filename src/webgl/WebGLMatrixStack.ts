import { mat4, vec3 } from '@tlaukkan/tsm';
import { MathHelper } from '../common/math/MathHelper';
import { mat4Adapter } from '../common/math/tsmAdapter';

export enum EMatrixMode {
    MODELVIEW,
    PROJECTION,
    TEXTURE,
}

export class GLMatrixStack {
    private _mvStack: mat4[];
    private _projStack: mat4[];
    private _texStack: mat4[];
    matrixMode: EMatrixMode;

    constructor() {
        //初始化时每个矩阵栈都先添加一个正交归一化后的矩阵
        this._mvStack = [];
        this._mvStack.push(new mat4().setIdentity());

        this._projStack = [];
        this._projStack.push(new mat4().setIdentity());

        this._texStack = [];
        this._texStack.push(new mat4().setIdentity());

        this.matrixMode = EMatrixMode.MODELVIEW;
    }

    get modelViewMatrix(): mat4 {
        if (this._mvStack.length <= 0) {
            throw new Error('model view matrix stack为空!');
        }
        return this._mvStack[this._mvStack.length - 1];
    }

    get projectionMatrix(): mat4 {
        if (this._projStack.length <= 0) {
            throw new Error('projection matrix stack为空!');
        }
        return this._projStack[this._projStack.length - 1];
    }

    get modelViewProjectionMatrix(): mat4 {
        const ret: mat4 = new mat4().setIdentity();
        this.projectionMatrix.copy(ret);
        ret.multiply(this.modelViewMatrix);
        return ret;
    }

    get normalMatrix(): mat4 {
        const ret: mat4 = new mat4();
        this.modelViewMatrix.copy(ret);
        // FIXME:
        // this.modelViewMatrix.inverse(ret);

        // mat4Instance.inverse() 会修改自身
        if (!ret.inverse()) throw new Error('can not solve `ret.inverse()` ');
        ret.transpose();
        return ret;
    }

    get textureMatrix(): mat4 {
        if (this._texStack.length <= 0) {
            throw new Error('projection matrix stack为空!');
        }
        return this._texStack[this._texStack.length - 1];
    }

    pushMatrix(): GLMatrixStack {
        const mv: mat4 = new mat4().setIdentity();
        const proj = new mat4().setIdentity();
        const tex: mat4 = new mat4().setIdentity();

        switch (this.matrixMode) {
            case EMatrixMode.MODELVIEW:
                this.modelViewMatrix.copy(mv);
                this._mvStack.push(mv);
                break;
            case EMatrixMode.PROJECTION:
                this.projectionMatrix.copy(proj);
                this._projStack.push(proj);
                break;
            case EMatrixMode.TEXTURE:
                this.textureMatrix.copy(tex);
                this._texStack.push(tex);
                break;
        }
        return this;
    }

    popMatrix(): GLMatrixStack {
        switch (this.matrixMode) {
            case EMatrixMode.MODELVIEW:
                this._mvStack.pop();
                break;
            case EMatrixMode.PROJECTION:
                this._projStack.pop();
                break;
            case EMatrixMode.TEXTURE:
                this._texStack.pop();
                break;
        }
        return this;
    }

    loadIdentity(): GLMatrixStack {
        switch (this.matrixMode) {
            case EMatrixMode.MODELVIEW:
                this.modelViewMatrix.setIdentity();
                break;
            case EMatrixMode.PROJECTION:
                this.projectionMatrix.setIdentity();
                break;
            case EMatrixMode.TEXTURE:
                this.textureMatrix.setIdentity();
                break;
        }
        return this;
    }

    loadMatrix(mat: mat4): GLMatrixStack {
        switch (this.matrixMode) {
            case EMatrixMode.MODELVIEW:
                mat.copy(this.modelViewMatrix);
                break;
            case EMatrixMode.PROJECTION:
                mat.copy(this.projectionMatrix);
                break;
            case EMatrixMode.TEXTURE:
                mat.copy(this.textureMatrix);
                break;
        }
        return this;
    }

    perspective(
        fov: number,
        aspect: number,
        near: number,
        far: number,
        isRadians: boolean = false,
    ): GLMatrixStack {
        this.matrixMode = EMatrixMode.PROJECTION;
        if (isRadians == false) {
            fov = MathHelper.toRadian(fov);
        }
        // const mat: mat4 = mat4.perspective(
        //     // FIXME: fov,
        //     0.5 * 360 * fov,
        //     aspect,
        //     near,
        //     far,
        // );

        const mat: mat4 = mat4Adapter.perspective(fov, aspect, near, far);

        this.loadMatrix(mat);
        this.matrixMode = EMatrixMode.MODELVIEW;
        // 是否要调用loadIdentity方法???
        this.loadIdentity();
        return this;
    }

    frustum(
        left: number,
        right: number,
        bottom: number,
        top: number,
        near: number,
        far: number,
    ): GLMatrixStack {
        this.matrixMode = EMatrixMode.PROJECTION;
        const mat: mat4 = mat4.frustum(left, right, bottom, top, near, far);
        this.loadMatrix(mat);
        this.matrixMode = EMatrixMode.MODELVIEW;
        // 是否要调用loadIdentity方法???
        this.loadIdentity();
        return this;
    }

    ortho(
        left: number,
        right: number,
        bottom: number,
        top: number,
        near: number,
        far: number,
    ): GLMatrixStack {
        this.matrixMode = EMatrixMode.PROJECTION;
        const mat: mat4 = mat4.orthographic(left, right, bottom, top, near, far);
        this.loadMatrix(mat);
        this.matrixMode = EMatrixMode.MODELVIEW;
        // 是否要调用loadIdentity方法???
        this.loadIdentity();
        return this;
    }

    lookAt(pos: vec3, target: vec3, up: vec3 = vec3.up): GLMatrixStack {
        this.matrixMode = EMatrixMode.MODELVIEW;
        const mat: mat4 = mat4.lookAt(pos, target, up);
        this.loadMatrix(mat);
        return this;
    }

    makeView(pos: vec3, xAxis: vec3, yAxis: vec3, zAxis: vec3): GLMatrixStack {
        zAxis.normalize();

        //forward cross right = up
        vec3.cross(zAxis, xAxis, yAxis);
        yAxis.normalize();

        //up cross forward = right
        vec3.cross(yAxis, zAxis, xAxis);
        xAxis.normalize();

        const x: number = -vec3.dot(xAxis, pos);
        const y: number = -vec3.dot(yAxis, pos);
        const z: number = -vec3.dot(zAxis, pos);

        const mat: mat4 = this._mvStack[this._mvStack.length - 1];
        // FIXME：
        // mat.values[0] = xAxis.x;
        // mat.values[1] = yAxis.x;
        // mat.values[2] = zAxis.x;
        // mat.values[3] = 0.0;

        // mat.values[4] = xAxis.y;
        // mat.values[5] = yAxis.y;
        // mat.values[6] = zAxis.y;
        // mat.values[7] = 0.0;

        // mat.values[8] = xAxis.z;
        // mat.values[9] = yAxis.z;
        // mat.values[10] = zAxis.z;
        // mat.values[11] = 0.0;

        // mat.values[12] = x;
        // mat.values[13] = y;
        // mat.values[14] = z;
        // mat.values[15] = 1.0;

        mat.init([
            ...[xAxis.x, yAxis.x, zAxis.x, 0.0],
            ...[xAxis.y, yAxis.y, zAxis.y, 0.0],
            ...[xAxis.z, yAxis.z, zAxis.z, 0.0],
            ...[x, y, z, 1.0],
        ]);

        return this;
    }

    multMatrix(mat: mat4): GLMatrixStack {
        switch (this.matrixMode) {
            case EMatrixMode.MODELVIEW:
                this.modelViewMatrix.multiply(mat);
                break;
            case EMatrixMode.PROJECTION:
                this.projectionMatrix.multiply(mat);
                break;
            case EMatrixMode.TEXTURE:
                this.textureMatrix.multiply(mat);
                break;
        }
        return this;
    }

    translate(pos: vec3): GLMatrixStack {
        switch (this.matrixMode) {
            case EMatrixMode.MODELVIEW:
                this.modelViewMatrix.translate(pos);
                break;
            case EMatrixMode.PROJECTION:
                this.projectionMatrix.translate(pos);
                break;
            case EMatrixMode.TEXTURE:
                this.textureMatrix.translate(pos);
                break;
        }
        return this;
    }

    rotate(angle: number, axis: vec3, isRadians: boolean = false): GLMatrixStack {
        if (isRadians === false) {
            angle = MathHelper.toRadian(angle);
        }
        switch (this.matrixMode) {
            case EMatrixMode.MODELVIEW:
                this.modelViewMatrix.rotate(angle, axis);
                break;
            case EMatrixMode.PROJECTION:
                this.projectionMatrix.rotate(angle, axis);
                break;
            case EMatrixMode.TEXTURE:
                this.textureMatrix.rotate(angle, axis);
                break;
        }
        return this;
    }

    scale(s: vec3): GLMatrixStack {
        switch (this.matrixMode) {
            case EMatrixMode.MODELVIEW:
                this.modelViewMatrix.scale(s);
                break;
            case EMatrixMode.PROJECTION:
                this.projectionMatrix.scale(s);
                break;
            case EMatrixMode.TEXTURE:
                this.textureMatrix.scale(s);
                break;
        }
        return this;
    }
}

/** 该类用于将局部坐标系表示的顶点变换到世界坐标系 */
export class GLWorldMatrixStack {
    /** 内置一个矩阵数组 */
    private _worldMatrixStack: mat4[];

    constructor() {
        //初始化时矩阵栈先添加一个正交单位化后的矩阵
        this._worldMatrixStack = [];
        this._worldMatrixStack.push(new mat4().setIdentity());
    }

    /** 获取堆栈顶部的世界矩阵 */
    get worldMatrix(): mat4 {
        if (this._worldMatrixStack.length <= 0) {
            throw new Error(' model matrix stack为空!');
        }
        return this._worldMatrixStack[this._worldMatrixStack.length - 1];
    }

    get modelViewMatrix(): mat4 {
        if (this._worldMatrixStack.length <= 0) {
            throw new Error(' model matrix stack为空!');
        }
        return this._worldMatrixStack[this._worldMatrixStack.length - 1];
    }

    /** 在矩阵堆栈中添加一个矩阵 */
    pushMatrix(): GLWorldMatrixStack {
        const mv: mat4 = new mat4().setIdentity(); // 要新增的矩阵复制了父矩阵的值
        this.worldMatrix.copy(mv); // 然后添加到堆栈的顶部
        this._worldMatrixStack.push(mv);
        return this; // 返回this，可用于链式操作
    }

    /** remove掉堆栈顶部的矩阵并返回this */
    popMatrix(): GLWorldMatrixStack {
        this._worldMatrixStack.pop();
        return this; // 返回this，可用于链式操作
    }
    /** 将栈顶的矩阵重置为单位矩阵 */
    loadIdentity(): GLWorldMatrixStack {
        this.worldMatrix.setIdentity();
        return this; // 返回this，可用于链式操作
    }

    /** 将参数矩阵mat的值复制到栈顶矩阵 */
    loadMatrix(mat: mat4): GLWorldMatrixStack {
        mat.copy(this.worldMatrix);
        return this; // 返回this，可用于链式操作
    }

    // FIXME: multiMatrix
    /** 栈顶矩阵 = 栈顶矩阵 ＊ 参数矩阵mat */
    multMatrix(mat: mat4): GLWorldMatrixStack {
        this.worldMatrix.multiply(mat);
        return this; // 返回this，可用于链式操作
    }

    /* 栈顶矩阵 = 栈顶矩阵 ＊ 平移矩阵 */
    translate(pos: vec3): GLWorldMatrixStack {
        this.worldMatrix.translate(pos);
        return this; // 返回this，可用于链式操作
    }

    /** 栈顶矩阵 = 栈顶矩阵 ＊ 轴角对表示的旋转矩阵 */
    rotate(angle: number, axis: vec3, isRadians: boolean = false): GLWorldMatrixStack {
        if (isRadians === false) {
            angle = MathHelper.toRadian(angle);
        }
        this.worldMatrix.rotate(angle, axis);
        return this; // 返回this，可用于链式操作
    }

    /** 栈顶矩阵 = 栈顶矩阵 ＊ 缩放矩阵 */
    scale(s: vec3): GLWorldMatrixStack {
        this.worldMatrix.scale(s);
        return this; // 返回this，可用于链式操作
    }
}
