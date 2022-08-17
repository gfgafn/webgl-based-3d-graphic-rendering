import { mat4, quat, vec2, vec3, vec4 } from '@tlaukkan/tsm';
import { GLAttribBits, GLAttribState } from './WebGLAttribState';
import { EShaderType, GLAttribMap, GLHelper, GLUniformMap } from './WebGLHelper';
import { GLShaderSource } from './WebGLShaderSource';

/** `GLProgram` 类用来用来GLSL ES源码的编译、链接、绑定及 `uniform` 变量载入等操作 */
export class GLProgram {
    // uniforms相关定义
    //vs常用的uniform命名
    static readonly MVMatrix: string = 'uMVMatrix'; // 模型视图矩阵
    static readonly ModelMatrix: string = 'uModelMatrix'; // 模型矩阵
    static readonly ViewMatrix: string = 'uViewMatrix'; // 视矩阵
    static readonly ProjectMatrix: string = 'uProjectMatrix'; // 投影矩阵
    static readonly NormalMatrix: string = 'uNormalMatrix'; // 法线矩阵
    static readonly MVPMatrix: string = 'uMVPMatrix'; // 模型_视图_投影矩阵
    static readonly Color: string = 'uColor'; // 颜色值        //ps常用的uniform命名
    static readonly Sampler: string = 'uSampler'; // 纹理取样器
    static readonly DiffuseSampler: string = 'uDiffuseSampler'; // 漫反射取样器
    static readonly NormalSampler: string = 'uNormalSampler'; // 法线取样器
    static readonly SpecularSampler: string = 'uSpecularSampler'; // 高光取样器
    static readonly DepthSampler: string = 'uDepthSampler'; // 深度取样器

    gl: WebGLRenderingContext; // WebGL上下文渲染对象
    name: string; // program名
    private _attribState: GLAttribBits; // 当前的Program使用的顶点属性bits值
    program: WebGLProgram; // 链接器
    vsShader: WebGLShader; // vertex shader编译器
    fsShader: WebGLShader; // fragment shader编译器
    // 主要用于信息输出
    attribMap: GLAttribMap;
    uniformMap: GLUniformMap;

    private _vsShaderDefineStrings: string[] = [];
    private _fsShaderDefineStrings: string[] = [];

    constructor(
        context: WebGLRenderingContext,
        attribState: GLAttribBits,
        vsShader: string | null = null,
        fsShader: string | null = null,
    ) {
        this.gl = context;
        this._attribState = attribState;
        // 最好能从shader源码中抽取，目前暂时使用参数传递方式
        this.bindCallback = null;
        this.unbindCallback = null;
        // 创建Vertex Shaders
        let shader: WebGLShader | null = GLHelper.createShader(
            this.gl,
            EShaderType.VS_SHADER,
        );
        if (!shader) throw new Error('Create Vertex Shader Object Fail! ! ! ');

        this.vsShader = shader;
        // 创建Fragment Shader
        shader = null;
        shader = GLHelper.createShader(this.gl, EShaderType.FS_SHADER);
        if (!shader) throw new Error('Create Fragment Shader Object Fail! ! ! ');

        this.fsShader = shader;
        // 创建WebGLProgram链接器对象
        const program: WebGLProgram | null = GLHelper.createProgram(this.gl);
        if (!program) throw new Error('Create WebGLProgram Object Fail! ! ! ');

        this.program = program;
        // 初始化map对象
        this.attribMap = {};
        this.uniformMap = {};
        // 如果构造函数参数包含GLSL ES源码，就调用loadShaders方法
        // 否则需要在调用构造函数后手动调用loadShaders方法
        if (vsShader !== null && fsShader !== null) {
            this.loadShaders(vsShader, fsShader);
        }
        this.name = 'name';
    }

