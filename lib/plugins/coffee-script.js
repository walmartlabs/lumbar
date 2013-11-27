var CoffeeScript,
    path = require('path'),
    fu = require('../fileUtil'),
    _ = require('underscore');

module.exports = {
  mode: 'scripts',
  priority: 50,
  resource: function(context, next, complete) {
    var resource = context.resource;
    if (/\.coffee$/.test(resource.src)) {
      CoffeeScript = CoffeeScript || require('coffee-script');

      next(function(err, resource) {
        function generator(context, callback) {
          // Load the source data
          context.loadResource(resource, function(err, file) {
            if (err) {
              return callback(err);
            }

            // Update the content
            callback(err, {
              data: CoffeeScript.compile(file.content.toString()),
              inputs: file.inputs
            });
          });
        }

        // Include any attributes that may have been defined on the base entry
        if (!_.isString(resource)) {
          _.extend(generator, resource);
        }
        complete(undefined, generator);
      });
    } else {
      next(complete);
    }
  }
};
