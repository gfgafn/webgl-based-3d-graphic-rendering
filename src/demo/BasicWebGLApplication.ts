import { mat4, vec3 } from '@tlaukkan/tsm';
import { Application } from '../common/Application';
// import { mat4, vec3 } from '../common/math/TSM';
import { MathHelper } from '../common/math/MathHelper';
// import { GLHelper, EShaderType, GLUniformMap, GLAttribMap } from '../webgl/WebGLHepler';
import { TypedArrayList } from '../common/container/TypedArrayList';
import { GLCoordSystem } from '../webgl/WebGLCoordSystem';
import { EShaderType, GLAttribMap, GLHelper, GLUniformMap } from '../webgl/WebGLHelper';
import { mat4Adapter } from '../common/math/tsmAdapter';

export class BasicWebGLApplication extends Application {
    gl: WebGLRenderingContext;

    coordSystem9s: GLCoordSystem[];
    coordSystem4s: GLCoordSystem[];

    // 增加视矩阵和投影矩阵
    projectMatrix: mat4;
    viewMatrix: mat4;
    viewProjectMatrix: mat4;

    colorShader_vs: string = `
        // 1、 attribute顶点属性声明
        attribute vec3 aPosition;
        attribute vec4 aColor;

        // 2、 uniform变量声明
        uniform mat4 uMVPMatrix;

        // 3、 varying变量声明
        varying vec4 vColor;

        // 4、 顶点处理入口main函数
        void main(void){
            // 5、 gl_Position为Vertex Shader内置varying变量，varying变量会被传递到Fragment Shader中去
            gl_Position = uMVPMatrix * vec4(aPosition,1.0); // 6、 将坐标值从局部坐标系变换到裁剪坐标系
            vColor = aColor; // 7、 将颜色属性传递到Fragment Shader中去
        }
        `;

    colorShader_fs: string = `

        #ifdef GL_ES
            precision highp float;
        #endif

        varying  vec4 vColor;
        void main(void){
            gl_FragColor = vColor;
        }
       `;

    colorShader_vs_2: string = `
       attribute mediump vec3 aPosition;
       attribute mediump vec4 aColor;

       uniform mediump mat4 uMVPMatrix;

       varying lowp vec4 vColor;

       void main(void){
           gl_Position = uMVPMatrix * vec4(aPosition,1.0);
           gl_PointSize = 10.0;
           vColor = aColor;
       }
       `;

    colorShader_fs_2: string = `
       varying  lowp vec4 vColor;
       void main(void){
           gl_FragColor = vColor;
       }
      `;

    vsShader: WebGLShader;
    fsShader: WebGLShader;
    program: WebGLProgram;

    uniformMap: GLUniformMap = {};
    attribMap: GLAttribMap = {};

    ivbo: WebGLBuffer; // i表示interleaved Array存储方式
    verts: TypedArrayList<Float32Array>; // 使用第二章中实现的动态类型数组，我们会重用该数组

    // BasicWebGLApplication增加EBO
    evbo: WebGLBuffer; // e表示gl.ELEMENT_ARRAY_BUFFER
    indices: TypedArrayList<Uint16Array>; // 索引缓存的数据

