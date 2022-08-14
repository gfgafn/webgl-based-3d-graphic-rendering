/* eslint-disable @typescript-eslint/no-this-alias */
import { IEnumerator } from './IEnumerator';

//回调函数类型定义
export type Indexer = (len: number, idx: number) => number;

export function IndexerL2R(len: number, idx: number): number {
    return idx;
}

export function IndexerR2L(len: number, idx: number): number {
    return len - idx - 1;
}

//          类型名，需要加 < T >       参数类型                返回类型
export type NodeCallback<T> = (node: TreeNode<T>) => void;

export interface IAdapter<T> {
    add(t: T): void; // 将t入队列或堆栈
    remove(): T | undefined; // 弹出队列或堆栈顶部的元素
    clear(): void; // 清空队列或堆栈，用于重用

    //属性
    length: number; // 当前队列或堆栈的元素个数
    isEmpty: boolean; // 判断当前队列或堆栈是否为空
}

export abstract class AdapterBase<T> implements IAdapter<T> {
    protected _arr: Array<T>;

    public constructor() {
        this._arr = new Array<T>();
    }

    public add(t: T): void {
        this._arr.push(t);
    }

    public abstract remove(): T | undefined;

    public get length(): number {
        return this._arr.length;
    }

    public get isEmpty(): boolean {
        return this._arr.length <= 0;
    }

    public clear(): void {
        this._arr = new Array<T>();
    }

    public toString(): string {
        return this._arr.toString();
    }
}

export class Stack<T> extends AdapterBase<T> {
    public remove(): T | undefined {
        if (this._arr.length > 0) return this._arr.pop();
        else return undefined;
    }
}

export class Queue<T> extends AdapterBase<T> {
    public remove(): T | undefined {
        if (this._arr.length > 0) return this._arr.shift();
        else return undefined;
    }
}

export class TreeNode<T> {
    /*
                                  树数据结构
            -------------------------root--------------------
           /                         |                      \
        node1                       node2                  node3
      /   |   \                    /      \                  |
 node4  node5 node6              node7   node8             node9
    |                            |         |
  node10                        node11  node12
                                           |
                                         node13
    */

    /**
     *
     * @param data { T | undefined } 设置要创建的树节点上依附的数据T，默认为undefined
     * @param parent { parent: TreeNode < T > | undefined = undefined } 设置要创建的树节点的父亲，默认为undefined
     * @param name { string } 设置要创建的树节点的名称，默认为空字符串
     */
    public constructor(
        data: T | undefined = undefined,
        parent: TreeNode<T> | undefined = undefined,
        name: string = '',
    ) {
        this._parent = parent;
        this._children = undefined;
        this.name = name;
        this.data = data;

        // 如果有父亲，则将this节点添加到父亲节点的儿子列表中去
        if (this._parent !== undefined) {
            this._parent.addChild(this);
        }
    }

    /**
     *
     * @param child { TreeNode < T > } 要添加的子节点
     * @param index { number } 要添加到的索引位置
     * @returns { TreeNode < T > | undefined} 如果添加子节点成功，返回true,否则返回false
     */
    public addChildAt(child: TreeNode<T>, index: number): TreeNode<T> | undefined {
        //第一种情况:要添加的子节点是当前节点的祖先的判断
        if (this.isDescendantOf(child)) {
            return undefined;
        }

        //延迟初始化的处理
        if (this._children === undefined) {
            //有两种方式初始化数组，我个人喜欢[ ]方式，可以少写一些代码
            this._children = [];
            //this._children = new Array<TreeNode<T>>();
        }

        //索引越界检查
        if (index >= 0 && index <= this._children.length) {
            if (child._parent) {
                //第二种情况:要添加的节点是有父亲的，需要从父亲中remove掉
                child._parent.removeChild(child);
            }
            //第三种情况: 要添加的节点不是当前节点的祖先并且也没有父亲(新节点或已从父亲移除)
            //设置父亲并添加到_children中去
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            child._parent = this;
            this._children.splice(index, 0, child);
            return child;
        } else {
            return undefined;
        }
    }

