import { mat4, vec3, vec4 } from '@tlaukkan/tsm';
import { CanvasKeyBoardEvent } from '../common/Application';
import { CoordSystem, DrawHelper } from '../lib/DrawHelper';
import { EAxisType, MathHelper } from '../common/math/MathHelper';
import { CameraApplication } from '../lib/CameraApplication';
import { GLCoordSystem } from '../webgl/WebGLCoordSystem';
import { vec4Adapter } from '../common/math/tsmAdapter';

export class CoordSystemApplication extends CameraApplication {
    // 存储当前使用的坐标系、视口以及旋转轴、旋转角度等信息的数组
    // 可以使用makeOneGLCoorSystem和makeFourGLCoordSystems方法来切换
    coordSystems: CoordSystem[] = [];
    mvp: mat4 = new mat4(); // 当前要绘制的坐标系的model-view-project矩阵
    cubeMVP: mat4 = new mat4(); // 当前要绘制的绕坐标系某个轴的立方体的model-view-project矩阵

    // 下面两个成员变量排列组合后，形成6种不同的绘制方式
    currentDrawMethod: (s: GLCoordSystem) => void; // 用于切换三种不同的绘制方法
    isOneViewport: boolean = false; // 用来切换是否单视口还是多视口（4个视口）绘制

    speed: number = 1; // 旋转速度
    isD3dMode: boolean = false; // 用来标记是D3D坐标系

    constructor(canvas: HTMLCanvasElement) {
        super(canvas, { preserveDrawingBuffer: false }, true); // 调用基类构造函数
        this.makeFourGLCoordSystems();
        this.currentDrawMethod = this.drawCoordSystem;
    }

    makeOneGLCoorSystem(): void {
        this.coordSystems = []; // 清空坐标系数组内容，用于按需重新生成
        // 如果只有一个坐标系的话，其视口和裁剪区与canvas元素尺寸一致
        this.coordSystems.push(
            new CoordSystem(
                [0, 0, this.canvas.width, this.canvas.height],
                vec3.zero,
                new vec3([1, 1, 0]).normalize(),
                45,
                true,
            ),
        ); // 右下
        this.isD3dMode = false;
    }

    makeFourGLCoordSystems(): void {
        this.coordSystems = []; // 清空坐标系数组内容，用于按需重新生成
        const hw: number = this.canvas.width * 0.5;
        const hh: number = this.canvas.height * 0.5;
        const dir: vec3 = new vec3([1, 1, 1]).normalize();
        // 对于四视口渲染来说，将整个窗口平分成2*2四个视口表示
        this.coordSystems.push(new CoordSystem([0, hh, hw, hh], vec3.zero, vec3.up, 0)); // 左上，旋转轴为y轴
        this.coordSystems.push(
            new CoordSystem([hw, hh, hw, hh], vec3.zero, vec3.right, 0),
        ); // 右上，旋转轴为x轴
        this.coordSystems.push(
            new CoordSystem([0, 0, hw, hh], vec3.zero, vec3.forward, 0),
        ); // 左下，旋转轴为z轴
        this.coordSystems.push(new CoordSystem([hw, 0, hw, hh], vec3.zero, dir, 0, true)); // 右下，旋转轴为[ 1 , 1 , 1 ]
        this.isD3dMode = false;
    }

    update(elapsedMsec: number, intervalSec: number): void {
        // s = vt，根据两帧间隔更新角速度和角位移
        for (let i: number = 0; i < this.coordSystems.length; i++) {
            const s: CoordSystem = this.coordSystems[i];
            s.angle += this.speed;
        }
        // 我们在CameraApplication中也覆写（override）的update方法
        // CameraApplication的update方法用来计算摄像机的投影矩阵以及视图矩阵
        // 所以我们必须要调用基类方法，用于控制摄像机更新
        // 否则你将什么都看不到，切记！
        super.update(elapsedMsec, intervalSec);
    }

    render(): void {
        // 使用了 preserveDrawingBuffer: false 创建WebGLRenderingContext，因此可以不用每帧调用clear方法清屏
        // this.gl.clear( this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT );

        // 由于要使用Canvs2D绘制文字，所以必须要有ctx2D对象
        if (this.ctx2D === null) {
            return;
        }
        // 对Canvas2D上下文渲染对象进行清屏操作
        this.ctx2D.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 遍历整个坐标系视口数组
        for (let i: number = 0; i < this.coordSystems.length; i++) {
            const s: CoordSystem = this.coordSystems[i];
            // 使用当前的坐标系及视口数据作为参数，调用currentDrawMethod回调函数
            this.currentDrawMethod(s);
        }
    }

