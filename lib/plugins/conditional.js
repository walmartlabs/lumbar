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
     * Called when generating a list of all resources that a given module will need.
     * @name moduleResources
     * @function
     * @param {Object} context 
     * @param {Function} next 
     * @param {Function} complete 
     */
    moduleResources: function(context, next, complete) {
      var flag = true;

      if (flag) {
        var module = context.module;
        var files = (module[context.mode] || []).slice();
        // prevent file output if condition is met
        complete(undefined, []);
      } else {
        next(complete);
      }
    
    }
  };
}

