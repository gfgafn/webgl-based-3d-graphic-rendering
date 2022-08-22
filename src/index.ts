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

const demoApplicationsMapper = {
    '第3章: RotatingCubeApplication': RotatingCubeApplication,
    '第3章: AsyncLoadTestApplication': AsyncLoadTestApplication,
    '第4章: BasicWebGLApplication': BasicWebGLApplication,
    '第7章: MeshBuilderApplication': MeshBuilderApplication,
    '第7章: CoordSystemApplication': CoordSystemApplication,
    '第8章: Q3BspApplication': Q3BspApplication,
    '第9章: Doom3Application': Doom3Application,
    '第10章: MD5SkinedMeshApplication': MD5SkinedMeshApplication,
} as const;

function createText(tagName: string): Text {
    const elem: HTMLSpanElement = document.getElementById(tagName) as HTMLSpanElement;
    const text: Text = document.createTextNode('');
    elem.appendChild(text);
    return text;
}

const [fps, tris, verts]: Text[] = ['fps', 'tris', 'verts'].map((value) =>
    createText(value),
);

function frameCallback(app: Application): void {
    fps.nodeValue = String(app.fps.toFixed(0));
    tris.nodeValue = '0';
    verts.nodeValue = '0';
}

type demoApplicationNameType = keyof typeof demoApplicationsMapper;

Object.keys(demoApplicationsMapper).forEach((key) =>
    select.options.add(new Option(key, key)),
);

select.onchange = () => {
    const appName = select.value as demoApplicationNameType;
    const app: Application = new demoApplicationsMapper[appName](canvas);
    runApplication(app);
};

const runApplication = (
    app: Application | (new (canvas: HTMLCanvasElement) => Application),
) => {
    if (typeof app === 'function') {
        app = new app(canvas);
    }
    app.frameCallback = frameCallback;
    app.run();
};

runApplication(RotatingCubeApplication);
// runApplication(AsyncLoadTestApplication);
// runApplication(BasicWebGLApplication);
// runApplication(MeshBuilderApplication);
// runApplication(CoordSystemApplication);
// runApplication(Q3BspApplication);
// runApplication(Doom3Application);
// runApplication(MD5SkinedMeshApplication);
