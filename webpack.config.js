module.exports = {
    entry: './src/main.js',
    output: {
        path: __dirname,
        filename: 'public/js/app.js',
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader',
                query: {
                    plugins: [
                        'transform-flow-strip-types',
                        ['typecheck', {
                            disable: {
                                production: true,
                            },
                        }],
                    ],
                    presets: ['es2015'],
                },
            },
        ],
    },
};
