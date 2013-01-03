var _ = require('underscore');

module.exports = plugin;

/**
 * This plugin makes it easy to distinguish between a dev and production
 * build in lumbar. It came about after working with locla storage
 * loaders and having to maunally clear local storage every time we
 * made a change. With this plugin we choose between two different files
 * for lumbar loader, the localstorage and standard versions. In our
 * lumbar.json configuration we have two entries like this
 *
 * {"src":"lumber-loader-localstorage.js", "env":"production"},
 * {"src":"lumber-loader-storage.js", "env":"dev"},
 *
 * We then call lumbar with the --use command line argument like this
 * ./lumbar --use ../lib/plugins/conditional --with {env:\'dev\'}
 *
 * @function
 * @param {Object} options this is an optional json object of your choosing.
 * @returns {Function} Return the plugin callback for lumbar.
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


