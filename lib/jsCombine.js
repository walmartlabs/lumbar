var _ = require('underscore'),
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
          map = new FileMap({file: output}),
          warnings = [];

      _.each(content, function(el) {
          var content = el.content.toString();

          if (!noSeparator && (!lastEl || !lastEl.noSeparator) && map.content()) {
            map.add(undefined, '\n;;\n');
          }

          map.add(el.name, content);

          lastEl = el;
        }, '');

      var data = map.content();

      // Minimize the content if flagged
      if (minimize) {
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

              // TODO : ignoreWarnings implementation?
              if (context) {
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
        } finally {
          uglify.AST_Node.warn_function = warnFunction;
        }
      }

      var inputs = [];
      content.forEach(function(el) {
        if (el.inputs) {
          inputs.push.apply(inputs, el.inputs);
        } else if (el.name) {
          inputs.push(el.name);
        }
      });
      inputs = _.unique(inputs);

      fu.writeFile(output, data, function(err) {
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
