const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
var fs = require('fs');

const nodeEnv = process.env.NODE_ENV;
const isProduction = nodeEnv !== 'development';


// Common plugins
let plugins = [
    // this was preventing process.env from being loaded from the node env
    // new webpack.DefinePlugin({
    //     'process.env': {
    //         NODE_ENV: JSON.stringify(nodeEnv)
    //     },
    // }),
    new webpack.NamedModulesPlugin()
];
if (!isProduction) {
    plugins.push(new webpack.HotModuleReplacementPlugin())
}
const entry = [
    'babel-polyfill',
    path.resolve(path.join(__dirname, './src/server.js'))
];
var nodeModules = fs.readdirSync('node_modules')
    .filter(function (x) {
        return ['.bin'].indexOf(x) === -1;
    });

module.exports = {
    mode: 'production',
    devtool: false,
    externals: [
        // function (context, request, callback) {
        //     var pathStart = request.split('/')[0];
        //     if (nodeModules.indexOf(pathStart) >= 0 && request != 'webpack/hot/signal.js') {
        //         return callback(null, "commonjs " + request);
        //     };
        //     callback();
        // }
        nodeExternals()
    ],
    name: 'server',
    plugins: plugins,
    target: 'node',
    entry: entry,
    output: {
        publicPath: './',
        path: path.resolve(__dirname, './build/'),
        filename: 'server.prod.js',
        libraryTarget: "commonjs2"
    },
    resolve: {
        extensions: ['.webpack-loader.js', '.web-loader.js', '.loader.js', '.js', '.jsx', '.css'],
        modules: [
            path.resolve(__dirname, 'node_modules')
        ]
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                //loader: "transform?brfs",
                loader: "babel-loader",
                options: {
                    // babelrc: true
                    presets: [
                        "@babel/preset-env",
                        "@babel/preset-react"
                    ]
                }
            },
            {
                test: /\.css$/,
                use: [
                    {
                        // Interprets `@import` and `url()` like `import/require()` and will resolve them
                        loader: 'css-loader',
                        options: {
                            modules: true,
                            //localIdentName: '[name]__[local]--[hash:base64:5]'
                        }
                    },
                ]

                //loader: 'css/locals?module&localIdentName=[name]__[local]___[hash:base64:5]'

                //use: ['isomorphic-style-loader', { loader: 'css-loader' }]

                //loaders: ['style-loader', 'css-loader'],


                // use: [
                //     //'style-loader', 
                //     'css-loader'
                // ],
            },
            {

            }
        ],
    },
    node: {
        console: false,
        global: false,
        process: false,
        Buffer: false,
        __filename: false,
        __dirname: false,
    }
};