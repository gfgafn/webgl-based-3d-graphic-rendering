import { vec2 } from '@tlaukkan/tsm';

/** 输入事件类型枚举 */
export enum EInputEventType {
    /** 总类，表示鼠标事件 */
    MOUSEEVENT,
    /** 鼠标按下事件 */
    MOUSEDOWN,
    /** 鼠标弹起事件 */
    MOUSEUP,
    /** 鼠标移动事件 */
    MOUSEMOVE,
    /** 鼠标拖动事件 */
    MOUSEDRAG,
    /** 总类，表示键盘事件 */
    KEYBOARDEVENT,
    /** 键按下事件 */
    KEYUP,
    /** 键弹起事件 */
    KEYDOWN,
    /** 按键事件 */
    KEYPRESS,
}

/**
 * `canvas` 输入事件类。
 * `CanvasKeyboardEvent` 和 `CanvasMouseEvent` 都继承自本类
 * 基类定义了共同的属性，`keyboard` 或 `mouse` 事件都能使用组合键。
 * 例如，可以按 `Ctrl` 键的同时点击鼠标左键做某些事情
 * 当然也可以按着 `Alt +A` 键做另外一些事情
 * @property {boolean} altKey 指示 `alt` 键是否被按下
 * @property {boolean} ctrlKey 指示 `ctrl` 键是否被按下
 * @property {boolean} shiftKey 指示 `shift` 键是否被按下
 * @property {EInputEventType} type 当前事件的类型
 */
export class CanvasInputEvent {
    /** 构造函数，初始化时3个组合键都默认是 `false` 状态 */
    constructor(
        /** 指示 `alt` 键是否被按下 */
        public altKey: boolean = false,
        /** 指示 `ctrl` 键是否被按下 */
        public ctrlKey: boolean = false,
        /** 指示 `shift` 键是否被按下 */
        public shiftKey: boolean = false,
        /** 当前事件的类型 */
        public type: EInputEventType = EInputEventType.MOUSEEVENT,
    ) {}
}

/**
 * 自定义 canvas 鼠标输入事件
 * @extends CanvasInputEvent
 * @property {number} button 表示当前按下鼠标哪个键, [ `0`：鼠标左键，`1`：鼠标中键，`2`：鼠标右键]
 * @property {vec2} canvasPosition 基于canvas坐标系的表示
 */
export class CanvasMouseEvent extends CanvasInputEvent {
    constructor(
        type: EInputEventType,
        /** 基于canvas坐标系的表示 */
        public canvasPosition: vec2,
        /** 表示当前按下鼠标哪个键, [ `0` ：鼠标左键，`1` ：鼠标中键，`2` ：鼠标右键] */
        public button: number,
        altKey: boolean = false,
        ctrlKey: boolean = false,
        shiftKey: boolean = false,
    ) {
        super(altKey, ctrlKey, shiftKey, type);
        console.log(`鼠标键 button ${this.button}`);
    }
}

/**
 * 自定义 canvas 键盘输入事件
 * @extends CanvasInputEvent
 */
export class CanvasKeyBoardEvent extends CanvasInputEvent {
    constructor(
        type: EInputEventType,
        /** 当前按下的键的 `ascii字符` */
        public key: string,
        /** 当前按下的键的 `ascii码(数字)` */
        public keyCode: number,
        /** 当前按下的键是否不停的触发事件 */
        public repeat: boolean,
        altKey: boolean = false,
        ctrlKey: boolean = false,
        shiftKey: boolean = false,
    ) {
        super(altKey, ctrlKey, shiftKey, type);
    }
}

/** 定时器回调函数类型别名，需要第三方实现和设置 */
export type TimerCallback = (id: number, data: unknown) => void;

/**
 * 定时器类
 * @property {number} id 定时器的id号
 * @property {boolean} enabled 标记当前定时器是否有效
 * @property {TimerCallback} callback 定时器回调函数，到时间会自动调用
 * @property {any} callbackData 用作回调函数的参数
 * @property {number} countdown 倒计时定时器，每次 `update` 时会倒计时
 * @property {number} timeout 重复触发定时器的时间间隔
 * @property {number} onlyOnce 是否重复触发定时器
 */
class Timer {
    /** 定时器的id号 */
    id: number = -1;
    /** 标记当前定时器是否有效 */
    enabled: boolean = false;
    /** 用作回调函数的参数 */
    callbackData: unknown = undefined;
    /** 倒计时定时器，每次 `update` 时会倒计时 */
    countdown: number = 0;
    /** 重复触发定时器的时间间隔 */
    timeout: number = 0;
    /** 是否重复触发定时器 */
    onlyOnce: boolean = false;

