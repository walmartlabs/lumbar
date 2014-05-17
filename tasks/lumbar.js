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
      init: {
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
      mode = 'build';
    }
    if (config.watch) {
      mode = 'watch';
    }

    if (mode !== 'watch' && mode !== 'build') {
      grunt.fatal('Arguments to lumbar task must be watch: {}, or build: {}');
    }

    if (!('background' in config)) {
      // Default to background for anything other than build operations
      config.background = mode !== 'build';
    }

    // never allow build to be in the background
    if (mode === 'build') {
      if (config.background) {
        grunt.warn('You can\'t do a lumbar build in the background, forcing non-background execution...');
      }
      config.background = false;
    }

    // build up command string
    var command = [
      'node',
      path.join(__dirname, '../bin/lumbar'),
      mode
    ];

    if (config.package) {
      command.push('--package');
      command.push(config.package);
    }

    if (config.config) {
      command.push('--config');
      command.push(config.config);
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
      command.push(JSON.stringify(config.withJson));
    }

    if (config.plugins) {
      config.plugins.forEach(function(plugin) {
        if (plugin.use) {
          command.push('--use');
          command.push(plugin.use);
        }

        if (plugin.withJson) {
          command.push('--with');
          command.push(JSON.stringify(plugin.withJson));
        }
      });
    }

    if (config.libraries) {
      config.libraries.forEach(function(library) {
        command.push('--library=' + library);
      });
    }

    if (config.verbose) {
      command.push('--verbose');
    }

    if (config.sourceMap) {
      command.push('--sourceMap' + (config.sourceMap !== true ? '=' + config.sourceMap : ''));
    }

    command.push(lumbarFile);
    command.push(outputDir);

    var lumbarProcess = require('child_process').spawn(command.shift(), command, { stdio: 'inherit', cwd: config.cwd });
    if (config.background) {
      done(true);
    } else {
      lumbarProcess.on('exit', function() {
        done(lumbarProcess.exitCode);
      });
    }
  });
}
