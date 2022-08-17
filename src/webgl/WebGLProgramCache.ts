import { Dictionary } from '../common/container/Dictionary';
import { GLProgram } from './WebGLProgram';

/** 缓存或管理当前 `WebGL` 应用中正在运行的相关`GLProgram`对象 */
export class GLProgramCache {
    // 单例设计模式
    // 只初始化一次，使用的是 static readonly声明方式
    static readonly instance: GLProgramCache = new GLProgramCache();
    private _dict: Dictionary<GLProgram>;

    // 私有构造函数
    private constructor() {
        this._dict = new Dictionary<GLProgram>();
        console.log('create new GLProgramCache! ! ');
    }

    set(key: string, value: GLProgram) {
        this._dict.insert(key, value);
    }

    // 可能返回undefined类型
    getMaybe(key: string): GLProgram | undefined {
        const ret: GLProgram | undefined = this._dict.find(key);
        return ret;
    }

    // 如果返回undefined，直接抛错
    getMust(key: string): GLProgram {
        const ret: GLProgram | undefined = this._dict.find(key);
        if (ret === undefined) {
            throw new Error(key + '对应的Program不存在!! ! ');
        }
        return ret;
    }

    remove(key: string): boolean {
        return this._dict.remove(key);
    }
}
