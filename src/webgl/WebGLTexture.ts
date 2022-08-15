import { GLHelper } from './WebGLHelper';

export enum EGLTexWrapType {
    GL_REPEAT, // 设置为gl对应的常量
    GL_MIRRORED_REPEAT,
    GL_CLAMP_TO_EDGE,
}

const CSSColors = <const>[
    'aqua', // 浅绿色
    'black', // 黑色
    'blue', // 蓝色
    'fuchsia', // 紫红色
    'gray', // 灰色
    'green', // 绿色
    'lime', // 绿黄色
    'maroon', // 褐红色
    'navy', // 海军蓝
    'olive', // 橄榄色
    'orange', // 橙色
    'purple', // 紫色
    'red', // 红色
    'silver', // 银灰色
    'teal', // 蓝绿色
    'yellow', // 黄色
    'white', // 白色
];

type CSSColor = typeof CSSColors[number];

/** `GLTexuture` 类可以在 `GLStaticMesh` 或 `GLMeshBuilder` 生成的网格对象上进行纹理贴图操作。 */
export class GLTexture {
    gl: WebGLRenderingContext;
    /** 是否使用mipmap多级渐进纹理生成纹理对象 */
    isMipmap: boolean;
    /** 当前纹理对象的像素宽度 */
    width: number;
    /** 当前纹理对象的像素高度 */
    height: number;
    /** 在内存或显存中像素的存储格式，默认为gl.RGBA */
    format: number;
    /** 像素分量的数据类型，默认为 `gl.UNSIGNED_BYTE` */
    type: number;
    /** WebGLTexture对象 */
    texture: WebGLTexture;
    /** 为 `gl.TEXTURE_2D`（另外一个可以是TEXTURE_CUBE_MAP，本书不使用TEXTURE_CUBE_MAP相关内容） */
    target: number;

    /** css标准色字符串 */
    static readonly Colors: ReadonlyArray<CSSColor> = CSSColors;
    /**
     * @param gl WebGLRenderingContext
     * @param name 纹理的名称
     */
    constructor(gl: WebGLRenderingContext, public name: string = '') {
        this.gl = gl;
        this.isMipmap = false;
        this.width = this.height = 0;
        this.format = gl.RGBA;
        this.type = gl.UNSIGNED_BYTE;
        const tex: WebGLTexture | null = gl.createTexture();
        if (!tex) throw new Error('WebGLTexture创建不成功!');
        this.texture = tex;
        this.target = gl.TEXTURE_2D;
        this.name = name;
        this.wrap();
        this.filter();
    }

