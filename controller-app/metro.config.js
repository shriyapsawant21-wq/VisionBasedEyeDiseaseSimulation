const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// relay/src/protocol.ts is imported directly as the shared source of truth
// for the WebSocket message protocol (see relay/src/protocol.ts) - Metro
// needs to know to watch outside this app's own folder to find it.
config.watchFolders = [repoRoot];

module.exports = config;
