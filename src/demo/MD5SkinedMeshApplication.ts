import { mat4, vec3 } from '@tlaukkan/tsm';
import { mat4Adapter } from '../common/math/tsmAdapter';
import { HttpRequest } from '../common/utils/HttpRequest';
import { CameraApplication } from '../lib/CameraApplication';
import { MD5SkinedMesh } from '../lib/MD5SkinedMesh';
import { GLAttribState } from '../webgl/WebGLAttribState';
import { EVertexLayout, GLMeshBuilder } from '../webgl/WebGLMesh';
import { GLProgram } from '../webgl/WebGLProgram';
import { GLProgramCache } from '../webgl/WebGLProgramCache';
import { GLTextureCache } from '../webgl/WebGLTextureCache';
// import { vec3, mat4 } from '../common/math/MathLib';

export class MD5SkinedMeshApplication extends CameraApplication {
    program: GLProgram;
    texBuilder: GLMeshBuilder;
    angle: number = 0;
    currFrame: number = 0;
    model: MD5SkinedMesh;

    constructor(canvas: HTMLCanvasElement) {
        super(canvas, { premultipliedAlpha: false }, true);
        this.program = GLProgramCache.instance.getMust('texture');
        this.texBuilder = new GLMeshBuilder(
            this.gl,
            GLAttribState.POSITION_BIT | GLAttribState.TEXCOORD_BIT,
            this.program,
            GLTextureCache.instance.getMust('default'),
            EVertexLayout.INTERLEAVED,
        );
        this.model = new MD5SkinedMesh();
        this.camera.z = 4;
    }

    async run(): Promise<void> {
        // 载入md5mesh
        let response: string = await HttpRequest.loadTextFileAsync(
            MD5SkinedMesh.path + 'test.md5mesh',
        ); // 解析md5mesh
        this.model.parse(response); // 获取纹理
        await this.model.loadTextures(this.gl); // 载入md5anim
        response = await HttpRequest.loadTextFileAsync(
            MD5SkinedMesh.path + 'testwalk.md5anim',
        ); // 解析md5anim并添加到md5anims数组中
        this.model.parseAnim(response);
        this.start(); // 进入不停更新和渲染流程
    }

    update(elapsedMsec: number, intervalSec: number): void {
        super.update(elapsedMsec, intervalSec); // 让frameNum增加，但是达到最后一帧后再从头开始播放，实现循环播放的方式
        this.currFrame++;
        this.currFrame %= this.model.anims[0].frames.length; // 连续播放
        // update中更新动画
        this.model.playAnim(0, this.currFrame); // 更新0号动画序列
        this.angle += 0.5;
    }

    render(): void {
        this.matStack.loadIdentity();
        // 因为我们在Doom3 MD5格式解析时，并没有将Doom3坐标系的顶点转换为WebGL坐标系，但是它们都是属于右手坐标系，
        //  所以可以通过旋转，将Doom3坐标系与WebGL坐标系重合，从而解决坐标问题，这里演示了这种方式
        this.matStack.rotate(-90, vec3.right); // 绘制绑定姿态
        this.matStack.rotate(this.angle, vec3.forward);
        mat4.product(
            this.camera.viewProjectionMatrix,
            this.matStack.modelViewMatrix,
            mat4Adapter.m0,
        );
        this.model.drawBindPose(this.texBuilder, mat4Adapter.m0); // 播放动画的当前一帧的姿态
        this.matStack.pushMatrix();
        this.matStack.translate(new vec3([1.0, 0, 0]));
        mat4.product(
            this.camera.viewProjectionMatrix,
            this.matStack.modelViewMatrix,
            mat4Adapter.m0,
        );
        this.model.drawAnimPose(this.texBuilder, mat4Adapter.m0);
        this.matStack.popMatrix();
    }
}
