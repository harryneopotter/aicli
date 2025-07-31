const path = require('path');

module.exports = {
  entry: './src/plugin.ts',
  mode: 'production',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  externals: {
    'tabby-core': 'tabby-core',
    'tabby-terminal': 'tabby-terminal',
    '@angular/core': '@angular/core',
    '@angular/common': '@angular/common'
  }
};
