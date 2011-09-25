const corePlugins = ['router', 'template', 'module-map', 'package-config'];
var globalPlugins = {};

exports.plugin = function(name, plugin) {
  globalPlugins[name] = plugin;
};

exports.plugin('router', require('./plugins/router'));
exports.plugin('template', require('./plugins/template'));
exports.plugin('module-map', require('./plugins/module-map'));
exports.plugin('package-config', require('./plugins/package-config'));

exports.create = function(options) {
  var plugins = [];

  function runPlugins(context, methodName, failOver) {
    var len = plugins.length;
    return (function next() {
      len--;
      var plugin = plugins[len];
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

  corePlugins.forEach(registerPlugin);
  if (options.plugins) {
    options.plugins.forEach(registerPlugin);
  }

  return {
    use: registerPlugin,
    moduleResources: function(context) {
      return runPlugins(context, 'moduleResources');
    },
    resourceList: function(context) {
      return runPlugins(context, 'resourceList', function() { return context.resource; });
    },
    resource: function(context) {
      var len = plugins.length;
      return (function next() {
        len--;
        var plugin = plugins[len];
        if (!plugin) {
          return context.resource;
        } else {
          plugin = plugin.resource || plugin;
          return typeof plugin == 'function' ? plugin(context, next) : next();
        }
      })();
    }
  };
};
