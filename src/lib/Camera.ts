import { mat4, vec3 } from '@tlaukkan/tsm';
import { Frustum } from './Frustum';
import { MathHelper } from '../common/math/MathHelper';
import { mat4Adapter } from '../common/math/tsmAdapter';

export enum ECameraType {
    /** 第一人称运动摄像机
     * FPSCamera表示第一人称摄像机，
     * 能够前进、后退，能够左移、右移，还能够站起来或蹲下来，
     * 这样视线高度会发生变化；还可以上下左右，从而产生不同的视野。
     */
    FPSCAMERA,
    /** 自由运动摄像机
     * 自由飞翔的摄像机，你可以将其看成拍摄电影的那种摄像机，可以做任何无拘束的拍摄效果。
     */
    FLYCAMERA,
}

/**
 * 摄像机类。摄像机类的基本功能有如下几点：
 * 生成视图矩阵（摄像机矩阵）与投影矩阵；
 * 提供多视口显示支持；
 * 摄像机场景漫游和旋转；
 * 抽取视截体6个平面信息（在第9章9.5节中实现）。
 * 世界坐标系中的点变换到视图坐标系（或摄像机坐标系）以及再变换到裁剪坐标系（或投影坐标系）的相关操作由摄像机（Camera）类实现
 */
export class Camera {
    // 提供一个WebGLRenderingContext的成员变量，这样可以直接和WebGL交互
    gl: WebGLRenderingContext;
    // 下面是摄像机相关的成员变量
    private _type: ECameraType = ECameraType.FLYCAMERA; // 摄像机类型
    private _position: vec3 = new vec3();
    // 摄像机在世界坐标系中的位置，初始化时为世界坐标系的原点处
    /** 摄像机在世界坐标系中的x轴方向 */
    private _xAxis: vec3 = new vec3([1, 0, 0]);
    /** 摄像机在世界坐标系中的y轴方向 */
    private _yAxis: vec3 = new vec3([0, 1, 0]);
    /** 摄像机在世界坐标系中的z轴方向 */
    private _zAxis: vec3 = new vec3([0, 0, 1]); //
    /** 每帧更新时会根据上述参数计算出视图矩阵 */
    private _viewMatrix: mat4;
    // 下面是投影相关的成员变量
    /** 投影的近平面距离 */
    private _near: number;
    /** 投影的远平面距离 */
    private _far: number;
    /** 上下视场角的大小，内部由弧度表示，输入时由角度表示 */
    private _fovY: number;
    /** 视野的纵横比 */
    private _aspectRatio: number;
    /** 每帧更新时会根据上述参数计算出投影矩阵 */
    private _projectionMatrix: mat4;
    /** 投影矩阵 * 摄像机矩阵以及其逆矩阵 */
    private _viewProjMatrix: mat4;
    /** 每帧更新时会计算出view_matrix矩阵及其逆矩阵 */
    private _invViewProjMatrix: mat4;
    private _invViewMatrix: mat4;

    private _left: number;
    private _right: number;
    private _bottom: number;
    private _top: number;
    private _frustum: Frustum;

    get fovY(): number {
        return this._fovY;
    }
    set fovY(value: number) {
        this._fovY = value;
    }
    get near(): number {
        return this._near;
    }
    set near(value: number) {
        this._near = value;
    }
    get far(): number {
        return this._far;
    }
    set far(value: number) {
        this._far = value;
    }
    get aspectRatio(): number {
        return this._aspectRatio;
    }
    set aspectRatio(value: number) {
        this._aspectRatio = value;
    }
    get position(): vec3 {
        return this._position;
    }
    set position(value: vec3) {
        this._position = value;
    }
    set x(value: number) {
        this._position.x = value;
    }
    get x(): number {
        return this._position.x;
    }
    set y(value: number) {
        this._position.y = value;
    }
    get y(): number {
        return this._position.y;
    }
    set z(value: number) {
        this._position.z = value;
    }
    get z(): number {
        return this._position.z;
    }
    get xAxis(): vec3 {
        return this._xAxis;
    }
    get yAxis(): vec3 {
        return this._yAxis;
    }
    get zAxis(): vec3 {
        return this._zAxis;
    }
    get type(): ECameraType {
        return this._type;
    }
    set type(value: ECameraType) {
        this._type = value;
    }

