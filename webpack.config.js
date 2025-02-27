// webpack.config.js
const path = require("path");

module.exports = {
  mode: "development",             // lub "production"
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, "public/js"),
    filename: "bundle.js"
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      // Dodajemy polyfill dla crypto
      crypto: require.resolve("crypto-browserify"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"),
      vm: require.resolve("vm-browserify"),
      fs: false
    }
  },
  module: {
    rules: [
      {
        // Obsługa plików .ts
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        // Obsługa pliku sql-wasm.wasm z biblioteki sql.js
        // - type: 'asset/resource' powoduje, że Webpack skopiuje plik do /public/js
        // - generator.filename ustala wynikową nazwę pliku (tutaj: "sql-wasm.wasm")
        test: /sql-wasm\.wasm$/,
        type: "asset/resource",
        generator: {
          filename: "sql-wasm.wasm"
        }
      }
    ]
  },
  // Czasem wymagane do synchronizacji z WASM:
  experiments: {
    syncWebAssembly: true
  }
};