import { mat4, vec3 } from '@tlaukkan/tsm';
import { CanvasKeyBoardEvent } from '../common/Application';
import { EAxisType, MathHelper } from '../common/math/MathHelper';
import { HttpRequest } from '../common/utils/HttpRequest';
import { CameraApplication } from '../lib/CameraApplication';
import { DrawHelper } from '../lib/DrawHelper';
import { Cube, GeometryData } from '../lib/Primitives';
import { GLStaticMesh } from '../webgl/WebGLMesh';
import { GLProgram } from '../webgl/WebGLProgram';
import { GLProgramCache } from '../webgl/WebGLProgramCache';
import { GLTexture } from '../webgl/WebGLTexture';
import { GLTextureCache } from '../webgl/WebGLTextureCache';

export class RotatingCubeApplication extends CameraApplication {
    // GPU可编程管线对象，后面章节详解
    colorProgram: GLProgram; // 使用纹理GPU Program对象
    textureProgram: GLProgram; // 使用颜色GPU Program对象

    // 纹理对象
    currTexIdx: number; // 由于cube会进行周而复始的换纹理操作，因此需要记录当前纹理的索引号
    textures: GLTexture[]; // 需要一个数组保存多个纹理

    // 立方体渲染数据，后续章节详解
    cube: Cube; // 几何体的数据表达式
    cubeVAO: GLStaticMesh; // 几何体的渲染数据源

    // 立方体的角运动相关变量
    cubeAngle: number; // cube的角位移
    cubeSpeed: number; // cube的角速度
    cubeMatrix: mat4; // 合成的cube的世界矩阵

    // 三角形
    triAngle: number; // 三角形的角位移
    triSpeed: number; // 三角形的角速度
    triTimerId: number; // 由于三角形使用键盘控制的更新方式，需要添加和删除操作，需要定时器id
    triMatrix: mat4; // 合成的三角形的世界矩阵

    private _hitAxis: EAxisType; // 为了支持鼠标点选，记录选中的坐标轴的enum值

    constructor(canvas: HTMLCanvasElement) {
        super(canvas, { premultipliedAlpha: false }, true); // 调用基类构造函数

        // 初始化角位移和角速度
        this.cubeAngle = 0;
        this.triAngle = 0;
        this.cubeSpeed = 100;
        this.triSpeed = 1;
        this.triTimerId = -1;

        this.currTexIdx = 0;
        this.textures = [];
        this.textures.push(GLTextureCache.instance.getMust('default'));

        // 创建封装后的GLProgram类
        this.textureProgram = GLProgramCache.instance.getMust('texture');
        this.colorProgram = GLProgramCache.instance.getMust('color');

        this.cube = new Cube(0.5, 0.5, 0.5);
        const data: GeometryData = this.cube.makeGeometryData();
        this.cubeVAO = data.makeStaticVAO(this.gl);

        this._hitAxis = EAxisType.NONE; // 初始化时没选中任何一条坐标轴

        // 初始化时，世界矩阵都为归一化矩阵
        this.cubeMatrix = new mat4().setIdentity();
        this.triMatrix = new mat4().setIdentity();

        // 调整摄像机的位置
        this.camera.z = 8;
    }

    private _renderCube(): void {
        // 绑定要绘制的texutre和program
        this.textures[this.currTexIdx].bind();
        this.textureProgram.bind();
        this.textureProgram.loadSampler();

        // 绘制立方体
        this.matStack.loadIdentity();

        // 第一个渲染堆栈操作
        {
            this.matStack.pushMatrix(); // 矩阵进栈
            this.matStack.rotate(this.cubeAngle, vec3.up, false); // 以角度(非弧度)为单位，每帧旋转
            // 合成modelViewProjection矩阵
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                this.cubeMatrix,
            );
            // 将合成的矩阵给GLProgram对象
            this.textureProgram.setMatrix4(GLProgram.MVPMatrix, this.cubeMatrix);
            this.cubeVAO.draw(); // 使用当前绑定的texture和program绘制cubeVao对象
            // 使用辅助方法绘制坐标系
            DrawHelper.drawCoordSystem(this.builder, this.cubeMatrix, this._hitAxis, 1);
            this.matStack.popMatrix(); // 矩阵出栈
        }

