const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver = defaultConfig.resolver || {};
defaultConfig.resolver.extraNodeModules = defaultConfig.resolver.extraNodeModules || {};

// Polyfill for 'stream'
defaultConfig.resolver.extraNodeModules.stream = path.resolve(__dirname, 'node_modules/stream-browserify');
// Polyfill for 'events'
defaultConfig.resolver.extraNodeModules.events = path.resolve(__dirname, 'node_modules/events');
// Polyfill for 'http'
defaultConfig.resolver.extraNodeModules.http = path.resolve(__dirname, 'node_modules/stream-http');
// Polyfill for 'https'
defaultConfig.resolver.extraNodeModules.https = path.resolve(__dirname, 'node_modules/https-browserify');
// Polyfill for 'url'
defaultConfig.resolver.extraNodeModules.url = path.resolve(__dirname, 'node_modules/url');
// Polyfill for 'buffer'
defaultConfig.resolver.extraNodeModules.buffer = path.resolve(__dirname, 'node_modules/buffer');
// Polyfill for 'crypto'
defaultConfig.resolver.extraNodeModules.crypto = path.resolve(__dirname, 'node_modules/crypto-browserify');

// Polyfill for 'net'
defaultConfig.resolver.extraNodeModules.net = require.resolve('node-libs-react-native/mock/net');

// Polyfill for 'tls'
defaultConfig.resolver.extraNodeModules.tls = require.resolve('node-libs-react-native/mock/tls');

// Polyfill for 'zlib'
defaultConfig.resolver.extraNodeModules.zlib = require.resolve('browserify-zlib');

// If you need other polyfills, add them here in the same way
// defaultConfig.resolver.extraNodeModules.path = path.resolve(__dirname, 'node_modules/path-browserify');
// defaultConfig.resolver.extraNodeModules.os = path.resolve(__dirname, 'node_modules/os-browserify/browser');

module.exports = defaultConfig; 