import { mat4, vec2, vec3, vec4 } from '@tlaukkan/tsm';
import { TypedArrayList } from '../common/container/TypedArrayList';
import { GLAttribBits, GLAttribOffsetMap, GLAttribState } from './WebGLAttribState';
import { GLProgram } from './WebGLProgram';
import { GLTexture } from './WebGLTexture';

/** 顶点数组存储布局方式 */
export enum EVertexLayout {
    /** 交错数组存储方式，存储在一个 `VBO` 中 */
    INTERLEAVED,
    /** 连续存储方式，存储在一个 `VBO` 中 */
    SEQUENCED,
    /** 每个顶点属性使用一个 `VBO` 存储 */
    SEPARATED,
}

/** 这些类是顶点缓冲区和索引缓冲区的拥有者，表示要绘制的几何图形。整个GLMesh系统由三个类组成。 */

/**
 * `GLMeshBase` 是抽象基类，内部封装了 `WebGLVertexArrayObjectOES` 对象，
 * 使用该对象能够大幅度减少 `gl.vertexAttribPointer` 和 `gl.enableVertexAttribArray` 方法的调用
 * 如果不使用 `VAO` 对象，每次绘制某个对象时都需要使用这两个方法来绑定渲染数据）。
 * `VAO` 是 `WebGLVertexArrayObjectOES` 对象的缩写，该对象属于 `WebGL` 的扩展对象。
 */
export abstract class GLMeshBase {
    /** WebGL渲染上下文 */
    gl: WebGLRenderingContext;
    /** `gl.TRIANGLES` 等7种基本几何图元之一 */
    drawMode: number;
    /** 顶点属性格式，和绘制当前网格时使用的 `GLProgram` 具有一致的 `attribBits` */
    protected _attribState: GLAttribBits;
    /** 当前使用的顶点属性的 `stride` 字节数 */
    protected _attribStride: number;
    /** 我们使用 `VAO` （顶点数组对象）来管理 `VBO` 和 `EBO` */
    // TODO: 重命名为 vaoExt
    /** `WebGL` 扩展对象 */
    protected _vao: OES_vertex_array_object;
    // TODO: 重命名为 vao
    /** `WebGLVertexArrayObject` 对象 */
    protected _vaoTarget: WebGLVertexArrayObjectOES;

    constructor(
        gl: WebGLRenderingContext,
        attribState: GLAttribBits,
        drawMode: number = gl.TRIANGLES,
    ) {
        this.gl = gl;
        // 获取VAO的步骤
        // 1．使用gl.getExtension( "OES_vertex_array_object" )方式获取 VAO 扩展
        const vao: OES_vertex_array_object | null = this.gl.getExtension(
            'OES_vertex_array_object',
        );
        if (!vao) throw new Error('Not Support OES_vertex_array_object');
        this._vao = vao;
        // 2．调用createVertexArrayOES获取 `WebGLVertexArrayObject` 对象
        const vaoTarget: WebGLVertexArrayObjectOES | null =
            this._vao.createVertexArrayOES();
        if (!vaoTarget) throw new Error('Not Support WebGLVertexArrayObjectOES');
        this._vaoTarget = vaoTarget;
        // 顶点属性格式，和绘制当前网格时使用的GLProgram具有一致的attribBits
        this._attribState = attribState;
        // 调用GLAttribState的getVertexByteStride方法，根据attribBits计算出顶点的stride字节数
        this._attribStride = GLAttribState.getVertexByteStride(this._attribState);
        // 设置当前绘制时使用的基本几何图元类型，默认为三角形集合
        this.drawMode = drawMode;
    }

    /** 绑定 `VAO` 对象 */
    bind(): void {
        // 将传递的 WebGLVertexArrayObject 对象绑定到缓冲区。
        this._vao.bindVertexArrayOES(this._vaoTarget);
    }

    /** 解绑 `VAO` */
    unbind(): void {
        this._vao.bindVertexArrayOES(null);
    }

    get vertexStride(): number {
        return this._attribStride;
    }
}

/** `GLStaticMesh` 类继承自 `GLMeshBase` ，并且持有两个 `WebGLBuffer` 对象，分别表示顶点缓冲区和索引缓冲区。
 * 其中，索引缓冲区可以设置为 `null` ，表示不使用索引缓冲区，在这种情况下，
 * 将会自动调用 `gl.rawArrays` 方法提交渲染数据，否则就会调用 `gl.drawElements` 方法绘制网格对象。
 * `GLStaticMesh` 类使用的是交错数组方式存储顶点属性相关的数据。
 */
