var _ = require('underscore'),
    async = require('async'),
    jsdom = require('jsdom').jsdom;

module.exports = {
  mode: 'static',
  priority: 50,

  updateHtmlReferences: function(context, content, callback) {
    function updateResources(mode, query, create) {
      return function(callback) {
        async.forEach(_.clone(doc.querySelectorAll(query)), function(el, callback) {
          var module = (el.src || el.href).replace(/^module:/, '');
          context.fileNamesForModule(mode, module, function(err, fileNames) {
            if (err) {
              return callback(err);
            }

            // Generate replacement elements for each of the entries
            var content = fileNames.map(function(fileName) {
              return create(context.config.loadPrefix() + fileName.fileName.path + '.' + fileName.fileName.extension);
            });

            // Output and kill the original
            content.forEach(function(replace) {
              el.parentNode.insertBefore(replace, el);
            });
            el.parentNode.removeChild(el);

            callback();
          });
        },
        callback);
      }
    }
    var doc = jsdom(content, null, { features: { ProcessExternalResources: false, QuerySelector: true } });
    async.parallel([
      updateResources('scripts', 'script[src^="module:"]', function(href) {
          var script = doc.createElement('script');
          script.type = 'text/javascript';
          script.src = href;
          return script;
        }),
      updateResources('styles', 'link[href^="module:"]', function(href) {
          var link = doc.createElement('link');
          link.rel = 'stylesheet';
          link.type = 'text/css';
          link.href = href;
          return link;
        })
      ],
      function(err) {
        callback(err, doc.doctype + doc.innerHTML);
      });
  },

  resource: function(context, next, complete) {
    var resource = context.resource;
    if (resource['update-externals']) {
      next(function(err, resource) {
        function generator(context, callback) {
          // Load the source data
          context.loadResource(resource, function(err, file) {
            if (err) {
              return complete(err);
            }

            // Update the content
            module.exports.updateHtmlReferences(context, file.content, function(err, data) {
              callback(err, {
                data: data,
                inputs: file.inputs
              });
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