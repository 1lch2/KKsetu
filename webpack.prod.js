const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                ignoreDeprecations: '5.0',
              },
            },
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),
    new CopyPlugin({
      patterns: [{ from: 'public/favicon.ico', to: 'favicon.ico' }],
    }),
  ],
  optimization: {
    usedExports: true, // 标记未使用的导出
    sideEffects: false, // 标记无副作用的模块
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 工具函数单独打包
        utils: {
          test: /[\\/]src[\\/]utils[\\/]/,
          name: 'utils',
          chunks: 'all',
          enforce: true,
        },
        // 第三方库单独打包
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        // 公共组件单独打包
        commons: {
          name: 'commons',
          minChunks: 2, // 至少被引用2次才拆分
          chunks: 'async',
          reuseExistingChunk: true,
          priority: 5,
        },
      },
    },
    runtimeChunk: {
      name: 'runtime', // 将 runtime 分离出来
    },
  },
  performance: {
    hints: 'warning', // 当入口点超过阈值时显示警告
    maxEntrypointSize: 1024000, // 1MB
    maxAssetSize: 1024000, // 1MB
  },
  mode: 'production',
  devtool: 'source-map',
};