    constructor(canvas: HTMLCanvasElement) {
        // 1、创建WebGLRenderingContext上下文渲染对象
        super(canvas); // 调用基类构造函数

        const contextAttribs: WebGLContextAttributes = {
            // WebGL上下文渲染对象需要创建深度和模版缓冲区
            depth: true, // 创建深度缓冲区，default为true
            stencil: true, // 创建模版缓冲区，default为false，我们这里设置为true

            // WebGL上下文自动会创建一个颜色缓冲区,
            alpha: true, // 颜色缓冲区的格式为rgba，如果设置为false，则颜色缓冲区使用rgb格式,default为true
            premultipliedAlpha: true, // 不使用预乘alpha，default为true

            // 帧缓冲区抗锯齿以及是否保留上一帧的内容
            antialias: true, //设置抗锯齿为true，如果硬件支持，会使用抗锯齿功能，default为true
            preserveDrawingBuffer: false, // 参看第五章5.2.1节说明
        };

        const ctx: WebGLRenderingContext | null = this.canvas.getContext(
            'webgl',
            contextAttribs,
        );
        if (ctx === null) {
            alert(' 无法创建WebGLRenderingContext上下文对象 ');
            throw new Error(' 无法创建WebGLRenderingContext上下文对象 ');
        }
        // 从canvas元素中获得webgl上下文渲染对象，WebGL API都通过该上下文渲染对象进行调用
        this.gl = ctx;

        canvas.addEventListener(
            'webglcontextlost',
            function (e) {
                console.log(JSON.stringify(e)); // 当触发webglcontextlost事件时，将该事件相关信息打印到控制台
            },
            false,
        );

        //GLHelper.triggerContextLostEvent( this.gl );

        GLHelper.printStates(this.gl);

        // 在构造函数中增加如下代码:
        // 构造投影矩阵
        // this.projectMatrix = mat4.perspective(
        //     // FIXME: MathHelper.toRadian(45),
        //     0.5 * 360 * MathHelper.toRadian(45),
        //     this.canvas.width / this.canvas.height,
        //     0.1,
        //     100,
        // );

        this.projectMatrix = mat4Adapter.perspective(
            MathHelper.toRadian(45),
            this.canvas.width / this.canvas.height,
            0.1,
            100,
        );

        // 构造视矩阵
        this.viewMatrix = mat4.lookAt(new vec3([0, 0, 5]), new vec3());
        // 构造viewprojectMatrix
        // FIXME
        // this.viewProjectMatrix = mat4.product(this.projectMatrix, this.viewMatrix);

        this.viewProjectMatrix = new mat4().setIdentity();
        this.viewProjectMatrix = mat4.product(
            this.projectMatrix,
            this.viewMatrix,
            this.viewProjectMatrix,
        );

        // 设置视口区域
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        // 设置裁剪区域
        this.gl.scissor(0, 0, this.canvas.width, this.canvas.height);
        // 需要开启裁剪测试
        this.gl.enable(this.gl.SCISSOR_TEST);

        // 着色器编译
        GLHelper.printWebGLInfo(this.gl);

        this.vsShader = GLHelper.createShader(this.gl, EShaderType.VS_SHADER);
        GLHelper.compileShader(this.gl, this.colorShader_vs, this.vsShader);

        this.fsShader = GLHelper.createShader(this.gl, EShaderType.FS_SHADER);
        GLHelper.compileShader(this.gl, this.colorShader_fs, this.fsShader);

        // 着色器链接
        this.program = GLHelper.createProgram(this.gl);
        // 1、 printProgramActiveInfos作为afterProgramLink的回调函数
        // 注意我们用了function对象的bind方法，因为在printProgramActiveInfos函数中使用了this指针
        // 该this指针需要指向BasicWebGLApplication对象，因此必须要使用bind方法进行绑定操作
        if (
            GLHelper.linkProgram(
                this.gl,
                this.program,
                this.vsShader,
                this.fsShader,
                this.printProgramActiveInfos.bind(this),
                this.printProgramActiveInfos.bind(this),
            ) === true
        ) {
            this.printProgramActiveInfos(); // 2、链接成功后打印所有的active attribute 和 uniform 变量
        }

        this.verts = new TypedArrayList(Float32Array, 6 * 7);
        this.ivbo = GLHelper.createBuffer(this.gl);

        // 初始化evbo
        this.indices = new TypedArrayList(Uint16Array, 6);
        this.evbo = GLHelper.createBuffer(this.gl);

        // this.gl.frontFace(this.gl.CCW);
        this.gl.enable(this.gl.CULL_FACE);
        // this.gl.cullFace(this.gl.BACK);

        this.coordSystem9s = this.makeViewportCoordSystems();
        this.coordSystem4s = this.makeViewportCoordSystems(2);
    }

