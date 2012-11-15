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
      configPath,
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

    configPath = fu.resolvePath(mixinConfig);
    mixinConfig = config.readConfig(configPath);
  }

  // To make things easy force root to be a dir
  if (root && !/\/$/.test(root)) {
    root = root + '/';
  }

  var mixins = mixinConfig.mixins;
  delete mixinConfig.mixins;

  function mapMixin(mixin, name) {
    this.mixins[name] = {
      attributes: mixin,
      parent: mixinConfig,
      root: root
    };
  }

  // Read each of the mixins that are defined in the config
  _.each(mixins, mapMixin, this);

  // Make mixin modules accessible as normal mixins as well
  _.each(mixinConfig.modules, mapMixin, this);

  // Run all of the plugins that are concerned with this.
  mixinConfig.root = root;
  mixinConfig.path = configPath;
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

Mixins.prototype.moduleMixins = function(module) {
  // Extend the module with each of the mixins content, giving priority to the module
  return _.map((module.mixins || []).reverse(), function(mixin) {
    var mixinConfig = mixin.name && mixin,
        name = mixin.name || mixin;
    mixin = _.extend(
        {},
        this.get(name),
        mixinConfig);
    if (!mixin.attributes) {
      throw new Error('Mixin "' + name + '" is not defined.');
    }

    // Save a distinct instance of the config for resource extension
    if (mixinConfig) {
      mixinConfig = _.clone(mixinConfig);
      delete mixinConfig.overrides;
      delete mixinConfig.name;
    }

    return {
      mixin: mixin,
      mixinConfig: mixinConfig
    };
  }, this);
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

Mixins.prototype.mergeHash = function(hashName, input, mixin, output) {
  if (mixin[hashName]) {
    // Close the value to make sure that we are not overriding anything
    if (!output[hashName] || output[hashName] === input[hashName]) {
      output[hashName] = _.clone(input[hashName] || {});
    }
    _.each(mixin[hashName], function(value, key) {
      if (!input[hashName] || !(key in input[hashName])) {
        output[hashName][key] = value;
      }
    });
    return true;
  }
};

module.exports = Mixins;