    onKeyPress(evt: CanvasKeyBoardEvent): void {
        super.onKeyPress(evt); // 调用基类方法，这样摄像机键盘事件全部有效了
        if (evt.key === '1') {
            // 将currentDrawMethod函数指针指向drawCoordSystem
            this.currentDrawMethod = this.drawCoordSystem;
        } else if (evt.key === '2') {
            // 将currentDrawMethod函数指针指向drawFullCoordSystem
            this.currentDrawMethod = this.drawFullCoordSystem;
        } else if (evt.key === '3') {
            // 将currentDrawMethod函数指针指向drawFullCoordSystemWithRotatedCube
            this.currentDrawMethod = this.drawFullCoordSystemWithRotatedCube;
        } else if (evt.key === 'c') {
            this.isOneViewport = !this.isOneViewport;
            if (this.isOneViewport === true) {
                this.makeOneGLCoorSystem(); // 切换到单视口渲染
            } else {
                this.makeFourGLCoordSystems(); // 切换到多视口渲染
            }
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

    // 绘制带文字指示的三轴坐标系
    drawCoordSystem(s: CoordSystem): void {
        // 设置当前的视口
        this.camera.setViewport(
            s.viewport[0],
            s.viewport[1],
            s.viewport[2],
            s.viewport[3],
        );

        // 1、绘制三轴坐标系
        this.matStack.pushMatrix();
        {
            this.matStack.translate(s.pos); // 将坐标系平移到s.pos位置
            this.matStack.rotate(s.angle, s.axis, false); // 绕着s.axis轴旋转s.angle度
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                this.mvp,
            ); // 合成model-view-project矩阵
            // 调用DrawHelper.drawCoordSystem的方法绘制X / Y / Z坐标系
            DrawHelper.drawCoordSystem(
                this.builder,
                this.mvp,
                EAxisType.NONE,
                1,
                s.isDrawAxis ? s.axis : null,
                s.isD3D,
            );
        }
        this.matStack.popMatrix();

        // 绘制坐标系的标示文字，调用drawText方法
        this.drawText(vec3.right, EAxisType.XAXIS, this.mvp, false); // X
        this.drawText(vec3.up, EAxisType.YAXIS, this.mvp, false); // Y
        if (this.isD3dMode === false) {
            this.drawText(vec3.forward, EAxisType.ZAXIS, this.mvp, false); // Z
        }
    }

    // 绘制带文字指示的六轴坐标系
    drawFullCoordSystem(s: CoordSystem): void {
        // 设置当前的视口
        this.camera.setViewport(
            s.viewport[0],
            s.viewport[1],
            s.viewport[2],
            s.viewport[3],
        );
        // 1、绘制六轴坐标系
        this.matStack.pushMatrix(); // 矩阵进栈
        {
            this.matStack.translate(s.pos); // 将坐标系平移到s.pos位置
            this.matStack.rotate(s.angle, s.axis, false); // 坐标系绕着s.axis轴旋转s.angle度
            // 合成model-view-project矩阵
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                this.mvp,
            );
            // 使用mvp矩阵绘制六轴坐标系，调用的是DrawHelper.drawFullCoordSystem的静态辅助方法
            DrawHelper.drawFullCoordSystem(
                this.builder,
                this.mvp,
                1,
                s.isDrawAxis ? s.axis : null,
            );
            this.matStack.popMatrix(); // 矩阵出栈
        }

        // 绘制坐标系的标示文字,调用的是本类的drawText方法
        this.drawText(vec3.right, EAxisType.XAXIS, this.mvp, false); // X
        this.drawText(new vec3([-1, 0, 0]), EAxisType.XAXIS, this.mvp, true); // -X

        this.drawText(vec3.up, EAxisType.YAXIS, this.mvp, false); // Y
        this.drawText(new vec3([0, -1, 0]), EAxisType.YAXIS, this.mvp, true); // -Y

        if (this.isD3dMode === false) {
            this.drawText(vec3.forward, EAxisType.ZAXIS, this.mvp, false); // Z
            this.drawText(new vec3([0, 0, -1]), EAxisType.ZAXIS, this.mvp, true); // -Z
        }
    }