    get left(): number {
        return this._left;
    }

    get right(): number {
        return this._right;
    }

    get bottom(): number {
        return this._bottom;
    }

    get top(): number {
        return this._top;
    }

    get viewMatrix(): mat4 {
        return this._viewMatrix;
    }

    get invViewMatrix(): mat4 {
        return this._invViewMatrix;
    }

    get projectionMatrix(): mat4 {
        return this._projectionMatrix;
    }

    get viewProjectionMatrix(): mat4 {
        return this._viewProjMatrix;
    }

    get invViewProjectionMatrix(): mat4 {
        return this._invViewProjMatrix;
    }

    get frustum(): Frustum {
        return this._frustum;
    }

    constructor(
        gl: WebGLRenderingContext,
        width: number,
        height: number,
        fovY: number = 45.0,
        zNear: number = 1,
        zFar: number = 1000,
    ) {
        this.gl = gl;
        this._aspectRatio = width / height; // 纵横比
        this._fovY = MathHelper.toRadian(fovY);
        // 我们的摄像机默认 fovY 参数是以角度表示，TSM 数学库的 perspective 静态方法使用的是弧度表示，
        // 因此需要进行转换操作
        this._near = zNear;
        this._far = zFar;
        // FIXME: 初始化时，矩阵设置为单位矩阵
        this._projectionMatrix = new mat4().setIdentity();
        this._viewMatrix = new mat4().setIdentity();
        this._viewProjMatrix = new mat4().setIdentity();
        this._invViewProjMatrix = new mat4().setIdentity();
        this._invViewMatrix = new mat4().setIdentity();

        this._top = this._near * Math.tan(this._fovY * 0.5);
        this._right = this._top * this._aspectRatio;
        this._bottom = -this._top;
        this._left = -this._right;
        this._frustum = new Frustum();
    }

    //局部坐标系下的前后运动
    moveForward(speed: number): void {
        // 对于第一人称摄像机来说，你双脚不能离地，因此运动时不能变动y轴上的数据
        if (this._type === ECameraType.FPSCAMERA) {
            this._position.x += this._zAxis.x * speed;
            this._position.z += this._zAxis.z * speed;
        } else {
            // 对于自由摄像机来说，它总是沿着当前的z轴方向前进或后退
            this._position.x += this._zAxis.x * speed;
            this._position.y += this._zAxis.y * speed;
            this._position.z += this._zAxis.z * speed;
        }
    } //局部坐标系下的左右运动
    moveRightward(speed: number): void {
        // 对于第一人称摄像机来说，你双脚不能离地，因此运动时不能变动y轴上的数据
        if (this._type === ECameraType.FPSCAMERA) {
            this._position.x += this._xAxis.x * speed;
            this._position.z += this._xAxis.z * speed;
        } else {
            // 对于自由摄像机来说，它总是沿着当前的x轴方向左右运动
            this._position.x += this._xAxis.x * speed;
            this._position.y += this._xAxis.y * speed;
            this._position.z += this._xAxis.z * speed;
        }
    }

    //局部坐标系下的上下运动
    moveUpward(speed: number): void {
        // 对于第一人称摄像机来说，只调整上下的高度，目的是模拟眼睛的高度
        if (this._type === ECameraType.FPSCAMERA) {
            this._position.y += speed;
        } else {
            // 对于自由摄像机来说，它总是沿着当前的y轴方向上下运动
            this._position.x += this._yAxis.x * speed;
            this._position.y += this._yAxis.y * speed;
            this._position.z += this._yAxis.z * speed;
        }
    }

