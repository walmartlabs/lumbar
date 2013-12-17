var Lumbar = require('../lib/lumbar');

module.exports = function(grunt) {
  grunt.registerMultiTask('module-map', 'outputs a projects module map', function() {
    var done = this.async();

    var config = this.options({config: './lumbar.json'}),
        lumbarFile = config.config,
        outputFile = config.dest;

    var lumbar = Lumbar.init(lumbarFile, config);
    lumbar.moduleMap(config.package, function(err, map) {
      if (err) {
        throw err;
      }

      grunt.file.write(outputFile, JSON.stringify(map, undefined, 2));
      done();
    });
  });
};
