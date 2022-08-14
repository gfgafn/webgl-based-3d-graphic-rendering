import { Camera } from './Camera';
import { Dictionary } from '../common/container/Dictionary';
import { TypedArrayList } from '../common/container/TypedArrayList';
import { HttpRequest, ImageInfo } from '../common/utils/HttpRequest';
import { GLAttribState } from '../webgl/WebGLAttribState';
import { GLStaticMesh } from '../webgl/WebGLMesh';
import { GLProgram } from '../webgl/WebGLProgram';
import { GLTexture } from '../webgl/WebGLTexture';
import { GLTextureCache } from '../webgl/WebGLTextureCache';
import { Q3BspParser, Q3BSPSurface } from './Quake3BspParser';

/** Quake3BspScene类用来从服务器异步加载纹理（loadTextures方法）、
 * 编译BSP渲染相关数据为GLStaticMesh对象存储格式（compileMap方法），
 * 以及整个场景的绘制（draw方法） */
export class Quake3BspScene {
    private _scene!: GLStaticMesh; // 整个quake3 BSP场景都被编译成第5章中定义的GLStaticMesh对象
    gl: WebGLRenderingContext; // WebGL上下文渲染对象
    texDict: Dictionary<GLTexture>; // 使用第2章封装的字典对象来存储加载的GLTexture对象
    // Q3有4种渲染表面类型，本书只渲染如下两种
    // 其中，BSP表面表示静态的房间的表面
    // 而mesh表面是例如椅子、凳子、灯等可独立添加的物体
    bspSurfaces: DrawSurface[]; // 类型为EQ3BSPSurfaceType.PLANAR的bsp场景表面
    meshSurfaces: DrawSurface[]; // 类型为类型为EQ3BSPSurfaceType.TRIANGLE静态物体表面
    private _defaultTexture: GLTexture; // 如果没找到BSP文件中的纹理对象，那么使用我们自己提供的默认对象
    pathPrifix: string = './data/quake3/'; // 默认的BSP资源服务器端文件夹
    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
        this.texDict = new Dictionary<GLTexture>();
        this.bspSurfaces = [];
        this.meshSurfaces = [];
        this._defaultTexture = GLTextureCache.instance.getMust('default');
    }

    // 使用async关键字，需要返回一个Promise对象
    // 说明本方法是一个异步加载方法，可以使用await关键字来同步资源
    async loadTextures(parser: Q3BspParser): Promise<void> {
        // 封装Promise对象
        return new Promise((resolve, reject): void => {
            const _promises: Promise<ImageInfo | null>[] = [];
            for (let i: number = 0; i < parser.textures.length; i++) {
                // 仅加载一次，所以先查询texDict中是否存在已经加载的纹理名
                if (this.texDict.contains(parser.textures[i].name)) {
                    // 如果已经加载了，就跳过
                    continue;
                }
                _promises.push(
                    HttpRequest.loadImageAsyncSafe(
                        this.pathPrifix + parser.textures[i].name + '.jpg',
                        parser.textures[i].name,
                    ),
                );
            }
            Promise.all(_promises)
                .then((images: (ImageInfo | null)[]) => {
                    for (let i: number = 0; i < images.length; i++) {
                        const img: ImageInfo | null = images[i];
                        if (img) {
                            // 加载纹理
                            const tex: GLTexture = new GLTexture(this.gl, img.name);
                            tex.upload(img.image);
                            this.texDict.insert(img.name, tex);
                        }
                    }
                    console.log(this.texDict.keys);
                    resolve();
                })
                .catch((e) => reject(e));
        });
    }

    compileMap(parser: Q3BspParser): void {
        // 所有的顶点都放入vertices中了
        // Q3BSPVertex带有更多的信息，而我们目前的BSP场景渲染仅需要位置坐标信息（ x /    y / z )和纹理坐标信息（ s / t )
        // 因此每个渲染顶点占用5个float
        const vertices: Float32Array = new Float32Array(parser.vertices.length * 5);
        let j: number = 0; // 将Q3BSPVertex复制到渲染顶点中
        for (let i: number = 0; i < parser.vertices.length; i++) {
            vertices[j++] = parser.vertices[i].x;
            vertices[j++] = parser.vertices[i].y;
            vertices[j++] = parser.vertices[i].z;
            vertices[j++] = parser.vertices[i].u;
            vertices[j++] = parser.vertices[i].v;
        } // 完成渲染用的顶点数据后，接着转换索引数据
        const indices: TypedArrayList<Uint16Array> = new TypedArrayList(Uint16Array); // 重组索引，先bsp地图的索引缓存，遍历所有Q3BSPSurface
        for (let i: number = 0; i < parser.mapSurfaces.length; i++) {
            // 逐表面
            const surf: Q3BSPSurface = parser.mapSurfaces[i];
            // 获取当前正在使用的Q3BSPSurface对象            // 注意使用下面如何寻址纹理名
            let tex: GLTexture | undefined = this.texDict.find(
                parser.textures[surf.textureIdx].name,
            );
            if (tex === undefined) {
                tex = this._defaultTexture;
            } // 起始地址和索引数量，这是关键点，地址用byte表示，每个索引使用unsignedShort类型，所以占2个字节，所以要indices.length2
            const drawSurf: DrawSurface = new DrawSurface(
                tex,
                indices.length * 2,
                surf.numIndex,
            );
            for (let k: number = 0; k < surf.numIndex; k++) {
                // 渲染BSP地图关键的索引寻址关系!! ! !一定要理解下面的关系式
                const pos: number =
                    surf.firstVertIdx + parser.indices[surf.firstIndex + k];
                indices.push(pos);
            }
            this.bspSurfaces.push(drawSurf);
        } // 重组索引，静态物体的索引缓存
        for (let i: number = 0; i < parser.meshSurfaces.length; i++) {
            const surf: Q3BSPSurface = parser.meshSurfaces[i];
            // 可能存在的情况是，BSP中有纹理名，但是服务器上不存在对应的图像，就需要先检测是否有该图像的存在
            let tex: GLTexture | undefined = this.texDict.find(
                parser.textures[surf.textureIdx].name,
            );
            if (tex === undefined) {
                // 如果图像不存在，就使用默认纹理
                tex = this._defaultTexture;
            } // 起始地址和索引数量，这是关键点，地址用byte表示
            const drawSurf: DrawSurface = new DrawSurface(
                tex,
                indices.length * 2,
                surf.numIndex,
            );
            for (let k: number = 0; k < surf.numIndex; k++) {
                // 渲染BSP地图关键的索引寻址关系!! ! !一定要理解下面的关系式
                const pos: number =
                    surf.firstVertIdx + parser.indices[surf.firstIndex + k];
                indices.push(pos);
            }
            this.meshSurfaces.push(drawSurf);
        } // 合成一个庞大的顶点和索引缓存后，就可以生成GLStaticMesh对象了
        this._scene = new GLStaticMesh(
            this.gl,
            GLAttribState.POSITION_BIT | GLAttribState.TEXCOORD_BIT,
            vertices,
            indices.subArray(),
        );
    }

    draw(camera: Camera, program: GLProgram): void {
        // 绑定当前使用的GLProgram对象
        program.bind(); // 设置当前的mvp矩阵
        program.setMatrix4(GLProgram.MVPMatrix, camera.viewProjectionMatrix);
        this._scene.bind(); // 绑定场景vao对象        // 遍历所有的BSP表面
        for (let i: number = 0; i < this.bspSurfaces.length; i++) {
            const surf: DrawSurface = this.bspSurfaces[i];
            surf.texture.bind(); // 绑定纹理对象
            program.loadSampler(); // 载入纹理Sampler
            // 调用drawRange方法
            this._scene.drawRange(surf.byteOffset, surf.elemCount);
            surf.texture.unbind(); // 解除纹理对象的绑定
        }
        // 接下来绘制所有静态mesh对象的表面，其渲染流程同上
        for (let i: number = 0; i < this.meshSurfaces.length; i++) {
            const surf: DrawSurface = this.meshSurfaces[i];
            surf.texture.bind();
            program.loadSampler();
            this._scene.drawRange(surf.byteOffset, surf.elemCount);
            surf.texture.unbind();
        }
        // 最后解绑vao和program对象
        this._scene.unbind();
        program.unbind();
    }
}

class DrawSurface {
    texture: GLTexture; // 当前要绘制的表面使用哪个纹理对象
    byteOffset: number;
    elemCount: number;
    constructor(texture: GLTexture, byteOffset: number = -1, count: number = 0) {
        this.texture = texture;
        this.byteOffset = byteOffset;
        this.elemCount = count;
    }
}
