export class LinkNode<T> {
    public next: LinkNode<T>;
    public prev: LinkNode<T>;
    public data: T | undefined;

    public constructor(data: T | undefined = undefined) {
        this.next = this.prev = this;
        this.data = data;
    }

    public link(newLink: LinkNode<T>, append: boolean = true): void {
        // 后面
        if (append === true) {
            newLink.next = this;
            newLink.prev = this.prev;
            this.prev.next = newLink;
            this.prev = newLink;
        } else {
            //前面
            newLink.prev = this;
            newLink.next = this.next;
            this.next.prev = newLink;
            this.next = newLink;
        }
    }

    public unlink(): void {
        if (this.next !== null) {
            this.next.prev = this.prev;
        }
        if (this.prev !== null) {
            this.prev.next = this.next;
        }
    }
}

export class LinkList<T> {
    private _header: LinkNode<T>;
    private _count: number;

    public constructor() {
        this._header = new LinkNode();
        this._count = 0;
    }

    public get length(): number {
        return this._count;
    }

    public push(item: T): LinkNode<T> {
        const n: LinkNode<T> = new LinkNode(item);
        this._header.link(n);
        this._count++;
        return n;
    }

    public pop(): T | undefined {
        if (this._header.prev === this._header) {
            return undefined;
        }

        const data: T | undefined = this._header.prev.data;
        this._header.prev.unlink();
        this._count--;
        return data;
    }

    // 这个目前有问题，next和prev有不正确性
    public insertAfter(node: LinkNode<T>, data: T | undefined): LinkNode<T> {
        const temp: LinkNode<T> = new LinkNode<T>(data);
        temp.next = node;
        temp.prev = node.prev;
        node.prev.next = temp;
        node.prev = temp;
        this._count++;
        return temp;
    }

    public contains(item: T): boolean {
        for (
            let link: LinkNode<T> = this._header.next;
            link != this._header;
            link = link.next
        ) {
            if (link.data !== undefined) {
                if (link.data === item) {
                    return true;
                }
            }
        }
        return false;
    }

    public forNext(cb: (data: T) => void): void {
        for (
            let link: LinkNode<T> = this._header.next;
            link != this._header;
            link = link.next
        ) {
            if (link.data !== undefined) {
                cb(link.data);
            }
        }
    }

    public forPrev(cb: (data: T) => void): void {
        for (
            let link: LinkNode<T> = this._header.prev;
            link != this._header;
            link = link.prev
        ) {
            if (link.data !== undefined) {
                cb(link.data);
            }
        }
    }
}

/*
let list:LinkList<number> = new LinkList();
        list.push(0);
        list.push(1);
        list.push(2);

        list.pop();

        list.forNext((data:number):void =>{
            console.log(data);
        });

        list.forPrev((data:number):void =>{
            console.log(data);
        });
*/