    /**
     * 定时器类构造函数
     * @param {TimerCallback} callback 回调函数，到时间会自动调用
     */
    constructor(public callback: TimerCallback) {}
}

/** `Application`基类，主要功能为更新、重绘、事件的分发或处理 */
export class Application implements EventListenerObject {
    timers: Timer[] = [];

    private _timeId: number = -1;

    private _fps: number = 0;

    /** 计算当前的FPS（Frame Per Second） */
    get fps() {
        return this._fps;
    }

    /** 指示如何计算Y轴的坐标 */
    isFlipYCoord: boolean = false;

    // 我们的Application主要是canvas2D和webGL应用
    // 而canvas2D和webGL context都是从HTMLCanvasElement元素获取的
    canvas: HTMLCanvasElement;

    /** 是否支持鼠标移动时触发 `mousemove` 事件 */
    isSupportMouseMove: boolean;

    /** 标记当前鼠标是否按下, 目的是提供 `mousedrag` 事件 */
    protected _isMouseDown: boolean;

    /** 标记当前鼠标右键是否按下, 目的是提供 `mousedrag` 事件 */
    protected _isRightMouseDown: boolean = false;

    /** 标记当前 `Application` 是否进入不间断的循环状态 */
    protected _start: boolean = false;

    /**
     * `window.requestAnimationFrame()` 返回的大于0的id号,
     * 可以使用 `cancelAnimationFrame(this ._requestId)` 来取消动画循环
     */
    protected _requestId: number = -1;

    /** 用于计算当前更新与上一次更新之间的时间差, 用于基于时间的物理更新 */
    protected _lastTime!: number;
    /** 用于计算当前更新与上一次更新之间的时间差, 用于基于时间的物理更新 */
    protected _startTime!: number;

    /** 每帧间回调函数, 下一次重绘之前更新动画帧所调用的函数 */
    frameCallback: ((app: Application) => void) | null;

    constructor(canvas: HTMLCanvasElement) {
        // Application基类拥有一个HTMLCanvasElement对象
        // 这样子类可以分别从该HTMLCanvasElement中获取Canvas2D或WebGL上下文对象
        this.canvas = canvas;
        // 初始化时，mouseDown为false
        this._isMouseDown = false;
        // 默认状态下不支持mousemove事件
        this.isSupportMouseMove = false;
        this.frameCallback = null;
        document.oncontextmenu = () => false; // 禁止右键上下文菜单

        // canvas元素能够监听鼠标事件
        this.canvas.addEventListener('mousedown', this, false);
        this.canvas.addEventListener('mouseup', this, false);
        this.canvas.addEventListener('mousemove', this, false);
        // 很重要的一点，键盘事件不能在canvas中触发，但是能在全局的window对象中触发
        // 因此我们能在window对象中监听键盘事件
        window.addEventListener('keydown', this, false);
        window.addEventListener('keyup', this, false);
        window.addEventListener('keypress', this, false);
    }

    /** 启动动画循环 */
    start(): void {
        if (this._start === false) {
            this._start = true;
            // this._requestId = -1; // 将_requestId设置为-1
            // 在start和stop函数中，_lastTime和_startTime都设置为-1
            this._lastTime = -1;
            this._startTime = -1;
            // 启动更新渲染循环
            this._requestId = window.requestAnimationFrame(
                (mSec: DOMHighResTimeStamp): void => this.step(mSec),
            );
            //注释掉上述代码，使用下面的代码来启动step方法
            // this._requestId = window.requestAnimationFrame(this.step.bind(this));
        }
    }

    /**
     * 虚函数，子类覆写（overide），用于同步各种资源后启动 `Application`
     */
    async run(): Promise<void> {
        // 调用start方法，该方法会启动requestAnimationFrame
        // 然后不停地进行回调
        this.start();
    }

    /** 判断当前的 `Application` 是否一直在调用 `window.requestAnimationFrame()` */
    isRunning(): boolean {
        return this._start;
    }

    /** 停止动画循环 */
    stop(): void {
        if (this._start) {
            // alert(this._requestId);
            //`cancelAnimationFrame` 函数用于
            //取消一个先前通过调用 `window.requestAnimationFrame()` 方法添加到计划中的动画帧请求
            window.cancelAnimationFrame(this._requestId);
            this._requestId = -1; // 将_requestId设置为-1
            // 在start和stop函数中，_lastTime和_startTime都设置为-1
            this._lastTime = -1;
            this._startTime = -1;
            this._start = false;
        }
    }

