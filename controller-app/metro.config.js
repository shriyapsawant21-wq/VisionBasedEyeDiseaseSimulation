const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// relay/src/protocol.ts is imported directly as the shared source of truth
// for the WebSocket message protocol (see relay/src/protocol.ts) - Metro
// needs to know to watch outside this app's own folder to find it.
//
// Only the relay package itself is watched, not the whole repoRoot: the
// repo also has unity-vr (a Unity project whose Library/Temp caches balloon
// into hundreds of thousands of churning files once built) and relay's own
// node_modules sitting alongside src. Watching repoRoot pulled in all of it,
// plus a redundant second watch of this app's own folder (repoRoot's walk
// re-covers projectRoot). On Windows that was enough to make Metro's file
// watcher miss edits outright - saving a file wouldn't trigger a rebundle,
// and only a full server restart picked the change back up.
config.watchFolders = [path.resolve(repoRoot, "relay")];

module.exports = config;
