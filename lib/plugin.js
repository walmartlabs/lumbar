const corePlugins = ['scope', 'router', 'template', 'stylus', 'module-map', 'style-map', 'package-config'];
var globalPlugins = {};

exports.plugin = function(name, plugin) {
  globalPlugins[name] = plugin;
};

exports.plugin('module-map', require('./plugins/module-map'));
exports.plugin('package-config', require('./plugins/package-config'));
exports.plugin('router', require('./plugins/router'));
exports.plugin('scope', require('./plugins/scope'));
exports.plugin('style-map', require('./plugins/style-map'));
exports.plugin('stylus', require('./plugins/stylus'));
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

    generatedFiles: function(context) {
      return runPlugins(context, 'generatedFiles', function() {
        // Default to a one to one mapping for a given {platform, package, module, mode} combo
        return [ {} ];
      });
    },
    fileName: function(context) {
      return runPlugins(context, 'fileName', function() {
        var name = context.module ? context.module.name : context.package;

        if (context.mode === 'scripts') {
          return {path: context.platformPath + name, extension: 'js'};
        } else if (context.mode === 'styles') {
          return {path: context.platformPath + name, extension: 'css'};
        }
      });
    },

    moduleResources: function(context) {
      return runPlugins(context, 'moduleResources', function() {
        var module = context.module;
        if (context.mode === 'scripts') {
          return (module.scripts || module.files || (module.slice && module) || []).slice();
        } else if (context.mode === 'styles') {
          return (module.styles || []).slice();
        }
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
