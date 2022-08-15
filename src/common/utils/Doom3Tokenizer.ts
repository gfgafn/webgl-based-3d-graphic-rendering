import { IEnumerator } from '../container/IEnumerator';

/** Doom3文件格式中的数据类型对象TS如下面两种数据类型 */
export enum ETokenType {
    NONE,
    STRING,
    NUMBER,
}

// Token接口
export interface IDoom3Token {
    readonly type: ETokenType; // 返回当前token的类型
    reset(): void; // 重用当前对象
    isString(str: string): boolean; // 判断当前的token是否是string类型
    // 下面3个转换方法
    getString(): string; // 如果当前token是string类型，可以获取该token的字符串值
    getFloat(): number; // 如果当前token是number类型，并且需要是浮点数形式，可以调用本函数
    getInt(): number; // 如果当前token是number类型并且需要整数形式，可以调用本函数
}

export interface IDoom3Tokenizer extends IEnumerator<IDoom3Token> {
    setSource(source: string): void;
    // 一但我们使用迭代器模式，实际上生产IDoom3Token的方法就不需要了
    createToken(): IDoom3Token;
    // reset方法已经定义在IEnumerator接口中了，不需要再在子接口中声明了
    reset(): void;
    // getNextToken被IEnumerator的moveNext和current替代，因此在此接口中可以取消
    getNextToken(token: IDoom3Token): boolean;
}

// 该工厂需要被调用方使用，因此export导出
export class Doom3Factory {
    // 注意返回的是IDoom3Tokenizer接口而不是Doom3Tokenizer实现类
    static createTokenizer(): IDoom3Tokenizer {
        return new Doom3Tokenizer();
    }
}

class Doom3Token implements IDoom3Token {
    private _charArr: string[] = [];
    private _val: number;
    private _type: ETokenType;

    constructor() {
        this._charArr.length = 0;
        this._type = ETokenType.NONE;
        this._val = 0.0;
    }

    reset(): void {
        this._charArr.length = 0;
        this._type = ETokenType.NONE;
        this._val = 0.0;
    }

    get type(): ETokenType {
        return this._type;
    }

    getString(): string {
        // _charArr数组中存放的都是单个字符序列，例如[d,o,o,m,3]
        // 我们可以使用数组的join方法将字符串联成字符串
        // 下面会使用join方法后，会返回doom3这个字符串
        return this._charArr.join('');
    }

    getFloat(): number {
        return this._val;
    }

    getInt(): number {
        // 使用parserInt函数
        // 第一个参数是一个字符串类型的数字表示
        // 第二个参数是进制，我们一般用10进制
        return parseInt(this._val.toString(), 10);
    }

    isString(str: string): boolean {
        // 字符串长度不相等，肯定不等
        if (str.length !== this._charArr.length) {
            return false;
        }

        // 遍历每个字符
        // _charArr数组类型中每个char和输入的string类型中的每个char进行严格比较（!==操作符而不是!=）
        // 只要任意一个char不相等，意味着字符串不相等
        return this._charArr.every((char, index) => char === str[index]);
    }

    //下面三个非接口方法被IDoom3Tokenizer接口的实现类Doom3Tokenizer所使用

    // 将一个char添加到_charArr数组的尾部
    addChar(c: string): void {
        this._charArr.push(c);
    }

    // 设置数字，并将类型设置为NUMBER
    setVal(num: number): void {
        this._val = num;
        this._type = ETokenType.NUMBER;
    }

    //设置类型
    setType(type: ETokenType): void {
        this._type = type;
    }
}

class Doom3Tokenizer implements IDoom3Tokenizer {
    private _whiteSpaces: string[] = [' ', '\t', '\v', '\n', '\r'];

    private _digits: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    /** 判断某个字符是不是数字 */
    private _isDigit(c: string): boolean {
        return this._digits.some((dig) => c === dig);
    }

    /** 判断某个字符是不是空白字符 */
    private _isWhitespace(c: string): boolean {
        return this._whiteSpaces.some((whiteSpace) => c === whiteSpace);
    }

    // 要解析的字符串，使用Doom3Tokenizer字符串来初始化变量
    private _source: string = 'Doom3Tokenizer';
    private _currIdx: number = 0;

    // 创建IToken接口
    createToken(): IDoom3Token {
        return new Doom3Token();
    }

    // 实现公开的接口方法，设置要解析的字符串，并且重置当前索引
    setSource(source: string): void {
        this._source = source;
        this._currIdx = 0;
    }