    /**
     * 简便方法，在子列表最后添加一个儿子节点
     * @param child { TreeNode < T > } 要添加的子节点
     * @returns { TreeNode < T > | undefined} 如果添加子节点成功，返回true,否则返回false
     */
    public addChild(child: TreeNode<T>): TreeNode<T> | undefined {
        if (this._children === undefined) {
            this._children = [];
        }

        //在列表最后添加一个节点
        return this.addChildAt(child, this._children.length);
    }

    /**
     *
     * @param index { number } 要移除的子节点的索引号
     * @returns { TreeNode<T> | undefined } 如果移除成功的话，返回的就是参数child节点，否则为undefined
     */
    public removeChildAt(index: number): TreeNode<T> | undefined {
        //由于使用延迟初始化，必须要进行undefined值检查
        if (this._children === undefined) return undefined;

        //根据索引从_children数组中获取节点
        const child: TreeNode<T> | undefined = this.getChildAt(index);

        //索引可能会越界，这是在getChildAt函数中处理的
        //如果索引越界了，getChildAt函数返回undefined
        //因此必须要进行undefined值检查
        if (child === undefined) {
            return undefined;
        }
        /*
        TypeScript / js splice方法: 向/从数组中添加/删除项目，然后返回被删除的项目。
        参数:
        index	必需。整数，规定添加/删除项目的位置，使用负数可从数组结尾处规定位置。
        howmany	必需。要删除的项目数量。如果设置为 0，则不会删除项目。
        item1 , ... , itemX	可选。向数组添加的新项目。
        这里使用了index和howmany这两个参数，含义是:将index处的元素删除掉
        */
        this._children.splice(index, 1); // 从子节点列表中移除掉
        child._parent = undefined; // 将子节点的父亲节点设置为undefined
        return child;
    }

    /**
     *
     * @param child { TreeNode < T > | undefined } 要移除的子节点
     * @returns { TreeNode < T > | undefined } 如果移除成功的话，返回的就是参数child节点，否则为null
     */
    public removeChild(child: TreeNode<T> | undefined): TreeNode<T> | undefined {
        //参数为undefined的处理
        if (child == undefined) {
            return undefined;
        }

        //如果当前节点是叶子节点的处理
        if (this._children === undefined) {
            return undefined;
        }

        //由于我们使用数组线性存储方式，从索引查找元素是最快的
        //但是从元素查找索引，必须遍历整个数组
        let index: number = -1;
        for (let i = 0; i < this._children.length; i++) {
            if (this.getChildAt(i) === child) {
                index = i; // 找到要删除的子节点，记录索引
                break;
            }
        }

        //没有找到索引
        if (index === -1) {
            return undefined;
        }

        //找到要移除的子节点的索引，那么就调用removeChildAt方法
        return this.removeChildAt(index);
    }

    /**
     *
     * 将this节点从父节点中移除
     * @returns { TreeNode < T > | undefined } 如果移除成功的话，返回的就是this节点
     */
    public remove(): TreeNode<T> | undefined {
        if (this._parent !== undefined) {
            return this._parent.removeChild(this);
        }
        return undefined;
    }

    public getChildAt(index: number): TreeNode<T> | undefined {
        if (this._children === undefined) return undefined;
        if (index < 0 || index >= this._children.length) return undefined;
        return this._children[index];
    }

    public get childCount(): number {
        if (this._children !== undefined) {
            return this._children.length;
        } else {
            return 0;
        }
    }

    public hasChild(): boolean {
        return this._children !== undefined && this._children.length > 0;
    }

    /**
     *
     * @param ancestor { TreeNode < T > | undefined } 用于测试参数ancestor是this节点的祖先
     * @returns { boolean } 如果this节点是ancestor的子孙，返回true,否则返回false
     */
    public isDescendantOf(ancestor: TreeNode<T> | undefined): boolean {
        //undefined值检查
        if (ancestor === undefined) return false;
        //从当前节点的父亲节点开始向上遍历
        for (
            let node: TreeNode<T> | undefined = this._parent;
            node !== undefined;
            node = node._parent
        ) {
            //如果当前节点的祖先等于ancestor，说明当前节点是ancestor的子孙，返回true
            if (node === ancestor) return true;
        }
        //否则遍历完成，说明当前节点不是ancestor的子孙，返回false
        return false;
    }

    public get children(): Array<TreeNode<T>> | undefined {
        return this._children;
    }

    public get parent(): TreeNode<T> | undefined {
        return this._parent;
    }

