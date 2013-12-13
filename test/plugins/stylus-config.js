var fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    lib = require('../lib'),
    watch = require('../lib/watch');

describe('stylus-config plugin', function() {
  var readFileSync = fs.readFileSync,
      readFile = fs.readFile,
      statSync = fs.statSync;
  beforeEach(function() {
    fu.lookupPath('');

    this.stub(fs, 'readFileSync', function(path) {
      if (/file1\.styl|png$/.test(path) && !/functions(?:[\\\/]index)?.styl/.test(path)) {
        return '.test\n  display $display\n';
      } else if (/lumbar\.json$/.test(path)) {
        return JSON.stringify(config);
      } else if (/two\.json$/.test(path)) {
        return '{"$display": "red","value!":10}';
      } else if (/\.json$/.test(path)) {
        return '{"$display": "black"}';
      } else {
        return readFileSync.apply(this, arguments);
      }
    });
    this.stub(fs, 'readFile', function(path, callback) {
      process.nextTick(function() {
        try {
          callback(undefined, fs.readFileSync(path));
        } catch (err) {
          callback(err);
        }
      });
    });
    this.stub(fs, 'statSync', function(path) {
      if (!/(foo|two|lumbar|file1)\.(styl|png|json)$/.test(path) || /functions(?:[\\\/]index)?.styl/.test(path)) {
        return statSync.apply(this, arguments);
      }
    });
  });

  var config = {
    'modules': {
      'test': {
        'scripts': [{'stylus-config': true}],
        'styles': ['file1.styl']
      }
    },
    'styles': {
      'config': ['two.json', 'foo.json'],
      'configObject': 'foo'
    },
    plugins: [
      'stylus',
      'stylus-config'
    ]
  };

  describe('config output', function() {
    this.timeout(5000);

    it('should include the config in scripts', function(done) {

      lib.pluginExec(undefined, 'scripts', config.modules.test, [], config, function(resources, context) {
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          data.content.should.eql('foo = {"$display":"black","value!":10};\n');

          done();
        });
      });
    });
    it('should include the content in styles', function(done) {
      lib.pluginExec(undefined, 'styles', config.modules.test, [], config, function(resources, context) {
        resources[0].plugins.push({
          plugin: __dirname + '/stylus-config-worker'
        });
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          data.content.should.eql('.test {\n  display: #000;\n}\n');

          done();
        });
      });
    });
  });


  describe('watch', function() {
    var mock;
    beforeEach(function() {
      mock = watch.mockWatch();
    });
    afterEach(function() {
      mock.cleanup();
    });

    function runWatchTest(srcdir, config, operations, expectedFiles, done) {
      var options = {
        plugins: [
          {
            mode: 'styles',
            priority: 25,
            module: function(context, next, complete) {
              next(function(err) {
                if (err) {
                  throw err;
                }

                context.moduleResources.forEach(function(resource) {
                  if (resource.stylus) {
                    resource.plugins.push({
                      plugin: __dirname + '/stylus-config-worker'
                    });
                  }
                });
                complete(err);
              });
            }
          }
        ]
      };

      watch.runWatchTest.call(this, srcdir, config, operations, expectedFiles, options, done);
    }

    it('should rebuild on change', function(done) {
      var expectedFiles = ['/test.js', '/test.css', '/test.js', '/test.css'],
          operations = {
            2: function(testdir) {
              mock.trigger('change', testdir + 'two.json');
            }
          };

      runWatchTest.call(this,
        'test/artifacts', 'lumbar.json',
        operations, expectedFiles,
        done);
    });
  });

  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          name: 'mixin',
          styles: {
            'config': 'test.json',
            'configObject': 'foo'
          }
        },
        {
          name: 'mixin2',
          styles: {
            'config': ['test2.json']
          }
        }
      ];

      var config = {
        styles: {
          'config': 'config.json'
        }
      };

      lib.mixinExec({}, mixins, config, function(_libraries, context) {
        context.config.attributes.styles.should.eql({
          'config': [
            {src: 'test.json', library: mixins[0]},
            {src: 'test2.json', library: mixins[1]},
            'config.json'
          ],
          'configObject': 'foo'
        });
        done();
      });
    });
    it('should create styles config if necessary', function(done) {
      var mixin = {
        name: 'mixin',
        'styles': {
          'config': 'foo'
        }
      };

      lib.mixinExec({}, [], {}, function(libraries, context) {
        libraries.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            'config': [{src: 'foo', library: mixin}]
          });
          done();
        });
      });
    });
    it('should update path references', function(done) {
      var mixin = {
        name: 'mixin',
        'styles': {
          'config': ['foo', 'bar']
        }
      };

      lib.mixinExec({}, [], {}, function(libraries, context) {
        mixin.root = 'a/';
        libraries.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            'config': [
              {src: 'a/foo', library: mixin},
              {src: 'a/bar', library: mixin}
            ]
          });
          done();
        });
      });
    });
  });
});
