import { mat4 } from '@tlaukkan/tsm';
import { Dictionary } from '../common/container/Dictionary';
import { MathHelper } from '../common/math/MathHelper';
import { vec3Adapter } from '../common/math/tsmAdapter';
import {
    Doom3Factory,
    IDoom3Token,
    IDoom3Tokenizer,
} from '../common/utils/Doom3Tokenizer';
import { HttpRequest, ImageInfo } from '../common/utils/HttpRequest';
import { GLMeshBuilder } from '../webgl/WebGLMesh';
import { GLTexture } from '../webgl/WebGLTexture';
import { GLTextureCache } from '../webgl/WebGLTextureCache';
import { MD5Anim, Pose } from './MD5Anim.ts';
import { MD5Joint, MD5Mesh, MD5Vertex, MD5Weight } from './MD5Mesh';

export class MD5SkinedMesh {
    static path: string = 'data/doom3/';
    joints: MD5Joint[] = []; // .md5mesh中的BindPose关节
    meshes: MD5Mesh[] = []; // 一个．md5mesh文件可以有多个mesh，但只有一个．md5mesh文件
    anims: MD5Anim[] = []; // 增加MD5Anim对象数组，每个MD5Anim对象对应一个．md5anim文件

    parse(source: string): void {
        // 解析前的准备工作，先创建IDoom3Tokenizer接口
        const tokenizer: IDoom3Tokenizer = Doom3Factory.createTokenizer();
        const token: IDoom3Token = tokenizer.createToken(); // 创建重用的IToken接口
        tokenizer.setSource(source); // 设置要解析的．md5mesh文件文本字符串
        // 解析1.MD5Version 10
        tokenizer.getNextToken(token); // 读取MD5Version关键字
        tokenizer.getNextToken(token); // 读取版本号
        console.log('MD5Version = ', token.getInt()); // 数据类型为int
        // 解析2.commandline "<string>"
        tokenizer.getNextToken(token); // 读取commandline关键字
        tokenizer.getNextToken(token); // 读取commandline的值
        console.log('commmandline = ', token.getString()); // 解析3.numJoints <int>
        tokenizer.getNextToken(token); // 读取numJoints关键字
        tokenizer.getNextToken(token); // 读取numJoints的值
        const numJoints: number = token.getInt(); // 转换为int类型
        console.log('numJoints = ', numJoints); // 解析4.numMeshes <int>
        tokenizer.getNextToken(token); // 读取numMeshes关键字
        tokenizer.getNextToken(token); // 读取numMeshes的值
        const numMeshes: number = token.getInt();
        console.log('numMeshes = ', numMeshes); // 解析5．已知numJoints ，读取所有关节数据（骨骼）
        this._readJoints(tokenizer, token, numJoints);
        // 解析6．已知numMeshes，读取所有mesh蒙皮数据
        this._readMeshes(tokenizer, token, numMeshes);

        // 最后逐mesh更新顶点坐标
        for (let i: number = 0; i < this.meshes.length; i++) {
            this.updateMeshFinalPositions(i);
        }
    }