        // 解除绑定的texture和program
        this.textureProgram.unbind();
        this.textures[this.currTexIdx].unbind();
    }

    private _renderTriangle(): void {
        // 禁止渲染三角形时启用背面剔除功能
        this.gl.disable(this.gl.CULL_FACE);
        // 由于三角形使用颜色+位置信息进行绘制，因此要绑定当前的GPU Program为colorProgram
        this.colorProgram.bind();
        {
            this.matStack.pushMatrix(); // 新产生一个矩阵
            // 立方体绘制在Canvas的中心
            // 而三角形则绘制在向左（负号）平移2个单位处的位置
            this.matStack.translate(new vec3([-2, 0, 0]));

            // 使用弧度，绕Z轴进行Roll旋转
            this.matStack.rotate(this.triAngle, vec3.forward, true);

            // 使用类似OpenGL1.1的立即绘制模式
            this.builder.begin(); // 开始绘制，defatul使用gl.TRIANGLES方式绘制
            this.builder.color(1, 0, 0).vertex(-0.5, 0, 0); // 三角形第一个点的颜色与坐标
            this.builder.color(0, 1, 0).vertex(0.5, 0, 0); // 三角形第二个点的颜色与坐标
            this.builder.color(0, 0, 1).vertex(0, 0.5, 0); // 三角形第三个点的颜色与坐标
            // 合成model-view-projection matrix
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                this.triMatrix,
            );
            // 将mvpMatrix传递给GLMeshBuilder的end方法，该方法会正确的显示图形
            this.builder.end(this.triMatrix);

            this.matStack.popMatrix(); // 删除一个矩阵
        }
        this.colorProgram.unbind();
        // 恢复背面剔除功能
        this.gl.enable(this.gl.CULL_FACE);
    }

    // 关于Canvas2D的详细应用，可以参考本书的姐妹篇：TypeScript图形渲染实战：2D架构设计与实现
    private _renderText(
        text: string,
        x: number = this.canvas.width * 0.5,
        y: number = 150,
    ): void {
        if (this.ctx2D !== null) {
            this.ctx2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx2D.save(); // 渲染状态进栈
            this.ctx2D.fillStyle = 'red'; // 红色
            this.ctx2D.textAlign = 'center'; // X轴居中对齐
            this.ctx2D.textBaseline = 'top'; // Y轴为top对齐
            this.ctx2D.font = '30px Arial'; // 使用大一点的Arial字体对象
            this.ctx2D.fillText(text, x, y); // 进行文字绘制
            this.ctx2D.restore(); // 恢复原来的渲染状态
        }
    }

    drawText(pos: vec3, axis: EAxisType, mvp: mat4, inverse: boolean = false): void {
        if (this.ctx2D === null) {
            return;
        }

        const out: vec3 = new vec3();
        // 调用 MathHelper.obj2ScreenSpace这个核心函数，将局部坐标系标示的一个点变换到屏幕坐标系上
        if (MathHelper.obj2GLViewportSpace(pos, mvp, this.camera.getViewport(), out)) {
            out.y = this.canvas.height - out.y; // 变换到屏幕坐标系，左手系，原点在左上角，x向右，y向下
            this.ctx2D.save(); // 渲染状态进栈
            this.ctx2D.font = '30px Arial'; // 使用大一点的Arial字体对象
            if (axis === EAxisType.XAXIS) {
                this.ctx2D.textBaseline = 'top'; // Y轴为top对齐
                this.ctx2D.fillStyle = 'red'; // 红色
                if (inverse === true) {
                    this.ctx2D.textAlign = 'right';
                    this.ctx2D.fillText('-X', out.x, out.y); // 进行文字绘制
                } else {
                    this.ctx2D.textAlign = 'left'; // X轴居中对齐
                    this.ctx2D.fillText('X', out.x, out.y); // 进行文字绘制
                }
            } else if (axis === EAxisType.YAXIS) {
                this.ctx2D.textAlign = 'center'; // X轴居中对齐
                this.ctx2D.fillStyle = 'green'; // 绿色
                if (inverse === true) {
                    this.ctx2D.textBaseline = 'top'; // -Y轴为top对齐
                    this.ctx2D.fillText('-Y', out.x, out.y); // 行文字绘制
                } else {
                    this.ctx2D.textBaseline = 'bottom'; // Y轴为bottom对齐
                    this.ctx2D.fillText('Y', out.x, out.y); // 进行文字绘制
                }
            } else {
                this.ctx2D.fillStyle = 'blue'; // 绿色

                this.ctx2D.textBaseline = 'top'; // Y轴为top对齐
                if (inverse === true) {
                    this.ctx2D.textAlign = 'right'; // X轴居中对齐
                    this.ctx2D.fillText('-Z', out.x, out.y); // 进行文字绘制
                } else {
                    this.ctx2D.textAlign = 'left'; // X轴居中对齐
                    this.ctx2D.fillText('Z', out.x, out.y); // 进行文字绘制
                }
            }

            this.ctx2D.restore(); // 恢复原来的渲染状态
        }
    }

    render(): void {
        this._renderCube();
        this._renderTriangle();
        this._renderText('第一个WebGL Demo');
    }

    update(elapsedMsec: number, intervalSec: number): void {
        // s = vt，根据两帧间隔更新角速度和角位移
        this.cubeAngle += this.cubeSpeed * intervalSec;

        // 我们在 CameraApplication 中也覆写（override）的update方法
        // CameraApplication的update方法用来计算摄像机的投影矩阵以及视图矩阵
        // 所以我们必须要调用基类方法，用于控制摄像机更新
        // 否则你将什么都看不到，切记!
        super.update(elapsedMsec, intervalSec);
    }

    // 资源同步方法
    async run(): Promise<void> {
        let img: HTMLImageElement = await HttpRequest.loadImageAsync('data/pic0.png');
        let tex: GLTexture = new GLTexture(this.gl);
        tex.upload(img, 0, true);
        tex.filter();
        this.textures.push(tex);
        console.log('1、第一个纹理载入成功!');

        img = await HttpRequest.loadImageAsync('data/pic1.jpg');
        tex = new GLTexture(this.gl);
        tex.upload(img, 0, true);
        tex.filter();
        this.textures.push(tex);
        console.log('2、第二个纹理载入成功!');

        // 在资源同步加载完成后，直接启动换肤的定时器，每隔2秒，将立方体的皮肤进行周而复始的替换
        this.addTimer(this.cubeTimeCallback.bind(this), 2, false);

        console.log('3、启动Application程序');
        super.run(); // 调用基类的run方法，基类run方法内部调用了start方法
    }

    cubeTimeCallback(): void {
        this.currTexIdx++; // 定时让计数器+1
        // 取模操作，让currTexIdx的取值范围为[ 0, 2 ]之间（当前有3个纹理）
        this.currTexIdx %= this.textures.length;
    }

    triTimeCallback(): void {
        this.triAngle += this.triSpeed;
    }

    onKeyDown(evt: CanvasKeyBoardEvent): void {
        if (evt.key === 'q') {
            if (this.triTimerId === -1) {
                this.triTimerId = this.addTimer(
                    this.triTimeCallback.bind(this),
                    0.25,
                    false,
                );
            }
        } else if (evt.key === 'e') {
            if (this.triTimerId !== -1) {
                if (this.removeTimer(this.triTimerId)) {
                    this.triTimerId = -1;
                }
            }
        }
    }
}
