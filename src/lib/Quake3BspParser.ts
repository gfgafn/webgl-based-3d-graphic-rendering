import { vec3 } from '@tlaukkan/tsm';
import { MathHelper } from '../common/math/MathHelper';
import { vec3Adapter } from '../common/math/tsmAdapter';

/** Quake3BspParser类使用DataView对象将从服务器获得的
 * 二进制（ArrayBuffer）BSP数据解析成预先定义的一些数据结构
 */
class Quake3BspParser {
    vertices: Q3BSPVertex[] = [];
    indices: number[] = [];
    mapSurfaces: Q3BSPSurface[] = [];
    meshSurfaces: Q3BSPSurface[] = [];
    textures: Q3BSPTexture[] = [];
    entities: string = '';

    // 载入各个lump的偏移地址
    private _loadHeader(view: DataView): Q3BSPHeader {
        const header: Q3BSPHeader = new Q3BSPHeader();
        let offset: number = 0; // BSP头的ID信息(4字节 int类型)，使用小端模式读取（Intel系列CPU是小端模式）
        header.id = view.getInt32(offset, true);
        offset += 4; // 4 byte 整型 bsp地图版本号
        header.version = view.getInt32(offset, true);
        offset += 4;
        for (let i = 0; i < Q3BspParser.TOTALLUMPS; i++) {
            const lump: Q3BSPLump = new Q3BSPLump();
            lump.offset = view.getInt32(offset, true);
            offset += 4;
            lump.length = view.getInt32(offset, true);
            offset += 4; // 不能使用push，因为BSPHeader已经分配好17个lump的内存了
            header.lumps[i] = lump;
        }
        console.log('sizeof(Q3BSPHeader) = ', offset);
        return header;
    }

    private _loadEntityString(header: Q3BSPHeader, view: DataView): void {
        // 使用Q3BspParser.ENTITIES索引号获取EntityString的Lump
        const lump: Q3BSPLump = header.lumps[Q3BspParser.ENTITIES]; // 获取EntityString块的字节偏移地址
        let offset: number = lump.offset;
        let charCode: number = 0;
        const strArr: string[] = []; // 将以char表示的字符存储在strArr数组中
        // 很重要的一点，EntityString Lump的length属性正好表示的是char（1 byte)的数量
        // 所以遍历每个char数据
        for (let j: number = 0; j < lump.length; j++) {
            // 每个char是1个byte，也就是8个bit，所以要用getInt8方法
            charCode = view.getInt8(offset);
            offset += 1; // 更新offset变量，让下一次读取的指针后移1字节
            // BSP中存储的是C语言风格的字符数组表示，最后一个字符为0，表示字符串的结尾
            // 因此需要判断不为0，则添加到TS / JS的字符串数组中
            if (charCode !== 0) {
                strArr[j] = String.fromCharCode(charCode);
            }
        } // 最后完全解析后，使用Array对象的join方法，并且注意参数为“”，中间没有空格
        // 这样合成一个完整的BSPEntityString，并且输出看看结果
        this.entities = strArr.join('');
        console.log('--------------load BSPEntityString---------');
        console.log(this.entities);
    }

    private _loadTextures(header: Q3BSPHeader, view: DataView): void {
        const lump: Q3BSPLump = header.lumps[Q3BspParser.TEXTURES]; // 如何计算Q3BSPTexture数量：数据块字节数除以每个Q3BSPTexture本身的字节数
        const count: number = lump.length / Q3BSPTexture.TOTALBYTES;
        let offset: number = lump.offset; // 获取当前的偏移量
        this.textures = new Array(count); // 分配内存
        const strArr: string[] = new Array(64); // BPS中name字符串最长63个char + '\0’结尾，合计64个
        let charCode: number = 0; // 遍历所有的Q3BSPTexture
        for (let i: number = 0; i < count; i++) {
            // 遍历每个name              //64定长字符串，不足64的部分null结尾
            for (let j: number = 0; j < 64; j++) {
                // 获取char表示的字符
                charCode = view.getInt8(offset);
                offset += 1; // 下一个偏移量
                if (charCode !== 0) {
                    // 加载到TS / JS字符窜数组中
                    strArr[j] = String.fromCharCode(charCode);
                }
            } // 生成Q3BSPTexture
            const texture: Q3BSPTexture = new Q3BSPTexture();
            texture.name = strArr.join(''); // 合成TS / JS字符串              // 读取flag , int类型，4个字节
            texture.flag = view.getInt32(offset, true);
            offset += 4; // 读取context, int类型，4个字节
            texture.content = view.getInt32(offset, true);
            offset += 4; // 将Q3BSPTexture对象添加到QuakeBspParser类的textures数组中缓存起来，后续会使用
            this.textures[i] = texture;
        } // 最后输出纹理相关信息
        console.log('-----------load BSPTexture-------------- ');
        console.log(this.textures);
    }

