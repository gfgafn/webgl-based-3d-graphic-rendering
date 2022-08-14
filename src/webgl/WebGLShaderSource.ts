/** 着色器源代码存储器 */
export const GLShaderSource = {
    colorShader: {
        vs: `
        #ifdef GL_ES
        precision highp float;
        #endif
        attribute vec3 aPosition;
        attribute vec4 aColor;
        uniform mat4 uMVPMatrix;
        varying vec4 vColor;
        void main(void) {
            gl_Position = uMVPMatrix * vec4(aPosition,1.0);
            vColor = aColor;
        }`,

        fs: `
        #ifdef GL_ES
        precision highp float;
        #endif
        varying   vec4 vColor;
        void main(void) {
            gl_FragColor = vColor;
        }`,
    },
    textureShader: {
        vs: `
        #ifdef GL_ES
        precision highp float;
        #endif
        attribute vec3 aPosition;
        attribute vec2 aTexCoord;
        uniform mat4 uMVPMatrix;
        varying vec2 vTextureCoord;
        void main(void) {
                gl_Position = uMVPMatrix * vec4(aPosition,1.0);;
                vTextureCoord = aTexCoord;
        }`,

        fs: `
        #ifdef GL_ES
        precision highp float;
        #endif
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        void main(void) {
            gl_FragColor = texture2D(uSampler, vTextureCoord);
        }`,
    },
};
