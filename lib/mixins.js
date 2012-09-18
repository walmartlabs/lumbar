var _ = require('underscore'),
    config = require('./config'),
    fu = require('./fileUtil'),
    glob = require('glob');

function Mixins(options) {
  this.options = options;
  this.mixins = [];
}

Mixins.prototype.initialize = function(config) {
  this.mixins = [];

  // load command line plugins
  _.each(this.options.mixins, this.load, this);

  // load lumbar.json plugins
  var fileMixins = config.attributes.mixins;
  if (fileMixins && fileMixins.auto) {
    // Auto wired mixins. Scan the directory for lumbar.json files.
  } else {
    _.each(fileMixins, this.load, this);
  }
};
Mixins.prototype.load = function(mixinConfig, root) {
  // Allow mixins to be passed directly
  if (!_.isObject(mixinConfig)) {
    root = root || mixinConfig;
    mixinConfig = config.readConfig(mixinConfig + '/lumbar.json');
  }

  var mixins = mixinConfig.mixins;
  delete mixinConfig.mixins;

  // Read each of the mixins that are defined in the config
  _.each(mixins, function(mixin, name) {
    this.mixins[name] = {
      attributes: mixin,
      parent: mixinConfig,
      root: root
    };
  }, this);
};

Mixins.prototype.get = function(name) {
  return this.mixins && this.mixins[name];
};

Mixins.prototype.resolvePath = function(name, mixin) {
  if (!mixin) {
    return name;
  }

  var override = mixin.overrides && mixin.overrides[name];
  if (override) {
    return _.isString(override) ? override : name;
  }

  return mixin.root + name;
};

module.exports = Mixins;
