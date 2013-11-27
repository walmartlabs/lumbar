var _ = require('underscore'),
    async = require('async'),
    FileMap = require('./util/file-map'),
    fu = require('./fileUtil'),
    ChildPool = require('child-pool');

var uglify = new ChildPool(__dirname + '/uglify-worker', {logId: 'uglify-worker'});

exports.combine = function(context, files, output, minimize, noSeparator, callback) {

  function outputIfCompleted() {
    if (completed >= files.length) {
      var lastEl,
          map = new FileMap(output),
          warnings = [],

          tasks = [];

      _.each(content, function(el) {
          var content = el.content.toString();

          if (!noSeparator && (!lastEl || !lastEl.noSeparator) && map.content()) {
            map.add(undefined, '\n;;\n');
          }

          map.add(el.name, content, el, el.generated);

          lastEl = el;
        }, '');

      var inputs = [];
      content.forEach(function(el) {
        if (el.inputs) {
          inputs.push.apply(inputs, el.inputs);
        } else if (el.name) {
          inputs.push(el.name);
        }
      });
      inputs = _.unique(inputs);

      // "Serialize" the data in the map
      tasks.push(function(callback) {
        callback(undefined, map.content());
      });

      // Minimize the content if flagged
      if (minimize) {
        var uglifyConfig = context.config.attributes.uglify || {};

        tasks.push(function(data, callback) {
          uglify.send({
              output: output,
              data: data,
              compressorOptions: uglifyConfig.compressor,
              manglerOptions: uglifyConfig.mangler,
              outputOptions: uglifyConfig.output,
              sourceMap: context.options.sourceMap ? map.sourceMap() : undefined
            },
            function(err, data) {
              if (err) {
                return callback(err);
              }

              _.each(data.warnings, function(msg) {
                var match = /(.*?)\s*\[.*:(\d+),(\d+)/.exec(msg);
                if (match) {
                  var msg = match[1],
                      line = parseInt(match[2], 10),
                      column = match[3],
                      context = map.context(line, column);

                  if (context && (!context.fileContext || !context.fileContext.ignoreWarnings)) {
                    context.msg = msg;
                    warnings.push(context);
                  }
                } else {
                  warnings.push({msg: msg});
                }
              });

              if (data.sourceMap) {
                // Remap the sourcemap output for the point that it is actually used for output
                // We need to restore the source map here as uglify will remove the original
                // Declaration
                map.sourceMap = function() { return data.sourceMap; };
              }

              callback(err, data.data);
            });
        });
      }

      // Output the source map if requested
      var sourceMap = context.options.sourceMap;
      if (sourceMap) {
        var inlineSourceMap = sourceMap === true;

        tasks.push(function(data, callback) {
          map.writeSourceMap({
            mapDestination: !inlineSourceMap && (sourceMap + '/' + context.buildPath),
            outputSource: inlineSourceMap,
            callback: function(err) {
              if (inlineSourceMap) {
                data += '\n' + map.sourceMapToken();
              }
              callback(err, data);
            }
          });
        });
      }

      // Output step
      tasks.push(function(data, callback) {
        fu.writeFile(output, data, callback);
      });

      // Excute everything and return to the caller
      async.waterfall(tasks, function(err) {
        if (err) {
          callback(new Error('Combined output "' + output + '" failed\n\t' + err));
          return;
        }

        callback(undefined, {
          fileName: output,
          inputs: inputs,
          warnings: warnings
        });
      });
    }
  }
  var completed = 0,
      content = [];

  files.forEach(function(resource) {
    var fileInfo = context.loadResource(resource, function(err) {
      if (err && callback) {
        callback(err);
        callback = undefined;
        return;
      }

      if (callback) {
        completed++;
        outputIfCompleted();
      }
    });
    content.push(fileInfo);
  });
};
