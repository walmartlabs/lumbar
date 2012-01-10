var _ = require('underscore');
const corePlugins = [
    'styles-output', 'scripts-output', 'static-output',
    'scope', 'router', 'template', 'inline-styles', 'stylus', 'module-map', 'package-config', 'update-externals',
    'inline-styles-resources', 'styles', 'scripts', 'static'];
var fileUtils = require("./fileUtil");

var globalPlugins = {};

exports.plugin = function(name, plugin) {
  globalPlugins[name] = plugin;
  plugin.id = name;
};

exports.plugin('module-map', require('./plugins/module-map'));
exports.plugin('package-config', require('./plugins/package-config'));
exports.plugin('router', require('./plugins/router'));
exports.plugin('scope', require('./plugins/scope'));
exports.plugin('stylus', require('./plugins/stylus'));
exports.plugin('inline-styles', require('./plugins/inline-styles'));
exports.plugin('inline-styles-resources', require('./plugins/inline-styles-resources'));
exports.plugin('update-externals', require('./plugins/update-externals'));
exports.plugin('template', require('./plugins/template'));
exports.plugin('styles', require('./plugins/styles.js'));
exports.plugin('scripts', require('./plugins/scripts.js'));
exports.plugin('static', require('./plugins/static.js'));
exports.plugin('styles-output', require('./plugins/styles-output.js'));
exports.plugin('scripts-output', require('./plugins/scripts-output.js'));
exports.plugin('static-output', require('./plugins/static-output.js'));

exports.create = function(options) {
  var plugins;
  var modes; // all registered modes
  var pluginModes; // map of modes and plugins scoped to the mode 
  var modeAll; // plugins that are scoped to all modes

  function runPlugins(context, methodName, complete, failOver) {
    var len = 0;
    return (function next(complete) {
      var plugin = plugins[len];
      len++;
      if (plugin) {
        // if plugin shouldn't work with current mode, go to next
        if ((pluginModes[context.mode].indexOf(plugin) < 0) && modeAll.indexOf(plugin) < 0) {
          return next(complete);
        }

        var method = plugin[methodName];
        if (method) {
          return method.call(plugin, context, next, complete);
        } else {
          return next(complete);
        }
      } else {
        if (complete) {
          // async
          complete(undefined, failOver && failOver());
        } else {
          // sync
          return failOver && failOver();
        }
      }
    })(complete);
  }

  function registerPlugin(plugin) {
    var _plugin = globalPlugins[plugin] || plugin;

    var mode = _plugin.mode;
    if (mode) {
      if (_.isString(mode)) {
        mode = [mode];
      }
      _.each(mode, function(_mode) {
        if (mode === 'all') {
          // allow plugins to contribute new modes and participate in all modes
          modeAll.push(_plugin);
        } else {
          if (modes.indexOf(_mode) < 0) {
            modes.push(_mode);
            pluginModes[_mode] = [];
          }
          pluginModes[_mode].push(_plugin);
        }
      });
    } else {
      modeAll.push(_plugin);
    }
    plugins.push(_plugin);
  }

  return {
    use: registerPlugin,

    initialize: function(config) {
      // reset
      plugins = [];
      modes = []; // all registered modes
      pluginModes = {}; // map of modes and plugins scoped to the mode 
      modeAll = []; // plugins that are scoped to all modes
      
      // load the core plugins
      if (!options.ignoreCorePlugins) {
        corePlugins.forEach(registerPlugin);
      }

      var relativePattern = /^[^/]/;
      function plugin(plugins) {
        if (plugins) {
          plugins.forEach(function(plugin) {
            var path = plugin.path || plugin;
            var options = plugin.options;
            var fn;
            try {
              fn = require(path);
            } catch (e) {
              // no global resolved, try and load plugin relative to the project
              path = fileUtils.resolvePath(path);
              if (path.match(relativePattern)) {
                path = process.cwd() + '/' + path;
              }
              fn = require(path);
            }
            if ('function' != typeof fn) {
              throw new Error('plugin ' + path + ' does not export a function');
            }

            plugin = fn(options);
            registerPlugin(plugin);
          });
        }
      }
      
      // load command line plugins
      plugin(options.plugins);
      
      // load lumbar.json plugins
      plugin(config.attributes.plugins);
    },

    outputConfigs: function(context, complete) {
      runPlugins(context, 'outputConfigs', complete, function() {
        // Default to a one to one mapping for a given {platform, package, module, mode} combo
        return [ {} ];
      });
    },
    modeComplete: function(context, complete) {
      runPlugins(context, 'modeComplete', complete);
    },
    fileName: function(context, complete) {
      runPlugins(context, 'fileName', complete);
    },

    fileFilter: function(context) {
      return runPlugins(context, 'fileFilter');
    },
    moduleResources: function(context, complete) {
      runPlugins(context, 'moduleResources', complete, function() {
        var module = context.module;
        return (module[context.mode] || []).slice();
      });
    },
    resourceList: function(context, complete) {
      runPlugins(context, 'resourceList', complete, function() { return [context.resource]; });
    },

    file: function(context, complete) {
      runPlugins(context, 'file', complete);
    },
    module: function(context, complete) {
      runPlugins(context, 'module', complete);
    },
    resource: function(context, complete) {
      runPlugins(context, 'resource', complete, function() { return context.resource; });
    },
    modes: function() {
      return modes;
    }
  };
};
