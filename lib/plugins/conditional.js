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
    mode: 'test',
    /**
     * Called when generating a list of all resources that a given module will need.
     * @name moduleResources
     * @function
     * @param {Object} context 
     * @param {Function} next 
     * @param {Function} complete 
     */
    moduleResources: function(context, next, complete) {
      var a = context.config.attributes;
      //debugger;
    
    }
  };
}