    private progromBeforeLink(gl: WebGLRenderingContext, program: WebGLProgram): void {
        // 链接前才能使用bindAttribLocation函数
        // 1.attrib名字和shader中的命名必须要一致
        // 2．数量必须要和mesh中一致
        // 3.mesh中的数组的component必须固定
        if (GLAttribState.hasPosition(this._attribState)) {
            gl.bindAttribLocation(
                program,
                GLAttribState.POSITION_LOCATION,
                GLAttribState.POSITION_NAME,
            );
        }
        if (GLAttribState.hasNormal(this._attribState)) {
            gl.bindAttribLocation(
                program,
                GLAttribState.NORMAL_LOCATION,
                GLAttribState.NORMAL_NAME,
            );
        }
        if (GLAttribState.hasTexCoord_0(this._attribState)) {
            gl.bindAttribLocation(
                program,
                GLAttribState.TEXCOORD_LOCATION,
                GLAttribState.TEXCOORD_NAME,
            );
        }
        if (GLAttribState.hasTexCoord_1(this._attribState)) {
            gl.bindAttribLocation(
                program,
                GLAttribState.TEXCOORD1_LOCATION,
                GLAttribState.TEXCOORD1_NAME,
            );
        }
        if (GLAttribState.hasColor(this._attribState)) {
            gl.bindAttribLocation(
                program,
                GLAttribState.COLOR_LOCATION,
                GLAttribState.COLOR_NAME,
            );
        }
        if (GLAttribState.hasTangent(this._attribState)) {
            gl.bindAttribLocation(
                program,
                GLAttribState.TANGENT_LOCATION,
                GLAttribState.TANGENT_NAME,
            );
        }
    }

    // 链接后的回调函数实际上在本类中是多余的
    // 因为我们已经固定了attribue的索引号及getUniformLocation方法获取某个uniform变量
    // 这里只是为了输出当前Program相关的uniform和attribute变量的信息
    private progromAfterLink(gl: WebGLRenderingContext, program: WebGLProgram): void {
        //获取当前active状态的attribute和uniform的数量        //很重要的一点，active_attributes/uniforms必须在link后才能获得
        GLHelper.getProgramActiveAttribs(gl, program, this.attribMap);
        GLHelper.getProgramAtciveUniforms(gl, program, this.uniformMap);
        console.log(JSON.stringify(this.attribMap));
        console.log(JSON.stringify(this.uniformMap));
    }

    /** 当调用gl.useProgram(this.program)后触发bindCallback回调 */
    bindCallback: ((program: GLProgram) => void) | null;
    /** 当调用gl.useProgram(null)前触发unbindCallback回调函数 */
    unbindCallback: ((program: GLProgram) => void) | null;

    /** 在Vertex Shader中动态添加宏 */
    addVSShaderMacro(str: string): void {
        if (str.indexOf('#define ') === -1) {
            str = '#define ' + str;
        }
        this._vsShaderDefineStrings.push(str);
    }

    /** 在Fragment Shader中动态添加宏 */
    addFSShaderMacro(str: string): void {
        if (str.indexOf('#define ') === -1) {
            str = '#define ' + str;
        }
        this._fsShaderDefineStrings.push(str);
    }

    /**
     * vs fs都要添加的宏，例如在VS / FS中添加如下宏：
     * ```C
     * #ifdef GL_ES
     * precision highp float;
     * #endif
     * ```
     * @param str vs fs 要添加的宏
     */
    addShaderMacro(str: string): void {
        this.addVSShaderMacro(str);
        this.addFSShaderMacro(str);
    }

    /**
     * 1. 载入并编译 `VS` 和 `FS`
     * 2. 使用 `WebGLRenderingContext` 对象的 `bindAttribLocation` 方法在链接前预先绑定顶点索引号
     * 3. 链接 `VS` 和 `FS`
     * @param vs 顶点着色器
     * @param fs 片段着色器
     */
    loadShaders(vs: string, fs: string): void {
        if (GLHelper.compileShader(this.gl, vs, this.vsShader) === false) {
            throw new Error(' WebGL顶点Shader链接不成功! ');
        }
        if (GLHelper.compileShader(this.gl, fs, this.fsShader) === false) {
            throw new Error(' WebGL像素片段Shader链接不成功! ');
        }
        if (
            GLHelper.linkProgram(
                this.gl,
                this.program,
                this.vsShader,
                this.fsShader,
                this.progromBeforeLink.bind(this),
                this.progromAfterLink.bind(this),
            ) === false
        ) {
            throw new Error(' WebGLProgram链接不成功! ');
        }
        console.log(JSON.stringify(this.attribMap));
    }

