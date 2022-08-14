import { mat4, quat, vec2, vec3 } from '@tlaukkan/tsm';

/** `MD5Mesh` 文件格式 */
export class MD5Mesh {
    material: string;
    vertices: MD5Vertex[];
    indices: number[];
    weights: MD5Weight[];

    constructor() {
        this.material = '';
        this.vertices = [];
        this.indices = [];
        this.weights = [];
    }
}

/** MD5模型的顶点数据结构 */
export class MD5Vertex {
    uv: vec2; // 纹理坐标
    firstWeight: number; // 指向weights列表中的索引号
    numWeight: number; // 从上面索引开始，有多少个weight值
    finalPosInModelSpace: vec3; // 位置坐标
    animiatedPosInModelSpace: vec3; // 每运行一帧动画后要进行更新操作

    constructor() {
        this.uv = new vec2();
        this.firstWeight = -1; // 初始化为-1
        this.numWeight = 0; // 初始化为0个
        this.finalPosInModelSpace = new vec3();
        this.animiatedPosInModelSpace = new vec3();
    }
}

/** MD5骨骼数据结构 */
export class MD5Joint {
    name: string; // 骨骼名称
    parentId: number; // 父亲骨骼的索引号
    originInModelSpace: vec3; // 骨骼的原点位置坐标
    orientationInModelSpace: quat; // 四元数表示的骨骼朝向
    bindPoseMatrix: mat4; // 由origin和orientation合成bindPose矩阵
    inverseBindPoseMatrix: mat4; // bindPose的逆矩阵，将模型坐标系的顶点变换到joint坐标系

    constructor() {
        this.name = '';
        this.parentId = -1; // 初始化时索引都指向-1
        this.originInModelSpace = new vec3();
        this.orientationInModelSpace = new quat();
        this.bindPoseMatrix = new mat4().setIdentity();
        this.inverseBindPoseMatrix = new mat4().setIdentity();
    }
}

/** 骨骼动画的权重数据结构 */
export class MD5Weight {
    jointId: number; // 当前权重属于哪个骨骼
    jointWeight: number; // 当前权重的值，[ 0 , 1 ]之间
    posInJointSpace: vec3; // 偏移量，相对的是第一帧标准姿态蒙皮的偏移

    constructor() {
        this.jointId = -1; // 初始化是索引都指向-1
        this.jointWeight = 0;
        this.posInJointSpace = new vec3();
    }
}
