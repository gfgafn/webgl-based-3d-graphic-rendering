import { Application } from '../common/Application';
import { HttpRequest } from '../common/utils/HttpRequest';

export class AsyncLoadTestApplication extends Application {
    // 需要从服务器加载的图像url列表
    private _urls: string[] = ['data/uv.jpg', 'data/test.jpg', 'data/p1.jpg'];

    async loadImagesSequence(): Promise<void> {
        this._urls.forEach(async (url, i) => {
            const image: HTMLImageElement = await HttpRequest.loadImageAsync(url);
            console.log('loadImagesSequence : ', i, image);
        });
    }

    // 并发加载所有image文件
    loadImagesParallel(): void {
        const _promises: Promise<HTMLImageElement>[] = [];
        this._urls.forEach((url) => _promises.push(HttpRequest.loadImageAsync(url)));
        Promise.all(_promises).then((images: HTMLImageElement[]) => {
            images.forEach((image) => console.log(`loadImagesParallel: ${image}`));
        });
    }

    loadImagesParallelWithPromise(): Promise<void> {
        return new Promise((resolve, reject): void => {
            const _promises: Promise<HTMLImageElement>[] = [];
            this._urls.forEach((url) => _promises.push(HttpRequest.loadImageAsync(url)));
            Promise.all(_promises)
                .then((images: HTMLImageElement[]) => {
                    images.forEach((image) =>
                        console.log(`loadImagesParallelWithPromise: ${image}`),
                    );
                    resolve();
                })
                .catch((e) => reject(e));
        });
    }

    async loadTextFile(): Promise<void> {
        const str: string = await HttpRequest.loadTextFileAsync('data/test.txt');
        console.log(str);
    }

    // 覆写（overide）基类方法
    async run(): Promise<void> {
        await this.loadImagesSequence();
        await this.loadTextFile();
        await this.loadImagesParallelWithPromise();
        console.log('完成 run 方法的调用');
    }
}
