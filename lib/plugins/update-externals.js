var _ = require('underscore'),
    async = require('async'),
    jsdom = require('jsdom-nocontextifiy').jsdom,
    path = require('path'),
      basename = path.basename,
      dirname = path.dirname,
    pathRelative = require('../path-relative');   // Shim for 0.4 support

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
              return create(loadDirName + basename(fileName.fileName.path) + '.' + fileName.fileName.extension);
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
    var doc = jsdom(content, null, { features: { ProcessExternalResources: false, QuerySelector: true } }),
        loadDirName = '';
    async.series([
      function(callback) {
        // Output the load prefix script we we have a module: script reference
        var firstScript = doc.querySelector('script[src^="module:"]');
        if (firstScript) {
          context.plugins.get('module-map').buildMap(context, function(err, map, loadPrefix) {
            var script = doc.createElement('script');
            script.type = 'text/javascript';

            var noFileComponent = !loadPrefix;
            loadPrefix = context.platformPath + loadPrefix;
            var dirname = path.dirname(loadPrefix + 'a'); // Force a component for the trailing '/' case

            // Only remap load prefix if not defined by the user
            if (!(loadDirName = context.config.loadPrefix())) {
              var filename = /\/$/.test(loadPrefix) ? '' : path.basename(loadPrefix);

              var resourcePath = path.dirname(context.fileName.substring(context.outdir.length + 1));
              loadPrefix = pathRelative.relative(resourcePath, loadPrefix);
              loadDirName = pathRelative.relative(resourcePath, dirname);

              if (loadDirName) {
                loadDirName += '/';
              }
              if (loadPrefix && noFileComponent) {
                loadPrefix += '/';
              }
            } else {
              // A load prefix was given, just combine this with the module map prefix
              loadPrefix = loadDirName + loadPrefix;
              loadDirName += dirname + '/';
            }

            script.textContent = 'var lumbarLoadPrefix = \'' + loadPrefix + '\';';
            firstScript.parentNode.insertBefore(script, firstScript);
            callback();
          });
        } else {
          callback();
        }
      },
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
        callback(err, (doc.doctype || '') + doc.innerHTML);
      });
  },

  resource: function(context, next, complete) {
    var resource = context.resource;
    if (resource['update-externals'] || (/\.html?$/.test(resource.src) && resource['update-externals'] !== false)) {
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