    private _loadVerts(header: Q3BSPHeader, view: DataView): void {
        const lump: Q3BSPLump = header.lumps[Q3BspParser.VERTS];
        const count: number = lump.length / Q3BSPVertex.VERTTOTALBYTES; // 计算出顶点总数
        let offset: number = lump.offset;
        this.vertices = new Array(count);
        let vert!: Q3BSPVertex;
        for (let i: number = 0; i < count; i++) {
            vert = new Q3BSPVertex(); // 读取x、y、z坐标，每个分量都是4 byte浮点数
            vert.x = view.getFloat32(offset, true);
            offset += 4;
            vert.y = view.getFloat32(offset, true);
            offset += 4;
            vert.z = view.getFloat32(offset, true);
            offset += 4; // 读取u v纹理坐标，每个分量都是4 byte浮点数
            vert.u = view.getFloat32(offset, true);
            offset += 4;
            vert.v = view.getFloat32(offset, true);
            offset += 4; // 读取lu lv光照图纹理坐标，每个分量都是4 byte浮点数
            vert.lu = view.getFloat32(offset, true);
            offset += 4;
            vert.lv = view.getFloat32(offset, true);
            offset += 4; // 读取法向量，每个分量都是4 byte浮点数
            vert.nx = view.getFloat32(offset, true);
            offset += 4;
            vert.ny = view.getFloat32(offset, true);
            offset += 4;
            vert.nz = view.getFloat32(offset, true);
            offset += 4; // 读取r / g / b / a颜色，每个分量都是1 byte字节数
            vert.r = view.getUint8(offset);
            offset += 1;
            vert.g = view.getUint8(offset);
            offset += 1;
            vert.b = view.getUint8(offset);
            offset += 1;
            vert.a = view.getUint8(offset);
            offset += 1; // 转换为opengl坐标系
            Q3BspParser.toGLCoord(vert); // 添加到vertices数组中缓存起来
            this.vertices[i] = vert;
        } // 输出顶点信息
        console.log('-----------load BSPVert-------------- ');
        console.log(this.vertices);
    }

    /** 解析顶点索引数据
     * Quake3 BSP文件中存储的索引数据类型为整型
     */
    private _loadIndices(header: Q3BSPHeader, view: DataView): void {
        const lump: Q3BSPLump = header.lumps[Q3BspParser.INDEXES];
        const count: number = lump.length / 4; // 每个索引用4个字节表示(int 32类型)
        let offset: number = lump.offset;
        this.indices = new Array(count);
        for (let i = 0; i < count; i++) {
            const value: number = view.getInt32(offset, true);
            this.indices[i] = value;
            offset += 4;
        } // 输出顶点索引数据
        console.log('-----------load BSPIndices-------------- ');
        console.log(this.indices);
    }

    private _loadSurfaces(header: Q3BSPHeader, view: DataView): void {
        const lump: Q3BSPLump = header.lumps[Q3BspParser.SURFACES];
        const count: number = lump.length / Q3BSPSurface.TOTALBYETS;
        let offset: number = lump.offset;
        for (let i: number = 0; i < count; i++) {
            const surface: Q3BSPSurface = new Q3BSPSurface();
            surface.textureIdx = view.getInt32(offset, true);
            offset += 4;
            surface.effectIdx = view.getInt32(offset, true);
            offset += 4;
            surface.faceType = Q3BspParser.toSurfaceType(view.getInt32(offset, true));
            offset += 4;
            surface.firstVertIdx = view.getInt32(offset, true);
            offset += 4;
            surface.numVert = view.getInt32(offset, true);
            offset += 4;
            surface.firstIndex = view.getInt32(offset, true);
            offset += 4;
            surface.numIndex = view.getInt32(offset, true);
            offset += 4;
            surface.lightMapIdx = view.getInt32(offset, true);
            offset += 4;
            surface.lightMapX = view.getInt32(offset, true);
            offset += 4;
            surface.lightMapY = view.getInt32(offset, true);
            offset += 4;
            surface.lightMapWidth = view.getInt32(offset, true);
            offset += 4;
            surface.lightMapHeight = view.getInt32(offset, true);
            offset += 4;
            surface.lightMapOrigin = new vec3();
            surface.lightMapOrigin.x = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapOrigin.y = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapOrigin.z = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapXAxis = new vec3();
            surface.lightMapXAxis.x = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapXAxis.y = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapXAxis.z = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapYAxis = new vec3();
            surface.lightMapYAxis.x = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapYAxis.y = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapYAxis.z = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapZAxis = new vec3();
            surface.lightMapZAxis.x = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapZAxis.y = view.getFloat32(offset, true);
            offset += 4;
            surface.lightMapZAxis.z = view.getFloat32(offset, true);
            offset += 4;
            surface.patchWidth = view.getInt32(offset, true);
            offset += 4;
            surface.patchHeight = view.getInt32(offset, true);
            offset += 4; // 进行表面分类，根据类型添加到对应的表面数组中，目前只支持两种类型表面
            switch (surface.faceType) {
                case EQ3BSPSurfaceType.PLANAR:
                    this.mapSurfaces.push(surface);
                    break;
                case EQ3BSPSurfaceType.TRIANGLE:
                    this.meshSurfaces.push(surface);
                    break;
                default:
                    break;
            }
        }
        // 排序整个表面，先按表面类型从小到大排序
        // 如果表面类型一致，则再按纹理从小到大排序
        // 按上述权重排序的目的是为了减少渲染状态的切换，加快渲染速度
        this.mapSurfaces.sort((a: Q3BSPSurface, b: Q3BSPSurface): number => {
            return a.textureIdx - b.textureIdx;
        });
        this.meshSurfaces.sort((a: Q3BSPSurface, b: Q3BSPSurface): number => {
            return a.textureIdx - b.textureIdx;
        }); // 最后输出表面相关信息
        console.log('-----------load BSPSurface-------------- ');
        console.log('Map Surfs: ', this.mapSurfaces);
        console.log(' Mesh Surfs: ', this.meshSurfaces);
    }

