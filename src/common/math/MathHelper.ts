import { mat4, quat, vec2, vec3, vec4 } from '@tlaukkan/tsm';
import { tsmAdapter } from '../math/tsmAdapter';

export enum EAxisType {
    NONE = -1,
    XAXIS,
    YAXIS,
    ZAXIS,
}

/** 点与平面之间的关系 */
export enum EPlaneLoc {
    /** 在平面的正面 */
    FRONT,
    /** 在平面的背面 */
    BACK,
    /** 与平面共面 */
    COPLANAR,
}

export class MathHelper {
    /** 角度/弧度互转函数 */
    static toRadian(degree: number): number {
        return (degree * Math.PI) / 180;
    }

    static toDegree(radian: number): number {
        return (radian / Math.PI) * 180;
    }

    /** 浮点数容差相等函数 */
    static numberEquals(left: number, right: number): boolean {
        if (Math.abs(left - right) > tsmAdapter.EPSILON) {
            return false;
        }
        return true;
    }

    static clamp(x: number, min: number, max: number): number {
        return x < min ? min : x > max ? max : x;
    }

    /** 通过不共线的三个点构造平面，平面的隐式方程：ax+by+cz+d=0 */
    static planeFromPoints(a: vec3, b: vec3, c: vec3, result: vec4 | null = null): vec4 {
        // if (!result) result = new vec4();
        // const normal: vec3 = new vec3(); // 计算三个点构成的三角形的法线
        // MathHelper.computeNormal(a, b, c, normal); // 计算ax+by+cz+d=0中的d
        // const d: number = -vec3.dot(normal, a);
        // result.x = normal.x; // ax+by+cz+d=0中的x
        // result.y = normal.y; // ax+by+cz+d=0中的y
        // result.z = normal.z; // ax+by+cz+d=0中的z
        // result.w = d; // ax+by+cz+d=0中的d
        // return result;

        if (!result) result = new vec4();
        const normal: vec3 = new vec3();
        this.computeNormal(a, b, c, normal);
        const d: number = -vec3.dot(normal, a);
        result.x = normal.x;
        result.y = normal.y;
        result.z = normal.z;
        result.w = d;
        return result;
    }

    /** 计算三角形的法向量，其公式为：cross ( b-a , c-a ).normalize() */
    static computeNormal(a: vec3, b: vec3, c: vec3, result: vec3 | null): vec3 {
        if (!result) result = new vec3();
        const l0: vec3 = new vec3();
        const l1: vec3 = new vec3();
        vec3.difference(b, a, l0);
        vec3.difference(c, a, l1);
        vec3.cross(l0, l1, result);
        result.normalize();
        return result;
    }

    /** 通过一条法线和一个点来构造一个平面，平面的隐式方程：ax+by+cz+d=0 */
    static planeFromPointNormal(
        point: vec3,
        normal: vec3,
        result: vec4 | null = null,
    ): vec4 {
        if (!result) result = new vec4();
        result.x = normal.x;
        result.y = normal.y;
        result.z = normal.z;
        result.w = -vec3.dot(normal, point);
        return result;
    }

    /**
     * 平面的单位化
     * 如果平面中的法向量（即vec4中的x、y、z分量部分）为单位向量，那么这个平面被称为单位化平面
     */
    static planeNormalize(plane: vec4): number {
        const length = Math.sqrt(
            plane.x * plane.x + plane.y * plane.y + plane.z * plane.z,
        );
        if (length === 0) throw new Error('面积为0的平面!!!');
        const ilength = 1.0 / length;
        plane.x = plane.x * ilength;
        plane.y = plane.y * ilength;
        plane.z = plane.z * ilength;
        plane.w = plane.w * ilength;

        return length;
    }

    /** 三维空间中任意一个点与平面之间的有向距离 */
    static planeDistanceFromPoint(plane: vec4, point: vec3): number {
        return point.x * plane.x + point.y * plane.y + point.z * plane.z + plane.w;
    }