    // 实现公开的接口方法，不改变要解析的字符串，仅重置当前索引
    reset(): void {
        this._currIdx = 0;
    }

    // 增加一个私有变量_current,并使用new进行初始化
    private _current: IDoom3Token = new Doom3Token();

    // 实现moveNext方法，实际调用的是getNextToken方法
    moveNext(): boolean {
        return this.getNextToken(this._current);
    }

    // 通过get方式实现只读属性current
    get current(): IDoom3Token {
        return this._current;
    }

    // 跳过所有的空白字符，将当前索引指向非空白字符
    private _skipWhitespace(): string {
        let c: string = '';
        do {
            c = this._getChar(); //移动当前索引

            //结束条件:数据源解析全部完成或者当前字符不是空白符
        } while (c.length > 0 && this._isWhitespace(c));

        return c;
    }

    // 修改为私有方法
    getNextToken(tok: IDoom3Token): boolean {
        //这里将IDoom3Token类型使用as操作符向下转型为Doom3Token
        /*之所以要向下转型是因为_getNumber 等方法的输出参数类型是Doom3Token而不是IDoom3Token
         **因此需要从IDoom3Token向下转型到Doom3Token
         **在TypeScript也可以使用< >来进行类型转换，代码如下所示:
         ** let token : Doom3Token = < Doom3Token > tok;
         */
        const token: Doom3Token = tok as Doom3Token;
        //初始化为空字符串
        let c: string = '';

        //重用token，每次调用本函数时，将token的索引重置为0
        //避免发生内存重新分配
        token.reset();

        do {
            // 第一步:跳过所有的空白字符,返回第一个可显示的字符
            c = this._skipWhitespace();

            // 第二步:判断非空白字符的第一个字符的开头是什么
            if (c == '/' && this._peekChar() == '/') {
                // 如果是//开头，则跳过单行注释中的所有字符
                c = this._skipComments0();
            } else if (c == '/' && this._peekChar() == '*') {
                //如果是/*开头的字符，则跳过多行注释中的所有字符
                c = this._skipComments1();
            } else if (
                this._isDigit(c) ||
                c == '-' ||
                (c == '.' && this._isDigit(this._peekChar()))
            ) {
                //如果当前字符是数字或是符号开头或者以点号以及数字开头
                //则返回到上一个字符索引处，因为_getNumber会重新处理数字情况
                this._ungetChar();
                this._getNumber(token);
                return true;
            } else if (c == '"' || c == "'") {
                //如果以\"或\'开头的字符，例如'origin'或'Body'
                //结束char也是\"或\'
                this._getSubstring(token, c);
                return true;
            } else if (c.length > 0) {
                //正常的字符串返回到上一个字符索引处，因为_getString会重新处理相关情况
                this._ungetChar();
                this._getString(token);
                return true;
            }
        } while (c.length > 0);

        return false;
    }

    //获得当前的索引指向的char，并且将索引加1，后移一位
    private _getChar(): string {
        //数组越界检查
        if (this._currIdx >= 0 && this._currIdx < this._source.length) {
            return this._source.charAt(this._currIdx++);
        }
        return '';
    }

    //探测一下一个字符是什么
    //很微妙的后++操作
    private _peekChar(): string {
        //数组越界检查，与getChar区别是并没移动当前索引
        //这里我们能体会到
        if (this._currIdx >= 0 && this._currIdx < this._source.length) {
            return this._source.charAt(this._currIdx);
        }
        return '';
    }

    private _ungetChar(): void {
        //将索引前移1位
        if (this._currIdx > 0) {
            --this._currIdx;
        }
    }

    private _skipComments0(): string {
        let c: string = '';
        do {
            c = this._getChar();

            //结束条件: 数据源解析全部完成或者遇到换行符
        } while (c.length > 0 && c != '\n');
        return c;
    }

    private _skipComments1(): string {
        //进入本函数是，当前索引只想/字符

        let c: string = '';

        // 1、先读取*号
        c = this._getChar();

        // 2、然后读取所有非* /这两个符号结尾的所有字符
        do {
            c = this._getChar();

            //结束条件: 数据源解析全部完成或者当前字符为*且下一个字符是/，也就是以*/结尾
        } while (c.length > 0 && (c != '*' || this._peekChar() != '/'));

        // 3. 由于上面读取到结束*前的字符就停止了，因此我们要将*也读取(消费)掉
        c = this._getChar();

        return c;
    }

