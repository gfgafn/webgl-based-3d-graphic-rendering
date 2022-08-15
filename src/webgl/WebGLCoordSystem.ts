import { vec3 } from '@tlaukkan/tsm';
import { vec3Adapter } from '../common/math/tsmAdapter';

/** `GLCoordSystem` 类用来描述和显示WebGL的坐标系结构，支持多视口的绘制 */
export class GLCoordSystem {
    // 此处更改参见 https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties
    constructor(
        /** 当前坐标系被绘制在哪个视口中 */
        public viewport: number[] = [],
        /** 当前坐标系的位置，如果是多视口渲染的话，就为 `[0,0,0]` */
        public position: vec3 = vec3Adapter.v0,
        /** 当前坐标系绕哪个轴旋转 */
        public axis: vec3 = vec3.up,
        /** 当前坐标系的旋转角度（不是弧度） */
        public angle: number = 0,
        /** 是否绘制旋转轴 */
        public isDrawAxis: boolean = false,
        /** 是否绘制为 `Direct3D` 左手系 */
        public isD3D: boolean = false,
    ) {}

    static makeViewportCoordSystems(
        width: number,
        height: number,
        row: number = 2,
        colum: number = 2,
    ): GLCoordSystem[] {
        const coords: GLCoordSystem[] = [];
        const w: number = width / colum; // 一行有多少个
        const h: number = height / row; // 一列有多少个
        // 循环生成GLCoordSystem对象，每个GLCoordSystem内置了表示viewport的数组
        for (let i: number = 0; i < colum; i++) {
            for (let j: number = 0; j < row; j++) {
                // viewport是[ x , y , width , height ]格式
                coords.push(new GLCoordSystem([i * w, j * h, w, h]));
            }
        }
        // 将生成的GLCoordSystem数组返回
        return coords;
    }
}