    /** 判断一个点是在平面的正面、反面还是该点在平面上 */
    static planeTestPoint(plane: vec4, point: vec3): EPlaneLoc {
        // 三维空间中任意一个点与平面的有向距离
        const num: number = MathHelper.planeDistanceFromPoint(plane, point);
        if (num > tsmAdapter.EPSILON) {
            // 大于正容差数（+0.0001），点在平面的正面
            return EPlaneLoc.FRONT;
        } else if (num < -tsmAdapter.EPSILON) {
            // 小于负容差数（-0.0001），点在平面的背面
            return EPlaneLoc.BACK;
        } else {
            return EPlaneLoc.COPLANAR; // 有向距离在-0.0001～+0.0001之间，表示点与平面共面
        }
    }

    static obj2GLViewportSpace(
        localPt: vec3,
        mvp: mat4,
        viewport: Int32Array | Float32Array,
        viewportPt: vec3,
    ): boolean {
        const v: vec4 = new vec4([localPt.x, localPt.y, localPt.z, 1.0]);
        mvp.multiplyVec4(v, v); // 将顶点从local坐标系变换到投影坐标系，或裁剪坐标系
        if (v.w === 0.0) {
            // 如果变换后的w为0，则返回false
            return false;
        }
        // 将裁剪坐标系的点的x / y / z分量除以w，得到normalized坐标值[ -1 , 1 ]之间
        v.x /= v.w;
        v.y /= v.w;
        v.z /= v.w;
        // [-1 , 1]标示的点变换到视口坐标系
        v.x = v.x * 0.5 + 0.5;
        v.y = v.y * 0.5 + 0.5;
        v.z = v.z * 0.5 + 0.5;
        // 视口坐标系再变换到屏幕坐标系
        viewportPt.x = v.x * viewport[2] + viewport[0];
        viewportPt.y = v.y * viewport[3] + viewport[1];
        viewportPt.z = v.z;
        return true;
    }

    /**
     * 计算 `AABB包围盒` 的 mins 和 `maxs` 值
     * ```plaintext
     *    /3--------/7
     *   / |       / |
     *  /  |      /  |
     * 1---|-----5   |
     * |  /2- - -|- -6
     * | /       |  /
     * |/        | /
     * 0---------4/
     * ```
     */
    static boundBoxAddPoint(v: vec3, mins: vec3, maxs: vec3): void {
        if (v.x < mins.x) {
            mins.x = v.x;
        }
        // v的x轴分量小于小的，就更新mins.x分量值
        if (v.x > maxs.x) {
            maxs.x = v.x;
        }
        // v的x轴分量大于大的，就更新maxs.x分量值
        // 原理同上
        if (v.y < mins.y) {
            mins.y = v.y;
        }
        if (v.y > maxs.y) {
            maxs.y = v.y;
        }
        // 原理同上
        if (v.z < mins.z) {
            mins.z = v.z;
        }
        if (v.z > maxs.z) {
            maxs.z = v.z;
        }
    }

    /** 初始化 `mins` 和 `maxs` */
    static boundBoxClear(mins: vec3, maxs: vec3, value: number = Infinity): void {
        mins.x = mins.y = mins.z = value; // 初始化时，让mins表示浮点数的最大范围
        maxs.x = maxs.y = maxs.z = -value; // 初始化是，让maxs表示浮点数的最小范围
    }

    /** 获得AABB包围盒的中心点坐标 */
    static boundBoxGetCenter(mins: vec3, maxs: vec3, out: vec3 | null = null): vec3 {
        if (!out) out = new vec3();
        // (maxs + mins) ＊ 0.5
        vec3.sum(mins, maxs, out);
        out.scale(0.5);
        return out;
    }