    private _readJoints(
        parser: IDoom3Tokenizer,
        token: IDoom3Token,
        numJoints: number,
    ): void {
        parser.getNextToken(token); // 读取"joints"关键词
        parser.getNextToken(token); // 跳过 {

        for (let i: number = 0; i < numJoints; i++) {
            const joint: MD5Joint = new MD5Joint();
            parser.getNextToken(token); // joint名称
            joint.name = token.getString();

            parser.getNextToken(token); // joint的父亲id号
            joint.parentId = token.getInt();

            // joint的位置
            parser.getNextToken(token); // (
            parser.getNextToken(token);
            joint.originInModelSpace.x = token.getFloat();
            parser.getNextToken(token);
            joint.originInModelSpace.y = token.getFloat();
            parser.getNextToken(token);
            joint.originInModelSpace.z = token.getFloat();
            parser.getNextToken(token); // )

            // joint的方向，存储了quat的x,y,z值，w需要计算出来
            parser.getNextToken(token); // (
            parser.getNextToken(token);
            joint.orientationInModelSpace.x = token.getFloat();
            parser.getNextToken(token);
            joint.orientationInModelSpace.y = token.getFloat();
            parser.getNextToken(token);
            joint.orientationInModelSpace.z = token.getFloat();
            joint.orientationInModelSpace.calculateW(); // 计算quat.w值

            // 将joint的位置和quat合成bindpose矩阵，该矩阵位于modelspace
            MathHelper.matrixFrom(
                joint.originInModelSpace,
                joint.orientationInModelSpace,
                joint.bindPoseMatrix,
            );
            // 计算bindPoseMatrix的逆矩阵
            // FIXME: joint.bindPoseMatrix.inverse(joint.inverseBindPoseMatrix);
            joint.inverseBindPoseMatrix.init(
                new mat4().setIdentity().init(joint.bindPoseMatrix.all()).inverse().all(),
            );
            this.joints.push(joint);
            parser.getNextToken(token); // )
        }
        parser.getNextToken(token); // }

        // parser.getNextToken(token); // 读取"joints"关键词
        // parser.getNextToken(token); // 跳过 {
        // for (let i: number = 0; i < numJoints; i++) {
        //     const joint: MD5Joint = new MD5Joint();
        //     parser.getNextToken(token); // joint名称
        //     joint.name = token.getString();
        //     parser.getNextToken(token); // joint的父亲id号
        //     joint.parentId = token.getInt(); // joint的位置
        //     parser.getNextToken(token); // (
        //     parser.getNextToken(token);
        //     joint.originInModelSpace.x = token.getFloat();
        //     parser.getNextToken(token);
        //     joint.originInModelSpace.y = token.getFloat();
        //     parser.getNextToken(token);
        //     joint.originInModelSpace.z = token.getFloat();
        //     parser.getNextToken(token); // )
        //     // joint的方向，存储了quat的x, y, z值，w需要计算出来
        //     parser.getNextToken(token); // (
        //     parser.getNextToken(token);
        //     joint.orientationInModelSpace.x = token.getFloat();
        //     parser.getNextToken(token);
        //     joint.orientationInModelSpace.y = token.getFloat();
        //     parser.getNextToken(token);
        //     joint.orientationInModelSpace.z = token.getFloat();
        //     joint.orientationInModelSpace.calculateW(); // 计算quat.w值
        //     // 将joint的位置和quat合成bindpose矩阵，该矩阵位于modelspace
        //     MathHelper.matrixFrom(
        //         joint.originInModelSpace,
        //         joint.orientationInModelSpace,
        //         joint.bindPoseMatrix,
        //     );
        //     // FIXME: 计算bindPoseMatrix的逆矩阵  joint.bindPoseMatrix.inverse(joint.inverseBindPoseMatrix);
        //     joint.inverseBindPoseMatrix.init(joint.bindPoseMatrix.inverse().all());
        //     this.joints.push(joint);
        //     parser.getNextToken(token); // )
        // }
        // parser.getNextToken(token); //
    }

    private _readVertex(
        parser: IDoom3Tokenizer,
        token: IDoom3Token,
        vertex: MD5Vertex,
    ): void {
        parser.getNextToken(token); // vert
        parser.getNextToken(token);
        token.getInt();
        parser.getNextToken(token); // (
        parser.getNextToken(token);
        vertex.uv.x = token.getFloat();
        parser.getNextToken(token);
        vertex.uv.y = 1.0 - token.getFloat(); // 纹理坐标和Quake一样，y轴需要调整一下
        parser.getNextToken(token); // )
        parser.getNextToken(token);
        vertex.firstWeight = token.getInt();
        parser.getNextToken(token);
        vertex.numWeight = token.getInt();
    }

    private _readTriangleTo(
        parser: IDoom3Tokenizer,
        token: IDoom3Token,
        triIndices: number[],
    ): void {
        parser.getNextToken(token); // tri
        parser.getNextToken(token);
        token.getInt();
        parser.getNextToken(token);
        const i0 = token.getInt();
        parser.getNextToken(token);
        const i1 = token.getInt();
        parser.getNextToken(token);
        const i2 = token.getInt();
        triIndices.push(i2, i1, i0); // 和Quake3一样，需要调整索引顺序，顺时针变为逆时针
    }

    private _readWeight(
        parser: IDoom3Tokenizer,
        token: IDoom3Token,
        weight: MD5Weight,
    ): void {
        parser.getNextToken(token); // weight
        parser.getNextToken(token);
        token.getInt();
        parser.getNextToken(token);
        weight.jointId = token.getInt();
        parser.getNextToken(token);
        weight.jointWeight = token.getFloat();
        parser.getNextToken(token); // (
        parser.getNextToken(token);
        weight.posInJointSpace.x = token.getFloat();
        parser.getNextToken(token);
        weight.posInJointSpace.y = token.getFloat();
        parser.getNextToken(token);
        weight.posInJointSpace.z = token.getFloat();
        parser.getNextToken(token); // )
    }

