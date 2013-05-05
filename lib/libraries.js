var _ = require('underscore'),
    async = require('async'),
    config = require('./config'),
    fs = require('fs'),
    fu = require('./fileUtil'),
    path = require('path');

function Libraries(options) {
  this.options = options;
  this.mixins = [];
  this.configs = [];
}

Libraries.prototype.initialize = function(context, callback) {
  this.mixins = [];
  this.originalConfig = _.clone(context.config.attributes);

  var commandLineLibraries = this.options.libraries || [],
      configLibraries = context.config.attributes.libraries || [],

      allLibraries = commandLineLibraries.concat(configLibraries);
  async.forEachSeries(allLibraries, _.bind(this.load, this, context), callback);
};
Libraries.prototype.load = function(context, libraryConfig, callback) {
  // Allow mixins to be passed directly
  var root = libraryConfig.root,
      configPath,
      self = this;

  // Or as a file reference
  if (!_.isObject(libraryConfig)) {
    root = root || libraryConfig;

    // If we have a dir then pull lumbar.json from that
    try {
      var stat = fs.statSync(fu.resolvePath(libraryConfig));
      if (stat.isDirectory()) {
        libraryConfig = libraryConfig + '/lumbar.json';
      } else if (root === libraryConfig) {
        // If we are a file the root should be the file's directory unless explicitly passed
        root = path.dirname(root);
      }
    } catch (err) {
      return callback(err);
    }

    configPath = fu.resolvePath(libraryConfig);
    libraryConfig = config.readConfig(configPath);
  }

  // To make things easy force root to be a dir
  if (root && !/\/$/.test(root)) {
    root = root + '/';
  }

  if (!libraryConfig.name) {
    return callback(new Error('Mixin with root "' + root + '" is missing a name.'));
  }

  var mixins = libraryConfig.mixins,
      toRegister = {};
  delete libraryConfig.mixins;

  function mapMixin(mixin, name) {
    // Only register once, giving priority to an explicitly defined mixin
    if (!toRegister[name]) {
      toRegister[name] = {
        serialize: function() {
          return {name: this.name, container: this.parent.name};
        },
        attributes: mixin,
        parent: libraryConfig,
        root: root
      };
    }
  }

  // Read each of the mixins that are defined in the config
  _.each(mixins, mapMixin, this);

  // Make mixin modules accessible as normal mixins as well
  _.each(libraryConfig.modules, mapMixin, this);

  // After we've pulled everything in register
  _.each(toRegister, function(mixin, name) {
    this.mixins[name] = this.mixins[name] || [];
    var list = this.mixins[name];
    list.push(mixin);
  }, this);

  // Run all of the plugins that are concerned with this.
  libraryConfig.root = root;
  libraryConfig.path = configPath;
  context.loadedLibrary = libraryConfig;
  context.plugins.loadMixin(context, function(err) {
    delete libraryConfig.root;

    // And then splat everything else into our config
    _.defaults(context.config.attributes, context.loadedLibrary);

    libraryConfig.serialize = function() {
      return { container: this.name };
    };

    libraryConfig.root = root;
    self.configs.push(libraryConfig);

    callback(err);
  });
};

Libraries.prototype.findDecl = function(mixins, mixinName) {
  if (!mixinName) {
    mixinName = {name: mixinName};
  }

  return _.find(mixins, function(mixinDecl) {
    return (mixinDecl.name || mixinDecl) === mixinName.name
        && (!mixinDecl.container || mixinDecl.container === mixinName.container);
  });
};

Libraries.prototype.moduleMixins = function(module) {
  // Perform any nested mixin lookup
  var mixins = _.clone(module.mixins || []);
  for (var i = 0, len = mixins.length; i < len; i++) {
    var firstInclude = mixins[i],
        mixin = this.getMixin(firstInclude),
        added = [i, 0];

    if (!mixin) {
      throw new Error('Unable to find mixin "' + firstInclude + '"');
    }

    // Check if we need to include any modules that this defined
    _.each(mixin.attributes.mixins, function(mixinInclude) {
      if (!this.findDecl(mixins, mixinInclude)) {
        added.push(mixinInclude);
      }
    }, this);

    // If we've found any new mixins insert them at the current spot and iterate
    // over those items
    if (added.length > 2) {
      mixins.splice.apply(mixins, added);
      i--;
    }
  }

  // Extend the module with each of the mixins content, giving priority to the module
  return _.map(mixins.reverse(), function(mixin) {
    var mixinConfig = mixin.name && mixin,
        name = mixin;
    if (mixinConfig) {
      mixinConfig = _.clone(mixinConfig);
      delete mixinConfig.container;
    }
    mixin = _.extend(
        {},
        this.getMixin(name),
        mixinConfig);
    if (!mixin.attributes) {
      throw new Error('Mixin "' + name.name || name + '" is not defined.');
    }

    // Save a distinct instance of the config for resource extension
    if (mixinConfig) {
      mixinConfig = _.clone(mixinConfig);
      delete mixinConfig.overrides;
      delete mixinConfig.name;
    }

    return {
      library: mixin,
      mixinConfig: mixinConfig
    };
  }, this);
};

