//var lumbar = require('lumbar');

var exports = module.exports = plugin;

/**
 * plugin version 
 */
exports.version = '0.1.0';

/**
 * lumbar path
 */
exports.path = __dirname;

/**
 * Return the plugin callback for lumbar.
 *
 * @function {Function}
 */
function plugin(options) {
  var _options = options;
  return {
    mode: ['scripts', 'styles'],
    /**
     * 
     * @name resourceList
     * @function
     * @param context 
     * @param next 
     * @param complete 
     */
    resourceList: function(context, next, complete) {
      debugger;
      var module = context.module;
      var resource = context.resource;
      complete(undefined, []);
    }
  };
}

