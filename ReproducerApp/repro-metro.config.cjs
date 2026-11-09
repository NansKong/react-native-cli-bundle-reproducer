// Preserve the template Metro defaults, disabling Watchman for portability.
const {mergeConfig} = require('@react-native/metro-config');
module.exports = mergeConfig(require('./metro.config.js'), {
  resolver: {useWatchman: false},
});
