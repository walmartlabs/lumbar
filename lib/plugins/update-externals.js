var _ = require('underscore'),
    async = require('async'),
    cheerio = require('cheerio'),
    path = require('path'),
      basename = path.basename,
      dirname = path.dirname;

module.exports = {
  mode: 'static',
  priority: 50,

  updateHtmlReferences: function(context, content, callback) {
    function updateResources(mode, query, create) {
      return function(callback) {
        async.forEach($(query), function(el, callback) {
          // Note using cheerio reference directly rather than $ due to
          // https://github.com/MatthewMueller/cheerio/pull/342
          el = cheerio(el);
          var module = (el.attr('src') || el.attr('href')).replace(/^module:/, '');
          context.fileNamesForModule(mode, module, function(err, fileNames) {
            if (err) {
              return callback(err);
            }

            // Generate replacement elements for each of the entries
            var content = fileNames.map(function(fileName) {
              if (fileName.server) {
                return '';
              }
              return create(loadDirName + basename(fileName.fileName.path) + '.' + fileName.fileName.extension);
            });

            // Output and kill the original
            el.replaceWith(content.join(''));

            callback();
          });
        },
        callback);
      };
    }

    var $ = cheerio.load(content.toString()),
        loadDirName = '';
    async.series([
      function(callback) {
        // Output the load prefix script we we have a module: script reference
        var firstScript = $('script[src^="module:"]').eq(0);
        if (firstScript.length) {
          context.plugins.get('module-map').buildMap(context, function(err, map, loadPrefix) {
            if (err) {
              return callback(err);
            }

            var noFileComponent = !loadPrefix;
            loadPrefix = context.platformPath + loadPrefix;
            var dirname = path.dirname(loadPrefix + 'a'); // Force a component for the trailing '/' case

            // Only remap load prefix if not defined by the user
            if (!(loadDirName = context.config.loadPrefix())) {
              var resourcePath = path.dirname(context.fileName.substring(context.outdir.length + 1));
              loadPrefix = path.relative(resourcePath, loadPrefix);
              loadDirName = path.relative(resourcePath, dirname);

              if (loadDirName) {
                loadDirName += '/';
              }
              if (loadPrefix && noFileComponent) {
                loadPrefix += '/';
              }
            } else {
              // A load prefix was given, just combine this with the module map prefix
              loadPrefix = loadDirName + loadPrefix;
              if (dirname !== '.') {
                loadDirName += dirname + '/';
              }
            }

            var script = '<script type="text/javascript">var lumbarLoadPrefix = \'' + loadPrefix + '\';</script>';
            firstScript.before(script);
            callback();
          });
        } else {
          callback();
        }
      },
      updateResources('scripts', 'script[src^="module:"]', function(href) {
          return '<script type="text/javascript" src="' + href + '"></script>';
        }),
      updateResources('styles', 'link[href^="module:"]', function(href) {
          return '<link rel="stylesheet" type="text/css" href="' + href + '"/>';
        })
      ],
      function(err) {
        callback(err, $.html());
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
              return callback(err);
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
