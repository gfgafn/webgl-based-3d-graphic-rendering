import { HttpRequest } from '../common/utils/HttpRequest';
import { CameraApplication } from '../lib/CameraApplication';
import { Q3BspParser as Quake3BspParser } from '../lib/Quake3BspParser';
import { Quake3BspScene } from '../lib/Quake3BspScene';
import { GLProgram } from '../webgl/WebGLProgram';
import { GLProgramCache } from '../webgl/WebGLProgramCache';

/** Q3BspApplication类为入口类，继承自CameraApplication类，因此可以使用键盘来控制摄像机在场景中的旋转和漫游 */
export class Q3BspApplication extends CameraApplication {
    bspScene: Quake3BspScene; // 引用了Quake3BspScene类
    program: GLProgram; // 引用了一个GLProgram类

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        this.bspScene = new Quake3BspScene(this.gl); // 创建Quake3BspScene对象
        this.program = GLProgramCache.instance.getMust('texture'); // 获取默认的纹理着色器对象
        this.camera.y = 6; // 设置摄像机的高度
    }

    render(): void {
        this.bspScene.draw(this.camera, this.program);
    }

    async run(): Promise<void> {
        // 1、创建Quake3BspParser对象，用来解析二进制的BSP文件格式
        const parser: Quake3BspParser = new Quake3BspParser();
        // 2、使用HttpRequest的loadArrayBufferAsync静态方法从服务器某个路径载入.bsp文件
        const buffer: ArrayBuffer = await HttpRequest.loadArrayBufferAsync(
            this.bspScene.pathPrifix + 'test1_paul.bsp',
        );
        // 3、注意上面载入bsp二进制数据时使用了await关键字对资源进行同步
        // 因此确保parse方法调用时，buffer是有数据的。
        // 如果上面方法不使用await，那么loadArrayBufferAsync是异步调用
        // parse方法调用时，buffer极大几率是个空对象，切记！
        parser.parse(buffer);
        // 4、当解析完成bsp文件后，调用bspScene的loadTextures方法，从服务器上载入相应的各种纹理
        // 需要注意的是，这里也使用了await关键字
        await this.bspScene.loadTextures(parser);
        // 5、一旦所有纹理都载入了后，就调用bspScene的compileMap方法生成GLStaticMesh对象
        this.bspScene.compileMap(parser);
        // 6、资源全局加载完成以及渲染数据都组装完成后，进入游戏循环
        super.run();
    }
}
