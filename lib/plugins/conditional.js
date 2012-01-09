//var lumbar = require('lumbar');
var _ = require('underscore'),
  config = require('../config');

var module.exports = plugin;

/**
 * Return the plugin callback for lumbar.
 *
 * @function {Function}
 */
function plugin(options) {
  var _options = options;
  return {
    priority: 50,

    resourceList: function(context, next, complete) {
      var module = context.module;
      var resource = context.resource;
      var found = false;

      if (_.isString(resource)) {
        resource = { src: resource };
      }

      for (var key in _options) {
        if (_options.hasOwnProperty(key)) {
          if (resource.hasOwnProperty(key)) {
            if (resource[key] !== _options[key]) {
              found = true;
              break;
            }
          }
        }
      }

      if (found) {
        complete(undefined, []);
      } else {
        next(complete);
      }
    }
  };
}