    /**
     * 计算8个顶点的坐标值
     * ```plaintext
     *    /3--------/7
     *   / |       / |
     *  /  |      /  |
     * 1---|-----5   |
     * |  /2- - -|- -6
     * | /       |  /
     * |/        | /
     * 0---------4/
     * ```
     */
    static boundBoxGet8Points(mins: vec3, maxs: vec3, pts8: vec3[]): void {
        const center: vec3 = MathHelper.boundBoxGetCenter(mins, maxs); // 获取中心点
        const maxs2center: vec3 = vec3.difference(center, maxs); // 获取最大点到中心点之间的距离向量
        pts8.push(
            new vec3([
                center.x + maxs2center.x,
                center.y + maxs2center.y,
                center.z + maxs2center.z,
            ]),
        ); // 0
        pts8.push(
            new vec3([
                center.x + maxs2center.x,
                center.y - maxs2center.y,
                center.z + maxs2center.z,
            ]),
        ); // 1
        pts8.push(
            new vec3([
                center.x + maxs2center.x,
                center.y + maxs2center.y,
                center.z - maxs2center.z,
            ]),
        ); // 2
        pts8.push(
            new vec3([
                center.x + maxs2center.x,
                center.y - maxs2center.y,
                center.z - maxs2center.z,
            ]),
        ); // 3
        pts8.push(
            new vec3([
                center.x - maxs2center.x,
                center.y + maxs2center.y,
                center.z + maxs2center.z,
            ]),
        ); // 4
        pts8.push(
            new vec3([
                center.x - maxs2center.x,
                center.y - maxs2center.y,
                center.z + maxs2center.z,
            ]),
        ); // 5
        pts8.push(
            new vec3([
                center.x - maxs2center.x,
                center.y + maxs2center.y,
                center.z - maxs2center.z,
            ]),
        ); // 6
        pts8.push(
            new vec3([
                center.x - maxs2center.x,
                center.y - maxs2center.y,
                center.z - maxs2center.z,
            ]),
        ); // 7
    }

    /** 计算变换后的 `AABB包围盒` */
    static boundBoxTransform(mat: mat4, mins: vec3, maxs: vec3): void {
        const pts: vec3[] = []; // 分配数组内存，类型为vec3
        MathHelper.boundBoxGet8Points(mins, maxs, pts); // 获得局部坐标系表示的AABB的8个顶点坐标
        const out: vec3 = new vec3(); // 变换后的顶点
        // 遍历局部坐标系的8个AABB包围盒的顶点坐标
        pts.forEach((pt) => {
            // 将局部坐标表示的顶点变换到mat坐标空间中去，变换后的结果放在out变量中
            out.xyz = mat.multiplyVec3(pt).xyz;
            // 重新构造新的，与世界坐标系轴对称的AABB包围盒
            this.boundBoxAddPoint(out, mins, maxs);
        });
    }

    /** 判断一个点是否在AABB包围盒内部，如果在则返回true，否则返回false */
    static boundBoxContainsPoint(point: vec3, mins: vec3, maxs: vec3): boolean {
        return (
            point.x >= mins.x &&
            point.x <= maxs.x &&
            point.y >= mins.y &&
            point.y <= maxs.y &&
            point.z >= mins.z &&
            point.z <= maxs.z
        );
    }

    /** `boundBoxBoundBoxOverlap` 方法用来判断两个AABB 包围盒是否相交（或重叠）。如果相交则返回 `true` ，否则返回 `false` */
    static boundBoxBoundBoxOverlap(
        min1: vec3,
        max1: vec3,
        min2: vec3,
        max2: vec3,
    ): boolean {
        if (min1.x > max2.x) return false;
        if (max1.x < min2.x) return false;
        if (min1.y > max2.y) return false;
        if (max1.y < min2.y) return false;
        if (min1.z > max2.z) return false;
        if (max1.z < min2.z) return false;
        return true;
    }

    static convertVec3IDCoord2GLCoord(v: vec3, scale: number = 10.0): void {
        const f: number = v.y; // opengl right = dooom3 x
        v.y = v.z; //opengl up = doom3 z
        v.z = -f; //opengl forward = doom3 -y
        if (!MathHelper.numberEquals(scale, 0) && !MathHelper.numberEquals(scale, 1.0)) {
            v.x /= scale;
            v.y /= scale;
            v.z /= scale;
        }
    }

    static convertVec2IDCoord2GLCoord(v: vec2): void {
        v.y = 1.0 - v.y;
    }

    static matrixFrom(pos: vec3, q: quat, dest: mat4 | null = null): mat4 {
        if (!dest) {
            dest = new mat4().setIdentity();
        }
        q.toMat4(dest);
        // 调用quat的toMat4方法，再放入平移部分数据

        dest.init([...dest.all().slice(0, 12), pos.x, pos.y, pos.z, dest.all()[15]]);

        return dest;
    }
}
