var _ = require('underscore');

var resources = module.exports = {
  cast: function(resource) {
    if (_.isString(resource)) {
      return {src: resource};
    } else {
      return resource;
    }
  },

  source: function(resource) {
    return resource.src || resource.dir || resource;
  }
};