    /** 将定义好的 `WebGLProgram` 对象添加到当前的 `WebGLRenderingContext`中 */
    bind(): void {
        this.gl.useProgram(this.program);
        this.bindCallback && this.bindCallback(this);
    }

    unbind(): void {
        this.unbindCallback && this.unbindCallback(this);
        this.gl.useProgram(null);
    }

    /** 根据变量名获取WebGLUniformLocationd对象  */
    getUniformLocation(name: string): WebGLUniformLocation | null {
        return this.gl.getUniformLocation(this.program, name);
    }

    getAttributeLocation(name: string): number {
        return this.gl.getAttribLocation(this.program, name);
    }

    setAttributeLocation(name: string, loc: number): void {
        this.gl.bindAttribLocation(this.program, loc, name);
    }

    setInt(name: string, i: number): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform1i(loc, i);
            return true;
        }
        return false;
    }

    setFloat(name: string, f: number): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform1f(loc, f);
            return true;
        }
        return false;
    }

    setVector2(name: string, vec2: vec2): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform2fv(loc, vec2.xy);
            return true;
        }
        return false;
    }

    setVector3(name: string, vec3: vec3): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform3fv(loc, vec3.xyz);
            return true;
        }
        return false;
    }

    setVector4(name: string, vec4: vec4): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform4fv(loc, vec4.xyzw);
            return true;
        }
        return false;
    }

    setQuat(name: string, quat: quat): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform4fv(loc, quat.xyzw);
            return true;
        }
        return false;
    }

    setMatrix3(name: string, mat: mat4): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniformMatrix3fv(loc, false, mat.all());
            return true;
        }
        return false;
    }

    /** 使用 `gl.uniformMatrix4fv` 方法载入类型为 `mat4` 的 `uniform` 变量到 `GLProgram` 对象中 */
    setMatrix4(name: string, mat: mat4): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniformMatrix4fv(loc, false, mat.all());
            return true;
        }
        return false;
    }

    setSampler(name: string, sampler: number): boolean {
        const loc: WebGLUniformLocation | null = this.getUniformLocation(name);
        if (loc) {
            this.gl.uniform1i(loc, sampler);
            return true;
        }
        return false;
    }

    loadModeViewMatrix(mat: mat4): boolean {
        return this.setMatrix4(GLProgram.MVMatrix, mat);
    }

    loadSampler(unit: number = 0): boolean {
        return this.setSampler(GLProgram.Sampler, unit);
    }

    /*
    static createDefaultTextureProgram ( gl: WebGLRenderingContext ): GLProgram
    {
        let pro: GLProgram = new GLProgram( gl, GLAttribState.POSITION_BIT | GLAttribState.TEXCOORD_BIT,
            GLShaderSource.textureShader.vs, GLShaderSource.textureShader.fs );
        return pro;
    }

    static createDefaultColorProgram ( gl: WebGLRenderingContext ): GLProgram
    {
        let pro: GLProgram = new GLProgram( gl, GLAttribState.POSITION_BIT | GLAttribState.COLOR_BIT,
            GLShaderSource.colorShader.vs, GLShaderSource.colorShader.fs );
        return pro;
    }
    */

    /** 创建默认纹理着色器 */
    static createDefaultTextureProgram(gl: WebGLRenderingContext): GLProgram {
        const pro: GLProgram = new GLProgram(
            gl,
            GLAttribState.makeVertexAttribs(true, false, false, false, false),
            GLShaderSource.textureShader.vs,
            GLShaderSource.textureShader.fs,
        );
        return pro;
    }

    /** 创建默认颜色着色器 */
    static createDefaultColorProgram(gl: WebGLRenderingContext): GLProgram {
        const pro: GLProgram = new GLProgram(
            gl,
            GLAttribState.makeVertexAttribs(false, false, false, false, true),
            GLShaderSource.colorShader.vs,
            GLShaderSource.colorShader.fs,
        );
        return pro;
    }
}
