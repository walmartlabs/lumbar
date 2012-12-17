var _ = require('underscore'),
    fu = require('./fileUtil'),
    uglify;

try {
  uglify = require('uglify-js');
} catch (err) { /* NOP */ }

const WARNING_CONTEXT = 3;

function messageContext(data, msg, line, column) {
  var offset = _.find(data.offsets, function(offset) { return offset.start <= line && line < offset.end; }) || { name: 'unknown file', start: 0 };
  if (offset.ignoreWarnings) {
    return;
  }

  if (!_.isArray(data.lines)) {
    data.lines = data.lines.split('\n');
  }

  // Zero based now
  line--;

  var start = Math.max(line - WARNING_CONTEXT, offset.start),
      end = Math.min(line + WARNING_CONTEXT, offset.end || data.lines.length),
      gutterWidth = (end + '').length;
  line = line - offset.start + 1;

  var lines = data.lines.slice(start, end).map(function(value, index) {
    var lineNum = start - offset.start + index + 1,
        lineText = lineNum + '',
        buffer = '';
    for (var i = lineText.length; i < gutterWidth; i++) {
      buffer += ' ';
    }
    buffer += lineText;
    buffer += (lineNum === line) ? ':  ' : '   ';
    buffer += value;
    return buffer;
  });

  return {
    msg: msg,
    file: offset.name,
    line: line,
    column: column || 0,
    context: lines
  };
}

exports.combine = function(context, files, output, minimize, noSeparator, callback) {

    function outputIfCompleted() {
        if (completed >= files.length) {
            var lastEl,
                currentOffset = 0,
                offsets = [],
                warnings = [];
            var data = content.reduce(function(prev, el) {
                var ret = el.content.toString();

                var offset = {
                  name: el.name || 'unknown file',
                  ignoreWarnings: el.ignoreWarnings,
                  start: currentOffset,
                  end: 0
                };
                currentOffset += (ret.match(/\n/g) || []).length;
                if (prev) {
                  var sep = (!noSeparator && (!lastEl || !lastEl.noSeparator) ? '\n;;\n' : '');
                  ret = prev + sep + ret;
                  if (sep) {
                    currentOffset += 2;
                  }
                }
                offset.end = currentOffset;
                offsets.push(offset);
                lastEl = el;
                return ret;
              }, '');

            offsets[offsets.length-1].end++;
            var lines = {
              offsets: offsets,
              lines: data
            };
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
                        context = messageContext(lines, msg, line, column);

                    if (context) {
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
