import { mat4, vec3 } from '@tlaukkan/tsm';
import { CanvasKeyBoardEvent } from '../common/Application';
import { EAxisType } from '../common/math/MathHelper';
import { mat4Adapter } from '../common/math/tsmAdapter';
import { CameraApplication } from '../lib/CameraApplication';
import { DrawHelper } from '../lib/DrawHelper';
import { GLAttribState } from '../webgl/WebGLAttribState';
import { GLCoordSystem } from '../webgl/WebGLCoordSystem';
import { EVertexLayout, GLMeshBuilder } from '../webgl/WebGLMesh';
import { GLProgram } from '../webgl/WebGLProgram';
import { GLProgramCache } from '../webgl/WebGLProgramCache';
import { GLTexture } from '../webgl/WebGLTexture';
import { GLTextureCache } from '../webgl/WebGLTextureCache';

export class MeshBuilderApplication extends CameraApplication {
    /** 颜色着色器 */
    colorShader: GLProgram;
    /** 纹理着色器 */
    textureShader: GLProgram;
    /** 纹理着色器所使用的纹理对象 */
    texture: GLTexture;

    /** 使用`EVertexLayout.INTERLEAVED`存储顶点数据的基于颜色着色器的`GLMeshBuilder`对象 */
    builder0: GLMeshBuilder;
    /** 使用`EVertexLayout.SEQUENCED`存储顶点数据的基于颜色着色器的`GLMeshBuilder`对象 */
    builder1: GLMeshBuilder;
    /** 使用EVertexLayout.SEPARATED存储顶点数据的基于颜色着色器的`GLMeshBuilder`对象 */
    builder2: GLMeshBuilder;

    /** 使用`EVertexLayout.INTERLEAVED`存储顶点数据的基于纹理着色器的`GLMeshBuilder`对象 */
    tbuilder0: GLMeshBuilder;
    /** 使用`EVertexLayout.SEQUENCED`存储顶点数据的基于纹理着色器的`GLMeshBuilder`对象 */
    tbuilder1: GLMeshBuilder;
    /** 使用`EVertexLayout.SEPARATED`存储顶点数据的基于纹理着色器的`GLMeshBuilder`对象 */
    tbuilder2: GLMeshBuilder;

    /** 用来更新旋转角度 */
    angle: number = 0;
    /** 用于多视口渲染使用的`GLCoordSystem`对象 */
    coords: GLCoordSystem[];

    /** 用于切换页面1和页面2的绘制函数，类型是一个函数 */
    currentDrawMethod: () => void;

