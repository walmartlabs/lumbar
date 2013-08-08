var _ = require('underscore');

var resources = module.exports = {
  cast: function(resource) {
    if (_.isString(resource)) {
      return {src: resource};
    } else {
      return resource;
    }
  }
};
