var _ = require('underscore'),
    fu = require('./fileUtil'),
    ChildPool = require('./child-pool');

var uglify = new ChildPool(__dirname + '/uglify-worker.js');

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

            var inputs = [];
            content.forEach(function(el) {
              if (el.inputs) {
                inputs.push.apply(inputs, el.inputs);
              } else if (el.name) {
                inputs.push(el.name);
              }
            });
            inputs = _.unique(inputs);

            // Minimize the content if flagged
            if (minimize) {
              var originalData = data;
              uglify.send({data: data}, function(err, data) {
                if (err) {
                  var msg = new Error('Uglify failed for file ' + output + ' error: ' + err);
                  return fu.writeFile(output, originalData, function(err) {
                    callback(err || msg);
                  });
                }

                fu.writeFile(output, data, function(err) {
                  callback(err, {
                    fileName: output,
                    input: inputs
                  });
                });
              });
            } else {
              fu.writeFile(output, data, function(err) {
                callback(err, {
                  fileName: output,
                  input: inputs
                });
              });
            }
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