    printProgramActiveInfos(): void {
        GLHelper.getProgramActiveAttribs(this.gl, this.program, this.attribMap);
        console.log('attribMap = ', JSON.stringify(this.attribMap));

        GLHelper.getProgramAtciveUniforms(this.gl, this.program, this.uniformMap);
        console.log('unfiorms = ', JSON.stringify(this.uniformMap));
    }

    makeViewportCoordSystems(num: number = 3): GLCoordSystem[] {
        const coords: GLCoordSystem[] = [];
        const w: number = this.canvas.width / num;
        const h: number = this.canvas.height / num;
        for (let i: number = 0; i < num; i++) {
            for (let j: number = 0; j < num; j++) {
                coords.push(new GLCoordSystem([i * w, j * h, w, h]));
            }
        }
        return coords;
    }

    render9Viewports(): void {
        // 从下到上第一列
        GLHelper.setViewport(this.gl, this.coordSystem9s[0].viewport);
        this.drawRectByInterleavedVBO(0, 6, this.gl.TRIANGLES);

        GLHelper.setViewport(this.gl, this.coordSystem9s[1].viewport);
        this.drawRectByInterleavedVBO(0, 3, this.gl.TRIANGLES);

        GLHelper.setViewport(this.gl, this.coordSystem9s[2].viewport);
        this.drawRectByInterleavedVBO(3, 3, this.gl.TRIANGLES);

        // 从下到上第二列
        GLHelper.setViewport(this.gl, this.coordSystem9s[3].viewport);
        this.drawRectByInterleavedVBO(0, 4, this.gl.TRIANGLE_FAN);

        GLHelper.setViewport(this.gl, this.coordSystem9s[4].viewport);
        this.drawRectByInterleavedVBO(0, 4, this.gl.TRIANGLE_STRIP);

        GLHelper.setViewport(this.gl, this.coordSystem9s[5].viewport);
        this.drawRectByInterleavedVBO(0, 4, this.gl.POINTS);

        // 从下到上第三列
        GLHelper.setViewport(this.gl, this.coordSystem9s[6].viewport);
        this.drawRectByInterleavedVBO(0, 4, this.gl.LINE_STRIP);

        GLHelper.setViewport(this.gl, this.coordSystem9s[7].viewport);
        this.drawRectByInterleavedVBO(0, 4, this.gl.LINE_LOOP);

        GLHelper.setViewport(this.gl, this.coordSystem9s[8].viewport);
        this.drawRectByInterleavedVBO(0, 4, this.gl.LINES);
    }

    render4Viewports(): void {
        GLHelper.setViewport(this.gl, this.coordSystem4s[0].viewport);
        this.drawRectByInterleavedVBOWithEBO(0, 6, this.gl.TRIANGLES);

        GLHelper.setViewport(this.gl, this.coordSystem4s[1].viewport);
        this.drawRectByInterleavedVBOWithEBO(0, 6, this.gl.TRIANGLE_FAN);

        GLHelper.setViewport(this.gl, this.coordSystem4s[2].viewport);
        this.drawRectByInterleavedVBOWithEBO(0, 6, this.gl.TRIANGLE_STRIP);

        GLHelper.setViewport(this.gl, this.coordSystem4s[3].viewport);
        this.drawRectByInterleavedVBOWithEBO(2 * 3, 3, this.gl.TRIANGLE_STRIP);
    }

    render(): void {
        this.render9Viewports();
        //this.render4Viewports();
    }

