var uglify = require('uglify-js');

process.on('message', function(msg) {
  var data = msg.data;

  try {
    var ast = uglify.parser.parse(data);
    ast = uglify.uglify.ast_mangle(ast);
    ast = uglify.uglify.ast_squeeze(ast);
    data = uglify.uglify.gen_code(ast);

    process.send({ data: data /* data data data */ });
  } catch (err) {
    process.send({err: err.toString()});
  }
});
