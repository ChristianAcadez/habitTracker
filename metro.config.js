const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Parche temporal para expo/expo#52175 (expo-notifications 57.x en Expo Go para Android)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'android' &&
    context.originModulePath.includes(`${path.sep}expo-notifications${path.sep}`) &&
    /TopicSubscriptionModule$/.test(moduleName)
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'shims/expoTopicSubscriptionModule.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;