export class GLStaticMesh extends GLMeshBase {
    //GLStaticMesh内置了一个顶点缓冲区
    /** 顶点缓冲区 */
    protected _vbo: WebGLBuffer;
    protected _vertCount: number = 0; // 顶点的数量
    // GLStaticMesh内置了一个可选的索引缓冲区
    /** 索引缓冲区 */
    protected _ibo: WebGLBuffer | null = null;
    protected _indexCount: number = 0; // 索引的数量

    mins: vec3 = new vec3([Infinity, Infinity, Infinity]);
    maxs: vec3 = new vec3([-Infinity, -Infinity, -Infinity]);

    /**
     * `GLStaticMesh` 构造函数
     * @param gl WebGL渲染上下文
     * @param attribState
     * @param vbo
     * @param ibo Index Buffer Object
     * @param drawMode
     */
    constructor(
        gl: WebGLRenderingContext,
        attribState: GLAttribBits,
        vbo: Float32Array | ArrayBuffer,
        ibo: Uint16Array | null = null,
        drawMode: number = gl.TRIANGLES,
    ) {
        // 调用基类的构造函数
        super(gl, attribState, drawMode);

        // 关键的操作：
        // 要使用VAO来管理VBO和EBO的话，必须要在VBO和EBO创建绑定之前先绑定VAO对象，这个顺序不能搞错!!!
        // 先绑定VAO后，那么后续创建的VBO和EBO对象都归属VAO管辖!!!
        this.bind();
        // 在创建并绑定vbo
        const vb: WebGLBuffer | null = gl.createBuffer();
        if (!vb) throw new Error('vbo creation fail');

        this._vbo = vb;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._vbo); // 绑定VBO
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vbo, this.gl.STATIC_DRAW); // 将顶点数据载入到VBO中
        // 然后计算出交错存储的顶点属性attribOffsetMap相关的值
        const offsetMap: GLAttribOffsetMap =
            GLAttribState.getInterleavedLayoutAttribOffsetMap(this._attribState);
        // 计算出顶点的数量
        this._vertCount = vbo.byteLength / offsetMap[GLAttribState.ATTRIBSTRIDE];
        // 使用VAO后，我们只要初始化时设置一次setAttribVertexArrayPointer和setAttribVertexArrayState就行了
        // 当我们后续调用基类的bind方法绑定VAO对象后，VAO会自动处理顶点地址绑定和顶点属性寄存器开启相关操作，这就简化了很多操作
        GLAttribState.setAttribVertexArrayPointer(gl, offsetMap);
        GLAttribState.setAttribVertexArrayState(gl, this._attribState);
        // 再创建IBO（IBO表示Index Buffer Object,EBO表示Element Buffer Object，表示一样的概念）
        this.setIBO(ibo);
        // 必须放在这里
        this.unbind();

        this.mins = new vec3();
        this.maxs = new vec3();
    }

    protected setIBO(ibo: Uint16Array | null): void {
        if (!ibo) return; // 按需创建IBO
        // 创建IBO
        this._ibo = this.gl.createBuffer();
        if (!this._ibo) throw new Error('IBO creation fail');
        // 绑定IBO
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this._ibo); // 将索引数据上传到IBO中
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, ibo, this.gl.STATIC_DRAW); // 计算出索引个数
        this._indexCount = ibo.length;
    }

    draw(): void {
        this.bind(); // 绘制前先要绑定VAO
        if (this._ibo) {
            // 如果有IBO，使用drawElements方法绘制静态网格对象
            this.gl.drawElements(
                this.drawMode,
                this._indexCount,
                this.gl.UNSIGNED_SHORT,
                0,
            );
        } else {
            // 如果没有IBO，则使用drawArrays方法绘制静态网格对象
            this.gl.drawArrays(this.drawMode, 0, this._vertCount);
        }
        this.unbind(); // 绘制好后解除VAO绑定
    }
    // 很重要的几点说明
    // drawElements中的offset是以字节为单位
    // 而count是以索引个数为单位
    // drawRange绘制从offset偏移的字节数开始，绘制count个索引
    // drawRange内部并没有调用bind和unbind方法，因此要调用drawRange方法的话，必须采用如下方式
    /*
        mesh.bind();           // 绑定VAO
        mesh.drawRange(2, 5); // 调用drawRange方法
        mesh.unbind();         // 解绑VAO
    */

    drawRange(offset: number, count: number): void {
        if (this._ibo) {
            this.gl.drawElements(this.drawMode, count, this.gl.UNSIGNED_SHORT, offset);
        } else {
            this.gl.drawArrays(this.drawMode, offset, count);
        }
    }
}