    /** 载入相关图像数据 */
    upload(
        source: HTMLImageElement | HTMLCanvasElement,
        unit: number = 0,
        mipmap: boolean = false,
    ): void {
        this.bind(unit); // 先绑定当前要操作的WebGLTexture对象，默认为0
        // 否则贴图会倒过来
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1);
        this.width = source.width;
        this.height = source.height;
        if (mipmap === true) {
            // 使用mipmap生成纹理
            const isWidthPowerOfTwo: boolean = GLTexture.isPowerOfTwo(this.width);
            const isHeightPowerOfTwo: boolean = GLTexture.isPowerOfTwo(this.height);
            // 如果源图像的宽度和高度都是2的n次方格式，则直接载入像素数据然后调用generateMipmap方法
            if (isWidthPowerOfTwo && isHeightPowerOfTwo) {
                this.gl.texImage2D(
                    this.target,
                    0,
                    this.format,
                    this.format,
                    this.type,
                    source,
                );
                this.gl.generateMipmap(this.target);
            }
            // 否则说明至少有一个不是2的n次方，需要特别处理
            else {
                const canvas: HTMLCanvasElement =
                    GLTexture.createPowerOfTwoCanvas(source);
                this.gl.texImage2D(
                    this.target,
                    0,
                    this.format,
                    this.format,
                    this.type,
                    canvas,
                );
                GLHelper.checkGLError(this.gl);
                this.gl.generateMipmap(this.target);
                GLHelper.checkGLError(this.gl);
                this.width = canvas.width;
                this.height = canvas.height;
            }
            this.isMipmap = true;
        } else {
            this.isMipmap = false;
            this.gl.texImage2D(
                this.target,
                0,
                this.format,
                this.format,
                this.type,
                source,
            );
        }
        console.log('当前纹理尺寸为： ', this.width, this.height);
        this.unbind(); // 解绑当前要操作的WebGLTexture对象
    }

    /** 静态辅助数学方法，判断参数x（必须是4）是否是2的n次方，即x是不是1、2、4、8、16、32、64..... */
    static isPowerOfTwo(x: number): boolean {
        return (x & (x - 1)) == 0;
    }

    /**
     * 静态辅助数学方法，给定整数参数x，取下一个2的n次方数
     * 如果x为3，则返回4；如果x为4，则返回4；如果x为5，则返回8；以此类推
     */
    static getNextPowerOfTwo(x: number): number {
        if (x <= 0) throw new Error('参数必须要大于0! ');
        --x;
        for (let i = 1; i < 32; i <<= 1) {
            x = x | (x >> i);
        }
        return x + 1;
    }

    /**
     * 将非2的n次方的`srcImage`转换成`2`的`n`次方的`CanvasRenderingContext2D`对象，
     * 然后后续用来生成`mipmap`纹理
     */
    static createPowerOfTwoCanvas(
        srcImage: HTMLImageElement | HTMLCanvasElement,
    ): HTMLCanvasElement {
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width = GLTexture.getNextPowerOfTwo(srcImage.width);
        canvas.height = GLTexture.getNextPowerOfTwo(srcImage.height);
        const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
        if (ctx === null) {
            throw new Error('未能成功创建CanvasRenderingContext2D对象');
        }
        ctx.drawImage(
            srcImage,
            0,
            0,
            srcImage.width,
            srcImage.height,
            0,
            0,
            canvas.width,
            canvas.height,
        );
        return canvas;
    }

    bind(unit: number = 0): void {
        if (this.texture) {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
            this.gl.bindTexture(this.target, this.texture);
        }
    }

    unbind(): void {
        if (this.texture) {
            this.gl.bindTexture(this.target, null);
        }
    }

    //TEXTURE_MIN_FILTER: NEAREST_MIPMAP_LINEAR(默认)
    //TEXTURE_MAG_FILTER: LINEAR(默认)
    /**
     * 调用`WebGLRenderingContext.texParameteri()`方法设置纹理参数
     * @param minLinear
     * @param magLinear
     */
    filter(minLinear: boolean = true, magLinear: boolean = true): void {
        // 在设置filter时先要绑定当前的纹理目标
        this.gl.bindTexture(this.target, this.texture);
        if (this.isMipmap) {
            this.gl.texParameteri(
                this.target,
                this.gl.TEXTURE_MIN_FILTER,
                minLinear ? this.gl.LINEAR_MIPMAP_LINEAR : this.gl.NEAREST_MIPMAP_NEAREST,
            );
        } else {
            this.gl.texParameteri(
                this.target,
                this.gl.TEXTURE_MIN_FILTER,
                minLinear ? this.gl.LINEAR : this.gl.NEAREST,
            );
        }
        this.gl.texParameteri(
            this.target,
            this.gl.TEXTURE_MIN_FILTER,
            magLinear ? this.gl.LINEAR : this.gl.NEAREST,
        );
    }

    wrap(mode: EGLTexWrapType = EGLTexWrapType.GL_REPEAT): void {
        this.gl.bindTexture(this.target, this.texture);
        if (mode === EGLTexWrapType.GL_CLAMP_TO_EDGE) {
            this.gl.texParameteri(
                this.target,
                this.gl.TEXTURE_WRAP_S,
                this.gl.CLAMP_TO_EDGE,
            );
            this.gl.texParameteri(
                this.target,
                this.gl.TEXTURE_WRAP_T,
                this.gl.CLAMP_TO_EDGE,
            );
        } else if (mode === EGLTexWrapType.GL_REPEAT) {
            this.gl.texParameteri(this.target, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
            this.gl.texParameteri(this.target, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        } else {
            this.gl.texParameteri(
                this.target,
                this.gl.TEXTURE_WRAP_S,
                this.gl.MIRRORED_REPEAT,
            );
            this.gl.texParameteri(
                this.target,
                this.gl.TEXTURE_WRAP_T,
                this.gl.MIRRORED_REPEAT,
            );
        }
    }

    /** 创建默认的2的n次方的纹理对象 */
    static createDefaultTexture(gl: WebGLRenderingContext): GLTexture {
        const step: number = 4;
        const canvas: HTMLCanvasElement = document.createElement(
            'canvas',
        ) as HTMLCanvasElement;
        canvas.width = 32 * step;
        canvas.height = 32 * step;
        const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
        if (context === null) {
            alert('离屏Canvas获取渲染上下文失败!');
            throw new Error('离屏Canvas获取渲染上下文失败!');
        }
        for (let i: number = 0; i < step; i++) {
            for (let j: number = 0; j < step; j++) {
                const idx: number = step * i + j;
                context.save();
                context.fillStyle = GLTexture.Colors[idx];
                context.fillRect(i * 32, j * 32, 32, 32);
                context.restore();
            }
        }
        const tex: GLTexture = new GLTexture(gl);
        tex.wrap();
        tex.upload(canvas);
        return tex;
    }
}
