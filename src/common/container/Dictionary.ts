export class Dictionary<T> {
    // 内部封装了索引签名或ES6 Map对象，其键的数据类型为string，泛型参数T可以是任意类型
    private _items: { [k: string]: T } | Map<string, T>;

    // 用来跟踪目前的元素个数，在成功调用insert方法后递增，在remove方法后递减
    private _count: number = 0; // 构造函数，根据参数useES6Map决定内部使用哪个关联数组

    constructor(useES6Map: boolean = true) {
        if (useES6Map === true) {
            this._items = new Map<string, T>();
            //初始化ES6 Map对象
        } else {
            this._items = {};
            // 初始化索引签名
        }
    }

    get length(): number {
        return this._count;
    }

    // 判断某个键是否存在
    contains(key: string): boolean {
        if (this._items instanceof Map) {
            return this._items.has(key);
        } else {
            // 注意：在索引签名中，key对应的值不存在时，返回的是undefined而不是null
            // 切记切记
            return this._items[key] !== undefined;
        }
    }

    // 给定一个键，返回对应的值对象
    find(key: string): T | undefined {
        if (this._items instanceof Map) {
            return this._items.get(key);
        } else {
            return this._items[key];
        }
    }

    // 插入一个键值对
    insert(key: string, value: T): void {
        if (this._items instanceof Map) {
            this._items.set(key, value);
        } else {
            this._items[key] = value;
        }
        this._count++;
    }

    // 删除
    remove(key: string): boolean {
        const ret: T | undefined = this.find(key);
        if (ret === undefined) {
            return false;
        }
        if (this._items instanceof Map) {
            this._items.delete(key);
        } else {
            delete this._items[key];
        }
        this._count--;
        return true;
    }

    get keys(): string[] {
        const keys: string[] = [];
        if (this._items instanceof Map) {
            const keyArray = this._items.keys();
            for (const key of keyArray) {
                keys.push(key);
            }
        } else {
            for (const prop in this._items) {
                if (Object.prototype.hasOwnProperty.call(this._items, prop)) {
                    keys.push(prop);
                }
            }
        }
        return keys;
    }

    get values(): T[] {
        const values: T[] = [];
        if (this._items instanceof Map) {
            // 一定要用of，否则会出错
            const vArray = this._items.values();
            for (const value of vArray) {
                values.push(value);
            }
        } else {
            for (const prop in this._items) {
                if (Object.prototype.hasOwnProperty.call(this._items, prop)) {
                    values.push(this._items[prop]);
                }
            }
        }
        return values;
    }

    toString(): string {
        return JSON.stringify(this._items as Map<string, T>);
    }
}
