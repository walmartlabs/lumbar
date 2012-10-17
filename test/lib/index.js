var _ = require('underscore'),
    assert = require('assert'),
    build = require('../../lib/build'),
    Config = require('../../lib/config'),
    Context = require('../../lib/context'),
    fu = require('../../lib/fileUtil'),
    fs = require('fs'),
    glob = require('glob'),
    lumbar = require('../../lib/lumbar'),
    Mixins = require('../../lib/mixins'),
    path = require('path'),
    should = require('should'),
    wrench = require('wrench');

var counter = 0;
try { fs.mkdirSync('/tmp/lumbar-test', 0755); } catch (err) {}

exports.testDir = function(testName, configFile) {
  var outdir = '/tmp/lumbar-test/' + testName + '-' + path.basename(configFile) + '-' + Date.now() + '-' + (counter++);
  fs.mkdirSync(outdir, 0755);
  return outdir;
};
exports.assertExpected = function(outdir, expectedDir, configFile) {
  var expectedFiles = glob.sync(expectedDir + '/**/*.*').map(function(fileName) {
        return fileName.substring(expectedDir.length);
      }).filter(function(file) { return !/\/$/.test(file); }).sort(),
      generatedFiles = glob.sync(outdir + '/**/*.*').map(function(fileName) {
        return fileName.substring(outdir.length);
      }).filter(function(file) { return !/\/$/.test(file); }).sort();
  generatedFiles.should.eql(expectedFiles, configFile + ': file list matches' + JSON.stringify(expectedFiles) + JSON.stringify(generatedFiles));

  generatedFiles.forEach(function(fileName) {
    var generatedStat = fs.statSync(outdir + fileName),
        expectedStat = fs.statSync(expectedDir + fileName);

    generatedStat.isFile().should.eql(expectedStat.isFile());
    generatedStat.isDirectory().should.eql(expectedStat.isDirectory());

    if (generatedStat.isDirectory()) {
      return;
    }

    var generatedContent = fs.readFileSync(outdir + fileName, 'utf8'),
        expectedContent = fs.readFileSync(expectedDir + fileName, 'utf8');
    generatedContent.should.eql(expectedContent, configFile + ':' + fileName + ': content matches');
  });
};

exports.mockFileList = function(config) {
  var fileList = fu.fileList;
  before(function() {
    fu.fileList = function(list, extension, callback) {
      callback = _.isFunction(extension) ? extension : callback;
      if (!_.isArray(list)) {
        list = [list];
      }
      callback(
          undefined,
          _.map(list, function(file) {
            if (config.fileFilter && config.fileFilter.test(file)) {
              return {src: file, enoent: true};
            } else {
              return file;
            }
          }));
    };
  });
  after(function() {
    fu.fileList = fileList;
  });
  beforeEach(function() {
    config.fileFilter = config.defaultFilter;
  });
};

exports.runTest = function(configFile, expectedDir, options, expectGlob) {
  return function(done) {
    var outdir = exports.testDir('lumbar', configFile);
    this.title += ' ' + outdir;

    options = options || {};
    options.outdir = outdir;

    var expectedFiles = glob.sync(expectedDir + (expectGlob || '/**/*.{js,css}')).map(function(fileName) {
          return fileName.substring(expectedDir.length);
        }).sort(),
        seenFiles = [];

    var arise = lumbar.init(configFile, options || {outdir: outdir});
    arise.on('output', function(status) {
      if (retCount > 0) {
        throw new Error('Output event seen after callback');
      }

      var statusFile = status.fileName.substring(outdir.length);
      if (!expectedFiles.some(function(fileName) { return statusFile === fileName; })) {
        should.fail(undefined, status.fileName, configFile + ':' + statusFile + ': missing from expected list');
      } else {
        seenFiles.push(statusFile);
      }
      if (seenFiles.length < expectedFiles.length) {
        return;
      }

      exports.assertExpected(outdir, expectedDir, configFile);

      seenFiles = seenFiles.sort();
      seenFiles.should.eql(expectedFiles, 'seen file list matches');

      // Cleanup (Do cleanup here so the files remain for the failure case)
      wrench.rmdirSyncRecursive(outdir);

      done();
    });
    var retCount = 0;
    arise.build(undefined, function(err) {
      if (err) {
        throw err;
      }

      retCount++;
      if (retCount > 1) {
        throw new Error('Build callback executed multiple times');
      }
    });
  };
};

exports.mixinExec = function(module, mixins, config, callback) {
  var plugin = require('../../lib/plugin').create({});
  plugin.initialize({ attributes: {} });

  if (_.isFunction(config)) {
    callback = config;
    config = undefined;
  }

  config = Config.create(_.extend({modules: {module: module}}, config));
  var context = new Context({module: module}, config, plugin, new Mixins({mixins: mixins}));
  context.options = {};
  context.configCache = {};

  context.mixins.initialize(context, function(err) {
    if (err) {
      throw err;
    }

    plugin.loadConfig(context, function(err) {
      if (err) {
        throw err;
      }

      callback(context.mixins, context);
    });
  });
};

exports.pluginExec = function(plugin, mode, module, mixins, config, callback) {
  if (_.isFunction(config)) {
    callback = config;
    config = undefined;
  }

  exports.mixinExec(module, mixins, config, function(mixins, context) {
    context.mode = mode;
    context.fileConfig = {};
    context.fileCache = {};

    build.loadResources(context, function(err, resources) {
      if (err) {
        throw err;
      }

      build.processResources(resources, context, function(err, resources) {
        if (err) {
          throw err;
        }

        context.moduleResources = resources;
        context.moduleCache = {};

        plugin = context.plugins.get(plugin);
        if (!plugin.module) {
          return callback(context.moduleResources, context);
        }
        plugin.module(context, function(complete) { complete(); }, function(err) {
          if (err) {
            throw err;
          }

          callback(context.moduleResources, context);
        });
      });
    });
  });
};