    /** 局部坐标轴的左右旋转，以角度表示 */
    yaw(angle: number): void {
        // 重用矩阵
        mat4Adapter.m0.setIdentity();
        angle = MathHelper.toRadian(angle);
        // 调用mat4的rotate方法生成旋转矩阵，注意不同摄像机类型绕不同轴旋转
        if (this._type === ECameraType.FPSCAMERA) {
            // 对于FPS摄像机来说，我们总是水平旋转摄像机，避免产生斜视现象
            mat4Adapter.m0.rotate(angle, vec3.up);
        } else {
            // 对于自由摄像机来说，镜头可以任意倾斜
            mat4Adapter.m0.rotate(angle, this._yAxis);
        }
        // 对于绕y轴的旋转，你会发现y轴不变，变动的是其他两个轴
        // 因此我们需要获取旋转angle后，另外两个轴的方向，可以使用multiplyVec3方法实现
        // FIXME: mat4Adapter.m0.multiplyVec3(this._zAxis, this._zAxis);
        this._zAxis.xyz = mat4Adapter.m0.multiplyVec3(this._zAxis).xyz;
        this._xAxis.xyz = mat4Adapter.m0.multiplyVec3(this._xAxis).xyz;
    }

    /** 局部坐标轴的上下旋转 */
    pitch(angle: number): void {
        // 两种摄像机都可以使用pitch旋转
        mat4Adapter.m0.setIdentity();
        angle = MathHelper.toRadian(angle);
        mat4Adapter.m0.rotate(angle, this._xAxis);
        // 对于绕x轴的旋转，你会发现x轴不变，变动的是其他两个轴
        // 因此我们需要获取旋转angle后，另外两个轴的方向，可以使用multiplyVec3方法实现
        // FIXME: mat4Adapter.m0.multiplyVec3(this._zAxis, this._zAxis);
        this._zAxis.xyz = mat4Adapter.m0.multiplyVec3(this._zAxis).xyz;
        this._yAxis.xyz = mat4Adapter.m0.multiplyVec3(this._yAxis).xyz;
        this._zAxis.xyz = mat4Adapter.m0.multiplyVec3(this._zAxis).xyz;
    }

    /** 局部坐标轴的滚转 */
    roll(angle: number): void {
        // 只支持自由摄像机
        if (this._type === ECameraType.FLYCAMERA) {
            angle = MathHelper.toRadian(angle);
            mat4Adapter.m0.setIdentity();
            mat4Adapter.m0.rotate(angle, this._zAxis);
            // 对于绕z轴的旋转，你会发现z轴不变，变动的是其他两个轴
            // 因此我们需要获取旋转angle后另外两个轴的方向，可以使用multiplyVec3方法实现
            // FIXME: mat4Adapter.m0.multiplyVec3(this._xAxis, this._xAxis);
            this._xAxis.xyz = mat4Adapter.m0.multiplyVec3(this._xAxis).xyz;
            this._yAxis.xyz = mat4Adapter.m0.multiplyVec3(this._yAxis).xyz;
        }
    }

    /** 当我们对摄像机进行移动或旋转操作时，或者改变投影的一些属性后，需要更新摄像机的视图矩阵和投影矩阵。
     * 本书为了简单起见，并不对这些操作进行优化，而是采取最简单直接的方式，每帧都自动计算相关矩阵
     * 摄像机的update需要每帧被调用，因此其最好的调用时机点是在Application及其子类的update虚方法中。
     */
    // FIXME：删除
    update(intervalSec: number): void {
        // 使用mat4的perspective静态方法计算投影矩阵
        // this._projectionMatrix = mat4.perspective(
        //     this._fovY,
        //     this._aspectRatio,
        //     this._near,
        //     this._far,
        // );
        this._projectionMatrix = mat4Adapter.perspective(
            this._fovY,
            this._aspectRatio,
            this._near,
            this._far,
        );

        this._calcViewMatrix(); // 计算视图矩阵
        // 使用 _projectionMatrix ＊ _viewMatrix顺序合成_viewProjMatrix，注意矩阵相乘的顺序
        mat4.product(this._projectionMatrix, this._viewMatrix, this._viewProjMatrix);
        // 然后再计算出_viewProjMatrix的逆矩阵
        // this._viewProjMatrix.copy( this._invViewProjMatrix );
        // this._viewProjMatrix.inverse( this._invViewProjMatrix );
        this._invViewProjMatrix.init(
            new mat4().setIdentity().init(this._viewProjMatrix.all()).inverse().all(),
        );
    }

