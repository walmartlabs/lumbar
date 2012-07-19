var _ = require('underscore'),
    path = require('path');
const corePlugins = [
    'styles-output', 'scripts-output', 'static-output',
    'scope', 'router', 'template', 'inline-styles', 'coffee-script', 'stylus', 'module-map', 'package-config', 'update-externals',
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
exports.plugin('coffee-script', require('./plugins/coffee-script'));
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
    plugins.sort(function(a, b) {
      return (a.priority || 50) - (b.priority || 50);
    });
  }

  return {
    get: function(name) {
      return plugins.reduce(function(plugin, left) {
        return plugin.id === name ? plugin : left;
      });
    },
    use: function(plugin) {
      if (plugin.path || (_.isString(plugin) && !globalPlugins[plugin])) {
        var pluginPath = plugin.path || plugin;
        var options = plugin.options;
        try {
          plugin = require(pluginPath);
        } catch (e) {
          
          plugin = require(path.resolve(process.cwd(), fileUtils.lookupPath()) + '/node_modules/' + pluginPath);
        }
        if ('function' === typeof plugin) {
          plugin = plugin(options);
        }
      }
      registerPlugin(plugin);
    },

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

      var self = this;
      function plugin(plugins) {
        if (plugins) {
          plugins.forEach(self.use, self);
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