    private _getNumber(token: Doom3Token): void {
        let val: number = 0.0;
        let isFloat: boolean = false; // 是不是浮点数
        let scaleValue: number = 0.1; // 缩放的倍数

        //获取当前的字符(当前可能的值是[数字，小数点，负号])
        let c: string = this._getChar();

        //预先判断是不是负数
        const isNegate: boolean = c === '-'; // 是不是负数

        let consumed: boolean = false;

        //获得0的ascii编码，使用了字符串的charCodeAt实列方法
        const ascii0 = '0'.charCodeAt(0);

        // 3.14 -3.14 .13 -.13 3. -3.
        // 只能进来三种类型的字符:- . 数字
        do {
            // 将当前的字符添加到token中去
            token.addChar(c);

            // 如果当前的字符是.的话，设置为浮点数类型
            if (c == '.') {
                isFloat = true;
            } else if (c !== '-') {
                // 10进制从字符到浮点数的转换算法
                // 否则如果不是-符号的话，说明是数字(代码运行到这里已经将点和负号操作符都排斥掉了，仅可能是数字)

                //这里肯定是数字了，我们获取当前的数字字符的ascii编码
                const ascii: number = c.charCodeAt(0);
                //将当前数字的ascii编码减去"0"的ascii编码的算法其实就是进行字符串-数字的类型转换
                const vc: number = ascii - ascii0;
                if (!isFloat)
                    // 整数部分算法，10倍递增，因为10进制
                    val = 10 * val + vc;
                else {
                    // 小数部分算法
                    val = val + scaleValue * vc;
                    //10倍递减
                    scaleValue *= 0.1;
                }
            } /* else { //运行到这段代码的，只能是负号 c = '-'
				console.log("运行到此处的只能是:" + c);
			}*/

            //上面循环中的代码没有消费字符，之所以使用consumed变量，是为了探测下一个字符
            if (consumed === true) this._getChar();

            c = this._peekChar();
            consumed = true;

            //结束条件：数据源解析全部完成或下一个字符既不是数字也不是小数点（如果是浮点数表示的话）
        } while (c.length > 0 && (this._isDigit(c) || (!isFloat && c === '.')));

        //如果是负数的话，要取反
        if (isNegate) val = -val;
        //设置数字和NUMBER类型
        token.setVal(val);
    }

    // 我们将左右大中小括号以及点号逗号都当作单独的Token处理
    // 如果想要增加更多的标点符号作为token，可以在本函数中进行添加
    private _isSpecialChar(c: string): boolean {
        switch (c) {
            case '(':
                return true;
            case ')':
                return true;
            case '[':
                return true;
            case ']':
                return true;
            case '{':
                return true;
            case '}':
                return true;
            case ',':
                return true;
            case '.':
                return true;
        }
        return false;
    }

    // 进入该函数，说明肯定不是数字，不是单行注释，不是多行注释，也不是子字符串
    // 进入该函数只有两种类型的字符串，即不带双引号或单引号的字符串以及specialChar
    private _getString(token: Doom3Token): void {
        // 获取当前字符，因为前面已经判断为字符串了
        let c: string = this._getChar();

        token.setType(ETokenType.STRING);

        // 进入循环
        do {
            //将当前的char添加到token中
            token.addChar(c);

            if (!this._isSpecialChar(c)) {
                c = this._getChar(); // 只有不是特殊操作符号的字符，才调用_getChar移动当前索引
            }

            //如果this . _isSpecialChar ( c )为true，不会调用_getChar函数，并且满足了跳出while循环的条件

            //结束条件：数据源解析全部完成或下一个是空白符或者当前字符是特殊符号
        } while (c.length > 0 && !this._isWhitespace(c) && !this._isSpecialChar(c));
    }

    private _getSubstring(token: Doom3Token, endChar: string): void {
        let end: boolean = false;
        let c: string = '';
        token.setType(ETokenType.STRING);
        do {
            //获取字符
            c = this._getChar();
            //如果当前字符是结束符(要么是\",要么是\')
            if (c === endChar) {
                end = true; //结束符
            } else {
                token.addChar(c);
            }
            //结束条件: 数据源解析全部完成或换行符（子串不能多行表示）或是结束符号(要么是\",要么是\')
        } while (c.length > 0 && c !== '\n' && !end);
    }
}