    /** 子类能覆写（override），用于渲染 */
    render(): void {
        throw new Error('Method not implemented, please override it in subClass!!!');
    }

    /** 子类能覆写（override），用于更新。注意：第二个参数是秒为单位，第一参数是毫秒为单位 */
    update(elapsedMsec: number, intervalSec: number): void {
        // 需要子类覆写
        void elapsedMsec, intervalSec;
    }

    /**
     * 不停地周而复始运动，不间断地刷新。
     * 将不间断地刷新分解为4个流程：计算帧率（FPS）、更新（update）、render（重绘）及按需逐帧回调（frameCallback）
     */
    protected step(timeStamp: DOMHighResTimeStamp): void {
        //第一次调用本函数时，设置start和lastTime为timestamp
        if (this._startTime === -1) this._startTime = timeStamp;
        if (this._lastTime === -1) this._lastTime = timeStamp;
        /** 当前时间点与第一次调用step时间点的差 */
        const elapsedMsec = timeStamp - this._startTime;
        //计算当前时间点与上一次调用step时间点的差(可以理解为两帧之间的时间差)
        // 此时intervalSec实际是毫秒表示
        let intervalSec = timeStamp - this._lastTime;
        // 第一帧的时候intervalSec为0，防止0作分母
        if (intervalSec !== 0) {
            // 计算fps
            this._fps = 1000.0 / intervalSec;
        }
        // 我们update使用的是秒为单位，因此转换为秒表示
        intervalSec /= 1000.0;
        //记录上一次的时间戳
        this._lastTime = timeStamp;
        this._handleTimers(intervalSec);

        // console.log(`elapsedTime = ${elapsedMsec} diffTime = ${intervalSec}`);

        // 先更新
        this.update(elapsedMsec, intervalSec);
        // 后渲染
        this.render();
        // 如果 `frameCallback` 回调函数不为null，则进行回调
        if (this.frameCallback !== null) {
            this.frameCallback(this);
        }
        // 递归调用，形成周而复始的前进
        window.requestAnimationFrame((timeStamp: DOMHighResTimeStamp) =>
            this.step(timeStamp),
        );
    }

    /**
     * 调用 `dispatchXXXX` 抽象成员方法进行事件分发
     * `handleEvent` 是接口EventListenerObject定义的协议分发，必须要实现
     * @param {Event} evt An event which takes place in the DOM.
     */
    handleEvent(evt: Event): void {
        // 根据事件的类型，调用对应的dispatchXXX虚方法
        switch (evt.type) {
            case 'mousedown':
                this._isMouseDown = true;
                this.onMouseDown(
                    this._toCanvasMouseEvent(evt, EInputEventType.MOUSEDOWN),
                );
                break;
            case 'mouseup':
                this._isMouseDown = false;
                this.onMouseUp(this._toCanvasMouseEvent(evt, EInputEventType.MOUSEUP));
                break;
            case 'mousemove':
                // 如果isSupportMouseMove为true，才会每次鼠标移动触发mouseMove事件
                if (this.isSupportMouseMove) {
                    this.onMouseMove(
                        this._toCanvasMouseEvent(evt, EInputEventType.MOUSEMOVE),
                    );
                }
                // 同时，如果当前鼠标任意一个键处于按下状态并拖动时，触发drag事件
                if (this._isMouseDown) {
                    this.onMouseDrag(
                        this._toCanvasMouseEvent(evt, EInputEventType.MOUSEDRAG),
                    );
                }
                break;
            case 'keypress':
                this.onKeyPress(
                    this._toCanvasKeyBoardEvent(evt, EInputEventType.KEYPRESS),
                );
                break;
            case 'keydown':
                this.onKeyDown(this._toCanvasKeyBoardEvent(evt, EInputEventType.KEYDOWN));
                break;
            case 'keyup':
                this.onKeyUp(this._toCanvasKeyBoardEvent(evt, EInputEventType.KEYUP));
                break;
        }
    }

