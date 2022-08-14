import { vec3, vec4 } from '@tlaukkan/tsm';
import { Camera } from './Camera';
import { MathHelper } from '../common/math/MathHelper';
import { vec3Adapter } from '../common/math/tsmAdapter';

export class Frustum {
    /** 原点坐标 */
    private _origin: vec3;
    /** 0～3表示近平面四边形的坐标，4～7表示远平面的四边形坐标，这些顶点坐标的布局，请参考图9.5 */
    private _points: vec3[];
    /** 上述9个顶点不同排列组合后生成的上/下/左/右/远/近6个平面，其法向量都是朝Frustum内部，切记 */
    private _planes: vec4[];
    /** 原点坐标 */
    get origin(): vec3 {
        return this._origin;
    }
    /** 0～3表示近平面四边形的坐标，4～7表示远平面的四边形坐标，这些顶点坐标的布局，请参考图9.5 */
    get points(): vec3[] {
        return this._points;
    }
    /** 上述9个顶点不同排列组合后生成的上/下/左/右/远/近6个平面，其法向量都是朝Frustum内部，切记 */
    get planes(): vec4[] {
        return this._planes;
    }

    constructor(origin: vec3 | null = null, points8: vec3[] | null = null) {
        //预先给内存分配8个点
        if (origin) {
            this._origin = origin;
        } else {
            this._origin = new vec3();
        }
        if (points8 && points8.length === 8) {
            this._points = points8;
        } else {
            this._points = new Array(8);
            for (let i = 0; i < this._points.length; i++) {
                this._points[i] = new vec3();
            }
        }
        this._planes = new Array(6);
        for (let i = 0; i < this._planes.length; i++) {
            this._planes[i] = new vec4();
        }
    }

    // 由代码可知，Frustum中的origin、points和planes都是在世界坐标系中的表示方式
    /** 构建世界坐标系表示的6个平面 */
    buildFromCamera(camera: Camera): void {
        const left: number = (camera.left * camera.far) / camera.near;
        const right: number = (camera.right * camera.far) / camera.near;
        const bottom: number = (camera.bottom * camera.far) / camera.near;
        const top: number = (camera.top * camera.far) / camera.near;
        //计算出近平面4个点
        this.points[0].x = left;
        this.points[0].y = bottom;
        this.points[0].z = -camera.near;
        this.points[1].x = right;
        this.points[1].y = bottom;
        this.points[1].z = -camera.near;
        this.points[2].x = right;
        this.points[2].y = top;
        this.points[2].z = -camera.near;
        this.points[3].x = left;
        this.points[3].y = top;
        this.points[3].z = -camera.near;
        //计算出远平面4个点
        this.points[4].x = left;
        this.points[4].y = bottom;
        this.points[4].z = -camera.far;
        this.points[5].x = right;
        this.points[5].y = bottom;
        this.points[5].z = -camera.far;
        this.points[6].x = right;
        this.points[6].y = top;
        this.points[6].z = -camera.far;
        this.points[7].x = left;
        this.points[7].y = top;
        this.points[7].z = -camera.far;
        //记住，此时的摄像机和8个cornor是在view坐标系中表示
        //将摄像机的原点和8个cornor点变换到世界坐标系
        this._origin.x = 0;
        this._origin.y = 0;
        this._origin.z = 0;
        // 摄像机的原点在view坐标系中是[ 0 , 0 , 0 ],通过invViewMatrix * _origin，得到了_origin在世界坐标系的表示
        this._origin = camera.invViewMatrix.multiplyVec3(this.origin);
        // 将view坐标系中表示的8个顶点也变换到世界坐标系中
        for (let i = 0; i < this._points.length; i++) {
            this._points[i] = camera.invViewMatrix.multiplyVec3(this.points[i]);
        }
        //构建世界坐标系表示的6个平面，法线朝内
        // TODO: 可以优化 forEach
        MathHelper.planeFromPoints(
            this._origin,
            this._points[0],
            this._points[3],
            this._planes[0],
        );
        MathHelper.planeFromPoints(
            this._origin,
            this._points[2],
            this._points[1],
            this._planes[1],
        );
        MathHelper.planeFromPoints(
            this._origin,
            this._points[3],
            this._points[2],
            this._planes[2],
        );
        MathHelper.planeFromPoints(
            this._origin,
            this._points[1],
            this._points[0],
            this._planes[3],
        );
        MathHelper.planeFromPoints(
            this._points[0],
            this._points[2],
            this._points[1],
            this._planes[4],
        );
        MathHelper.planeFromPoints(
            this._points[5],
            this._points[7],
            this._points[4],
            this._planes[5],
        );
        // 将6个平面单位化
        for (let i: number = 0; i < this._planes.length; i++) {
            MathHelper.planeNormalize(this._planes[i]);
        }
    }

    /** 测试AABB轴对称包围盒的mins和maxs这两个属性是否都不在围成Frustum的6个平面内部。如果都不在内部，说明不可见，被剔除掉，返回fasle，否则返回true */
    isBoundBoxVisible(mins: vec3, maxs: vec3): boolean {
        for (let i = 0; i < this._planes.length; i++) {
            const current = this._planes[i];

            vec3Adapter.v0.x = current.x > 0.0 ? maxs.x : mins.x;
            vec3Adapter.v0.y = current.y > 0.0 ? maxs.y : mins.y;
            vec3Adapter.v0.z = current.z > 0.0 ? maxs.z : mins.z;
            if (MathHelper.planeDistanceFromPoint(current, vec3Adapter.v0) < 0.0) {
                return false;
            }
        }
        return true;
    }

    isTriangleVisible(a: vec3, b: vec3, c: vec3): boolean {
        for (let i: number = 0; i < this._planes.length; i++) {
            const current: vec4 = this._planes[i];
            if (MathHelper.planeDistanceFromPoint(current, a) >= 0.0) {
                continue;
            }
            if (MathHelper.planeDistanceFromPoint(current, b) >= 0.0) {
                continue;
            }
            if (MathHelper.planeDistanceFromPoint(current, c) >= 0.0) {
                continue;
            }
            return false;
        }
        return true;
    }
}
