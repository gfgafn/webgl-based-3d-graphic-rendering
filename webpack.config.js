const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: './bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    mode: isProduction ? 'production' : 'development',
    devtool: 'inline-source-map',
    devServer: {
        static: {
            directory: path.join(__dirname, './'),
            watch: {
                ignored: ['**/node_modules'],
            },
        },
        open: true,
        host: 'localhost',
        historyApiFallback: true, // 所有 404 页面定位到 index.html
        compress: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
        }),
        new CleanTerminalPlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.ts$/, // 如果以是 `.ts` 结尾的文件
                loader: 'ts-loader', // 使用 `ts-loader` 来加载和转译 TypeScript 源码
                exclude: ['/node_modules/'],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
};
