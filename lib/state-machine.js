var _ = require('underscore'),
    async = require('async'),
    build = require('./build'),
    configLoader = require('./config'),
    Context = require('./context'),
    fs = require('fs'),
    fu = require('./fileUtil'),
    Libraries = require('./libraries'),
    plugin = require('./plugin');

exports.loadAndInitDir = function(path, event, options, callback) {
  exports.loadConfig(path, event, options, function(err, context) {
    if (err) {
      return callback(err);
    }

    exports.ensureDirs(context, function(err) {
      return callback(err, context);
    });
  });
};

exports.loadConfig = function(path, event, options, callback) {
  try {
    fu.resetCache();

    var config = _.isString(path) ? configLoader.load(path) : configLoader.create(path);

    var plugins = plugin.create(options);
    plugins.initialize(config);

    config.outdir = options.outdir = options.outdir || config.attributes.output;

    var libraries = new Libraries(options);
    var context = new Context(options, config, plugins, libraries, event);
    context.options = options;
    context.configCache = {};

    libraries.initialize(context, function(err) {
      if (err) {
        return callback(err);
      }

      plugins.loadConfig(context, function(err) {
        if (err) {
          return callback(err);
        }

        event.emit('config', context.config);
        if (options.verbose) {
          event.emit('log', 'Finalized config ' + JSON.stringify(context.config.serialize(), undefined, 2));
        }

        callback(undefined, context);
      });
    });
  } catch (err) {
    callback(err);
  }
};

exports.ensureDirs = function(context, callback) {
  var config = context.config;

  // Ensure that we have the proper build output
  if (!config.outdir) {
    return callback(new Error('Output must be defined on the command line or config file.'));
  }
  context.outdir = config.outdir;

  fu.ensureDirs(config.outdir + '/.', function() {
    var stat = fs.statSync(config.outdir);
    if (!stat.isDirectory()) {
      callback(new Error('Output must be a directory'));
    } else {
      callback();
    }
  });
};

exports.buildPackages = function(rootContext, packageName, modules, callback) {
  if (!callback) {
    callback = modules;
    modules = undefined;
  }

  exports.loadPackages(rootContext, packageName, modules, function(err, contexts) {
    if (err) {
      return callback(err);
    }

    exports.buildContexts(contexts, callback);
  });
};

exports.loadPackages = function(rootContext, packageName, modules, callback) {
  if (!callback) {
    callback = modules;
    modules = undefined;
  }

  // Allow a string or a list as modules input
  if (!_.isArray(modules)) {
    modules = [modules];
  } else if (!modules.length) {
    // Special case empty array input to build all
    modules = [undefined];
  }

  var options = {};
  if (typeof packageName === 'object') {
    options = packageName;
    packageName = options.package;
  }

  var packages = rootContext.config.packageList();
  if (packageName && !_.contains(packages, packageName)) {
    return callback(undefined, {});
  }

  var packageNames = packageName ? [packageName] : packages,
      contexts = [];

  packageNames.forEach(function(pkg) {
    modules.forEach(function(module) {
      options.package = pkg;
      options.module = module || undefined;   // '' -> undefined

      rootContext.event.emit('debug', 'Load package: ' + pkg);

      var platforms = rootContext.config.platformList(pkg);
      platforms.forEach(function(platform) {
        options.platform = platform;

        var newContext = rootContext.clone(options);
        contexts.push(newContext);
      });
    });
  });

  var ret = {};
  async.forEach(
    contexts,
    function(context, callback) {
      exports.loadPlatform(context, function(err, contexts) {
        if (!err) {
          var pkg = ret[context.package] = ret[context.package] || {};
          pkg[context.platform] = _.flatten(contexts);
        }
        return callback(err);
      });
    },
    function(err) {
      callback(err, ret);
    });
};

exports.loadPlatform = function(context, callback) {
  context.event.emit('debug', 'Load platform: ' + context.description);
  var modes = context.mode ? [context.mode] : context.plugins.modes();

  async.map(modes, function(mode, callback) {
      exports.loadMode(mode, context, callback);
    },
    function(err, contexts) {
      callback(err, contexts && _.flatten(contexts));
    });
};

exports.loadMode = function(mode, context, callback) {
  context.event.emit('debug', 'Load mode: ' + context.description);

  context = context.clone();
  context.mode = mode;
  context.modeCache = {};

  if (context.fileConfig) {
    callback(undefined, [processFileConfig(context.fileConfig)]);
  } else {
    context.plugins.outputConfigs(context, function(err, configs) {
      if (err) {
        return callback(err);
      }

      callback(undefined, _.map(configs, processFileConfig));
    });
  }

  function processFileConfig(fileConfig) {
    var fileContext = context.clone(true);
    fileContext.fileConfig = fileConfig;

    return fileContext;
  }
};

exports.buildContexts = function(configContexts, callback) {
  if (configContexts instanceof Context) {
    configContexts = [configContexts];
  } else if (!_.isArray(configContexts)) {
    configContexts = _.map(configContexts, function(package) {
      return _.values(package);
    });
    configContexts = _.flatten(configContexts);
  }

  async.forEach(
    configContexts,
    function(fileContext, callback) {
        var modules = fileContext.module ? [fileContext.module] : fileContext.config.moduleList(fileContext.package);

        fileContext.resources = [];
        fileContext.combineResources = {};
        fileContext.fileCache = fileContext.combined ? {} : undefined;

        async.forEach(modules, function(module, callback) {
          var moduleContext = fileContext.clone();
          moduleContext.module = module;

          exports.buildModule(moduleContext, callback);
        },
        function(err) {
          if (err) {
            return callback(err);
          }

          fileContext.plugins.modeComplete(fileContext, callback);
        });
      },
      callback);
};

exports.buildModule = function(context, callback) {
  context.event.emit('debug', 'Build module: ' + context.description);

  var module = context.config.module(context.module);
  if (!module) {
    return callback(new Error('Unable to find module "' + context.module + '"'));
  }

  context.module = module;
  context.moduleCache = {};
  context.fileCache = context.combined ? context.fileCache : {};

  var resource = context.resource;
  if (resource) {
    resource = resource.originalResource || resource;
    exports.processResources(context, [resource], callback);
  } else {
    // Load all resources associated with this module
    build.loadResources(context, function(err, resources) {
      if (err) {
        return callback(err);
      }
      exports.processResources(context, resources, callback);
    });
  }
};

exports.processResources = function(context, resources, callback) {
  build.processResources(resources, context, function(err, resources) {
    if (err) {
      return callback(err);
    }

    context.moduleResources = resources;
    context.plugins.module(context, callback);
  });
};
