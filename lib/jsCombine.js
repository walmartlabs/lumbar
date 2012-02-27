var _ = require('underscore'),
    fu = require('./fileUtil'),
    uglify = require('uglify-js');

exports.combine = function(context, files, output, minimize, noSeparator, callback) {

    function outputIfCompleted() {
        if (completed >= files.length) {
            var lastEl;
            var data = content.reduce(function(prev, el) {
                var ret = el.content;
                if (prev) {
                  ret = prev + (!noSeparator && (!lastEl || !lastEl.noSeparator) ? ';;\n' : '') + ret
                }
                lastEl = el;
                return ret;
              }, '');

            // Minimize the content if flagged
            if (minimize) {
                var ast = uglify.parser.parse(data);
                ast = uglify.uglify.ast_mangle(ast);
                ast = uglify.uglify.ast_squeeze(ast);
                data = uglify.uglify.gen_code(ast);
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
                input: inputs
              });
            });
        }
    }
    var completed = 0,
        content = [];

    files.forEach(function(resource) {
      var fileInfo = context.loadResource(resource, function(err, data) {
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
