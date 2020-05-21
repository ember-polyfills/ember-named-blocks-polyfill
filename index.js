'use strict';

module.exports = {
  name: require('./package').name,

  setupPreprocessorRegistry(_type, registry) {
    registry.add('htmlbars-ast-plugin', {
      name: 'named-blocks-polyfill',

      plugin: require('./lib/named-blocks-polyfill-plugin.js'),

      baseDir: function() {
        return __dirname;
      }
    });
  }
};