/** GLMeshBuilder类用来每帧动态生成网格几何体并进行绘制显示。 */
export class GLMeshBuilder extends GLMeshBase {
    // 字符串常量key
    private static SEQUENCED: string = 'SEQUENCED';
    private static INTERLEAVED: string = 'INTERLEAVED';
    /** 顶点在内存或显存中的布局方式 */
    private _layout: EVertexLayout;
    // 为了简单起见，只支持顶点的位置坐标、纹理0坐标、颜色和法线这4种顶点属性格式
    // 表示当前正在输入的顶点属性值
    /** 当前正在输入的顶点颜色属性 */
    private _color: vec4 = new vec4([0, 0, 0, 0]);
    /** 当前正在输入的顶点纹理0坐标属性 */
    private _texCoord: vec2 = new vec2([0, 0]);
    /** 当前正在输入的顶点法线属性 */
    private _normal: vec3 = new vec3([0, 0, 1]);
    // 从GLAttribBits判断是否包含如下几个顶点属性
    private _hasColor: boolean;
    private _hasTexcoord: boolean;
    private _hasNormal: boolean;
    /** 渲染的数据源 */
    private _lists: { [key: string]: TypedArrayList<Float32Array> } = {};
    /** 渲染用的VBO */
    private _buffers: { [key: string]: WebGLBuffer } = {};
    /** 要渲染的顶点数量  */
    private _vertCount: number = 0;
    /** 当前使用的GLProgram对象 */
    program: GLProgram;
    /** 如果使用了纹理坐标，那么需要设置当前使用的纹理对象，否则将texture变量设置为null */
    texture: WebGLTexture | null;

    private _ibo: WebGLBuffer | null = null;
    private _indexCount: number = -1;

