var _ = require('underscore'),
    uglify;

try {
  uglify = require('uglify-js');
} catch (err) { /* NOP */ }

process.on('message', function(msg) {
  var outputFile = msg.output,
      manglerOptions = msg.manglerOptions,
      compressorOptions = msg.compressorOptions,
      outputOptions = _.clone(msg.outputOptions || {}),   // Clone to play it safe with source map
      data = msg.data,
      sourceMap = msg.sourceMap,
      warnings = [];

  try {
    var warnFunction;
    try {
      warnFunction = uglify.AST_Node.warn_function;
      uglify.AST_Node.warn_function = function(msg) {
        warnings.push(msg);
      };
      var ast = uglify.parse(data),
          compressor = uglify.Compressor(compressorOptions);

      if (sourceMap) {
        sourceMap = uglify.SourceMap({
          file: outputFile,
          orig: sourceMap
        });
        outputOptions.source_map = sourceMap;
      }

      ast.figure_out_scope();
      ast = ast.transform(compressor);
      ast.figure_out_scope();
      ast.compute_char_frequency();
      ast.mangle_names(manglerOptions);
      data = ast.print_to_string(outputOptions);

      process.send({
        data: {
          data: data,
          warnings: warnings,
          sourceMap: sourceMap && sourceMap.toString()
        }
      });
    } finally {
      uglify.AST_Node.warn_function = warnFunction;
    }
  } catch (err) {
    process.send({err: err.stack || err.msg || err.toString()});
  }
});