    public get root(): TreeNode<T> | undefined {
        let curr: TreeNode<T> | undefined = this;
        // 从this开始，一直向上遍历
        while (curr !== undefined && curr.parent !== undefined) {
            curr = curr.parent;
        }

        // 返回root节点
        return curr;
    }

    public get depth(): number {
        let curr: TreeNode<T> | undefined = this;
        let level: number = 0;
        while (curr !== undefined && curr.parent !== undefined) {
            curr = curr.parent;
            level++;
        }
        return level;
    }

    /**
     * 将一个字符串输出n次
     * @param target { string } 要重复输出的字符串
     * @param n { number } 要输出多少次
     */
    public repeatString(target: string, n: number): string {
        let total: string = '';
        for (let i = 0; i < n; i++) {
            total += target;
        }
        return total;
    }

    public visit(
        preOrderFunc: NodeCallback<T> | null = null,
        postOrderFunc: NodeCallback<T> | null = null,
        indexFunc: Indexer = IndexerL2R,
    ): void {
        // 在子节点递归调用visit之前，触发先根（前序）回调
        // 注意前序回调的时间点是在此处！！！！
        if (preOrderFunc !== null) {
            preOrderFunc(this);
        }
        // 遍历所有子节点
        const arr: Array<TreeNode<T>> | undefined = this._children;
        if (arr !== undefined) {
            for (let i: number = 0; i < arr.length; i++) {
                // 根据indexFunc选取左右遍历还是右左遍历
                const child: TreeNode<T> | undefined = this.getChildAt(
                    indexFunc(arr.length, i),
                );
                if (child !== undefined) {
                    // 递归调用visit
                    child.visit(preOrderFunc, postOrderFunc, indexFunc);
                    // 这里是中根（中序）in-order遍历，注意调用方不是this，而是child
                    // console . log ( child . repeatString ( "    " , child . depth  )  + child . name ) ;
                }
            }
        }

        // 在这个时机点触发postOrderFunc回调
        // 注意后根（后序）回调的时间点是在此处！！！！
        if (postOrderFunc !== null) {
            postOrderFunc(this);
        }
    }

    public visitForward(
        preOrderFunc: NodeCallback<T> | null = null,
        postOrderFunc: NodeCallback<T> | null = null,
    ): void {
        // 先根(前序)遍历时preOrderFunc触发的时机点
        if (preOrderFunc) {
            preOrderFunc(this);
        }
        let node: TreeNode<T> | undefined = this.firstChild;
        while (node !== undefined) {
            node.visitForward(preOrderFunc, postOrderFunc);
            node = node.nextSibling;
        }
        // 后根(后序)遍历时postOrderFunc触发的时机点
        if (postOrderFunc) {
            postOrderFunc(this);
        }
    }

    public visitBackward(
        preOrderFunc: NodeCallback<T> | null = null,
        postOrderFunc: NodeCallback<T> | null = null,
    ): void {
        // 先根(前序)遍历时preOrderFunc触发的时机点
        if (preOrderFunc) {
            preOrderFunc(this);
        }
        let node: TreeNode<T> | undefined = this.lastChild;
        while (node !== undefined) {
            node.visitBackward(preOrderFunc, postOrderFunc);
            node = node.prevSibling;
        }
        // 后根(后序)遍历时postOrderFunc触发的时机点
        if (postOrderFunc) {
            postOrderFunc(this);
        }
    }

    public printLevelInfo(idx: number = 0): void {
        const str: string = this.repeatString(' ', idx * 4);
        // 递归调用前，此处是先根遍历操作，先根操作是在此处，切记！！！！
        //console . log( "先根：" + str + this.name );
        const arr: Array<TreeNode<T>> | undefined = this._children;
        if (arr !== undefined) {
            for (let i: number = 0; i < arr.length; i++) {
                const child: TreeNode<T> | undefined = this.getChildAt(i);
                if (child !== undefined) {
                    // 递归调用
                    child.printLevelInfo(idx + 1);
                }
            }
        }
        // 递归调用后，此处是后根遍历操作，后根操作是在此处，切记！！！！
        console.log('后根：' + str + this.name);
    }