    private static toSurfaceType(type: number): EQ3BSPSurfaceType {
        if (type === 0) {
            return EQ3BSPSurfaceType.BAD;
        } else if (type === 1) {
            return EQ3BSPSurfaceType.PLANAR;
        } else if (type === 2) {
            return EQ3BSPSurfaceType.PATCH;
        } else if (type === 3) {
            return EQ3BSPSurfaceType.TRIANGLE;
        } else if (type === 4) {
            return EQ3BSPSurfaceType.BILLBOARD;
        }
        return EQ3BSPSurfaceType.BAD;
    }

    // Quake3BspParser核心方法
    parse(data: ArrayBuffer): void {
        // 参数data来自服务器，是一个BSP二进制文件数据
        // 要解析二进制数据，必须要用DataView对象
        const view: DataView = new DataView(data);
        // 调用_loadHeader私有方法，解析BSP文件头
        const header: Q3BSPHeader = this._loadHeader(view);
        // 判断文件的id和版本号正确
        if (header.id !== Q3BspParser.BSPID && header.version !== Q3BspParser.BSPVER) {
            alert('Quake3 BSP 版本不正确!');
            throw new Error('Quake3 BSP 版本不正确!');
        } // 一旦解析好文件头，有了各个Lump的偏移和大小数据后，我们就可以进行随机读取
        // BSP中有17个数据Lump，本节我们只使用如下5个数据块
        this._loadEntityString(header, view);
        this._loadTextures(header, view);
        this._loadVerts(header, view);
        this._loadIndices(header, view);
        this._loadSurfaces(header, view);
    }

    // IBSP int类型 占4字节 使用左移操作将IBSP四个字符写入到一个32位整数中去
    static readonly BSPID: number =
        ('P'.charCodeAt(0) << 24) +
        ('S'.charCodeAt(0) << 16) +
        ('B'.charCodeAt(0) << 8) +
        'I'.charCodeAt(0);
    // BSP版本号 int类型 占4个字节，Quake3 BSP版本编号值为46
    static readonly BSPVER: number = 46;

    // BSP文件格式中所有的数据块名称和索引编号
    // 编号必须是如下所设定的值，千万不能随便修改
    static readonly ENTITIES: number = 0; // 本DEMO解析
    static readonly TEXTURES: number = 1; // 本DEMO解析，shader，但是我们只当纹理使用
    static readonly PLANES: number = 2;

    static readonly BSPNODES: number = 3;
    static readonly BSPLEAFS: number = 4;
    static readonly LEAFSURFACES: number = 5;
    static readonly LEAFBRUSHES: number = 6;
    static readonly MODELS: number = 7;
    static readonly BRUSHES: number = 8;
    static readonly BRUSHSIDES: number = 9;
    static readonly VERTS: number = 10; // 所有可渲染顶点数据
    static readonly INDEXES: number = 11; // 索引数据
    static readonly EFFECTS: number = 12;
    static readonly SURFACES: number = 13; // 所有表面数据
    static readonly LIGHTMAPS: number = 14;
    static readonly LIGHTGRID: number = 15;
    static readonly VISIBILITY: number = 16;
    static readonly TOTALLUMPS: number = 17;

