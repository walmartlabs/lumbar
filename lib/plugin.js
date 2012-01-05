var _ = require('underscore');
const corePlugins = ['scope', 'router', 'template', 'inline-styles', 'stylus', 'module-map', 'package-config', 'inline-styles-resources', 'styles', 'scripts'];
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
exports.plugin('template', require('./plugins/template'));
exports.plugin('styles', require('./plugins/styles.js'));
exports.plugin('scripts', require('./plugins/scripts.js'));

exports.create = function(options) {
  var plugins = [];
  var modes = []; // all registered modes
  var pluginModes = {}; // map of modes and plugins scoped to the mode 
  var modeAll = []; // plugins that are scoped to all modes

  /**
   * This function will loop through all the plugins and invoke
   * the function with name methodName if it exists and if
   * the plugin matches the correct mode we're currently in.
   * @name runPlugins
   * @function
   * @param {Object} context 
   * @param {String} methodName name of method to invoke from plugin code
   * @param {Function} complete this is the function we invoke from the plugin.
   *   Again, its a function that takes two arguments, err and configs.
   * @param {Function} failOver if there's a problem and want to handle it, we
   *   will call this function. it usually returns an empty array of objects,
   *   but that depends on the callee. For example, [ {} ], is a possible 
   *   return value from invoking failOver.
   */
  function runPlugins(context, methodName, complete, failOver) {
    var len = 0;
    (function next(complete) {
      var plugin = plugins[len];
      len++;
      if (plugin) {
        // if plugin shouldn't work with current mode, go to next
        if ((pluginModes[context.mode].indexOf(plugin) < 0) && modeAll.indexOf(plugin) < 0) {
          return next(complete);
        }

        var method = plugin[methodName];
        if (method) {
          // note: although we pass in next function, do we really need
          // to have the plugin call it? seems like if the plugin doesn't
          // invoke it then we'll get the same behavior regardless.
          method.call(plugin, context, next, complete);
        } else {
          next(complete);
        }
      } else {
        // Always call complete at the end of the list of plugins.
        // here we're passing undefined so we don't signal an error condition
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

  corePlugins.forEach(registerPlugin);

  if (options.plugins) {
    options.plugins.forEach(function(plugin){
      var path = plugin.path;
      var name = plugin.name;
      var options = plugin.options;
      var fn = require(path);
      if ('function' != typeof fn) {
        throw new Error('plugin ' + path + ' does not export a function');
      }

      exports.plugin(name, fn(options));
      registerPlugin(name);
    });
  }

  return {
    use: registerPlugin,
    /**
     * This is the first function that's ran from lumbar.js. 
     * @name generatedFiles
     * @function
     * @param {Object} context 
     * @param {Function} complete is function that takes err and configs
     *   arguments. if there's no err then it will loop through each config
     *   from configs and lumbar.js will call another function, 
     *   processConfig on each of them.
     *   It should return a list of file configs.
     */
    generatedFiles: function(context, complete) {
      runPlugins(context, 'generatedFiles', complete, function() {
        // Default to a one to one mapping for a given {platform, package, module, mode} combo
        return [ {} ];
      });
    },
    fileName: function(context, complete) {
      runPlugins(context, 'fileName', complete);
    },

    /**
     * Called when generating a list of all resources that a given module will need. 
     * This method may be used to add additional content to the module one time. 
     * @name moduleResources
     * @function
     * @param {Object} context 
     * @param {Function} complete is called when generating the moduleResources list.
     *   It should return a list of resource objects.   
     */
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