    /**
     * 将鼠标事件发生时鼠标指针的位置变换为相对当前 `canvas` 元素的偏移表示。
     * 这是一个受保护方法，意味着只能在本类或其子类才能使用，其他类都无法调用本方法。
     * 之所以设计为受保护的方法，是为了让子类能够覆写（override）本方法。
     * 因为本方法实现时不考虑CSS盒模型对鼠标坐标系变换的影响，如果你要支持更完善的变换。
     * 则可以让子类覆写（override）本方法。
     * 只要是鼠标事件（ `down / up / move / drag ...` ）都需要调用本方法。
     * 将相对于浏览器viewport表示的点变换到相对于canvas表示的点。
     */
    protected viewportToCanvasCoordinate(evt: MouseEvent): vec2 {
        // 切记，很重要一点：
        const rect: DOMRect = this.canvas.getBoundingClientRect();
        // 获取触发鼠标事件的target元素，这里总是HTMLCanvasElement
        if (evt.target) {
            const x: number = evt.clientX - rect.left;
            let y: number = 0;
            y = evt.clientY - rect.top;
            // 相对于canvas左上的偏移
            if (this.isFlipYCoord) {
                y = this.canvas.height - y;
            } // 变成矢量表示
            const pos: vec2 = new vec2([x, y]);
            return pos;
        }
        alert('evt . target为null');
        throw new Error('evt . target为null');
    }

    /** 将DOM Event对象信息转换为我们自己定义的 `CanvasMouseEvent` 事件 */
    private _toCanvasMouseEvent(evt: Event, type: EInputEventType): CanvasMouseEvent {
        // 向下转型，将Event转换为MouseEvent
        const event: MouseEvent = evt as MouseEvent;
        if (type === EInputEventType.MOUSEDOWN && event.button === 2) {
            this._isRightMouseDown = true;
        } else if (type === EInputEventType.MOUSEUP && event.button === 2) {
            this._isRightMouseDown = false;
        }
        let buttonNum: number = event.button;
        if (this._isRightMouseDown && type === EInputEventType.MOUSEDRAG) {
            buttonNum = 2;
        }
        // 将客户区的鼠标pos变换到Canvas坐标系中表示
        const mousePosition: vec2 = this.viewportToCanvasCoordinate(event);
        // 将Event一些要用到的信息传递给CanvasMouseEvent并返回
        const canvasMouseEvent: CanvasMouseEvent = new CanvasMouseEvent(
            type,
            mousePosition,
            buttonNum,
            event.altKey,
            event.ctrlKey,
            event.shiftKey,
        );
        return canvasMouseEvent;
    }

    // 将DOM Event对象信息转换为我们自己定义的Keyboard事件
    private _toCanvasKeyBoardEvent(
        evt: Event,
        type: EInputEventType,
    ): CanvasKeyBoardEvent {
        const event: KeyboardEvent = evt as KeyboardEvent;
        // 将Event一些要用到的信息传递给CanvasKeyBoardEvent并返回
        const canvasKeyboardEvent: CanvasKeyBoardEvent = new CanvasKeyBoardEvent(
            type,
            event.key,
            event.keyCode,
            event.repeat,
            event.altKey,
            event.ctrlKey,
            event.shiftKey,
        );
        return canvasKeyboardEvent;
    }

    /** 抽象成员，派生类能覆写（override），用于分发输入事件 */
    dispatchMouseDown(inputEvent: CanvasMouseEvent): void {
        // 需要子类覆写
        void inputEvent;
    }
    /** 抽象成员，派生类能覆写（override），用于分发输入事件 */
    dispatchMouseUp(inputEvent: CanvasMouseEvent): void {
        // 需要子类覆写
        void inputEvent;
    }
    /** 抽象成员，派生类能覆写（override），用于分发输入事件 */
    dispatchMouseMove(inputEvent: CanvasMouseEvent): void {
        // 需要子类覆写
        void inputEvent;
    }
    /** 抽象成员，派生类能覆写（override），用于分发输入事件 */
    dispatchMouseDrag(inputEvent: CanvasMouseEvent): void {
        // 需要子类覆写
        void inputEvent;
    }
    /** 抽象成员，派生类能覆写（override），用于分发输入事件 */
    dispatchKeyPress(inputEvent: CanvasKeyBoardEvent): void {
        // 需要子类覆写
        void inputEvent;
    }
    /** 抽象成员，派生类能覆写（override），用于分发输入事件 */
    dispatchKeyDown(inputEvent: CanvasKeyBoardEvent): void {
        // 需要子类覆写
        void inputEvent;
    }
    /** 抽象成员，派生类能覆写（override），用于分发输入事件 */
    dispatchKeyUp(inputEvent: CanvasKeyBoardEvent): void {
        // 需要子类覆写
        void inputEvent;
    }

    /**
     * 根据 `id` 在 `timers` 列表中查找特定的 `timer`
     * 如果找到，则设置 `timer` 的 `enabled` 为 `false`, 并返回 `true`,
     * 如没找到，返回 `false`
     * @param {number} id 定时器 `id`
     * @returns {boolean} 是否存在这样一个定时器
     */
    removeTimer(id: number): boolean {
        return this.timers.some((timer) => {
            if (timer.id === id) {
                // 只是enabled设置为false，并没有从数组中删除
                timer.enabled = false;
                return true;
            }
        });
    }

