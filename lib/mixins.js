var _ = require('underscore'),
    async = require('async'),
    config = require('./config'),
    fs = require('fs'),
    fu = require('./fileUtil'),
    path = require('path');

function Mixins(options) {
  this.options = options;
  this.mixins = [];
  this.configs = [];
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
  var root = mixinConfig.root,
      self = this;

  // Or as a file reference
  if (!_.isObject(mixinConfig)) {
    root = root || mixinConfig;

    // If we have a dir then pull lumbar.json from that
    try {
      var stat = fs.statSync(fu.resolvePath(mixinConfig));
      if (stat.isDirectory()) {
        mixinConfig = mixinConfig + '/lumbar.json';
      } else if (root === mixinConfig) {
        // If we are a file the root should be the file's directory unless explicitly passed
        root = path.dirname(root);
      }
    } catch (err) {
      return callback(err);
    }

    mixinConfig = config.readConfig(mixinConfig);
  }

  // To make things easy force root to be a dir
  if (root && !/\/$/.test(root)) {
    root = root + '/';
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

    mixinConfig.root = root;
    self.configs.push(mixinConfig);

    callback(err);
  });
};

Mixins.prototype.mapFiles = function(value, mixin, config) {
  return _.map(value, function(resource) {
    if (_.isString(resource)) {
      resource = {src: resource};
    } else {
      resource = _.clone(resource);
    }

    var src = resource.src || resource.dir;
    if (src) {
      var mixinSrc = (mixin.root || '') + src;

      var override = mixin.overrides && mixin.overrides[src];
      if (override) {
        resource.originalSrc = mixinSrc;
        mixinSrc = _.isString(override) ? override : src;
      }

      _.extend(resource, config);

      if (resource.src) {
        resource.src = mixinSrc;
      } else if (resource.dir) {
        resource.dir = mixinSrc;
      }
    }

    resource.mixin = mixin;
    return resource;
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