    private _readMeshes(
        parser: IDoom3Tokenizer,
        token: IDoom3Token,
        numSurfs: number,
    ): void {
        let count: number;
        let surf: MD5Mesh;
        let vertex: MD5Vertex;
        let weight: MD5Weight;
        for (let i: number = 0; i < numSurfs; i++) {
            surf = new MD5Mesh();
            parser.getNextToken(token); // "mesh"
            parser.getNextToken(token); // {
            parser.getNextToken(token); // "shader"
            parser.getNextToken(token); //
            surf.material = token.getString(); // 顶点
            parser.getNextToken(token); // "numverts"
            parser.getNextToken(token);
            count = token.getInt();
            for (let j: number = 0; j < count; j++) {
                vertex = new MD5Vertex(); // 调用_readVertex方法
                this._readVertex(parser, token, vertex);
                surf.vertices.push(vertex);
            } // 索引三角形
            parser.getNextToken(token); // "numtris"
            parser.getNextToken(token);
            count = token.getInt();
            for (let j: number = 0; j < count; j++) {
                // 调用_readTriangleTo方法
                this._readTriangleTo(parser, token, surf.indices);
            } // 权重值
            parser.getNextToken(token);
            parser.getNextToken(token);
            count = token.getInt();
            for (let j: number = 0; j < count; j++) {
                weight = new MD5Weight(); // 调用_readWeight方法
                this._readWeight(parser, token, weight);
                surf.weights.push(weight);
            }

            this.meshes.push(surf);
            parser.getNextToken(token); // }
        }
    }

    updateMeshFinalPositions(meshIdx: number): void {
        const mesh: MD5Mesh = this.meshes[meshIdx];
        // 获取参数所指向的MD5Mesh结构
        // 变量MD5Mesh中的所有顶点
        for (let j: number = 0; j < mesh.vertices.length; j++) {
            const vert: MD5Vertex = mesh.vertices[j];
            // 获取当前的MD5Vertex对象            // 遍历当前MD5Vertex中关联的所有权重对象
            for (let k: number = 0; k < vert.numWeight; k++) {
                // 注意权重对象的寻址算法
                const weight: MD5Weight = mesh.weights[vert.firstWeight + k];
                // 先获得当前顶点关联的weight对象，再从weight对象的jointId获得该 weight所属的关节
                // 然后再从关节中获得基于模型坐标系表示的绑定姿态矩阵（在_readJoints方法中计算出了姿态矩阵和其逆矩阵）
                const bindPose: mat4 = this.joints[weight.jointId].bindPoseMatrix;
                // 将基于骨骼坐标系表示的坐标变换到模型坐标系中表示
                // FIXME  bindPose.multiplyVec3(weight.posInJointSpace, vec3.zero);
                vec3Adapter.v0.xyz = bindPose.multiplyVec3(weight.posInJointSpace).xyz;
                // 然后再乘以权重标量
                vec3Adapter.v0.scale(weight.jointWeight);
                // 将计算出来的向量add到finalPosInModelSpace中
                vert.finalPosInModelSpace.add(vec3Adapter.v0);
            }
        } // 遍历完所有的权重对象后得到最终位于模型坐标系的顶点坐标
    }

    async loadTextures(gl: WebGLRenderingContext): Promise<void> {
        // 封装一个Promise对象
        return new Promise((resolve): void => {
            // 创建字典对象
            const names: Dictionary<string> = new Dictionary<string>();
            const _promises: Promise<ImageInfo | null>[] = []; // 遍历所有MD5 Mesh对象集合
            for (let i: number = 0; i < this.meshes.length; i++) {
                const mesh: MD5Mesh = this.meshes[i]; // 查看names字典，该字典保存所有已经添加的材质名称，目的是防止重复加载纹理
                if (names.contains(mesh.material) === false) {
                    // 如果不存在名字，就添加该名字
                    names.insert(mesh.material, mesh.material); // 将Promise加入到_promises数组中
                    _promises.push(
                        HttpRequest.loadImageAsyncSafe(
                            MD5SkinedMesh.path + mesh.material + '.png',
                            mesh.material,
                        ),
                    );
                }
            }
            //console.log(names.Keys);
            // 添加完所有请求的Promise对象后，调用all静态方法
            Promise.all(_promises).then((images: (ImageInfo | null)[]) => {
                console.log(images); // 加载完毕后，输出所有ImaeInfo对象，用于debug
                // 遍历ImageInfo对象，加载图像数据，生成纹理对象
                for (let i: number = 0; i < images.length; i++) {
                    const img: ImageInfo | null = images[i];
                    if (img) {
                        // 创建GLTexture对象
                        const tex: GLTexture = new GLTexture(gl, img.name);
                        tex.upload(img.image); // 加载图像数据
                        GLTextureCache.instance.set(img.name, tex); // 将成功生成的GLTexture对象存储到GLTextureCache容器中
                    }
                }
                resolve(); // 全部完成后，调用resolve回调，表示完成回调
            });
        });
    }

    drawBindPose(texBuilder: GLMeshBuilder, mvp: mat4): void {
        for (let i: number = 0; i < this.meshes.length; i++) {
            this._drawMesh(i, texBuilder, mvp);
        }
    }