    // 初始化时，timers是空列表
    // 为了减少内存析构，我们在removeTimer时并不从timers中删除Timer，而是设置enabled为false
    // 这样让内存使用量和析构达到相对平衡状态
    // 每次添加一个定时器时，先查看timers列表中是否有没有使用的Timer，如有的话，返回该 `Timer` 的id号
    // 如果没有可用的timer，就重新创建一个Timer，并设置其id号及其他属性
    /**
     * 添加定时器
     * @param callback 回调函数，到时间会自动调用
     * @param timeout 重复触发定时器的时间间隔
     * @param onlyOnce 是否重复触发定时器
     * @param data `callback` 被调用时要传入的参数
     * @returns
     */
    addTimer(
        callback: TimerCallback,
        timeout: number = 1.0,
        onlyOnce: boolean = false,
        data: unknown = undefined,
    ): number {
        for (let i = 0; i < this.timers.length; i++) {
            const timer: Timer = this.timers[i];
            if (timer.enabled === false) {
                timer.callback = callback;
                timer.callbackData = data;
                timer.timeout = timeout;
                timer.countdown = timeout;
                timer.enabled = true;
                timer.onlyOnce = onlyOnce;
                return timer.id;
            }
        }

        // 不存在，就新创建一个Timer对象
        const timer = new Timer(callback);
        timer.callbackData = data;
        timer.timeout = timeout;
        timer.countdown = timeout;
        timer.enabled = true;
        timer.id = ++this._timeId; // 由于初始化时id为-1,所以前++
        timer.onlyOnce = onlyOnce; //设置是否是一次回调还是重复回调
        // 添加到timers列表中去
        this.timers.push(timer);
        // 返回新添加的timer的id号
        return timer.id;
    }

    // _handleTimers私有方法被Application的update函数调用
    // update函数第二个参数是以秒表示的前后帧时间差
    // 正符合_handleTimers参数要求
    // 我们的定时器依赖于requestAnimationFrame回调
    // 如果当前Application没有调用start的话
    // 则定时器不会生效
    private _handleTimers(intervalSec: number): void {
        /**
         * 处理定时器列表中 `timer.enabled` 为 `true` 的定时器
         * @param {Timer} timer 定时器
         */
        const handleEnabledTimer = (timer: Timer) => {
            if (timer.enabled === true) {
                // countdown 初始化时 = timeout
                // 每次调用本函数，会减少上下帧的时间间隔，也就是update第二个参数传来的值
                // 从而形成倒计时的效果
                timer.countdown -= intervalSec;
                // 如果countdown 小于 0.0，那么说明时间到了，要触发回调了
                // 从这里看到，实际上timer并不是很精确的
                // 举个例子，假设我们update每次0.16秒
                // 我们的timer设置0.3秒回调一次
                // 那么实际上是 ( 0.3 - 0.32 ) < 0 ，触发回调
                if (timer.countdown < 0.0) {
                    // 调用回调函数
                    timer.callback(timer.id, timer.callbackData);

                    // 下面代码两个分支分别处理触发一次和重复触发的操作
                    // 如果该定时器需要重复触发
                    if (timer.onlyOnce === false) {
                        // 我们重新将countdown设置为timeout
                        // 由此可见，timeout不会更改，它规定了触发的时间间隔
                        // 每次更新的是countdown这个变量的值
                        timer.countdown = timer.timeout; //很精妙的一个技巧
                    } else {
                        // 如果该定时器只需要触发一次，那么我们就删除掉该定时器
                        this.removeTimer(timer.id);
                    }
                }
            }
        };

        // 遍历整个定时器列表
        this.timers.forEach(handleEnabledTimer);
    }

    protected onMouseDown(evt: CanvasMouseEvent): void {
        void evt;
        return;
    }

    protected onMouseUp(evt: CanvasMouseEvent): void {
        void evt;
        return;
    }

    protected onMouseMove(evt: CanvasMouseEvent): void {
        void evt;
        return;
    }

    protected onMouseDrag(evt: CanvasMouseEvent): void {
        void evt;
        return;
    }

    protected onKeyDown(evt: CanvasKeyBoardEvent): void {
        void evt;
        return;
    }

    protected onKeyUp(evt: CanvasKeyBoardEvent): void {
        void evt;
        return;
    }

    protected onKeyPress(evt: CanvasKeyBoardEvent): void {
        void evt;
        return;
    }
}
