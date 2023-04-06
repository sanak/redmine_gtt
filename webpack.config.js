const path = require('path');

// Define loaders
// Loaders for processing Sass files
const sassLoaders = [
  'style-loader', // Creates `style` nodes from JS strings
  'css-loader', // Translates CSS into CommonJS
  'sass-loader', // Compiles Sass to CSS
];

// Loaders for processing CSS files
const cssLoaders = ['style-loader', 'css-loader'];

// Loaders for processing image files
const imageLoaders = {
  test: /\.(png|svg|jpg|jpeg|gif)$/i,
  type: 'asset/resource',
};

// Loaders for processing font files
const fontLoaders = {
  test: /\.(woff|woff2|eot|ttf|otf)$/i,
  type: 'asset/resource',
};

// Loaders for processing TypeScript files
const tsLoaders = {
  test: /\.ts$/i,
  use: 'ts-loader',
};

module.exports = {
  mode: 'production', // Set build mode to production
  entry: path.join(__dirname, 'src', 'index.ts'), // Specify entry point
  module: {
    rules: [
      // Apply loaders
      { test: /\.s[ac]ss$/i, use: sassLoaders },
      { test: /\.css$/i, use: cssLoaders },
      imageLoaders,
      fontLoaders,
      tsLoaders,
    ],
  },
  devtool: false, // Disable source maps
  resolve: {
    extensions: ['.ts', '.js'], // Specify file extensions to resolve
  },
  output: {
    filename: 'main.js', // Set output filename
    path: path.join(__dirname, 'assets', 'javascripts'), // Set output directory
  },
};