    constructor(
        gl: WebGLRenderingContext,
        state: GLAttribBits,
        program: GLProgram,
        texture: WebGLTexture | null = null,
        layout: EVertexLayout = EVertexLayout.INTERLEAVED,
    ) {
        super(gl, state); // 调用基类的构造方法

        // 根据attribBits，测试是否使用了下面几种类型的顶点属性格式
        this._hasColor = GLAttribState.hasColor(this._attribState);
        this._hasTexcoord = GLAttribState.hasTexCoord_0(this._attribState);
        this._hasNormal = GLAttribState.hasNormal(this._attribState);

        this._ibo = null;

        // 默认情况下，使用INTERLEAVED存储顶点
        this._layout = layout;

        // 设置当前使用的GLProgram和GLTexture2D对象
        this.program = program;
        this.texture = texture;

        // 先绑定VAO对象
        this.bind();

        // 生成索引缓存
        let buffer: WebGLBuffer | null = this.gl.createBuffer();
        // buffer = this.gl.createBuffer();
        if (!buffer) throw new Error('WebGLBuffer创建不成功!');

        if (this._layout === EVertexLayout.INTERLEAVED) {
            // interleaved的话：
            // 使用一个arraylist,一个顶点缓存
            // 调用的是GLAttribState.getInterleavedLayoutAttribOffsetMap方法
            this._lists[GLMeshBuilder.INTERLEAVED] = new TypedArrayList<Float32Array>(
                Float32Array,
            );
            this._buffers[GLMeshBuilder.INTERLEAVED] = buffer;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            const map: GLAttribOffsetMap =
                GLAttribState.getInterleavedLayoutAttribOffsetMap(this._attribState);
            // 调用如下两个方法
            GLAttribState.setAttribVertexArrayPointer(this.gl, map);
            GLAttribState.setAttribVertexArrayState(this.gl, this._attribState);
        } else if (this._layout === EVertexLayout.SEQUENCED) {
            // sequenced的话：
            // 使用n个arraylist,一个顶点缓存
            // 无法在初始化时调用的是getSequencedLayoutAttribOffsetMap方法
            // 无法使用GLAttribState.setAttribVertexArrayPointer方法预先固定地址
            // 能够使用GLAttribState.setAttribVertexArrayState开启顶点属性寄存器
            this._lists[GLAttribState.POSITION_NAME] = new TypedArrayList<Float32Array>(
                Float32Array,
            );
            if (this._hasColor) {
                this._lists[GLAttribState.COLOR_NAME] = new TypedArrayList<Float32Array>(
                    Float32Array,
                );
            }
            if (this._hasTexcoord) {
                this._lists[GLAttribState.TEXCOORD_NAME] =
                    new TypedArrayList<Float32Array>(Float32Array);
            }
            if (this._hasNormal) {
                this._lists[GLAttribState.NORMAL_NAME] = new TypedArrayList<Float32Array>(
                    Float32Array,
                );
            }
            buffer = this.gl.createBuffer();
            if (!buffer) throw new Error('WebGLBuffer创建不成功!');
            this._buffers[GLMeshBuilder.SEQUENCED] = buffer;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            // sequenced没法预先设置指针，因为是动态的
            // 但是可以预先设置顶点属性状态
            GLAttribState.setAttribVertexArrayState(this.gl, this._attribState);
        } else {
            // seperated的话：
            // 使用n个arraylist,n个顶点缓存
            // 调用的是getSepratedLayoutAttribOffsetMap方法
            // 能够使用能够使用GLAttribState.setAttribVertexArrayPointer方法预先固定地址
            // 能够使用GLAttribState.setAttribVertexArrayState开启顶点属性寄存器

            // 肯定要有的是位置数据
            this._lists[GLAttribState.POSITION_NAME] = new TypedArrayList<Float32Array>(
                Float32Array,
            );
            this._buffers[GLAttribState.POSITION_NAME] = buffer;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.vertexAttribPointer(
                GLAttribState.POSITION_LOCATION,
                3,
                gl.FLOAT,
                false,
                0,
                0,
            );
            this.gl.enableVertexAttribArray(GLAttribState.POSITION_LOCATION);
            if (this._hasColor) {
                this._lists[GLAttribState.COLOR_NAME] = new TypedArrayList<Float32Array>(
                    Float32Array,
                );
                buffer = this.gl.createBuffer();
                if (!buffer) throw new Error('WebGLBuffer创建不成功!');
                this._buffers[GLAttribState.COLOR_NAME] = buffer;
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.vertexAttribPointer(
                    GLAttribState.COLOR_LOCATION,
                    4,
                    gl.FLOAT,
                    false,
                    0,
                    0,
                );
                this.gl.enableVertexAttribArray(GLAttribState.COLOR_LOCATION);
            }
            if (this._hasTexcoord) {
                this._lists[GLAttribState.TEXCOORD_NAME] =
                    new TypedArrayList<Float32Array>(Float32Array);
                this._buffers[GLAttribState.TEXCOORD_NAME] = buffer;
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.vertexAttribPointer(
                    GLAttribState.TEXCOORD_BIT,
                    2,
                    gl.FLOAT,
                    false,
                    0,
                    0,
                );
                this.gl.enableVertexAttribArray(GLAttribState.TEXCOORD_BIT);
            }
            if (this._hasNormal) {
                this._lists[GLAttribState.NORMAL_NAME] = new TypedArrayList<Float32Array>(
                    Float32Array,
                );
                buffer = this.gl.createBuffer();
                if (!buffer) throw new Error('WebGLBuffer创建不成功!');
                this._buffers[GLAttribState.NORMAL_NAME] = buffer;
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.vertexAttribPointer(
                    GLAttribState.NORMAL_LOCATION,
                    3,
                    gl.FLOAT,
                    false,
                    0,
                    0,
                );
                this.gl.enableVertexAttribArray(GLAttribState.NORMAL_LOCATION);
            }
            //GLAttribState.setAttribVertexArrayPointer( this.gl, map );
            //GLAttribState.setAttribVertexArrayState( this.gl, this._attribState );
        }

        this.unbind();
    }

    setTexture(tex: GLTexture): void {
        this.texture = tex.texture;
    }

