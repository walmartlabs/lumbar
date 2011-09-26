const corePlugins = ['scope', 'router', 'template', 'module-map', 'package-config'];
var globalPlugins = {};

exports.plugin = function(name, plugin) {
  globalPlugins[name] = plugin;
};

exports.plugin('module-map', require('./plugins/module-map'));
exports.plugin('package-config', require('./plugins/package-config'));
exports.plugin('router', require('./plugins/router'));
exports.plugin('scope', require('./plugins/scope'));
exports.plugin('template', require('./plugins/template'));

exports.create = function(options) {
  var plugins = [];

  function runPlugins(context, methodName, failOver) {
    var len = 0;
    return (function next() {
      var plugin = plugins[len];
      len++;
      if (plugin) {
        return (plugin[methodName] || next)(context, next);
      } else if (failOver) {
        return failOver();
      }
    })();
  }

  function registerPlugin(plugin) {
    plugins.push(globalPlugins[plugin] || plugin);
  }

  if (!options.ignoreCorePlugins) {
    corePlugins.forEach(registerPlugin);
  }
  if (options.plugins) {
    options.plugins.forEach(registerPlugin);
  }

  return {
    use: registerPlugin,

    moduleResources: function(context) {
      return runPlugins(context, 'moduleResources', function() {
        var module = context.module;
        return (module.files || module).slice();
      });
    },
    resourceList: function(context) {
      return runPlugins(context, 'resourceList', function() { return [context.resource]; });
    },

    file: function(context) {
      return runPlugins(context, 'file');
    },
    module: function(context) {
      return runPlugins(context, 'module');
    },
    resource: function(context) {
      return runPlugins(context, 'resource', function() { return context.resource; });
    }
  };
};