    static toGLCoord(v: Q3BSPVertex, scale: number = 8): void {
        // 将Q3的顶点坐标变换为WebGL坐标系        // 参考图8.5与图8.6
        const f: number = v.y; // 记录Q3的y坐标值
        v.y = v.z; // WebGL的y值相当于Q3的z值
        v.z = -f; // WebGL的z值相当于Q3的-y值，x值不用变，都指向右        // 进行顶点的缩放操作
        if (!MathHelper.numberEquals(scale, 0) && !MathHelper.numberEquals(scale, 1.0)) {
            v.x /= scale;
            v.y /= scale;
            v.z /= scale;
        } // 将Q3的纹理坐标系变换为WebGL的纹理坐标系
        v.lv = 1.0 - v.lv;
        v.v = 1.0 - v.v;
    }
}

class Q3BspParser extends Quake3BspParser {}

/** 通过Q3BSPLump这个数据结构，就能确定各个子数据块在BSP文件中的偏移量和大小（都是以字节为单位） */
class Q3BSPLump {
    offset: number; // 表示当前Lump相对BSP文件首地址的偏移量，字节为单位
    length: number; // 表示当前Lump的字节数量，以字节为单位
    constructor(offset: number = 0, length: number = 0) {
        this.offset = offset;
        this.length = length;
    }
}

class Q3BSPHeader {
    id: number = -1;
    version: number = -1;
    lumps: Q3BSPLump[] = new Array(Q3BspParser.TOTALLUMPS);
    static readonly TOTALBYTES = 144; // 4 + 4 + 17 ＊ 8 = 144个字节
}

export class Q3BSPTexture {
    name: string = ''; //quake bsp中name都是定长字符串，包括null（0）结尾符，共64字节
    flag: number = -1; //本Demo没用到
    content: number = -1; //本Demo没用到
    static readonly TOTALBYTES: number = 72;
    // 64 + 4 + 4 = 72个字节
}

export class Q3BSPVertex {
    // 位置坐标信息
    x: number = 0;
    y: number = 0;
    z: number = 0; // 贴图坐标信息
    u: number = 0;
    v: number = 0; // 光照贴图坐标信息，本书不使用
    lu: number = 0;
    lv: number = 0; // 法线坐标信息，本书不使用
    nx: number = 0;
    ny: number = 0;
    nz: number = 0; // rgba颜色信息，本书也不使用
    r: number = 0; // byte
    g: number = 0;
    b: number = 0;
    a: number = 0; // [x, y, z, u, v, lu, lv, nx, ny, nz, r, g, b, a]  = 10 float ＊ 4 + rgba（4） = 44    bytes
    static VERTTOTALBYTES = 44;
}

/** Quake3 BSP静态场景中所有的可渲染数据 */
export class Q3BSPSurface {
    textureIdx: number = 0; // 4 bytes 指向textures数组中的索引
    effectIdx: number = -1; // 4 bytes 本书没有使用该数据
    faceType: EQ3BSPSurfaceType = EQ3BSPSurfaceType.BAD; // 4 bytes
    // 下面的4个变量是理解BSP场景渲染的关键，在Quake3BSPScene中了解
    firstVertIdx: number = -1; // 4 bytes 索引指向vertArray中的offset顶点
    numVert: number = 0; // 4 bytes 顶点数量通过firstVertIdx和numVert可以获得vertex数据
    firstIndex: number = -1; // 4 bytes 指向索引缓存
    numIndex: number = 0; // 4 bytes        // 下面的数据本书没用使用
    lightMapIdx: number = 0; // 4 bytes
    lightMapX: number = 0; // 4 bytes
    lightMapY: number = 0; // 4 bytes
    lightMapWidth: number = 0; // 4 bytes
    lightMapHeight: number = 0; // 4 bytes
    lightMapOrigin: vec3 = vec3Adapter.v0; // 4 ＊ 3 = 12 bytes
    lightMapXAxis: vec3 = vec3Adapter.v0; // 4 ＊ 3 = 12 bytes
    lightMapYAxis: vec3 = vec3Adapter.v0; // 4 ＊ 3 = 12 bytes
    lightMapZAxis: vec3 = vec3Adapter.v0; // 4 ＊ 3 = 12 bytes
    patchWidth: number = 0; // 4 bytes
    patchHeight: number = 0; // 4 bytes        // 合计每个表面所占字节数为104
    static TOTALBYETS: number = 104; // （12 ＊ 4 + 12 ＊ 4 + 8 = 104个字节）
}

export enum EQ3BSPSurfaceType {
    /** 0表示不符合渲染要求的表面 */
    BAD,
    /** 1表示BSP静态场景中的表面 */
    PLANAR,
    /** 2表示二次贝塞尔曲面，本书不使用 */
    PATCH,
    /** 3表示模型中的三角形表面 */
    TRIANGLE,
    /** 4表示使用billboard技术渲染的表面，本书不使用 */
    BILLBOARD,
}

export { Quake3BspParser as Q3BspParser };