    setIBO(data: Uint16Array): void {
        // 创建ibo
        this._ibo = this.gl.createBuffer();
        if (this._ibo === null) {
            throw new Error('IBO creation fail');
        }
        // 绑定ibo
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this._ibo);
        // 将索引数据上传到ibo中
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
        this._indexCount = data.length;
    }

    /** 输入rgba颜色值，取值范围为`[0, 1]`之间，返回 `this` */
    color(r: number, g: number, b: number, a: number = 1.0): GLMeshBuilder {
        if (this._hasColor) {
            this._color.r = r;
            this._color.g = g;
            this._color.b = b;
            this._color.a = a;
        }
        return this;
    }

    /** 输入uv纹理坐标值，返回 `this` */
    texcoord(u: number, v: number): GLMeshBuilder {
        if (this._hasTexcoord) {
            this._texCoord.x = u;
            this._texCoord.y = v;
        }
        return this;
    }

    /** 输入法线值xyz，返回 `this` */
    normal(x: number, y: number, z: number): GLMeshBuilder {
        if (this._hasNormal) {
            this._normal.x = x;
            this._normal.y = y;
            this._normal.z = z;
        }
        return this;
    }

    /** `vertex` 必须要最后调用，输入xyz，返回 `this` */
    vertex(x: number, y: number, z: number): GLMeshBuilder {
        if (this._layout === EVertexLayout.INTERLEAVED) {
            // 针对interleaved存储方式的操作
            const list: TypedArrayList<Float32Array> =
                this._lists[GLMeshBuilder.INTERLEAVED];
            // position
            list.push(x);
            list.push(y);
            list.push(z);
            // texcoord
            if (this._hasTexcoord) {
                //TODO: [this._texCoord.x, this._texCoord.y].forEach((v) => list.push(v));
                list.push(this._texCoord.x);
                list.push(this._texCoord.y);
            }
            // normal
            if (this._hasNormal) {
                list.push(this._normal.x);
                list.push(this._normal.y);
                list.push(this._normal.z);
            }
            // color
            if (this._hasColor) {
                list.push(this._color.r);
                list.push(this._color.g);
                list.push(this._color.b);
                list.push(this._color.a);
            }
        } else {
            // sequenced和separated都是具有多个ArrayList
            // 针对除interleaved存储方式之外的操作
            let list: TypedArrayList<Float32Array> =
                this._lists[GLAttribState.POSITION_NAME];
            list.push(x);
            list.push(y);
            list.push(z);
            if (this._hasTexcoord) {
                list = this._lists[GLAttribState.TEXCOORD_NAME];
                list.push(this._texCoord.x);
                list.push(this._texCoord.y);
            }
            if (this._hasNormal) {
                list = this._lists[GLAttribState.NORMAL_NAME];
                list.push(this._normal.x);
                list.push(this._normal.y);
                list.push(this._normal.z);
            }
            if (this._hasColor) {
                list = this._lists[GLAttribState.COLOR_NAME];
                list.push(this._color.r);
                list.push(this._color.g);
                list.push(this._color.b);
                list.push(this._color.a);
            }
        }
        // 记录更新后的顶点数量
        this._vertCount++;
        return this;
    }

    /** 每次调用上述几个添加顶点属性的方法之前，必须要先调用 `begin` 方法，返回 `this` */
    begin(drawMode: number = this.gl.TRIANGLES): GLMeshBuilder {
        this.drawMode = drawMode; // 设置要绘制的mode,7种基本几何图元
        this._vertCount = 0; // 清空顶点数为0
        if (this._layout === EVertexLayout.INTERLEAVED) {
            const list: TypedArrayList<Float32Array> =
                this._lists[GLMeshBuilder.INTERLEAVED];
            list.clear(); // 使用自己实现的动态类型数组，重用
        } else {
            // 使用自己实现的动态类型数组，重用
            let list: TypedArrayList<Float32Array> =
                this._lists[GLAttribState.POSITION_NAME];
            list.clear();
            if (this._hasTexcoord) {
                list = this._lists[GLAttribState.TEXCOORD_NAME];
                list.clear();
            }
            if (this._hasNormal) {
                list = this._lists[GLAttribState.NORMAL_NAME];
                list.clear();
            }
            if (this._hasColor) {
                list = this._lists[GLAttribState.COLOR_NAME];
                list.clear();
            }
        }
        return this;
    }

    /** `end` 方法用于渲染操作 */
    end(mvp: mat4): void {
        this.program.bind(); // 绑定GLProgram
        this.program.setMatrix4(GLProgram.MVPMatrix, mvp); // 载入MVPMatrix uniform变量
        if (this.texture !== null) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.program.loadSampler();
        }
        this.bind(); // 绑定VAO
        if (this._layout === EVertexLayout.INTERLEAVED) {
            // 获取数据源
            const list: TypedArrayList<Float32Array> =
                this._lists[GLMeshBuilder.INTERLEAVED];
            // 获取VBO
            const buffer: WebGLBuffer = this._buffers[GLMeshBuilder.INTERLEAVED];
            // 绑定VBO
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            // 上传渲染数据到VBO中
            this.gl.bufferData(
                this.gl.ARRAY_BUFFER,
                list.subArray(),
                this.gl.DYNAMIC_DRAW,
            );
        } else if (this._layout === EVertexLayout.SEQUENCED) {
            // 针对sequenced存储方式的渲染处理
            const buffer: WebGLBuffer = this._buffers[GLMeshBuilder.SEQUENCED];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            //用的是预先分配显存机制
            this.gl.bufferData(
                this.gl.ARRAY_BUFFER,
                this._attribStride * this._vertCount,
                this.gl.DYNAMIC_DRAW,
            );

            const map: GLAttribOffsetMap =
                GLAttribState.getSequencedLayoutAttribOffsetMap(
                    this._attribState,
                    this._vertCount,
                );

            let list: TypedArrayList<Float32Array> =
                this._lists[GLAttribState.POSITION_NAME];
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, list.subArray());

            if (this._hasTexcoord) {
                list = this._lists[GLAttribState.TEXCOORD_NAME];
                this.gl.bufferSubData(
                    this.gl.ARRAY_BUFFER,
                    map[GLAttribState.TEXCOORD_NAME],
                    list.subArray(),
                );
            }

            if (this._hasNormal) {
                list = this._lists[GLAttribState.NORMAL_NAME];
                this.gl.bufferSubData(
                    this.gl.ARRAY_BUFFER,
                    map[GLAttribState.NORMAL_NAME],
                    list.subArray(),
                );
            }

            if (this._hasColor) {
                list = this._lists[GLAttribState.COLOR_NAME];
                this.gl.bufferSubData(
                    this.gl.ARRAY_BUFFER,
                    map[GLAttribState.COLOR_NAME],
                    list.subArray(),
                );
            }
            // 每次都要重新计算和绑定顶点属性数组的首地址
            GLAttribState.setAttribVertexArrayPointer(this.gl, map);
        } else {
            // 针对seperated存储方式的渲染数据处理
            // 需要每个VBO都绑定一次
            // position
            let buffer: WebGLBuffer = this._buffers[GLAttribState.POSITION_NAME];
            let list: TypedArrayList<Float32Array> =
                this._lists[GLAttribState.POSITION_NAME];
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(
                this.gl.ARRAY_BUFFER,
                list.subArray(),
                this.gl.DYNAMIC_DRAW,
            );

            // texture
            if (this._hasTexcoord) {
                buffer = this._buffers[GLAttribState.TEXCOORD_NAME];
                list = this._lists[GLAttribState.TEXCOORD_NAME];
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.bufferData(
                    this.gl.ARRAY_BUFFER,
                    list.subArray(),
                    this.gl.DYNAMIC_DRAW,
                );
            }

            // normal
            if (this._hasNormal) {
                buffer = this._buffers[GLAttribState.NORMAL_NAME];
                list = this._lists[GLAttribState.NORMAL_NAME];
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.bufferData(
                    this.gl.ARRAY_BUFFER,
                    list.subArray(),
                    this.gl.DYNAMIC_DRAW,
                );
            }

            // color
            if (this._hasColor) {
                buffer = this._buffers[GLAttribState.COLOR_NAME];
                list = this._lists[GLAttribState.COLOR_NAME];
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.bufferData(
                    this.gl.ARRAY_BUFFER,
                    list.subArray(),
                    this.gl.DYNAMIC_DRAW,
                );
            }
        }
        // GLMeshBuilder不使用索引缓冲区绘制方式，因此调用drawArrays方法
        if (this._ibo) {
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this._ibo);
            //this.gl.bufferData( this.gl.ELEMENT_ARRAY_BUFFER, this._indices.subArray(), this._indexCount );
            this.gl.drawElements(
                this.drawMode,
                this._indexCount,
                this.gl.UNSIGNED_SHORT,
                0,
            );
        } else {
            this.gl.drawArrays(this.drawMode, 0, this._vertCount);
        }
        this.unbind(); // 解绑VAO
        this.program.unbind(); // 解绑GLProgram
    }
}
