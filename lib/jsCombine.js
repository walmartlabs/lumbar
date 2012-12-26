var _ = require('underscore'),
    async = require('async'),
    FileMap = require('./util/file-map'),
    fu = require('./fileUtil'),
    uglify;

try {
  uglify = require('uglify-js');
} catch (err) { /* NOP */ }

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

          map.add(el.name, content, el);

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

      // Output the source map if requested
      if (context.options.sourceMap) {
        tasks.push(function(callback) {
          map.writeSourceMap(callback);
        });
      }

      // "Serialize" the data in the map
      tasks.push(function(callback) {
        callback(undefined, map.content());
      });

      // Minimize the content if flagged
      if (minimize) {
        tasks.push(function(data, callback) {
          var warnFunction;
          try {
            warnFunction = uglify.AST_Node.warn_function;
            uglify.AST_Node.warn_function = function(msg) {
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
            };
            var ast = uglify.parse(data),
                compressor = uglify.Compressor();

            ast.figure_out_scope();
            ast = ast.transform(compressor);
            ast.figure_out_scope();
            ast.compute_char_frequency();
            ast.mangle_names();
            data = ast.print_to_string();
            callback(undefined, data);
          } catch (err) {
            callback(err);
          } finally {
            uglify.AST_Node.warn_function = warnFunction;
          }
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
      if (err) {
        callback(err);
        return;
      }

      completed++;
      outputIfCompleted();
    });
    content.push(fileInfo);
  });
};
