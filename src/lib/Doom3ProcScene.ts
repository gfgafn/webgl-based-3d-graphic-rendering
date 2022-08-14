import { vec3 } from '@tlaukkan/tsm';
import { Dictionary } from '../common/container/Dictionary';
import { TypedArrayList } from '../common/container/TypedArrayList';
import { HttpRequest, ImageInfo } from '../common/utils/HttpRequest';
import { GLAttribState } from '../webgl/WebGLAttribState';
import { GLMeshBuilder, GLStaticMesh } from '../webgl/WebGLMesh';
import { GLProgram } from '../webgl/WebGLProgram';
import { GLTexture } from '../webgl/WebGLTexture';
import { GLTextureCache } from '../webgl/WebGLTextureCache';
import { Camera } from './Camera';
import { Doom3ProcParser, Doom3Surface } from './Doom3ProcParser';
import { DrawHelper } from './DrawHelper';

export class Doom3ProcScene {
    gl: WebGLRenderingContext;
    renderSurfaces: RenderSurface[] = [];
    mins: vec3 = new vec3([Infinity, Infinity, Infinity]);
    maxs: vec3 = new vec3([-Infinity, -Infinity, -Infinity]);

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
    }

    draw(camera: Camera, program: GLProgram, builder: GLMeshBuilder | null = null): void {
        program.bind(); //绑定纹理着色器
        program.setMatrix4(GLProgram.MVPMatrix, camera.viewProjectionMatrix); // 设置当前的mvp矩阵
        // 遍历所有RenderSurface对象
        for (let i: number = 0; i < this.renderSurfaces.length; i++) {
            const surf: RenderSurface = this.renderSurfaces[i];
            // 增加如下代码用来判断当前的RenderSurface是否在视截体内
            if (
                camera.frustum.isBoundBoxVisible(surf.surface.mins, surf.surface.maxs) ===
                false
            ) {
                continue; // 不可见，就不要绘制了
            }
            surf.texture.bind(); // 绑定当前渲染表面的纹理对象
            program.loadSampler(); // 载入纹理Sampler
            surf.surface.draw(); // 调用GLStaticMesh的draw方法
            surf.texture.unbind(); // 解绑当前渲染表面的纹理，恢复WebGL的渲染状态
        }
        program.unbind(); // 渲染完毕后，解绑纹理着色器
    }

    async loadTextures(parser: Doom3ProcParser): Promise<void> {
        // 封装一个Promise对象
        return new Promise((resolve, reject): void => {
            // 创建字典对象
            const names: Dictionary<string> = new Dictionary<string>();
            const _promises: Promise<ImageInfo | null>[] = []; // 遍历所有Doom3Area对象
            for (let i: number = 0; i < parser.areas.length; i++) {
                // 遍历当前的Doom3Area对象中的所有Doom3Surface对象
                for (let j: number = 0; j < parser.areas[i].surfaces.length; j++) {
                    const surf: Doom3Surface = parser.areas[i].surfaces[j];
                    // 查看names字典，该字典保存所有已经添加的材质名称，目的是防止重复加载纹理
                    if (names.contains(surf.material) === false) {
                        // 如果不存在名字，就添加该名字
                        names.insert(surf.material, surf.material);
                        // 将Promise加入_promises数组中
                        _promises.push(
                            HttpRequest.loadImageAsyncSafe(
                                surf.material + '.png',
                                surf.material,
                            ),
                        );
                    }
                }
            }
            //console.log(names.Keys);
            // 添加完所有请求的Promise对象后，调用all静态方法
            Promise.all(_promises).then((images: (ImageInfo | null)[]) => {
                console.log(images); // 加载完毕后，输出所有ImaeInfo对象，用于debug
                // 遍历ImageInfo对象，加载图像数据，生成纹理对象
                for (let i: number = 0; i < images.length; i++) {
                    const img: ImageInfo | null = images[i];
                    if (img) {
                        // 创建GLTexture对象
                        const tex: GLTexture = new GLTexture(this.gl, img.name);
                        tex.upload(img.image); // 加载图像数据
                        GLTextureCache.instance.set(img.name, tex); // 将成功生成的GLTexture对象存储到GLTextureCache容器中
                    }
                }
                resolve(); // 全部完成后，调用resolve回调，表示完成回调
            });
        });
    }

    async parseDoom3Map(url: string): Promise<void> {
        const response: string = await HttpRequest.loadTextFileAsync(url);
        const parser: Doom3ProcParser = new Doom3ProcParser();
        parser.parse(response);
        parser.mins.copy(this.mins);
        parser.maxs.copy(this.maxs);
        // 使用await
        await this.loadTextures(parser);
        // 使用await等待所有纹理加载完毕后才运行下面的代码
        // 将Doom3的顶点和索引数据编译成GLStaticMesh对象
        const verts: TypedArrayList<Float32Array> = new TypedArrayList(Float32Array);
        const indices: TypedArrayList<Uint16Array> = new TypedArrayList(Uint16Array); //最简单的方式，每个surface为一个StaticMesh
        for (let i: number = 0; i < parser.areas.length; i++) {
            for (let j: number = 0; j < parser.areas[i].surfaces.length; j++) {
                verts.clear(); // 重用verts动态类型数组
                indices.clear(); // 重用indices动态类型数组
                parser.makeSurfaceVerticesTo(i, j, verts); // 将Doom3Surface对象中的渲染数据转换为动态类型数组（因为GLStatic只接受动态类型数组作为输入）
                parser.makeSurfaceIndicesTo(i, j, indices); // 将Doom3Surface对象中的索引数组转换为动态类型数组（因为GLStatic只接受动态类型数组作为输入）                    // 根据名称查找当前GLTextureCache是否存在该纹理，此时await
                this.loadTextures(parser);
                //已经载入所有纹理，但可能存在的情况是服务器上的确没有要加载的纹理
                const tex: GLTexture | undefined = GLTextureCache.instance.getMaybe(
                    parser.areas[i].surfaces[j].material,
                );
                if (tex === undefined) {
                    // 如果不存在，就用default纹理，创建GLStaticMesh
                    const mesh: GLStaticMesh = new GLStaticMesh(
                        this.gl,
                        GLAttribState.POSITION_BIT | GLAttribState.TEXCOORD_BIT,
                        verts.slice(),
                        indices.slice(),
                    );
                    // 然后创建RenderSurface
                    const surf: RenderSurface = new RenderSurface(
                        mesh,
                        GLTextureCache.instance.getMust('default'),
                        parser.areas[i].surfaces[j].mins,
                        parser.areas[i].surfaces[j].maxs,
                    );
                    // 将RenderSurface加入到渲染列表中
                    this.renderSurfaces.push(surf);
                } else {
                    // 创建GLStaticMesh
                    const mesh: GLStaticMesh = new GLStaticMesh(
                        this.gl,
                        GLAttribState.POSITION_BIT | GLAttribState.TEXCOORD_BIT,
                        verts.slice(),
                        indices.slice(),
                    );
                    // 然后创建RenderSurface
                    const surf: RenderSurface = new RenderSurface(
                        mesh,
                        tex,
                        parser.areas[i].surfaces[j].mins,
                        parser.areas[i].surfaces[j].maxs,
                    );
                    // 将RenderSurface加入到渲染列表中
                    this.renderSurfaces.push(surf);
                }
            }
        }
    }

    public drawBoundBox(
        builder: GLMeshBuilder,
        camera: Camera,
        program: GLProgram,
    ): void {
        program.bind(); //绑定纹理着色器
        for (let i: number = 0; i < this.renderSurfaces.length; i++) {
            const surf: RenderSurface = this.renderSurfaces[i];
            // 增加如下代码用来判断当前的RenderSurface是否在视截体内
            if (
                camera.frustum.isBoundBoxVisible(surf.surface.mins, surf.surface.maxs) ===
                false
            ) {
                continue; // 不可见，就不要绘制了
            }
            DrawHelper.drawBoundBox(
                builder,
                camera.viewProjectionMatrix,
                surf.surface.mins,
                surf.surface.maxs,
            );
        }
        program.unbind();
    }
}

class RenderSurface {
    surface: GLStaticMesh; // 要绘制的静态mesh对象
    texture: GLTexture; // 使用哪个纹理来绘制静态mesh
    constructor(surf: GLStaticMesh, tex: GLTexture, mins: vec3, maxs: vec3) {
        this.surface = surf;
        this.texture = tex;
        mins.copy(this.surface.mins); // 将Doom3Surface的mins复制到GLStaticMesh的mins属性中
        maxs.copy(this.surface.maxs); // 将Doom3Surface的maxs复制到GLStaticMesh的maxs属性中
    }
}