    /** 从当前轴及postion合成view矩阵 */
    private _calcViewMatrix(): void {
        //固定forward方向
        this._zAxis.normalize();
        //forward 叉乘 right = up
        vec3.cross(this._zAxis, this._xAxis, this._yAxis);
        this._yAxis.normalize();
        //up 叉乘 forward = right
        vec3.cross(this._yAxis, this._zAxis, this._xAxis);
        this._xAxis.normalize(); // 将世界坐标系表示的摄像机位置投影到摄像机的3个轴上
        const x: number = -vec3.dot(this._xAxis, this._position);
        const y: number = -vec3.dot(this._yAxis, this._position);
        const z: number = -vec3.dot(this._zAxis, this._position);
        // 合成视图矩阵（摄像机矩阵）
        // this._viewMatrix.values[0] = this._xAxis.x;
        // this._viewMatrix.values[1] = this._yAxis.x;
        // this._viewMatrix.values[2] = this._zAxis.x;
        // this._viewMatrix.values[3] = 0.0;
        // this._viewMatrix.values[4] = this._xAxis.y;
        // this._viewMatrix.values[5] = this._yAxis.y;
        // this._viewMatrix.values[6] = this._zAxis.y;
        // this._viewMatrix.values[7] = 0.0;
        // this._viewMatrix.values[8] = this._xAxis.z;
        // this._viewMatrix.values[9] = this._yAxis.z;
        // this._viewMatrix.values[10] = this._zAxis.z;
        // this._viewMatrix.values[11] = 0.0;
        // this._viewMatrix.values[12] = x;
        // this._viewMatrix.values[13] = y;
        // this._viewMatrix.values[14] = z;
        // this._viewMatrix.values[15] = 1.0;
        this._viewMatrix.init([
            ...[this._xAxis.x, this._yAxis.x, this._zAxis.x, 0.0],
            ...[this._xAxis.y, this._yAxis.y, this._zAxis.y, 0.0],
            ...[this._xAxis.z, this._yAxis.z, this._zAxis.z, 0.0],
            ...[x, y, z, 1.0],
        ]);

        //求view的逆矩阵，也就是世界矩阵
        // this._viewMatrix.inverse( this._invViewMatrix );
        this._invViewMatrix.init(new mat4().init(this._viewMatrix.all()).inverse().all());

        this._frustum.buildFromCamera(this);
    }

    /**
     * 从当前postition和target获得view矩阵,并且从 `view` 矩阵抽取forward、up、right方向矢量
     * @param target 要观察的目标，世界坐标系中的任意一个点来构建视图矩阵
     * @param up
     */
    lookAt(target: vec3, up: vec3 = vec3.up): void {
        this._viewMatrix = mat4.lookAt(this._position, target, up);
        // 从抽摄像机矩阵中抽取世界坐标系中表示的3个轴
        // 我们需要使用世界坐标系表示的轴进行有向运动
        // this._xAxis.x = this._viewMatrix.values[0];
        // this._yAxis.x = this._viewMatrix.values[1];
        // this._zAxis.x = this._viewMatrix.values[2];
        // this._xAxis.y = this._viewMatrix.values[4];
        // this._yAxis.y = this._viewMatrix.values[5];
        // this._zAxis.y = this._viewMatrix.values[6];
        // this._xAxis.z = this._viewMatrix.values[8];
        // this._yAxis.z = this._viewMatrix.values[9];
        // this._zAxis.z = this._viewMatrix.values[10];
        this._xAxis.x = this._viewMatrix.at(0);
        this._yAxis.x = this._viewMatrix.at(1);
        this._zAxis.x = this._viewMatrix.at(2);
        this._xAxis.y = this._viewMatrix.at(4);
        this._yAxis.y = this._viewMatrix.at(5);
        this._zAxis.y = this._viewMatrix.at(6);
        this._xAxis.z = this._viewMatrix.at(8);
        this._yAxis.z = this._viewMatrix.at(9);
        this._zAxis.z = this._viewMatrix.at(10);
    }

    setViewport(x: number, y: number, width: number, height: number): void {
        this.gl.viewport(x, y, width, height);
    }

    getViewport(): Int32Array {
        return this.gl.getParameter(this.gl.VIEWPORT);
    }
}