    private _drawMesh(meshIdx: number, texBuilder: GLMeshBuilder, mvp: mat4): void {
        const mesh: MD5Mesh = this.meshes[meshIdx];
        const verts: MD5Vertex[] = mesh.vertices; // 如果纹理名对应的纹理存在，则使用，否则就使用default纹理
        const tex: GLTexture | undefined = GLTextureCache.instance.getMaybe(
            mesh.material,
        );
        if (tex) {
            texBuilder.setTexture(tex);
        } else {
            texBuilder.setTexture(GLTextureCache.instance.getMust('default'));
        } // 直接使用finalPosInModelSpace来绘制绑定姿态
        texBuilder.begin();
        for (let j: number = 0; j < mesh.indices.length; j++) {
            const vert: MD5Vertex = verts[mesh.indices[j]];
            texBuilder
                .texcoord(vert.uv.x, vert.uv.y)
                .vertex(
                    vert.finalPosInModelSpace.x,
                    vert.finalPosInModelSpace.y,
                    vert.finalPosInModelSpace.z,
                );
        }
        texBuilder.end(mvp);
    }

    parseAnim(content: string): void {
        const anim: MD5Anim = new MD5Anim();
        anim.parse(content);
        this.anims.push(anim);
    }

    playAnim(idx: number, frameNum: number): void {
        const anim: MD5Anim = this.anims[idx];
        anim.buildLocalSkeleton(frameNum); // 合成pose的局部matrix
        anim.updateToModelSpaceSkeleton(); // 合成pose的Model Space matrix表示
        for (let i: number = 0; i < anim.skeleton.poses.length; i++) {
            const pose: Pose = anim.skeleton.poses[i];
            // 继续合成pose的matrix矩阵
            // 此时pose.matrix的矩阵表示的是Model Space坐标系表示的MD5Vertex.finalPosInModelSpace顶点;
            // 变换到MD5Mesh中的bindpose的局部空间中，然后接着变换到当前pose的Model Space中
            mat4.product(pose.matrix, this.joints[i].inverseBindPoseMatrix, pose.matrix);
        }
        // 遍历所有mesh
        for (let i: number = 0; i < this.meshes.length; i++) {
            const mesh: MD5Mesh = this.meshes[i]; // 获取当前mesh
            for (let j: number = 0; j < mesh.vertices.length; j++) {
                const vert: MD5Vertex = mesh.vertices[j]; // 获取当前的MD5Vertex
                vert.animiatedPosInModelSpace.reset(); // 重用该坐标                // 遍历各个权重，合成最终的animatedPosInModelSpace的值
                for (let k: number = 0; k < vert.numWeight; k++) {
                    const weight: MD5Weight = mesh.weights[vert.firstWeight + k]; // 获取MD5Vertex关联的权重对象
                    // 获取当前权重关联的pose的matrix，注意这个matrix在本方法上面的注释
                    const bindPose: mat4 = anim.skeleton.poses[weight.jointId].matrix; // 将finalPosInModelSpace变换到Model Space
                    // FIXME:  bindPose.multiplyVec3(vert.finalPosInModelSpace, vec3.zero);
                    vec3Adapter.v0.xyz = bindPose.multiplyVec3(
                        vert.finalPosInModelSpace,
                    ).xyz;
                    vec3Adapter.v0.scale(weight.jointWeight); // 缩放权重
                    vert.animiatedPosInModelSpace.add(vec3Adapter.v0); // 添加当前权重到animiatedPosInModelSpace中
                }
            }
        }
    }

    drawAnimPose(texBuilder: GLMeshBuilder, mvp: mat4): void {
        for (let i: number = 0; i < this.meshes.length; i++) {
            this._drawAnimMesh(i, texBuilder, mvp);
        }
    }

    private _drawAnimMesh(meshIdx: number, texBuilder: GLMeshBuilder, mvp: mat4): void {
        const mesh: MD5Mesh = this.meshes[meshIdx];
        const verts: MD5Vertex[] = mesh.vertices;
        const tex: GLTexture | undefined = GLTextureCache.instance.getMaybe(
            mesh.material,
        );
        if (tex) {
            texBuilder.setTexture(tex);
        } else {
            texBuilder.setTexture(GLTextureCache.instance.getMust('default'));
        }
        texBuilder.begin();
        for (let j: number = 0; j < mesh.indices.length; j++) {
            const vert: MD5Vertex = verts[mesh.indices[j]];
            texBuilder
                .texcoord(vert.uv.x, vert.uv.y)
                .vertex(
                    vert.animiatedPosInModelSpace.x,
                    vert.animiatedPosInModelSpace.y,
                    vert.animiatedPosInModelSpace.z,
                );
        }
        texBuilder.end(mvp);
    }
}