    public printInfo(idx: number = 0): void {
        const str: string = this.repeatString(' ', idx * 4);
        // 递归调用前，此处是先根遍历操作，先根操作是在此处，切记！！！！
        console.log('先根：' + str + this.name);
        let node: TreeNode<T> | undefined = this.firstChild;
        while (node !== undefined) {
            node.printInfo(idx + 1);
            node = node.nextSibling;
        }
        // 递归调用后，此处是后根遍历操作，后根操作是在此处，切记！！！！
        //console . log ( "后根："  + str + this . name ) ;
    }

    public printInfo2(idx: number = 0): void {
        const str: string = this.repeatString(' ', idx * 4);
        // 递归调用前，此处是先根遍历操作，先根操作是在此处，切记！！！！
        console.log('先根：' + str + this.name);
        let node: TreeNode<T> | undefined = this.lastChild;
        while (node !== undefined) {
            node.printInfo(idx + 1);
            node = node.prevSibling;
        }
        // 递归调用后，此处是后根遍历操作，后根操作是在此处，切记！！！！
        //console . log ( "后根："  + str + this . name ) ;
    }

    // 获取当前节点的第一个儿子节点
    public get firstChild(): TreeNode<T> | undefined {
        if (this._children !== undefined && this._children.length > 0) {
            return this._children[0];
        } else {
            return undefined;
        }
    }

    // 获取当前节点的最后一个儿子节点
    public get lastChild(): TreeNode<T> | undefined {
        if (this._children !== undefined && this._children.length > 0) {
            return this._children[this._children.length - 1];
        } else {
            return undefined;
        }
    }