    drawFullCoordSystemWithRotatedCube(s: CoordSystem): void {
        // 设置当前的视口
        this.camera.setViewport(
            s.viewport[0],
            s.viewport[1],
            s.viewport[2],
            s.viewport[3],
        );
        this.matStack.pushMatrix();
        {
            // 第一步：绘制旋转的坐标系
            this.matStack.translate(s.pos); // 平移到当前坐标系的原点
            this.matStack.rotate(s.angle, s.axis, false); // 绕着当前坐标系的轴旋转angle度
            // 合成坐标系的model-view-project矩阵
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                this.mvp,
            );
            // 绘制坐标系
            DrawHelper.drawFullCoordSystem(
                this.builder,
                this.mvp,
                1,
                s.isDrawAxis ? s.axis : null,
            );

            // 第二步：绘制绕x轴旋转的线框立方体
            this.matStack.pushMatrix();
            {
                this.matStack.rotate(s.angle, vec3.right, false);
                this.matStack.translate(new vec3([0.8, 0.4, 0]));
                this.matStack.rotate(s.angle * 2, vec3.right, false);
                mat4.product(
                    this.camera.viewProjectionMatrix,
                    this.matStack.modelViewMatrix,
                    this.cubeMVP,
                );
                DrawHelper.drawWireFrameCubeBox(this.builder, this.cubeMVP, 0.1);
                this.matStack.popMatrix();
            }

            // 第三步：绘制绕y轴旋转的线框立方体
            this.matStack.pushMatrix();
            {
                this.matStack.rotate(s.angle, vec3.up, false);
                this.matStack.translate(new vec3([0.2, 0.8, 0]));
                this.matStack.rotate(s.angle * 2, vec3.up, false);
                mat4.product(
                    this.camera.viewProjectionMatrix,
                    this.matStack.modelViewMatrix,
                    this.cubeMVP,
                );
                DrawHelper.drawWireFrameCubeBox(
                    this.builder,
                    this.cubeMVP,
                    0.1,
                    vec4Adapter.green,
                );
                this.matStack.popMatrix();
            }

            // 第四步：绘制绕z轴旋转的线框立方体
            this.matStack.pushMatrix();
            {
                this.matStack.translate(new vec3([0.0, 0.0, 0.8]));
                this.matStack.rotate(s.angle * 2, vec3.forward, false);
                mat4.product(
                    this.camera.viewProjectionMatrix,
                    this.matStack.modelViewMatrix,
                    this.cubeMVP,
                );
                DrawHelper.drawWireFrameCubeBox(
                    this.builder,
                    this.cubeMVP,
                    0.1,
                    vec4Adapter.blue,
                );
                this.matStack.popMatrix();
            }

            // 第五步：绘制绕坐标系旋转轴（s.axis）旋转的线框立方体
            this.matStack.pushMatrix();
            {
                const len: vec3 = new vec3();
                this.matStack.translate(s.axis.scale(0.8, len));
                this.matStack.translate(new vec3([0, 0.3, 0]));
                this.matStack.rotate(s.angle, s.axis, false);
                mat4.product(
                    this.camera.viewProjectionMatrix,
                    this.matStack.modelViewMatrix,
                    this.cubeMVP,
                );
                DrawHelper.drawWireFrameCubeBox(
                    this.builder,
                    this.cubeMVP,
                    0.1,
                    new vec4(),
                );
                this.matStack.popMatrix();
            }
            this.matStack.popMatrix();
        }

        // 第六步：绘制坐标系的标示文字
        this.drawText(vec3.right, EAxisType.XAXIS, this.mvp, false); // X
        this.drawText(new vec3([-1, 0, 0]), EAxisType.XAXIS, this.mvp, true); // -X

        this.drawText(vec3.up, EAxisType.YAXIS, this.mvp, false); // Y
        this.drawText(new vec3([0, -1, 0]), EAxisType.YAXIS, this.mvp, true); // -Y

        if (this.isD3dMode === false) {
            this.drawText(vec3.forward, EAxisType.ZAXIS, this.mvp, false); // Z
            this.drawText(new vec3([0, 0, -1]), EAxisType.ZAXIS, this.mvp, true); // -Z
        }
    }
}
