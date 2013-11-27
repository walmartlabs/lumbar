var _ = require('underscore'),
    async = require('async'),
    build = require('./build'),
    combine = require('./jsCombine'),
    configLoader = require('./config'),
    Context = require('./context'),
    fs = require('fs'),
    fu = require('./fileUtil'),
    Libraries = require('./libraries'),
    plugin = require('./plugin'),
    WatchManager = require('./watch-manager');

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
            callback(undefined, context);
          }
        });
      });
    });
  } catch (err) {
    callback(err);
  }
};

exports.buildPackages = function(context, packageName, modules, callback) {
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

  var packageNames = packageName ? [packageName] : context.config.packageList(),
      contexts = [];

  packageNames.forEach(function(pkg) {
    modules.forEach(function(module) {
      options.package = pkg;
      options.module = module || undefined;   // '' -> undefined

      context.event.emit('debug', 'Build package: ' + pkg);

      var platforms = context.config.platformList(pkg);
      platforms.forEach(function(platform) {
        options.platform = platform;

        var newContext = context.clone(options);
        contexts.push(newContext);
      });
    });
  });

  async.forEach(contexts, exports.buildPlatform, callback);
};
exports.buildPlatform = function(context, callback) {
  context.event.emit('debug', 'Build platform: ' + context.description);
  var modes = context.mode ? [context.mode] : context.plugins.modes();

  async.forEach(modes, function(mode, callback) {
      exports.buildMode(mode, context, callback);
    },
    callback);
};
exports.buildMode = function(mode, context, callback) {
  context.event.emit('debug', 'Build mode: ' + context.description);

  var modules = context.module ? [context.module] : context.config.moduleList(context.package);

  context = context.clone();
  context.mode = mode;
  context.modeCache = {};

  if (context.fileConfig) {
    processFileConfig(context.fileConfig, callback);
  } else {
    context.plugins.outputConfigs(context, function(err, configs) {
      if (err) {
        return callback(err);
      }
      async.forEach(configs, processFileConfig, callback);
    });
  }

  function processFileConfig(fileConfig, callback) {
    var fileContext = context.clone(true);
    fileContext.fileConfig = fileConfig;
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

      context.plugins.modeComplete(fileContext, callback);
    });
  }
};
exports.buildModule = function(context, callback) {
  context.event.emit('debug', 'Build module: ' + context.description);

  var module = context.config.module(context.module);
  if (!module) {
    return callback(new Error('Unable to find module "' + context.module + '"'));
  }

  context.module = module;
  context.fileCache = context.combined ? context.fileCache : {};
  context.moduleCache = {};

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
