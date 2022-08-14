export type GLAttribBits = number;

// TODO:完善注释
export type GLAttribOffsetMap = { [key: string]: number };

export class GLAttribState {
    // 顶点属性：位置坐标
    static readonly POSITION_BIT: number = 1 << 0;
    static readonly POSITION_COMPONENT: number = 3; //xyz
    static readonly POSITION_NAME: string = 'aPosition';
    static readonly POSITION_LOCATION: number = 0;
    // 顶点属性：纹理坐标0
    static readonly TEXCOORD_BIT: number = 1 << 1;
    static readonly TEXCOORD_COMPONENT: number = 2; //st
    static readonly TEXCOORD_NAME: string = 'aTexCoord';
    static readonly TEXCOORD_LOCATION: number = 1;
    // 顶点属性：纹理坐标1
    static readonly TEXCOORD1_BIT: number = 1 << 2;
    static readonly TEXCOORD1_COMPONENT: number = 2;
    static readonly TEXCOORD1_NAME: string = 'aTexCoord1';
    static readonly TEXCOORD1_LOCATION: number = 2;
    // 顶点属性：法向量
    static readonly NORMAL_BIT: number = 1 << 3;
    static readonly NORMAL_COMPONENT: number = 3; //xyz
    static readonly NORMAL_NAME: string = 'aNormal';
    static readonly NORMAL_LOCATION: number = 3;
    // 顶点属性：切向量
    static readonly TANGENT_BIT: number = 1 << 4;
    static readonly TANGENT_COMPONENT: number = 4; //xyzw vec4
    static readonly TANGENT_NAME: string = 'aTangent';
    static readonly TANGENT_LOCATION: number = 4;
    // 顶点属性：颜色
    static readonly COLOR_BIT: number = 1 << 5;
    static readonly COLOR_COMPONENT: number = 4; // r g b a vec4
    static readonly COLOR_NAME: string = 'aColor';
    static readonly COLOR_LOCATION: number = 5;

    /*
     static readonly WEIGHT0_BIT: number = (1 << 7);
     static readonly WEIGHT1_BIT: number = (1 << 8);
     static readonly WEIGHT2_BIT: number = (1 << 9);
     static readonly WEIGHT3_BIT: number = (1 << 10);
    */

    static readonly ATTRIBSTRIDE: string = 'STRIDE';
    static readonly ATTRIBBYTELENGTH: string = 'BYTELENGTH';

    // float类型和uint16类型的字节长度
    static readonly FLOAT32_SIZE = Float32Array.BYTES_PER_ELEMENT;
    static readonly UINT16_SIZE = Uint16Array.BYTES_PER_ELEMENT;

    /** 顶点属性设置 */
    static makeVertexAttribs(
        useTexcoord0: boolean,
        useTexcoord1: boolean,
        useNormal: boolean,
        useTangent: boolean,
        useColor: boolean,
    ): GLAttribBits {
        // 不管如何，总是使用位置坐标属性
        let bits: GLAttribBits = GLAttribState.POSITION_BIT;
        // 使用 |= 操作符添加标记位
        if (useTexcoord0) bits |= GLAttribState.TEXCOORD_BIT;
        if (useTexcoord1) bits |= GLAttribState.TEXCOORD1_BIT;
        if (useNormal) bits |= GLAttribState.NORMAL_BIT;
        if (useTangent) bits |= GLAttribState.TANGENT_BIT;
        if (useColor) bits |= GLAttribState.COLOR_BIT;
        return bits;
    }

    // 使用按位与（&）操作符来测试否是包含某个位标记值
    static hasPosition(attribBits: GLAttribBits): boolean {
        return (attribBits & GLAttribState.POSITION_BIT) !== 0;
    }

    static hasNormal(attribBits: GLAttribBits): boolean {
        return (attribBits & GLAttribState.NORMAL_BIT) !== 0;
    }

    static hasTexCoord_0(attribBits: GLAttribBits): boolean {
        return (attribBits & GLAttribState.TEXCOORD_BIT) !== 0;
    }