    public get nextSibling(): TreeNode<T> | undefined {
        // 没有父亲节点，肯定没有兄弟节点
        if (this._parent === undefined) {
            return undefined;
        }
        // 只有当前节点的父亲的儿子节点的数量大于1才说明有兄弟节点
        if (this._parent._children !== undefined && this._parent._children.length > 1) {
            // 此时只说明可能有兄弟节点，还要知道是否有右兄弟节点
            // 先要知道当前节点在父亲节点子节点列表中的索引号
            let idx: number = -1;
            for (let i = 0; i < this._parent._children.length; i++) {
                if (this === this._parent._children[i]) {
                    idx = i;
                    break;
                }
            }
            // idx 肯定不为-1
            // 如果idx不是父亲节点子节点列表中最后一个的话，说明有nextSibling
            if (idx !== this._parent._children.length - 1) {
                return this._parent._children[idx + 1];
            } else {
                // 说明当前节点在父亲的子列表的最后一个，不可能有右兄弟了
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    public get prevSibling(): TreeNode<T> | undefined {
        // 没有父亲节点，肯定没有兄弟节点
        if (this._parent === undefined) {
            return undefined;
        }
        // 只有当前节点的父亲的儿子节点的数量大于1才说明有兄弟节点
        if (this._parent._children !== undefined && this._parent._children.length > 1) {
            // 此时只说明可能有兄弟节点，还要知道是否有右兄弟节点
            // 先要知道当前节点在父亲节点子节点列表中的索引号
            let idx: number = -1;
            for (let i = 0; i < this._parent._children.length; i++) {
                if (this === this._parent._children[i]) {
                    idx = i;
                    break;
                }
            }
            // idx 肯定不为-1
            // 如果idx不是父亲节点子节点列表中最前一个的话，说明有nextSibling
            if (idx !== 0) {
                return this._parent._children[idx - 1];
            } else {
                // 说明当前节点在父亲的子列表的最前一个，不可能有左兄弟了
                return undefined;
            }
        } else {
            return undefined;
        }
    }

    public get mostRight(): TreeNode<T> | undefined {
        let node: TreeNode<T> | undefined = this;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            let subNode: TreeNode<T> | undefined = undefined;
            if (node !== undefined) {
                // 调用lastChild只读属性
                subNode = node.lastChild;
            }
            if (subNode === undefined) {
                break;
            }
            node = subNode;
        }
        return node;
    }

    public get mostLeft(): TreeNode<T> | undefined {
        let node: TreeNode<T> | undefined = this;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            let subNode: TreeNode<T> | undefined = undefined;
            if (node !== undefined) {
                // 调用firstChild只读属性
                subNode = node.firstChild;
            }
            if (subNode === undefined) {
                break;
            }
            node = subNode;
        }
        return node;
    }

    public moveNext(): TreeNode<T> | undefined {
        // 如果有左儿子节点，则返回儿子节点
        let ret: TreeNode<T> | undefined = this.firstChild;
        if (ret !== undefined) {
            return ret;
        }
        // 如果没有儿子节点，但是有兄弟节点，则返回当前节点的右兄弟
        ret = this.nextSibling;
        if (ret !== undefined) {
            return ret;
        }
        // 当前节点既没有左儿子，也没有右兄弟
        ret = this;
        while (ret !== undefined && ret.nextSibling === undefined) {
            ret = ret.parent;
        }
        //console . log ( "--")
        // 如果父亲有右兄弟，则返回右兄弟节点
        if (ret !== undefined) {
            return ret.nextSibling;
        }
        // 否则表示遍历结束
        return undefined;
    }

    public movePrev(): TreeNode<T> | undefined {
        // 如果有左儿子节点，则返回儿子节点
        let ret: TreeNode<T> | undefined = this.lastChild;
        if (ret !== undefined) {
            return ret;
        }
        // 如果没有儿子节点，但是有兄弟节点，则返回当前节点的右兄弟
        ret = this.prevSibling;
        if (ret !== undefined) {
            return ret;
        }
        // 当前节点既没有左儿子，也没有右兄弟
        ret = this;
        while (ret !== undefined && ret.prevSibling === undefined) {
            ret = ret.parent;
        }
        //console . log ( "--")
        // 如果父亲有右兄弟，则返回右兄弟节点
        if (ret !== undefined) {
            return ret.prevSibling;
        }
        // 否则表示遍历结束
        return undefined;
    }
    /*
    public movePrev ( ) : TreeNode<T> | undefined {
        let ret : TreeNode<T> | undefined = this . prevSibling ;
        if ( ret !== undefined ) {
           while ( ret . lastChild !== undefined ) {
               ret = ret . lastChild ;
           }
           return ret ;
        }
        return this . parent ;
    }*/

    /*
                                  树数据结构
            -------------------------root--------------------
           /                          |                      \
        node1                       node2                  node3
      /       \                    /      \                  |
    node4     node5              node6   node7             node8
      |         |                   |       |
    node9     node13              node10  node11
                                           |
                                         node12
*/

    public moveNextPost(): TreeNode<T> | undefined {
        // 如果当且节点没有右兄弟，则返回当前节点的父亲节点
        let next: TreeNode<T> | undefined = this.nextSibling;
        if (next === undefined) {
            return this.parent;
        }

        // 如果当前节点存在右兄弟，则获取当前节点的右兄弟的最左边儿子
        let first: TreeNode<T> | undefined = undefined;
        while (next !== undefined && (first = next.firstChild)) {
            next = first;
        }

        return next;
    }

    public movePrevPost(): TreeNode<T> | undefined {
        // 如果当且节点没有左兄弟，则返回当前节点的父亲节点
        let prev: TreeNode<T> | undefined = this.prevSibling;
        if (prev === undefined) {
            return this.parent;
        }
        // 如果当前节点存在左兄弟，则获取当前节点的左兄弟的最右边儿子
        let last: TreeNode<T> | undefined = undefined;
        while (prev !== undefined && (last = prev.lastChild)) {
            prev = last;
        }
        return prev;
    }

    private _parent: TreeNode<T> | undefined; // 指向父亲节点
    private _children: Array<TreeNode<T>> | undefined; // 数组中保存所有直接儿子节点

    public name: string; // 当前节点的名称，有利于debug时信息输出或按名字获取节点(集合)操作
    public data: T | undefined; // 一个泛型对象，指向一个你需要依附到当前节点的对象
}

/**
 * NodeT2BEnumerator 枚举器实现了IEnumerator < TreeNode < T > > 泛型接口
 * 泛型参数 ： T 表示树节点中附加的数据的类型
 *            IdxFun泛型参数必须是Indexer类型
 *            Adapter泛型参数必须是IAdapter < TreeNode < T > > > 类型
 *            TypeScript中我们可以使用extends来进行泛型的类型限定
 */
export class NodeT2BEnumerator<
    T,
    IdxFunc extends Indexer,
    Adapter extends IAdapter<TreeNode<T>>,
> implements IEnumerator<TreeNode<T>>
{
    private _node: TreeNode<T> | undefined; // 头节点，指向输入的根节点
    private _adapter!: IAdapter<TreeNode<T>>; // 枚举器内部持有一个队列或堆栈的适配器，用于存储遍历的元素，指向泛型参数
    private _currNode!: TreeNode<T> | undefined; // 当前正在操作的节点类型
    private _indexer!: IdxFunc; // 当前的Indexer，用于选择从左到右还是从右到左遍历，指向泛型参数

    /**
     * 构造函数
     * @param node { TreeNode < T > | undefined } 要遍历的树结构的根节点
     * @param func  { IdxFunc }  IdxFunc extends Indexer 必须是Indexer类型的回调函数
     * @param adapter  { Adapter } 必须是实现IAdapter < TreeNode < T > > >接口的类，该类必须要实现无参数的构造函数(new ( ) => Adapter )
     */
    public constructor(
        node: TreeNode<T> | undefined,
        func: IdxFunc,
        adapter: new () => Adapter,
    ) {
        // 必须要有根节点，否则无法遍历
        if (node === undefined) {
            return;
        }
        this._node = node; //头节点，指向输入的根节点
        this._indexer = func; //设置回调函数
        this._adapter = new adapter(); //调用new回调函数

        this._adapter.add(this._node); // 初始化时将根节点放入到堆栈或队列中去
        this._currNode = undefined; //设定当前node为undefined
    }

    /**
     * 实现接口方法，将枚举器设置为初始化状态，调用reset函数后，我们可以重用枚举器
     */
    public reset(): void {
        if (this._node === undefined) {
            return;
        }
        this._currNode = undefined;
        this._adapter.clear();
        this._adapter.add(this._node);
    }

    /**
     * 实现接口函数moveNext , 返回false表示枚举结束，否则返回true
     */
    public moveNext(): boolean {
        //当队列或者栈中没有任何元素，说明遍历已经全部完成了，返回false
        if (this._adapter.isEmpty) {
            return false;
        }

        //弹出头或尾部元素，依赖于adapter是stack还是queue
        this._currNode = this._adapter.remove();

        // 如果当前的节点不为undefined
        if (this._currNode != undefined) {
            // 获取当前的节点的儿子个数
            const len: number = this._currNode.childCount;
            // 遍历所有的儿子
            for (let i = 0; i < len; i++) {
                // 儿子是从左到右，还是从右到左进入队列或堆栈
                // 注意，我们的_indexer是在这里调用的
                const childIdx: number = this._indexer(len, i);
                const child: TreeNode<T> | undefined =
                    this._currNode.getChildAt(childIdx);
                if (child !== undefined) {
                    this._adapter.add(child);
                }
            }
        }

        return true;
    }

    /**
     * 实现接口属性current，用于返回当前正在枚举的节点TreeNode < T > | undefined
     */
    public get current(): TreeNode<T> | undefined {
        return this._currNode;
    }
}

export class NodeB2TEnumerator<T> implements IEnumerator<TreeNode<T>> {
    private _iter: IEnumerator<TreeNode<T>>; // 持有一个枚举器接口
    private _arr!: Array<TreeNode<T> | undefined>; //声明一个数组对象
    private _arrIdx!: number; // 当前的数组索引

