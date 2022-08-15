export class TypedArrayList<T extends Uint16Array | Float32Array | Uint8Array> {
    /** 内部使用类型数组，类型数组必须是 `Uint16Array | Float32Array | Uint8Array` 之一 */
    private _array: T;
    // 如果需要在ArrayList<T>的构造函数中new一个类型数组，则必须提供该类型数组的构造函数签名
    private _typedArrayConstructor: new (length: number) => T;

    // _length表示当前已经使用过的元素个数，而_capacity是指当前已经内存预先分配好的元素个数
    private _length: number;
    private _capacity: number;

    get length(): number {
        return this._length;
    }
    get capacity(): number {
        return this._capacity;
    }
    get typeArray(): T {
        return this._array;
    }

    constructor(
        typedArrayConstructor: new (capacity: number) => T,
        capacity: number = 8,
    ) {
        this._typedArrayConstructor = typedArrayConstructor;
        this._capacity = capacity; // 而预先分配内存的个数为capacity
        // 确保初始化时至少有8个元素的容量
        if (this._capacity === 0) {
            this._capacity = 8; // 默认分配8个元素内存
        }
        this._array = new this._typedArrayConstructor(this._capacity); // 预先分配capacity个元素的内存
        this._length = 0; // 初始化时，其_length为0
    }

    /** 根据索引号来获取该索引处的元素 */
    at(idx: number): number {
        if (idx < 0 || idx >= this.length) {
            throw new Error('索引越界!');
        }
        // 都是number类型
        const ret: number = this._array[idx];
        return ret;
    }

    push(num: number): number {
        // 如果当前的length超过了预先分配的内存容量
        // 那就需要进行内存扩容
        if (this._length >= this._capacity) {
            //如果最大容量数>0
            if (this._capacity > 0) {
                //增加当前的最大容量数（每次翻倍增加）
                //关于扩容策略，你可以自行定制，为了简单起见，每次扩容在原来的基础上翻倍
                // 例如当前为10，下一次为20，再下一次为40，以此类推
                this._capacity += this._capacity;
                console.log('curr capacity = ' + this._capacity);
            }
            const oldArray: T = this._array; // 记录原来类型数组的地址
            this._array = new this._typedArrayConstructor(this._capacity); // 创建一个新的扩容后的类型数组
            // 将oldArray中的数据复制到新建的类型数组的头部
            this._array.set(oldArray);
        }
        this._array[this._length++] = num;
        return this._length;
    }

    pushArray(nums: number[]): void {
        nums.forEach((num) => this.push(num));
    }

    /** subarray方法不会重新创建并复制源类型数组中的ArrayBuffer数据 */
    subArray(start: number = 0, end: number = this.length): T {
        return this._array.subarray(start, end) as T;
    }

    /** slice方法在创建新类型数组的同时，还会重新创建并复制源类型数组中的ArrayBuffer数据 */
    slice(start: number = 0, end: number = this.length): T {
        return this._array.slice(start, end) as T;
    }

    // 最简单高效的处理方式，直接设置_length为0，重用整个类型数组
    clear(): void {
        this._length = 0;
    }
}
