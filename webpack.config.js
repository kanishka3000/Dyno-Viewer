const path = require('path');

const commonConfig = {
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [{
      test: /\.tsx?$/,
      include: /src/,
      use: [{ loader: 'ts-loader' }]
    }]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  }
};

const mainConfig = {
  ...commonConfig,
  target: 'electron-main',
  entry: './src/main/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js'
  }
};

const rendererConfig = {
  ...commonConfig,
  target: 'electron-renderer',
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'index.js'
  }
};

module.exports = [mainConfig, rendererConfig];