    /**
     *
     * @param iter { IEnumerator < TreeNode < T > > } 指向树结构的先根迭代器
     */
    public constructor(iter: IEnumerator<TreeNode<T>>) {
        this._iter = iter; // 指向先根迭代器
        this.reset(); // 调用reset，填充数组内容以及_arrIdx
    }

    /**
     * 实现接口方法，将枚举器设置为初始化状态，调用reset函数后，我们可以重用枚举器
     * 关键方法
     */
    public reset(): void {
        this._arr = []; // 清空数组

        // 调用先根枚举器，将结果全部存入数组
        while (this._iter.moveNext()) {
            this._arr.push(this._iter.current);
        }
        // 设置_arrIdx为数组的length
        // 因为后根遍历是先根遍历的逆操作，所以是从数组尾部向顶部的遍历
        this._arrIdx = this._arr.length;
    }

    /**
     * 实现接口放current，用于返回当前正在枚举的节点TreeNode < T > | undefined
     */
    public get current(): TreeNode<T> | undefined {
        // 数组越界检查
        if (this._arrIdx >= this._arr.length) {
            return undefined;
        } else {
            // 从数组中获取当前节点
            return this._arr[this._arrIdx];
        }
    }

    /**
     * 实现接口函数moveNext , 返回false表示枚举结束，否则返回true
     */
    public moveNext(): boolean {
        this._arrIdx--;
        return this._arrIdx >= 0 && this._arrIdx < this._arr.length;
    }
}

export type NIter<T> = NodeT2BEnumerator<T, Indexer, IAdapter<TreeNode<T>>>;

export class NodeEnumeratorFactory {
    // 创建深度优先( stack )、从左到右 ( IndexerR2L ) 、从上到下的枚举器
    public static create_df_l2r_t2b_iter<T>(
        node: TreeNode<T> | undefined,
    ): IEnumerator<TreeNode<T>> {
        const iter: IEnumerator<TreeNode<T>> = new NodeT2BEnumerator(
            node,
            IndexerR2L,
            Stack,
        );
        return iter;
    }
    // 创建深度优先( stack )、从右到左( IndexerL2R )、从上到下的枚举器
    public static create_df_r2l_t2b_iter<T>(
        node: TreeNode<T> | undefined,
    ): IEnumerator<TreeNode<T>> {
        const iter: IEnumerator<TreeNode<T>> = new NodeT2BEnumerator(
            node,
            IndexerL2R,
            Stack,
        );
        return iter;
    }