    drawRectByInterleavedVBO(
        first: number,
        count: number,
        mode: number = this.gl.TRIANGLES,
    ): void {
        // 重用动态数组，因此调用clear方法，将当前索引reset到0位置
        this.verts.clear();
        // 声明interleaved存储的顶点数组。
        let data: number[];

        if (mode === this.gl.TRIANGLES) {
            data = [
                // 三角形0
                -0.5,
                -0.5,
                0,
                1,
                0,
                0,
                1, // 左下  0
                0.5,
                -0.5,
                0,
                0,
                1,
                0,
                1, // 右下  1
                0.5,
                0.5,
                0,
                0,
                0,
                1,
                0, // 右上  2
                // 三角形1
                0.5,
                0.5,
                0,
                0,
                0,
                1,
                0, // 右上  2
                -0.5,
                0.5,
                0,
                0,
                1,
                0,
                1, // 左上  4
                -0.5,
                -0.5,
                0,
                1,
                0,
                0,
                1, // 左下  0
            ];
        } else if (mode === this.gl.TRIANGLE_STRIP) {
            data = [
                -0.5,
                0.5,
                0,
                0,
                1,
                0,
                1, // 左上 0
                -0.5,
                -0.5,
                0,
                1,
                0,
                0,
                1, // 左下 1
                0.5,
                0.5,
                0,
                0,
                0,
                1,
                0, // 右上 2
                0.5,
                -0.5,
                0,
                0,
                1,
                0,
                1, // 右下 3
            ];
        } else {
            data = [
                -0.5,
                -0.5,
                0,
                1,
                0,
                0,
                1, // 左下 0
                0.5,
                -0.5,
                0,
                0,
                1,
                0,
                1, // 右下 1
                0.5,
                0.5,
                0,
                0,
                0,
                1,
                0, // 右上 2
                -0.5,
                0.5,
                0,
                0,
                1,
                0,
                1, // 左上 3
            ];
        }

        this.verts.pushArray(data);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.ivbo);
        // 使用我们自己实现的动态类型数组的subArray方法，该方法不会重新创建Float32Array对象
        // 而是返回一个子数组的引用，这样效率比较高
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            this.verts.subArray(),
            this.gl.DYNAMIC_DRAW,
        );

        // vertexAttribPointer方法参数说明：
        // 1、使用VertexShader中的attribue变量名aPosition,在attribMap中查找到我们自己封装的GLAttribInfo对象,该对象中存储了顶点属性寄存器的索引号
        // 2、aPosition的类型为vec3,而vec3由3个float类型组成，因此第二个参数为3,第三个参数为gl.FLOAT常量值
        // 但是aColor的类型为vec4,,而vec4由4个float类型组成,因此第二个参数为4,第三个参数为gl.FLOAT常量值
        // 3、第四个参数用来指明attribe变量是否使用需要normalized，
        // 由于normalize只对gl.BYTE / gl.SHORT [-1 , 1 ]和gl.UNSIGNED_BYTE / gl.UNSIGNED_SHORT [ 0 , 1 ]有效
        // 而我们的aPosition和aColor在WebGLBuffer被定义为FLOAT表示的vec3和vec4,因此直接设置false
        // 4、关于最后两个参数，需要参考图5.12，因此请参考本书内容
        this.gl.vertexAttribPointer(
            this.attribMap['aPosition'].location,
            3,
            this.gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * 7,
            0,
        );
        this.gl.vertexAttribPointer(
            this.attribMap['aColor'].location,
            4,
            this.gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * 7,
            12,
        );

        // 默认情况下，是关闭vertexAttrbArray对象的，因此需要开启
        // 一旦开启后，当我们调用draw开头的WebGL方法时，WebGL驱动会自动将VBO中的顶点数据上传到对应的Vertex Shader中
        this.gl.enableVertexAttribArray(this.attribMap['aPosition'].location);
        this.gl.enableVertexAttribArray(this.attribMap['aColor'].location);

        // 绘制阶段
        this.gl.useProgram(this.program); // 设置要使用的WebGLProgram对象

        const mat: mat4 = new mat4().setIdentity().scale(new vec3([2, 2, 2]));
        mat4.product(this.viewProjectMatrix, mat, mat);
        // 将vMVPMatrix uniform变量上传（upload）到着色器重
        this.gl.uniformMatrix4fv(
            this.uniformMap['uMVPMatrix'].location,
            false,
            // FIXME 无法使用 mat.all() 代替 mat.values
            mat.all(),
        );
        // 调用drawArrays对象

        this.gl.drawArrays(mode, first, count); // 几个顶点

        // 将渲染状态恢复的未设置之前
        this.gl.useProgram(null);
        this.gl.disableVertexAttribArray(this.attribMap['aPosition'].location);
        this.gl.disableVertexAttribArray(this.attribMap['aColor'].location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }

    drawRectByInterleavedVBOWithEBO(
        byteOffset: number,
        count: number,
        mode: number = this.gl.TRIANGLES,
        isCCW: boolean = true,
    ): void {
        // 重用动态数组，因此调用clear方法，将当前索引reset到0位置
        this.verts.clear();
        // 声明interleaved存储的顶点数组。
        // 逆时针顺序声明不重复的顶点属性相关数据
        this.verts.pushArray([
            -0.5,
            -0.5,
            0,
            1,
            0,
            0,
            1, // 左下 0
            0.5,
            -0.5,
            0,
            0,
            1,
            0,
            1, // 右下 1
            0.5,
            0.5,
            0,
            0,
            0,
            1,
            0, // 右上 2
            -0.5,
            0.5,
            0,
            0,
            1,
            0,
            1, // 左上 3
        ]);
        // 清空索引类型数组
        this.indices.clear();
        if (mode === this.gl.TRIANGLES || this.gl.TRIANGLE_FAN) {
            // 如果是TRIANGLES或TRIANGLE_FAN方式，我们的索引按照TRIANGLE_FAN方式排列
            if (isCCW === true) {
                this.indices.pushArray([0, 1, 2, 0, 2, 3]);
            } else {
                this.indices.pushArray([0, 2, 1, 0, 3, 2]);
            }
        } else if (mode === this.gl.TRIANGLE_STRIP) {
            // 如果是TRIANGLE_STRIP方式
            this.indices.pushArray([0, 1, 2, 2, 3, 0]);
        } else {
            // 简单起见，本方法就只演示三角形相关内容。
            return;
        }

        // 绑定VBO
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.ivbo);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            this.verts.subArray(),
            this.gl.DYNAMIC_DRAW,
        );
        this.gl.vertexAttribPointer(
            this.attribMap['aPosition'].location,
            3,
            this.gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * 7,
            0,
        );
        this.gl.vertexAttribPointer(
            this.attribMap['aColor'].location,
            4,
            this.gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * 7,
            12,
        );

        this.gl.enableVertexAttribArray(this.attribMap['aPosition'].location);
        this.gl.enableVertexAttribArray(this.attribMap['aColor'].location);

        // 绑定EBO
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.evbo);
        this.gl.bufferData(
            this.gl.ELEMENT_ARRAY_BUFFER,
            this.indices.subArray(),
            this.gl.DYNAMIC_DRAW,
        );

        this.gl.useProgram(this.program);
        const mat: mat4 = new mat4().setIdentity().scale(new vec3([2, 2, 2]));
        mat4.product(this.viewProjectMatrix, mat, mat);
        this.gl.uniformMatrix4fv(
            this.uniformMap['uMVPMatrix'].location,
            false,
            // FIXME 无法使用 mat.all() 代替 mat.values
            mat.all(),
        );

        // 调用drawElements方法
        this.gl.drawElements(mode, count, this.gl.UNSIGNED_SHORT, byteOffset);

        this.gl.useProgram(null);
        this.gl.disableVertexAttribArray(this.attribMap['aPosition'].location);
        this.gl.disableVertexAttribArray(this.attribMap['aColor'].location);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    }
}
