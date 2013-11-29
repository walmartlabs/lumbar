/*
  Grunt task, sample usage:

  var port = 8000,
    publicDir = './public',
    lumbarFile = './lumbar.json';
  
  grunt.loadNpmTasks('lumbar');

  grunt.initConfig({
    server: {
      base: publicDir,
      port: port
    },
    lumbar: {
      // performs an initial build so when tests
      // and initial open are run, code is built
      init  : {
        build: lumbarFile,
        outputDir: publicDir
      },
      // a long running process that will watch
      // for updates, to include another long
      // running task such as "watch", set
      // background: true
      watch: {
        background: false,
        watch: lumbarFile,
        outputDir: publicDir
      }
    }
  });

  grunt.registerTask('default', 'lumbar:build server lumbar:watch');
*/

var path = require('path');

module.exports = function(grunt) {
  grunt.registerMultiTask('lumbar', 'Starts a lumbar process', function() {

    var done = this.async();

    var config = this.data,
        lumbarFile = config.watch || config.build || './lumbar.json',
        outputDir = config.output || './public',
        mode;

    if (config.build) {
      mode = 'build'
    }
    if (config.watch) {
      mode = 'watch';
    }

    if (mode !== 'watch' && mode !== 'build') {
      throw new Error('Arguments to lumbar task must be watch: {}, or build: {}');
    }

    if (!('background' in config)) {
      config.background = true;
    }
    // never allow build to be in the background
    if (mode === 'build') {
      config.background = false;
    }

    // build up command string
    var command = [
      'node',
      path.join(process.cwd(), 'node_modules/lumbar/bin/lumbar'),
      mode
    ];
    if (config.package) {
      command.push('--package ' + config.package);
    }
    if (config.config) {
      command.push('--config ' + config.config);
    }
    if (config.minimize) {
      command.push('--minimize');
    }
	
	if (config.use) {
      command.push('--use');
      command.push(config.use);
    }
   
    if (config.withJson) {
      command.push('--with');
      command.push(config.withJson);
    }
		
    command.push(lumbarFile);
    command.push(outputDir);

    var lumbarProcess = require('child_process').spawn(command.shift(), command);
    lumbarProcess.stdout.on('data', function(data) {
      process.stdout.write(data.toString());
    });
    lumbarProcess.stderr.on('data', function(data) {
      process.stdout.write(data.toString());
    });

    if (config.background) {
      done(true);
    } else {
      lumbarProcess.on('exit', function() {
        done(true);
      });
    }
  });
}