    // 创建广度优先( Queue )、从左到右( IndexerL2R )、从上到下的枚举器
    public static create_bf_l2r_t2b_iter<T>(
        node: TreeNode<T> | undefined,
    ): IEnumerator<TreeNode<T>> {
        const iter: IEnumerator<TreeNode<T>> = new NodeT2BEnumerator(
            node,
            IndexerL2R,
            Queue,
        );
        return iter;
    }

    // 创建广度优先( Queue )、从右到左( IndexerR2L )、从上到下的枚举器
    public static create_bf_r2l_t2b_iter<T>(
        node: TreeNode<T> | undefined,
    ): IEnumerator<TreeNode<T>> {
        const iter: IEnumerator<TreeNode<T>> = new NodeT2BEnumerator(
            node,
            IndexerR2L,
            Queue,
        );
        return iter;
    }

    // 上面都是从上到下(先根)遍历
    // 下面都是从下到上(后根)遍历，是对上面的从上到下(先根)枚举器的包装

    // 创建深度优先、从左到右、从下到上的枚举器
    public static create_df_l2r_b2t_iter<T>(
        node: TreeNode<T> | undefined,
    ): IEnumerator<TreeNode<T>> {
        //向上转型，自动(向下转型，需要as或< >手动)
        const iter: IEnumerator<TreeNode<T>> = new NodeB2TEnumerator<T>(
            NodeEnumeratorFactory.create_df_r2l_t2b_iter(node),
        );
        return iter;
    }

    // 创建深度优先、从右到左、从下到上的枚举器
    public static create_df_r2l_b2t_iter<T>(
        node: TreeNode<T> | undefined,
    ): IEnumerator<TreeNode<T>> {
        const iter: IEnumerator<TreeNode<T>> = new NodeB2TEnumerator<T>(
            NodeEnumeratorFactory.create_df_l2r_t2b_iter(node),
        );
        return iter;
    }

    // 创建广度优先、从左到右、从下到上的枚举器
    public static create_bf_l2r_b2t_iter<T>(
        node: TreeNode<T> | undefined,
    ): IEnumerator<TreeNode<T>> {
        const iter: IEnumerator<TreeNode<T>> = new NodeB2TEnumerator<T>(
            NodeEnumeratorFactory.create_bf_r2l_t2b_iter(node),
        );
        return iter;
    }

    // 创建广度优先、从右到左、从下到上的枚举器
    public static create_bf_r2l_b2t_iter<T>(
        node: TreeNode<T> | undefined,
    ): IEnumerator<TreeNode<T>> {
        const iter: IEnumerator<TreeNode<T>> = new NodeB2TEnumerator<T>(
            NodeEnumeratorFactory.create_bf_l2r_t2b_iter(node),
        );
        return iter;
    }
}
