import { Dictionary } from '../common/container/Dictionary';
import { GLTexture } from './WebGLTexture';

export class GLTextureCache {
    static readonly instance: GLTextureCache = new GLTextureCache();

    set(key: string, value: GLTexture) {
        this._dict.insert(key, value);
    }

    getMaybe(key: string): GLTexture | undefined {
        const ret: GLTexture | undefined = this._dict.find(key);
        return ret;
    }

    getMust(key: string): GLTexture {
        const ret: GLTexture | undefined = this._dict.find(key);
        if (ret === undefined) {
            throw new Error(key + '对应的Program不存在!!!');
        }
        return ret;
    }

    remove(key: string): boolean {
        return this._dict.remove(key);
    }

    private _dict: Dictionary<GLTexture>;
    // 私有构造函数
    private constructor() {
        this._dict = new Dictionary<GLTexture>();
    }
}
