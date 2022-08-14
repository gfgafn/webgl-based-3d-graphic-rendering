import { mat4, vec3, vec4 } from '@tlaukkan/tsm';
import { mat4Adapter } from '../common/math/tsmAdapter';
import { CameraApplication } from '../lib/CameraApplication';
import { Doom3ProcScene } from '../lib/Doom3ProcScene';
import { DrawHelper } from '../lib/DrawHelper';
import { GLProgram } from '../webgl/WebGLProgram';
import { GLProgramCache } from '../webgl/WebGLProgramCache';

export class Doom3Application extends CameraApplication {
    program: GLProgram; // 使用纹理着色器
    scene: Doom3ProcScene;
    colorProgram: GLProgram;
    angle: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        super(canvas, { premultipliedAlpha: false }, true); // 调用基类构造函数
        this.program = GLProgramCache.instance.getMust('texture'); // 获得纹理着色器引用
        this.colorProgram = GLProgramCache.instance.getMust('color');
        this.scene = new Doom3ProcScene(this.gl); // 创建Doom3ProcScene对象
    }

    // 覆写（override）基类的异步run方法，加载本Demo所需的场景文件和渲染资源
    async run(): Promise<void> {
        // await同步等待资源解析和加载完毕
        await this.scene.parseDoom3Map('./data/doom3/level.proc');
        // await成功后才会运行下面的代码
        this.camera.y = this.scene.mins.y + 5; // 设置摄像机的高度
        super.run(); // 调用基类方法，从而进入不停地更新和渲染流程
    }

    render(): void {
        // 绘制操作委托给Doom3ProcScene类进行
        // this.scene.draw(this.camera, this.program);
        this.gl.disable(this.gl.CULL_FACE);
        this.scene.draw(this.camera, this.program, this.builder);
        this.scene.drawBoundBox(this.builder, this.camera, this.colorProgram);

        this.matStack.loadIdentity();
        this.matStack.translate(new vec3([0, 6, 0]));
        this.matStack.rotate(this.angle, vec3.up);

        mat4.product(
            this.camera.viewProjectionMatrix,
            this.matStack.modelViewMatrix,
            mat4Adapter.m0,
        );

        this.colorProgram.bind();
        DrawHelper.drawWireFrameCubeBox(
            this.builder,
            mat4Adapter.m0,
            0.2,
            new vec4([0, 0, 1, 1]),
        );
        this.colorProgram.unbind();
        this.angle += 1;
        this.gl.enable(this.gl.CULL_FACE);
    }
}
