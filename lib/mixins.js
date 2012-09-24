var _ = require('underscore'),
    async = require('async'),
    config = require('./config'),
    fu = require('./fileUtil'),
    glob = require('glob');

function Mixins(options) {
  this.options = options;
  this.mixins = [];
}

Mixins.prototype.initialize = function(context, callback) {
  this.mixins = [];
  this.originalConfig = _.clone(context.config.attributes);

  var commandLineMixins = this.options.mixins || [],
      configMixins = context.config.attributes.mixins || [],

      allMixins = commandLineMixins.concat(configMixins);
  async.forEach(allMixins, _.bind(this.load, this, context), callback);
};
Mixins.prototype.load = function(context, mixinConfig, callback) {
  // Allow mixins to be passed directly
  var root = mixinConfig.root;

  // Or as a file reference
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

  // Run all of the plugins that are concerned with this.
  mixinConfig.root = root;
  context.loadedMixin = mixinConfig;
  context.plugins.loadMixin(context, function(err) {
    delete mixinConfig.root;

    // And then splat everything else into our config
    _.defaults(context.config.attributes, context.loadedMixin);
    callback(err);
  });
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
