import { CanvasKeyBoardEvent } from '../common/Application';
import { Camera } from './Camera';
import { WebGLApplication } from '../webgl/WebGLApplication';

export class CameraApplication extends WebGLApplication {
    camera: Camera; // 在 `WebGLApplication` 的基础上增加了对摄像机系统的支持

    constructor(
        canvas: HTMLCanvasElement,
        /** 默认情况下告诉排版引擎绘制缓冲区不包含预混合 alpha 通道 */
        contextAttributes: WebGLContextAttributes = { premultipliedAlpha: false },
        need2d: boolean = false,
    ) {
        super(canvas, contextAttributes, need2d);
        this.camera = new Camera(this.gl, canvas.width, canvas.height, 45, 1, 2000);
    }

    /**
     * 子类override `update`函数时必须要调用基类本方法。
     * 如果`CameraApplication`的子类覆写（override）本函数
     * 那么必须在函数的最后一句代码调用： `super.update(elapsedMsec, intervalSec)`
     */
    update(elapsedMsec: number, intervalSec: number): void {
        // 调用Camera对象的update，这样就能实时地计算camera的投影和视图矩阵
        // 这样才能保证摄像机正确运行
        // 如果CameraApplication的子类覆写（override）本函数
        // 那么必须在函数的最后一句代码调用： super.update(elapsedMsec, intervalSec)
        this.camera.update(intervalSec);
    }

    // 内置一个通用的摄像机按键事件响应操作
    // 覆写（）
    onKeyPress(evt: CanvasKeyBoardEvent): void {
        if (evt.key === 'w') {
            this.camera.moveForward(-1); // 摄像机向前运行
        } else if (evt.key === 's') {
            this.camera.moveForward(1); // 摄像机向后运行
        } else if (evt.key === 'a') {
            this.camera.moveRightward(1); // 摄像机向右运行
        } else if (evt.key === 'd') {
            this.camera.moveRightward(-1); // 摄像机向左运行
        } else if (evt.key === 'z') {
            this.camera.moveUpward(1); // 摄像机向上运行
        } else if (evt.key === 'x') {
            this.camera.moveUpward(-1); // 摄像机向下运行
        } else if (evt.key === 'y') {
            this.camera.yaw(1); // 摄像机绕本身的Y轴旋转
        } else if (evt.key === 'r') {
            this.camera.roll(1); // 摄像机绕本身的Z轴旋转
        } else if (evt.key == 'p') {
            this.camera.pitch(1); // 摄像机绕本身的X轴旋转
        }
    }
}
