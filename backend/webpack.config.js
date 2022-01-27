const path = require("path");
const { NODE_ENV = "production" } = process.env;
const nodeExternals = require("webpack-node-externals");
const WebpackShellPluginNext = require("webpack-shell-plugin-next");

module.exports = {
  entry: "./src/index.ts",
  mode: NODE_ENV,
  target: "node",
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "index.js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ["ts-loader"],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        loader: "file-loader",
      },
      {
        test: /\.(pem)$/i,
        loader: "file-loader",
      },
    ],
  },
  externals: [nodeExternals()],
  watch: NODE_ENV === "development",
  plugins: [
    new WebpackShellPluginNext({
      onBuildEnd: ["yarn run:dev"],
    }),
  ],
};