Libraries.prototype.mapFiles = function(value, library, config) {
  var files = _.map(value, function(resource) {
    return this.mapFile(resource, library, config);
  }, this);
  files = _.filter(files, function(file) { return file; });

  return files;
};
Libraries.prototype.mapFile = function(resource, library, config) {
  // If explicitly declared the resource library takes precedence
  if (_.isString(resource.library)) {
    library = this.getConfig(resource.library);
    if (!library) {
      throw new Error('Mixin "' + resource.library + '" not found');
    }
  }

  // If no mixin was defined on either side then return the identity
  if (!library) {
    return resource;
  }

  if (_.isString(resource)) {
    resource = {src: resource};
  } else {
    resource = _.clone(resource);
  }

  var src = resource.src || resource.dir;

  // Include any config information such as env or platform that may have been
  // specified on the library settings
  _.extend(resource, config);

  if (src) {
    var librarySrc = (library.root || '') + src;

    var override = library.overrides && library.overrides[src];
    if (override) {
      resource.originalSrc = librarySrc;
      librarySrc = _.isString(override) ? override : src;
    } else if (override === false) {
      return;
    }

    if (resource.src) {
      resource.src = librarySrc;
    } else if (resource.dir) {
      resource.dir = librarySrc;
    }
  }

  resource.library = library;
  return resource;
};

Libraries.prototype.getMixin = function(name) {
  var mixins = (this.mixins && this.mixins[name.name || name]) || [];
  if (mixins.length > 1 && !name.container) {
    throw new Error(
        'Duplicate mixins found for "' + (name.name || name) + '"'
          + _.map(mixins, function(mixin) {
            return ' parent: "' + mixin.parent.name + '"';
          }).join(''));
  }

  if (name.container) {
    if (name.name === undefined) {
      var found = _.find(this.configs, function(config) {
        return config.name === name.container;
      });
      if (!found) {
        throw new Error('Unable to find container "' + name.container + '"');
      }
      return found;
    }

    var found = _.find(mixins, function(mixin) {
      return mixin.parent.name === name.container;
    });
    if (found) {
      return found;
    } else {
      throw new Error('Mixin named "' + name.name + '" not found in container "' + name.container + '"');
    }
  } else if (mixins.length === 1) {
    return mixins[0];
  }
};
Libraries.prototype.getConfig = function(name) {
  return _.find(this.configs, function(config) { return config.name === name; });
};

Libraries.prototype.resolvePath = function(name, mixin) {
  if (!mixin) {
    return name;
  }

  var override = mixin.overrides && mixin.overrides[name];
  if (override) {
    return _.isString(override) ? override : name;
  }

  return mixin.root + name;
};

Libraries.prototype.mergeHash = function(hashName, input, mixin, output) {
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
Libraries.prototype.mergeFiles = function(fieldName, input, mixinData, output, library) {
  if (mixinData[fieldName]) {
    mixinData = _.isArray(mixinData[fieldName]) ? mixinData[fieldName]  : [mixinData[fieldName]];

    var configData = input[fieldName] || [];
    if (!output[fieldName] || configData === output[fieldName]) {
      output[fieldName] = _.clone(configData);
    }
    if (!_.isArray(configData)) {
      configData = [configData];
    }
    if (!_.isArray(output[fieldName])) {
      output[fieldName] = [output[fieldName]];
    }

    // Insert point is at the start of the upstream list, which we are
    // assuming occurs at length postions from the end.
    _.each(mixinData, function(value) {
      //Make the include relative to the mixin
      value = (library.root || '') + value;

      output[fieldName].splice(
          output[fieldName].length - configData.length,
          0,
          {src: value, library: library});
    });

    return true;
  }
};

module.exports = Libraries;
