# webgl-based-3d-graphic-rendering

《TypeScript图形渲染实战：基于WebGL的3D建构与实现》随书源码

**非原版随书代码**，个人对项目结构和局部代码进行了一定程度的更改，[主要修改](#主要修改)在此。

你可以点击下方出版社给出的链接下载此书的配套资源，包括原版源代码与视频
>[TypeScript图形渲染实战：基于WebGL的3D架构与实现_源代码+视频.rar](http://www.hzcourse.com/oep/image/ueditor/jsp/upload/file/20191209/64266-TypeScript图形渲染实战：基于WebGL的3D架构与实现_源代码+视频.rar
)

目前可以以预期方式显示与运行的Demo如下，第8章及以后章节由于缺少相关游戏程序资源，无法确认运行效果

- 第3章: `RotatingCubeApplication` ✅
- 第3章: `AsyncLoadTestApplication` ✅
- 第4章: `BasicWebGLApplication` ✅
- 第7章: `MeshBuilderApplication` 场景1 ✅ 场景2 ❌
- 第7章: `CoordSystemApplication` ❌
- 第8章: `Q3BspApplication` ❓
- 第9章: `Doom3Application` ❓
- 第10章: `MD5SkinedMeshApplication` ❓

## 依赖安装

首先需要安装[`pnpm`](https://pnpm.io/)

```shell
npm install -g pnpm && pnpm install
```

## 开发

```shell
pnpm run serve
```

## 生产环境构建

```shell
pnpm run build:prod
```

## 主要修改

- 解决了原版随书源码编译报错以及无法在开发时热更新的问题
- 引入了`eslint`, `prettier`, `.editorconfig`等代码检查以及代码格式化工具，减少代码潜在错误，统一代码风格
- 去掉了几乎所有的`public`关键字，在`JavaScript`和`TypeScript`中所有的`Class`成员默认都是公开的
- 对`VS Code`更友好的注释方式
- `tsm`数学库的引入由置于项目源码中变为由`npm`引入，由于该数学库目前不支持`npm`引入，因此引入[`@tlaukkan/tsm`](https://github.com/tlaukkan/tsm)这一`fork`版本作为代替
- `tsm`数学库API变更导致的更改，书中说使用的是[`tsm`](https://github.com/matthiasferch/tsm)这一数学库，但本人在重新构建项目的过程中发现这一书中的部分`tsm`源代码与该数学库在[`Github`](https://github.com/tlaukkan/tsm)的源码有出入，目前已经发现的如下所示
  - 随书源码中各类的`values`字段均为`public`型，而`Github`上源码均为`private`型
  - 随书源码中`mat4.perspective(fov, aspect, near, far)`方法的实现与`Github`上的实现有较大差异
  - 随书源码中`mat4`实例上的`inverse`方法不会修改实例自身，但`Github`上的源码显示其会修改自身
  - `tsm`整体相关

    ```typescript
    // 之前
    import { EPSILON, vec2, vec3, vec4, mat4, quat } from "../math/TSM";

    if ( num > EPSILON ) {}

    // 现在
    import { tsmAdapter } from '../math/tsmAdapter';

    if (num > tsmAdapter.EPSILON) {}
    ```

  - `vec2`相关

    ```typescript
    // 之前
    this.gl.uniform2fv(loc, vec2.values);

    // 现在
    this.gl.uniform2fv(loc, vec2.xy);
    ```

  - `vec3`相关

    ```typescript
    // 之前
    let a = vec3.v0

    this.gl.uniform3fv(loc, vec3.values);

    let out: vec3;
    let mat4: mat4 = new mat4()
    mat4.multiplyVec3(pts[i], out)

    // 现在
    let a = vec3Adapter.v0

    this.gl.uniform3fv(loc, vec3.xyz);

    let out: vec3;
    let mat4: mat4 = new mat4()
    out.xyz = mat4.multiplyVec3(pts[i]).xyz;
    ```

  - `vec4`相关

    ```typescript
    // 之前
    this.gl.uniform4fv(loc, vec4.values);

    // 现在
    this.gl.uniform4fv(loc, vec4.xyzw);
    ```

  - `mat4`相关

    ```typescript
    // 之前
    let b = mat4.values[index]

    let color: vec4 = vec4.red

    let out: vec3;
    mat4.multiplyVec3(pts[i], out)

    this.gl.uniformMatrix4fv(loc, false, mat4.values);


    // 现在
    let b = mat4.at(index)

    let color: vec4 = vec4Adapter.red

    let out: vec3;
    out.xyz = mat4.multiplyVec3(pts[i]).xyz;

    this.gl.uniformMatrix4fv(loc, false, mat4.all());

    ```

  - `quat`相关

    ```typescript
    // 之前
    this.gl.uniform4fv(loc, quat.values);

    // 现在
    this.gl.uniform4fv(loc, quat.xyzw);
    ```