    private cubeTexCoords: number[] = [
        ...[0, 0.5, 0.5, 0.5, 0.5, 1, 0, 1], // 0区映射到立方体的前面
        ...[0.5, 0.5, 1, 0.5, 1, 1, 0.5, 1], // 1区映射到立方体的右面
        ...[0, 0, 0.5, 0, 0.5, 0.5, 0, 0.5], // 2区映射到立方体的后面
        ...[0.5, 0, 1, 0, 1, 0.5, 0.5, 0.5], // 3区映射到立方体的左面
        ...[0.25, 0.25, 0.75, 0.25, 0.75, 0.75, 0.25, 0.75], // 4区映射到立方体的上面
        ...[0, 0, 1, 0, 1, 1, 0, 1], // 整个贴图映射到立方体的下面
    ];

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        // 使用default纹理和着色器
        this.texture = GLTextureCache.instance.getMust('default');
        this.colorShader = GLProgramCache.instance.getMust('color');
        this.textureShader = GLProgramCache.instance.getMust('texture');
        // 创建不同EVertexLayout的颜色着色器
        this.builder0 = new GLMeshBuilder(
            this.gl,
            GLAttribState.POSITION_BIT | GLAttribState.COLOR_BIT,
            this.colorShader,
            null,
            EVertexLayout.INTERLEAVED,
        );
        this.builder1 = new GLMeshBuilder(
            this.gl,
            GLAttribState.POSITION_BIT | GLAttribState.COLOR_BIT,
            this.colorShader,
            null,
            EVertexLayout.SEQUENCED,
        );
        this.builder2 = new GLMeshBuilder(
            this.gl,
            GLAttribState.POSITION_BIT | GLAttribState.COLOR_BIT,
            this.colorShader,
            null,
            EVertexLayout.SEPARATED,
        );
        // 创建不同EVertexLayout的纹理着色器
        this.tbuilder0 = new GLMeshBuilder(
            this.gl,
            GLAttribState.POSITION_BIT | GLAttribState.TEXCOORD_BIT,
            this.textureShader,
            this.texture.texture,
            EVertexLayout.INTERLEAVED,
        );
        this.tbuilder1 = new GLMeshBuilder(
            this.gl,
            GLAttribState.POSITION_BIT | GLAttribState.TEXCOORD_BIT,
            this.textureShader,
            this.texture.texture,
            EVertexLayout.SEQUENCED,
        );
        this.tbuilder2 = new GLMeshBuilder(
            this.gl,
            GLAttribState.POSITION_BIT | GLAttribState.TEXCOORD_BIT,
            this.textureShader,
            this.texture.texture,
            EVertexLayout.SEPARATED,
        );
        // 可以随便该行列数量，用于多视口渲染使用
        this.coords = GLCoordSystem.makeViewportCoordSystems(
            this.canvas.width,
            this.canvas.height,
            2,
            3,
        );
        this.camera.z = 4; // 调整摄像机位置
        // 初始化时指向页面1的绘图函数
        this.currentDrawMethod = this.drawByMatrixWithColorShader;
        // BUG
        // this.currentDrawMethod = this.drawByMultiViewportsWithTextureShader;
    }

    /** 将`GLCoorSystem`中的`viewport`数据设置到`WebGL`上下文对象中 */
    private setViewport(coord: GLCoordSystem): void {
        // camera的setViewport方法内部会调用:
        // 1、gl.viewport (x, y, width, height)方法
        // 2、gl.scissor (x, y, width, height)方法
        // 而在WebGLApplication的构造函数调用的GLHelper.setDefaultState方法已经开启了SCISSOR_TEST
        // 因此可以进行视口大小的裁剪操作了，超出视口部分的内容都被裁剪掉了!!
        this.camera.setViewport(
            coord.viewport[0],
            coord.viewport[1],
            coord.viewport[2],
            coord.viewport[3],
        );
    }

    /** @override */
    update(elapsedMsec: number, intervalSec: number): void {
        // 每帧旋转1度
        this.angle += 1;
        // 调用基类方法，这样就能让摄像机进行更新
        super.update(elapsedMsec, intervalSec);
    }

    /** @override */
    render(): void {
        // 调用的的currentDrawMethod这个回调函数，该函数指向当前要渲染的页面方法
        this.currentDrawMethod();
    }

    drawByMatrixWithColorShader(): void {
        // 很重要，由于我们后续使用多视口渲染，因此必须要调用camera的setviewport方法
        this.camera.setViewport(0, 0, this.canvas.width, this.canvas.height);
        // 使用cleartColor方法设置当前颜色缓冲区背景色是什么颜色
        this.gl.clearColor(0.8, 0.8, 0.8, 1);
        // 调用clear清屏操作
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        // 关闭三角形背面剔除功能，这是因为在初始化是，我们是开启了该功能
        // 但是由于我们下面会渲染三角形和四边形这两个2d形体，所以要关闭，否则不会显示三角形或四边形的背面部分
        this.gl.disable(this.gl.CULL_FACE);

        // EVertexLayout.INTERLEAVED 顶点存储格式绘制绕z轴旋转的三角形
        this.matStack.pushMatrix();
        {
            this.matStack.translate(new vec3([-1.5, 0, 0])); // 将坐标系左移1.5个单位（右移为正，左移为负)
            this.matStack.rotate(this.angle, vec3.forward); // 绕着Z轴每帧旋转this.angle数量，单位为度而不是弧度
            // 合成model-view-projection矩阵，存储到mat4的静态变量中，减少内存的重新分配
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            this.builder0.begin(this.gl.TRIANGLES); // 在使用GLMeshBuilder时，必须要调用beging方法
            this.builder0.color(1, 0, 0).vertex(-0.5, 0, 0); // 顶点0为红色  左
            this.builder0.color(0, 1, 0).vertex(0.5, 0, 0); // 顶点1为绿色  右
            this.builder0.color(0, 0, 1).vertex(0, 0.5, 0); // 顶点2为蓝色  上
            this.builder0.end(mat4Adapter.m0); // 在使用GLMeshBuilder时，必须要调用end方法进行真正的绘制提交命令
            this.matStack.popMatrix(); // 矩阵出堆栈
            DrawHelper.drawCoordSystem(
                this.builder0,
                mat4Adapter.m0,
                EAxisType.NONE,
                0.8,
            );
        }

        // EVertexLayout.SEQUENCED 顶点存储格式绘制绘制绕y轴旋转的四边形
        this.matStack.pushMatrix(); // 矩阵堆栈进栈
        {
            this.matStack.rotate(this.angle, vec3.up); // 在窗口中心绘制，因此不需要平移，只需要旋转
            // 合成model-view-projection矩阵，存储到mat4的静态变量中，减少内存的重新分配
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            this.builder1.begin(this.gl.TRIANGLE_FAN); // 注意这里我们使用TRIANGLE_FAN图元而不是TRIANGLES图元绘制
            this.builder1.color(1, 0, 0).vertex(-0.5, 0, 0); // 顶点0为红色  左下
            this.builder1.color(0, 1, 0).vertex(0.5, 0, 0); // 顶点1为绿色  右下
            this.builder1.color(0, 0, 1).vertex(0.5, 0.5, 0); // 顶点2为蓝色  右上
            this.builder1.color(1, 1, 0).vertex(-0.5, 0.5, 0); // 顶点3为黄色 左上
            this.builder1.end(mat4Adapter.m0); // 向GPU提交绘制命令
            this.matStack.popMatrix(); // 矩阵出堆栈
            DrawHelper.drawCoordSystem(
                this.builder1,
                mat4Adapter.m0,
                EAxisType.NONE,
                0.8,
            );
        }

        // EVertexLayout.SEPARATED 顶点存储格式绘制绘制绕[1, 1, 1]轴转转的立方体
        this.matStack.pushMatrix(); // 矩阵堆栈进栈
        {
            this.matStack.translate(new vec3([1.5, 0, 0])); // 将坐标系右移1.5个单位（右移为正，左移为负)
            this.matStack.rotate(-this.angle, new vec3([1, 1, 1]).normalize()); // 绕[1, 1, 1]轴旋转，主要轴调用normalize方法进行单位化
            // 合成model-view-projection矩阵，存储到mat4的静态变量中，减少内存的重新分配
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            DrawHelper.drawWireFrameCubeBox(this.builder2, mat4Adapter.m0, 0.2); // 调用DrawHelper类的静态drawWireFrameCubeBox方法
            this.matStack.popMatrix(); // 矩阵出堆栈
            DrawHelper.drawCoordSystem(
                this.builder2,
                mat4Adapter.m0,
                EAxisType.NONE,
                0.8,
            );
        }
        // 恢复三角形背面剔除功能
        this.gl.enable(this.gl.CULL_FACE);
    }

    drawByMultiViewportsWithTextureShader(): void {
        // 第一步，设置viewport
        this.setViewport(this.coords[0]);
        // 第二步，设置viewport的背景色（可选，如果你不想使用default深灰色的背景色）
        this.gl.clearColor(0.0, 0, 0, 1);
        // 第三步，将viewport设置为第二步设置的背景色（可选，如果你不想使用default深灰色的背景色）
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.matStack.pushMatrix();
        {
            this.matStack.rotate(this.angle, vec3.forward);
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            this.tbuilder0.begin(this.gl.TRIANGLES);
            this.tbuilder0.texcoord(0, 0).vertex(-1, 0, 0);
            this.tbuilder0.texcoord(1, 0).vertex(1, 0, 0);
            this.tbuilder0.texcoord(0.5, 0.5).vertex(0, 1, 0);
            this.tbuilder0.end(mat4Adapter.m0);
            this.matStack.popMatrix();
            DrawHelper.drawCoordSystem(
                this.builder0,
                mat4Adapter.m0,
                EAxisType.NONE,
                1.5,
            );
        }

        // 使用default深灰色的背景色，所以只使用第一步设置了viewport，忽略第二/第三步
        this.setViewport(this.coords[1]);
        this.matStack.pushMatrix();
        {
            this.tbuilder1.begin(this.gl.TRIANGLE_FAN);
            this.matStack.rotate(-this.angle, vec3.forward);
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            this.tbuilder1.texcoord(0, 0).vertex(-1, -0.5, 0);
            this.tbuilder1.texcoord(1, 0).vertex(1, -0.5, 0);
            this.tbuilder1.texcoord(1, 1).vertex(1, 0.5, 0);
            this.tbuilder1.texcoord(0, 1).vertex(-1, 0.5, 0);
            this.tbuilder1.end(mat4Adapter.m0);
            this.matStack.popMatrix();
            DrawHelper.drawCoordSystem(
                this.builder0,
                mat4Adapter.m0,
                EAxisType.NONE,
                1.5,
            );
        }

        // 在viewport2中绘制绕y轴旋转、使用cubeTexCoords的立方体
        this.setViewport(this.coords[2]);
        this.matStack.pushMatrix();
        {
            this.matStack.rotate(this.angle, vec3.up);
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            DrawHelper.drawTextureCubeBox(
                this.tbuilder0,
                mat4Adapter.m0,
                0.5,
                this.cubeTexCoords,
            );
            this.matStack.popMatrix();
            DrawHelper.drawCoordSystem(
                this.builder0,
                mat4Adapter.m0,
                EAxisType.NONE,
                1.5,
            );
        }

        // 在viewport3中绘制绕x轴旋转、使用cubeTexCoords的立方体
        this.setViewport(this.coords[3]);
        this.gl.clearColor(1.0, 1, 1, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.matStack.pushMatrix();
        {
            this.matStack.rotate(this.angle, vec3.right);
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            DrawHelper.drawTextureCubeBox(
                this.tbuilder1,
                mat4Adapter.m0,
                0.5,
                this.cubeTexCoords,
            );
            this.matStack.popMatrix();
            DrawHelper.drawCoordSystem(
                this.builder0,
                mat4Adapter.m0,
                EAxisType.NONE,
                1.5,
            );
        }

        // 在viewport4中绘制绕z轴旋转、使用cubeTexCoords的立方体
        this.setViewport(this.coords[4]);
        this.gl.clearColor(0.0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.matStack.pushMatrix();
        {
            this.matStack.rotate(this.angle, vec3.forward);
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            DrawHelper.drawTextureCubeBox(
                this.tbuilder0,
                mat4Adapter.m0,
                0.5,
                this.cubeTexCoords,
            );
            this.matStack.popMatrix();
            DrawHelper.drawCoordSystem(
                this.builder0,
                mat4Adapter.m0,
                EAxisType.NONE,
                1.5,
            );
        }

        // 在viewport5中绘制绕[1, 1, 1]轴旋转、使用默认贴图坐标的立方体
        this.setViewport(this.coords[5]);
        this.matStack.pushMatrix();
        {
            this.matStack.rotate(this.angle, new vec3([1, 1, 1]).normalize());
            mat4.product(
                this.camera.viewProjectionMatrix,
                this.matStack.modelViewMatrix,
                mat4Adapter.m0,
            );
            DrawHelper.drawTextureCubeBox(this.tbuilder0, mat4Adapter.m0, 0.8);
            this.matStack.popMatrix();
            DrawHelper.drawCoordSystem(
                this.builder0,
                mat4Adapter.m0,
                EAxisType.NONE,
                1.5,
            );
        }
    }

    onKeyPress(evt: CanvasKeyBoardEvent): void {
        super.onKeyPress(evt); // 调用基类方法，这样摄像机键盘事件全部有效了
        if (evt.key === '1') {
            // 将currentDrawMethod函数指针指向drawByMatrixWithColorShader方法
            this.currentDrawMethod = this.drawByMatrixWithColorShader;
        } else if (evt.key === '2') {
            // 将currentDrawMethod函数指针指向drawByMultiViewportsWithTextureShader方法
            this.currentDrawMethod = this.drawByMultiViewportsWithTextureShader;
        }
    }
}
