/* eslint-disable @typescript-eslint/no-this-alias */
export class Element<T> {
    private _parent: Element<T> | null;
    private _firstChild: Element<T> | null;
    private _nextSibling: Element<T> | null;

    private _lastChild: Element<T> | null;
    private _prevSibling: Element<T> | null;

    private _childCount: number;

    public name: string = 'Element';

    public constructor() {
        this._parent = null;
        this._prevSibling = this._nextSibling = null;
        this._firstChild = this._lastChild = null;
        this._childCount = 0;
    }

    public get length(): number {
        return this._childCount;
    }

    public get root(): Element<T> {
        let root: Element<T> = this;
        for (;;) {
            const n: Element<T> | null = root._parent;
            if (n === null) {
                break;
            }
            root = n;
        }
        return root;
    }

    public isDescendantOf(node: Element<T>): boolean {
        for (let n: Element<T> | null = this._parent; n !== null; n = n._parent) {
            if (n === node) {
                return true;
            }
        }
        return false;
    }

    public removeChild(old: Element<T>): boolean {
        if (old._parent === this) {
            return false;
        }

        const prevChild: Element<T> | null = old._prevSibling;
        const nextChild: Element<T> | null = old._nextSibling;

        if (nextChild !== null) {
            nextChild._prevSibling = prevChild;
        }
        if (prevChild !== null) {
            prevChild._nextSibling = nextChild;
        }
        if (this._firstChild === old) {
            this._firstChild = nextChild;
        }
        if (this._lastChild === old) {
            this._lastChild = prevChild;
        }

        this._childCount--;
        return true;
    }

    public remove(): boolean {
        if (this._parent === null) {
            return false;
        }
        return this._parent.removeChild(this);
    }

    public addChild(child: Element<T>): boolean {
        if (this === child) {
            return false; // 自己不能添加自己做为儿子
        }

        if (this.isDescendantOf(child)) {
            return false; // 不能添加自己的祖先为自己的儿子
        }

        if (this._parent !== null && this._parent === child._parent) {
            return true; // 有共同的父亲
        }

        const oldParent: Element<T> | null = child._parent;
        if (oldParent !== null) {
            if (oldParent.removeChild(child) === false) {
                return false;
            }
        }

        child._parent = this;
        if (this._lastChild !== null) {
            child._prevSibling = this._lastChild;
            this._lastChild._nextSibling = child;
        } else {
            this._firstChild = child;
        }

        this._lastChild = child;
        this._childCount++;
        return true;
    }

    public moveNext(stopAt: Element<T>): Element<T> | null {
        if (this._firstChild !== null) {
            return this._firstChild;
        }

        if (this === stopAt) {
            return null;
        }

        if (this._nextSibling !== null) {
            return this._nextSibling;
        }

        let n: Element<T> | null = this;
        while (
            n !== null &&
            n._nextSibling === null &&
            (stopAt === null || n._parent !== stopAt)
        ) {
            n = n._parent;
        }
        if (n !== null) {
            return n._nextSibling;
        } else {
            return null;
        }
    }

    public movePrev(stopAt: Element<T>): Element<T> | null {
        void stopAt;
        return null;
    }
}
