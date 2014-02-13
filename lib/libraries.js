var _ = require('underscore'),
    async = require('async'),
    bower = require('bower'),
    config = require('./config'),
    fs = require('fs'),
    fu = require('./fileUtil'),
    path = require('path'),
    resources = require('./util/resources');

function Libraries(options) {
  this.options = options;
  this.mixins = [];
  this.configs = [];
}

Libraries.prototype.initialize = function(context, callback) {
  this.mixins = [];
  this.originalConfig = _.clone(context.config.attributes);

  function normalize(libraries) {
    if (_.isString(libraries)) {
      return [libraries];
    } else {
      return _.map(libraries, function (name) {
        if (_.isString(name)) {
          return path.normalize(name);
        } else {
          return name;
        }
      });
    }
  }

  var commandLineLibraries = normalize(this.options.libraries || []),
      configLibraries = normalize(context.config.attributes.libraries || context.config.attributes.mixins || []),
      bowerLibraries = this.bowerLibraries(context) || [],

      allLibraries = _.union(commandLineLibraries, configLibraries, bowerLibraries);

  delete context.config.attributes.mixins;

  async.forEachSeries(allLibraries, _.bind(this.load, this, context), callback);
};

Libraries.prototype.bowerLibraries = function(context) {
  try {
    fs.statSync(fu.resolvePath('bower.json'));

    var bowerDir = bower.config.directory,
        possibleModules = fs.readdirSync(bowerDir);

    return possibleModules
        .map(function(name) {
          return path.normalize(path.join(bowerDir, name));
        })
        .filter(function(name) {
          try {
            fs.statSync(path.join(name, 'lumbar.json'));
            return true;
          } catch (err) {
            /* NOP */
          }
        });
  } catch (err) {
    context.event.emit('debug', err);
  }
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
  if (root && root.indexOf(path.sep, root.length - 1) == -1) {
    root = root + path.sep;
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
          return {name: this.name, library: this.parent.name};
        },
        name: name,
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
    _.defaults(context.config.attributes, _.omit(context.loadedLibrary, 'name', 'path'));

    libraryConfig.serialize = function() {
      return { library: this.name };
    };

    libraryConfig.root = root;
    self.configs.push(libraryConfig);

    callback(err);
  });
};

Libraries.prototype.findDecl = function(mixins, mixinName) {
  if (!mixinName.name) {
    mixinName = {name: mixinName};
  }

  return _.find(mixins, function(mixinDecl) {
    return (mixinDecl.name || mixinDecl) === mixinName.name
        && (!mixinDecl.library || mixinDecl.library === mixinName.library);
  });
};

Libraries.prototype.moduleMixins = function(module) {
  // Perform any nested mixin lookup
  var mixins = _.clone(module.mixins || []),
      processed = {};
  for (var i = 0; i < mixins.length; i++) {
    var firstInclude = mixins[i],
        mixinConfig = firstInclude.name && firstInclude,
        mixin = this.getMixin(firstInclude),
        added = [i, 0];

    // Save a config object off for propagation to included mixins
    if (mixinConfig) {
      mixinConfig = _.omit(mixinConfig, 'overrides', 'name', 'library');
    }

    if (!mixin) {
      throw new Error('Unable to find mixin "' + ((firstInclude && firstInclude.name) || firstInclude) + '"');
    }

    // Check if we need to include any modules that this defined
    var processedName = mixin.name + '_' + (mixin.parent && mixin.parent.name);
    if (!processed[processedName]) {
      processed[processedName] = true;

      _.each(mixin.attributes.mixins, function(mixinInclude) {
        // Apply any attributes that were applied to the mixin config here
        if (mixinConfig) {
          mixinInclude = mixinInclude.name ? _.clone(mixinInclude) : {name: mixinInclude};
          _.extend(mixinInclude, mixinConfig);
        }

        // Save the library that caused the include so we can lookup the root and reverse
        // any overrides in the future.
        if (firstInclude.overrides) {
          mixinInclude.overrideLibrary = _.extend({root: mixin.parent.root}, firstInclude);
        } else {
          mixinInclude.overrideLibrary = mixin.parent;
        }

        if (!this.findDecl(mixins, mixinInclude)) {
          added.push(mixinInclude);
        }
      }, this);
    }

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
      delete mixinConfig.library;
      delete mixinConfig.container;
    }
    mixin = _.extend(
        {},
        this.getMixin(name),
        mixinConfig);
    if (!mixin.attributes) {
      throw new Error('Mixin "' + (name.name || name) + '" is not defined.');
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
  if (_.isString(resource.library || resource.mixin)) {
    library = this.getConfig(resource.library || resource.mixin);
    if (!library) {
      throw new Error('Mixin "' + (resource.library || resource.mixin) + '" not found');
    }
    delete resource.mixin;
  }

  return resources.map(resource, library, config);
};

Libraries.prototype.mapPathToLibrary = function(src, library) {
  return resources.pathToLibrary(src, library);
};

Libraries.prototype.getMixin = function(name) {
  var mixins = (this.mixins && this.mixins[name.name || name]) || [],
      library = name.library || name.container;
  if (mixins.length > 1 && !library) {
    throw new Error(
        'Duplicate mixins found for "' + (name.name || name) + '"'
          + _.map(mixins, function(mixin) {
            return ' parent: "' + mixin.parent.name + '"';
          }).join(''));
  }

  if (library) {
    if (name.name === undefined) {
      var found = _.find(this.configs, function(config) {
        return config.name === library;
      });
      if (!found) {
        throw new Error('Unable to find library "' + library + '"');
      }
      return found;
    }

    var found = _.find(mixins, function(mixin) {
      return mixin.parent.name === library;
    });
    if (found) {
      return found;
    } else {
      throw new Error('Mixin named "' + name.name + '" not found in library "' + library + '"');
    }
  } else if (mixins.length === 1) {
    return mixins[0];
  }
};
Libraries.prototype.getConfig = function(name) {
  return _.find(this.configs, function(config) { return config.name === name; });
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
