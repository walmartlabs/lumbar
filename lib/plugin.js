const corePlugins = ['scope', 'router', 'template', 'inline-styles', 'stylus', 'module-map', 'package-config', 'inline-styles-resources'];
var globalPlugins = {};

exports.plugin = function(name, plugin) {
  globalPlugins[name] = plugin;
};

exports.plugin('module-map', require('./plugins/module-map'));
exports.plugin('package-config', require('./plugins/package-config'));
exports.plugin('router', require('./plugins/router'));
exports.plugin('scope', require('./plugins/scope'));
exports.plugin('stylus', require('./plugins/stylus'));
exports.plugin('inline-styles', require('./plugins/inline-styles'));
exports.plugin('inline-styles-resources', require('./plugins/inline-styles-resources'));
exports.plugin('template', require('./plugins/template'));

exports.create = function(options) {
  var plugins = [];
  var modes = []; // all registered modes
  var pluginModes = {}; // map of modes and plugins scoped to the mode 
  var modeAll = []; // plugins that are scoped to all modes

  function runPlugins(context, methodName, complete, failOver) {
    var len = 0;
    (function next(complete) {
      var plugin = plugins[len];
      len++;
      if (plugin) {
        // if plugin shouldn't work with current mode, go to next
        if ((pluginModes[context.mode] && pluginModes[context.mode].indexOf(plugin) < 0) && modeAll.indexOf(plugin) < 0) {
          next(complete);
        }

        var method = plugin[methodName];
        if (method) {
          method.call(plugin, context, next, complete);
        } else {
          next(complete);
        }
      } else {
        complete(undefined, failOver && failOver());
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

  if (!options.ignoreCorePlugins) {
    corePlugins.forEach(registerPlugin);
  }
  if (options.plugins) {
    options.plugins.forEach(registerPlugin);
  }

  return {
    use: registerPlugin,

    generatedFiles: function(context, complete) {
      runPlugins(context, 'generatedFiles', complete, function() {
        // Default to a one to one mapping for a given {platform, package, module, mode} combo
        return [ {} ];
      });
    },
    fileName: function(context, complete) {
      runPlugins(context, 'fileName', complete, function() {
        var name = context.module ? context.module.name : context.package;

        if (context.mode === 'scripts') {
          return {path: context.platformPath + name, extension: 'js'};
        } else if (context.mode === 'styles') {
          return {path: context.platformPath + name, extension: 'css'};
        }
      });
    },

    moduleResources: function(context, complete) {
      runPlugins(context, 'moduleResources', complete, function() {
        var module = context.module;
        if (context.mode === 'scripts') {
          return (module.scripts || module.files || (module.slice && module) || []).slice();
        } else if (context.mode === 'styles') {
          return (module.styles || []).slice();
        }
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
    }
  };
};
