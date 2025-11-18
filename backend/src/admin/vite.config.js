const { mergeConfig } = require('vite');

module.exports = (config) => {
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@': '/src',
        path: 'path-browserify',
      },
    },
    optimizeDeps: {
      include: ['path-browserify'],
    },
  });
};
