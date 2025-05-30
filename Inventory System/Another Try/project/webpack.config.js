const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Customize the config before returning it.
  if (config.resolve.fallback) {
    config.resolve.fallback.stream = require.resolve('stream-browserify');
    config.resolve.fallback.events = require.resolve('events');
    config.resolve.fallback.http = require.resolve('stream-http');
    config.resolve.fallback.https = require.resolve('https-browserify');
    config.resolve.fallback.url = require.resolve('url');
    config.resolve.fallback.buffer = require.resolve('buffer');
    config.resolve.fallback.crypto = require.resolve('crypto-browserify');
    config.resolve.fallback.net = require.resolve('node-libs-react-native/mock/net');
    config.resolve.fallback.tls = require.resolve('node-libs-react-native/mock/tls');
    config.resolve.fallback.zlib = require.resolve('browserify-zlib');
  } else {
    config.resolve.fallback = {
      stream: require.resolve('stream-browserify'),
      events: require.resolve('events'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      url: require.resolve('url'),
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      net: require.resolve('node-libs-react-native/mock/net'),
      tls: require.resolve('node-libs-react-native/mock/tls'),
      zlib: require.resolve('browserify-zlib'),
    };
  }
  
  // It's also common to need fallbacks for other Node.js core modules
  // For example, if you encounter errors for 'crypto', 'path', 'os', etc.
  // config.resolve.fallback.crypto = require.resolve('crypto-browserify');
  // config.resolve.fallback.path = require.resolve('path-browserify');
  // config.resolve.fallback.os = require.resolve('os-browserify/browser');


  return config;
}; 