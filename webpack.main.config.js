const path = require('path');

module.exports = [
  // Main process configuration
  {
    target: 'electron-main',
    entry: './src/main/main.ts',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'main.js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      'sqlite3': 'commonjs sqlite3',
    },
  },
  // Preload script configuration
  {
    target: 'electron-preload',
    entry: './src/main/preload.ts',
    output: {
      path: path.resolve(__dirname, 'dist/preload'),
      filename: 'preload.js',
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  },
];