    static hasTexCoord_1(attribBits: GLAttribBits): boolean {
        return (attribBits & GLAttribState.TEXCOORD1_BIT) !== 0;
    }

    static hasColor(attribBits: GLAttribBits): boolean {
        return (attribBits & GLAttribState.COLOR_BIT) !== 0;
    }

    static hasTangent(attribBits: GLAttribBits): boolean {
        return (attribBits & GLAttribState.TANGENT_BIT) !== 0;
    }

    // TODO:完善注释
    /** 交错数组存储方式 */
    static getInterleavedLayoutAttribOffsetMap(
        attribBits: GLAttribBits,
    ): GLAttribOffsetMap {
        const offsets: GLAttribOffsetMap = {}; // 初始化顶点属性偏移表
        let byteOffset: number = 0; // 初始化时的首地址为0
        if (GLAttribState.hasPosition(attribBits)) {
            // 记录位置坐标的首地址
            offsets[GLAttribState.POSITION_NAME] = 0;
            // 位置坐标由3个float值组成，因此下一个属性的首地址位 3 * 4 = 12个字节处
            byteOffset += GLAttribState.POSITION_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        // 下面各个属性偏移计算算法同上，唯一区别是分量的不同而已
        if (GLAttribState.hasNormal(attribBits)) {
            offsets[GLAttribState.NORMAL_NAME] = byteOffset;
            byteOffset += GLAttribState.NORMAL_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTexCoord_0(attribBits)) {
            offsets[GLAttribState.TEXCOORD_NAME] = byteOffset;
            byteOffset += GLAttribState.TEXCOORD_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTexCoord_1(attribBits)) {
            offsets[GLAttribState.TEXCOORD1_NAME] = byteOffset;
            byteOffset += GLAttribState.TEXCOORD1_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasColor(attribBits)) {
            offsets[GLAttribState.COLOR_NAME] = byteOffset;
            byteOffset += GLAttribState.COLOR_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTangent(attribBits)) {
            offsets[GLAttribState.TANGENT_NAME] = byteOffset;
            byteOffset += GLAttribState.TANGENT_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        // stride和length相等
        offsets[GLAttribState.ATTRIBSTRIDE] = byteOffset;

        // 间隔数组方法存储的话，顶点的stride非常重要
        offsets[GLAttribState.ATTRIBBYTELENGTH] = byteOffset;
        return offsets;
    }

    // TODO:完善注释
    /** 顺序数组存储方式
     * 先存储所有顶点的位置坐标数据，然后再依次存储其他顶点属性相关数据
     */
    static getSequencedLayoutAttribOffsetMap(
        attribBits: GLAttribBits,
        vertCount: number,
    ): GLAttribOffsetMap {
        const offsets: GLAttribOffsetMap = {}; // 初始化顶点属性偏移表
        let byteOffset: number = 0; // 初始化时的首地址为0
        if (GLAttribState.hasPosition(attribBits)) {
            // 记录位置坐标的首地址
            offsets[GLAttribState.POSITION_NAME] = 0;
            // 位置坐标由3个float值组成，因此下一个属性的首地址为 3 * 4 * 顶点数量
            byteOffset +=
                vertCount * GLAttribState.POSITION_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasNormal(attribBits)) {
            offsets[GLAttribState.NORMAL_NAME] = byteOffset;
            byteOffset +=
                vertCount * GLAttribState.NORMAL_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTexCoord_0(attribBits)) {
            offsets[GLAttribState.TEXCOORD_NAME] = byteOffset;
            byteOffset +=
                vertCount * GLAttribState.TEXCOORD_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTexCoord_1(attribBits)) {
            offsets[GLAttribState.TEXCOORD1_NAME] = byteOffset;
            byteOffset +=
                vertCount *
                GLAttribState.TEXCOORD1_COMPONENT *
                GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasColor(attribBits)) {
            offsets[GLAttribState.COLOR_NAME] = byteOffset;
            byteOffset +=
                vertCount * GLAttribState.COLOR_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTangent(attribBits)) {
            offsets[GLAttribState.TANGENT_NAME] = byteOffset;
            byteOffset +=
                vertCount * GLAttribState.TANGENT_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        //SequencedLayout具有ATTRIBSTRIDE和ATTRIBSTRIDE属性
        offsets[GLAttribState.ATTRIBSTRIDE] = byteOffset / vertCount;
        // 总的字节数 / 顶点数量  = 每个顶点的stride，实际上顺序存储时不需要这个值
        offsets[GLAttribState.ATTRIBBYTELENGTH] = byteOffset;
        // 总的字节数
        return offsets;
    }

    // TODO:完善注释
    /**
     * 单独数组存储方式
     * 每种顶点属性存储在单独的一个 `WebGLBuffer` 对象中，偏移值都是0
     */
    static getSepratedLayoutAttribOffsetMap(attribBits: GLAttribBits): GLAttribOffsetMap {
        // 每个顶点属性使用一个vbo的话，每个offsets中的顶点属性的偏移都是为0
        // 并且offsets的length = vbo的个数，不需要顶点stride和byteLenth属性
        const offsets: GLAttribOffsetMap = {};

        if (GLAttribState.hasPosition(attribBits)) {
            offsets[GLAttribState.POSITION_NAME] = 0;
        }
        if (GLAttribState.hasNormal(attribBits)) {
            offsets[GLAttribState.NORMAL_NAME] = 0;
        }
        if (GLAttribState.hasTexCoord_0(attribBits)) {
            offsets[GLAttribState.TEXCOORD_NAME] = 0;
        }
        if (GLAttribState.hasTexCoord_1(attribBits)) {
            offsets[GLAttribState.TEXCOORD1_NAME] = 0;
        }
        if (GLAttribState.hasColor(attribBits)) {
            offsets[GLAttribState.COLOR_NAME] = 0;
        }
        if (GLAttribState.hasTangent(attribBits)) {
            offsets[GLAttribState.TANGENT_NAME] = 0;
        }
        return offsets;
    }

    /** 获取顶点属性以字节表示的 `stride` 值 */
    static getVertexByteStride(attribBits: GLAttribBits): number {
        let byteOffset: number = 0;
        if (GLAttribState.hasPosition(attribBits)) {
            byteOffset += GLAttribState.POSITION_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasNormal(attribBits)) {
            byteOffset += GLAttribState.NORMAL_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTexCoord_0(attribBits)) {
            byteOffset += GLAttribState.TEXCOORD_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTexCoord_1(attribBits)) {
            byteOffset += GLAttribState.TEXCOORD1_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasColor(attribBits)) {
            byteOffset += GLAttribState.COLOR_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        if (GLAttribState.hasTangent(attribBits)) {
            byteOffset += GLAttribState.TANGENT_COMPONENT * GLAttribState.FLOAT32_SIZE;
        }
        return byteOffset;
    }

    /** 绑定当前缓冲区范围到 `gl.ARRAY_BUFFER` ,成为当前顶点缓冲区对象的通用顶点属性并指定它的布局 (缓冲区对象中的偏移量)。 */
    static setAttribVertexArrayPointer(
        gl: WebGLRenderingContext,
        offsetMap: GLAttribOffsetMap,
    ): void {
        let stride: number = offsetMap[GLAttribState.ATTRIBSTRIDE];
        if (stride === 0) throw new Error('vertex Array有问题! ! ');
        // sequenced 的话 stride 为 0
        if (stride !== offsetMap[GLAttribState.ATTRIBBYTELENGTH]) stride = 0;
        if (stride === undefined) stride = 0;
        let offset: number = offsetMap[GLAttribState.POSITION_NAME];
        if (offset !== undefined) {
            gl.vertexAttribPointer(
                GLAttribState.POSITION_LOCATION,
                GLAttribState.POSITION_COMPONENT,
                gl.FLOAT,
                false,
                stride,
                offset,
            );
        }
        offset = offsetMap[GLAttribState.NORMAL_NAME];
        if (offset !== undefined) {
            gl.vertexAttribPointer(
                GLAttribState.NORMAL_LOCATION,
                GLAttribState.NORMAL_COMPONENT,
                gl.FLOAT,
                false,
                stride,
                offset,
            );
        }
        offset = offsetMap[GLAttribState.TEXCOORD_NAME];
        if (offset !== undefined) {
            gl.vertexAttribPointer(
                GLAttribState.TEXCOORD_LOCATION,
                GLAttribState.TEXCOORD_COMPONENT,
                gl.FLOAT,
                false,
                stride,
                offset,
            );
        }
        offset = offsetMap[GLAttribState.TEXCOORD1_NAME];
        if (offset !== undefined) {
            gl.vertexAttribPointer(
                GLAttribState.TEXCOORD1_LOCATION,
                GLAttribState.TEXCOORD1_COMPONENT,
                gl.FLOAT,
                false,
                stride,
                offset,
            );
        }
        offset = offsetMap[GLAttribState.COLOR_NAME];
        if (offset !== undefined) {
            gl.vertexAttribPointer(
                GLAttribState.COLOR_LOCATION,
                GLAttribState.COLOR_COMPONENT,
                gl.FLOAT,
                false,
                stride,
                offset,
            );
        }
        offset = offsetMap[GLAttribState.TANGENT_NAME];
        if (offset !== undefined) {
            gl.vertexAttribPointer(
                GLAttribState.TANGENT_LOCATION,
                GLAttribState.TANGENT_COMPONENT,
                gl.FLOAT,
                false,
                stride,
                offset,
            );
        }
    }

    /** 开启或关闭属性数组列表中指定索引处的通用顶点属性数组 */
    static setAttribVertexArrayState(
        gl: WebGLRenderingContext,
        attribBits: number,
        enable: boolean = true,
    ): void {
        if (GLAttribState.hasPosition(attribBits)) {
            if (enable) gl.enableVertexAttribArray(GLAttribState.POSITION_LOCATION);
            else gl.disableVertexAttribArray(GLAttribState.POSITION_LOCATION);
        } else {
            gl.disableVertexAttribArray(GLAttribState.POSITION_LOCATION);
        }
        if (GLAttribState.hasNormal(attribBits)) {
            if (enable) gl.enableVertexAttribArray(GLAttribState.NORMAL_LOCATION);
            else gl.disableVertexAttribArray(GLAttribState.NORMAL_LOCATION);
        } else {
            gl.disableVertexAttribArray(GLAttribState.NORMAL_LOCATION);
        }
        if (GLAttribState.hasTexCoord_0(attribBits)) {
            if (enable) gl.enableVertexAttribArray(GLAttribState.TEXCOORD_LOCATION);
            else gl.disableVertexAttribArray(GLAttribState.TEXCOORD_LOCATION);
        } else {
            gl.disableVertexAttribArray(GLAttribState.TEXCOORD_LOCATION);
        }
        if (GLAttribState.hasTexCoord_1(attribBits)) {
            if (enable) gl.enableVertexAttribArray(GLAttribState.TEXCOORD1_LOCATION);
            else gl.disableVertexAttribArray(GLAttribState.TEXCOORD1_LOCATION);
        } else {
            gl.disableVertexAttribArray(GLAttribState.TEXCOORD1_LOCATION);
        }
        if (GLAttribState.hasColor(attribBits)) {
            if (enable) gl.enableVertexAttribArray(GLAttribState.COLOR_LOCATION);
            else gl.disableVertexAttribArray(GLAttribState.COLOR_LOCATION);
        } else {
            gl.disableVertexAttribArray(GLAttribState.COLOR_LOCATION);
        }
        if (GLAttribState.hasTangent(attribBits)) {
            if (enable) gl.enableVertexAttribArray(GLAttribState.TANGENT_LOCATION);
            else gl.disableVertexAttribArray(GLAttribState.TANGENT_LOCATION);
        } else {
            gl.disableVertexAttribArray(GLAttribState.TANGENT_LOCATION);
        }
    }
}
