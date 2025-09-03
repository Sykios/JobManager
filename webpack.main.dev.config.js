const path = require('path');
const webpack = require('webpack');
require('dotenv').config();

module.exports = [
  // Main process configuration
  {
    mode: 'development',
    target: 'electron-main',
    entry: './src/main/main.ts',
    devtool: 'eval-cheap-module-source-map',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'main.js',
      clean: false, // Don't clean in dev mode
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
        'process.env.SYNC_API_URL': JSON.stringify(process.env.SYNC_API_URL || ''),
        'process.env.ENABLE_SYNC': JSON.stringify(process.env.ENABLE_SYNC || 'true'),
        'process.env.NODE_ENV': JSON.stringify('development'),
      }),
    ],
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'esbuild-loader',
              options: {
                loader: 'ts',
                target: 'node16',
              },
            },
          ],
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
    stats: 'errors-warnings',
  },
  // Preload script configuration
  {
    mode: 'development',
    target: 'electron-preload',
    entry: './src/main/preload.ts',
    devtool: 'eval-cheap-module-source-map',
    output: {
      path: path.resolve(__dirname, 'dist/preload'),
      filename: 'preload.js',
      clean: false,
    },
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'esbuild-loader',
              options: {
                loader: 'ts',
                target: 'node16',
              },
            },
          ],
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
    stats: 'errors-warnings',
  },
];
