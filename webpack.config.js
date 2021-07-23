const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const AngularCompilerPlugin = require('@ngtools/webpack').AngularCompilerPlugin;

if (process.env.NODE_ENV == null) {
    process.env.NODE_ENV = 'development';
}
const ENV = process.env.ENV = process.env.NODE_ENV;

const moduleRules = [
    {
        test: /\.ts$/,
        enforce: 'pre',
        loader: 'tslint-loader',
    },
    {
        test: /\.(html)$/,
        loader: 'html-loader',
    },
    {
        test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        exclude: /loading.svg/,
        use: [{
            loader: 'file-loader',
            options: {
                name: '[name].[ext]',
                outputPath: 'popup/fonts/',
                publicPath: './fonts/',
            },
        }],
    },
    {
        test: /\.(jpe?g|png|gif|svg)$/i,
        exclude: /.*(fontawesome-webfont|glyphicons-halflings-regular)\.svg/,
        use: [{
            loader: 'file-loader',
            options: {
                name: '[name].[ext]',
                outputPath: 'popup/images/',
                publicPath: './images/',
            },
        }],
    },
    {
        test: /\.scss$/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
                options: {
                    publicPath: '../',
                }
            },
            'css-loader',
            'sass-loader',
        ],
    },
    // Hide System.import warnings. ref: https://github.com/angular/angular/issues/21560
    {
        test: /[\/\\]@angular[\/\\].+\.js$/,
        parser: { system: true },
    },
    {
        test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
        loader: '@ngtools/webpack',
    }
];

const plugins = [
    new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup/index.html',
        chunks: ['popup/polyfills', 'popup/vendor-angular', 'popup/vendor', 'popup/main'],
        cache: false, // Remove after upgrading to Webpack 5
    }),
    new HtmlWebpackPlugin({
        template: './src/background.html',
        filename: 'background.html',
        chunks: ['vendor', 'background'],
        cache: false, // Remove after upgrading to Webpack 5
    }),
    new HtmlWebpackPlugin({
        template: './src/notification/bar.html',
        filename: 'notification/bar.html',
        chunks: ['notification/bar'],
        cache: false, // Remove after upgrading to Webpack 5
    }),
    new CopyWebpackPlugin({
        patterns: [
            './src/manifest.json',
            { from: './src/_locales', to: '_locales' },
            { from: './src/images', to: 'images' },
            { from: './src/popup/images', to: 'popup/images' },
            { from: './src/content/autofill.css', to: 'content' },
        ]
    }),
    new webpack.SourceMapDevToolPlugin({
        include: ['popup/main.js', 'background.js'],
    }),
    new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: 'chunk-[id].css',
    }),
    new webpack.DefinePlugin({
        'process.env': {
            'ENV': JSON.stringify(ENV)
        }
    }),
    new AngularCompilerPlugin({
        tsConfigPath: 'tsconfig.json',
        entryModule: 'src/popup/app.module#AppModule',
        sourceMap: true,
    }),
    new CleanWebpackPlugin({
        cleanAfterEveryBuildPatterns: ['!popup/fonts/**/*'],
    }),
];


const config = {
    mode: ENV,
    devtool: false,
    entry: {
        'popup/polyfills': './src/popup/polyfills.ts',
        'popup/main': './src/popup/main.ts',
        'background': './src/background.ts',
        'content/autofill': './src/content/autofill.js',
        'content/autofiller': './src/content/autofiller.ts',
        'content/notificationBar': './src/content/notificationBar.ts',
        'content/contextMenuHandler': './src/content/contextMenuHandler.ts',
        'content/shortcuts': './src/content/shortcuts.ts',
        'content/message_handler': './src/content/message_handler.ts',
        'notification/bar': './src/notification/bar.js',
    },
    optimization: {
        minimize: false,
        splitChunks: {
            cacheGroups: {
                commons: {
                    test(module, chunks) {
                        return module.resource != null &&
                            module.resource.includes(`${path.sep}node_modules${path.sep}`) &&
                            !module.resource.includes(`${path.sep}node_modules${path.sep}@angular${path.sep}`);
                    },
                    name: 'popup/vendor',
                    chunks: (chunk) => {
                        return chunk.name === 'popup/main';
                    },
                },
                angular: {
                    test(module, chunks) {
                        return module.resource != null &&
                            module.resource.includes(`${path.sep}node_modules${path.sep}@angular${path.sep}`);
                    },
                    name: 'popup/vendor-angular',
                    chunks: (chunk) => {
                        return chunk.name === 'popup/main';
                    },
                },
                commons2: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: (chunk) => {
                        return chunk.name === 'background';
                    },
                },
            },
        },
    },
    resolve: {
        extensions: ['.ts', '.js'],
        symlinks: false,
        modules: [path.resolve('node_modules')],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'build'),
    },
    module: { rules: moduleRules },
    plugins: plugins,
};

module.exports = config;
