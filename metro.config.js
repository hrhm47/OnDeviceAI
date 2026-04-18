const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push(
  "bin",
  "raw",
  "onnx",
  "txt",
  "vec",
  "ext",
  "conf",
);

module.exports = config;
