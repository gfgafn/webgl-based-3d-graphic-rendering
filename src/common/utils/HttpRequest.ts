/** 有时我们在完成时需要按名称查询对应的HTMLImageElement对象
 * 此时就需要ImageInfo结构了
 */
export class ImageInfo {
    name: string;

    constructor(public path: string, public image: HTMLImageElement) {
        this.name = path;
        this.image = image;
    }
}

export class HttpRequest {
    // 所有的load方法都是返回Promise对象，说明都是异步加载方式

    /**
     * 异步加载图像
     * @param url 图像url
     * @returns Promise<HTMLImageElement>
     */
    static loadImageAsync(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject): void => {
            const image = new Image();
            // 当image从url加载成功时, 调用成功状态的resolve回调函数
            image.onload = () => resolve(image);
            // 当image加载不成功时, 则调用失败状态的reject回调函数
            image.onerror = () => reject(new Error('Could not load image at ' + url));
            // 用url向服务器请求要加载的image
            image.src = url;
        });
    }

    static loadImageAsyncSafe(
        url: string,
        name: string = url,
    ): Promise<ImageInfo | null> {
        return new Promise((resolve, reject): void => {
            const image: HTMLImageElement = new Image();
            image.onload = () => resolve(new ImageInfo(name, image));
            image.onerror = (e) => reject(e);
            image.src = url;
        });
    }

    /**
     * 通过http get方式从服务器请求文本文件
     * @param url 文本文件url
     * @returns Promise<string>
     */
    static loadTextFileAsync(url: string): Promise<string> {
        return new Promise((resolve): void => {
            const xhr: XMLHttpRequest = new XMLHttpRequest();
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    resolve(xhr.responseText);
                }
            };
            // 异步执行操作，`user` 和 `password` 均为 `null`
            xhr.open('get', url, true, null, null);
            xhr.send();
        });
    }

    /**
     * 通过http get方式从服务器请求二进制文件
     * @param url 二进制文件url
     * @returns Promise<ArrayBuffer>
     */
    static loadArrayBufferAsync(url: string): Promise<ArrayBuffer> {
        return new Promise((resolve): void => {
            const xhr: XMLHttpRequest = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    resolve(xhr.response as ArrayBuffer);
                }
            };
            // 异步执行操作，`user` 和 `password` 均为 `null`
            xhr.open('get', url, true, null, null);
            xhr.send();
        });
    }
}
