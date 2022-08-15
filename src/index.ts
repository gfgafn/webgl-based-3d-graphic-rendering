import { Application } from './common/Application';
import { AsyncLoadTestApplication } from './demo/AsyncLoadTestApplication';
import { BasicWebGLApplication } from './demo/BasicWebGLApplication';
import { CoordSystemApplication } from './demo/CoordSystemApplication';
import { Doom3Application } from './demo/Doom3Application';
import { MD5SkinedMeshApplication } from './demo/MD5SkinedMeshApplication';
import { MeshBuilderApplication } from './demo/MeshBuilderApplication';
import { Q3BspApplication } from './demo/Q3BspApplication';
import { RotatingCubeApplication } from './demo/RotatingCubeApplication';

// 获得HTMLSelectElement对象，用来切换要运行的Application
const select: HTMLSelectElement = document.getElementById('select') as HTMLSelectElement;

// 获取用于获得webgl上下文对象的HTMLCanvasElement元素
const canvas: HTMLCanvasElement | null = document.getElementById(
    'webgl',
) as HTMLCanvasElement;

const demoSelectOptions: string[] = [
    '第3章: RotatingCubeApplication',
    '第3章: AsyncLoadTestApplication',
    '第4章: BasicWebGLApplication',
    '第7章: MeshBuilderApplication',
    '第7章: CoordSystemApplication',
    '第8章: Q3BspApplication',
    '第9章: Doom3Application',
    '第10章: MD5SkinedMeshApplication',
];

const demoApplications = [
    RotatingCubeApplication,
    AsyncLoadTestApplication,
    BasicWebGLApplication,
    MeshBuilderApplication,
    CoordSystemApplication,
    Q3BspApplication,
    Doom3Application,
    MD5SkinedMeshApplication,
];

function addOptionsToSelectElement(select: HTMLSelectElement): void {
    if (!canvas) return;
    demoSelectOptions.forEach((option) => select.options.add(new Option(option, option)));
}

enum EAPPName {
    ROTATINGCUBE,
    ASYNCLOAD,
    BASICWEBGL,
    MESHBUILDER,
    COORDSYSTEM,
    Q3BSP,
    DOOM3PROC,
    DOOM3MD5,
}

function runApplication(name: EAPPName): void {
    // 获取用于获得webgl上下文对象的HTMLCanvasElement元素
    const canvas: HTMLCanvasElement | null = document.getElementById(
        'webgl',
    ) as HTMLCanvasElement;
    if (name === EAPPName.ROTATINGCUBE) {
        const app: RotatingCubeApplication = new RotatingCubeApplication(canvas);
        app.frameCallback = frameCallback;
        app.run();
    } else if (name === EAPPName.ASYNCLOAD) {
        const app: AsyncLoadTestApplication = new AsyncLoadTestApplication(canvas);
        app.run();
    } else if (name === EAPPName.BASICWEBGL) {
        const app: Application = new BasicWebGLApplication(canvas);
        app.frameCallback = frameCallback;
        app.run();
    } else if (name === EAPPName.MESHBUILDER) {
        const app: Application = new MeshBuilderApplication(canvas);
        app.frameCallback = frameCallback;
        app.start();
    } else if (name === EAPPName.COORDSYSTEM) {
        const app: CoordSystemApplication = new CoordSystemApplication(canvas);
        app.frameCallback = frameCallback;
        app.run();
    } else if (name === EAPPName.Q3BSP) {
        const app: Application = new Q3BspApplication(canvas);
        app.frameCallback = frameCallback;
        app.run();
    } else if (name === EAPPName.DOOM3PROC) {
        const app: Doom3Application = new Doom3Application(canvas);
        app.frameCallback = frameCallback;
        app.run();
    } else if (name === EAPPName.DOOM3MD5) {
        const app: MD5SkinedMeshApplication = new MD5SkinedMeshApplication(canvas);
        app.frameCallback = frameCallback;
        app.run();
    }
}

function createText(tagName: string): Text {
    const elem: HTMLSpanElement = document.getElementById(tagName) as HTMLSpanElement;
    const text: Text = document.createTextNode('');
    elem.appendChild(text);
    return text;
}

const fps: Text = createText('fps');
const tris: Text = createText('tris');
const verts: Text = createText('verts');

function frameCallback(app: Application): void {
    fps.nodeValue = String(app.fps.toFixed(0));
    tris.nodeValue = '0';
    verts.nodeValue = '0';
}

addOptionsToSelectElement(select);

select.onchange = () => {
    const app: Application = new demoApplications[select.selectedIndex](canvas);
    app.frameCallback = frameCallback;
    app.run();
};

runApplication(EAPPName.ROTATINGCUBE);
// runApplication(EAPPName.ASYNCLOAD);
// runApplication(EAPPName.BASICWEBGL);
// runApplication(EAPPName.MESHBUILDER);
// runApplication(EAPPName.COORDSYSTEM);
// runApplication(EAPPName.Q3BSP);
// runApplication(EAPPName.DOOM3PROC);
// runApplication(EAPPName.DOOM3MD5);
