'use strict';

const VersionChecker = require('ember-cli-version-checker');

const MINIMUM_NAMED_BLOCKS_VERSION = '3.25.0-beta.0';

const FALSE = ['false', 'disable', 'no', 'off', '0'];

module.exports = {
  name: require('./package').name,

  _usePolyfill: flag(process.env.USE_NAMED_BLOCKS_POLYFILL),

  usePolyfill() {
    if (this._usePolyfill === undefined) {
      let version = new VersionChecker(this).for(`ember-source`);
      this._usePolyfill = version.lt(MINIMUM_NAMED_BLOCKS_VERSION);
    }

    return this._usePolyfill;
  },

  setupPreprocessorRegistry(_type, registry) {
    if (this.usePolyfill()) {
      let plugin = this._buildTemplatePlugin();
      registry.add('htmlbars-ast-plugin', plugin);
    }
  },

  treeForAddon() {
    if (this.usePolyfill()) {
      return this._super.treeForAddon.apply(this, arguments);
    }
  },

  treeForApp() {
    if (this.usePolyfill()) {
      return this._super.treeForApp.apply(this, arguments);
    }
  },

  _buildTemplatePlugin() {
    let plugin = require('./lib/named-blocks-polyfill-plugin.js');
    return {
      name: 'named-blocks-polyfill',
      plugin,
      baseDir() { return __dirname; },
      parallelBabel: {
        requireFile: __filename,
        buildUsing: '_buildTemplatePlugin',
        params: {},
      }
    };
  },
};

function flag(flag) {
  if (flag === undefined) {
    return undefined;
  } else if (FALSE.includes(flag.toLowerCase())) {
    return false;
  } else {
    return true;
  }
}
