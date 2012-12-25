var fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    lib = require('../lib'),
    watch = require('../lib/watch');

describe('stylus-config plugin', function() {
  var readFileSync = fs.readFileSync,
      readFile = fs.readFile,
      statSync = fs.statSync,
      read;
  beforeEach(function() {
    read = [];
  });
  before(function() {
    fu.lookupPath('');

    fs.readFileSync = function(path) {
      if (/file1\.styl|png$/.test(path) && !/functions(?:[\\\/]index)?.styl/.test(path)) {
        read.push(path);
        return '.test\n  display $display\n';
      } else if (/lumbar\.json$/.test(path)) {
        read.push(path);
        return JSON.stringify(config);
      } else if (/two\.json$/.test(path)) {
        read.push(path);
        return '{"$display": "red","value!":10}';
      } else if (/\.json$/.test(path)) {
        read.push(path);
        return '{"$display": "black"}';
      } else {
        return readFileSync.apply(this, arguments);
      }
    };
    fs.readFile = function(path, callback) {
      process.nextTick(function() {
        try {
          callback(undefined, fs.readFileSync(path));
        } catch (err) {
          callback(err);
        }
      });
    };
    fs.statSync = function(path) {
      if (!/(foo|two|lumbar|file1)\.(styl|png|json)$/.test(path) || /functions(?:[\\\/]index)?.styl/.test(path)) {
        return statSync.apply(this, arguments);
      }
    };
  });
  after(function() {
    fs.readFileSync = readFileSync;
    fs.readFile = readFile;
    fs.statSync = statSync;
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

    it('should include the config in scripts', function(done) {

      lib.pluginExec(undefined, 'scripts', config.modules.test, [], config, function(resources, context) {
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          read.should.eql([
            'two.json',
            'foo.json'
          ]);
          data.content.should.eql('foo = {"$display":"black","value!":10};\n');

          done();
        });
      });
    });
    it('should include the content in styles', function(done) {
      lib.pluginExec(undefined, 'styles', config.modules.test, [], config, function(resources, context) {
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          read.should.eql([
            'two.json',
            'foo.json',
            'file1.styl'
          ]);
          data.content.should.eql('.test {\n  display: black;\n}\n');

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
      var options = {};

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
    afterEach(function() {
      fs.readFileSync = readFileSync;
      fs.statSync = statSync;
    });
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          name: 'mixin',
          styles: {
            "config": "test.json",
            "configObject": "foo"
          }
        },
        {
          name: 'mixin2',
          styles: {
            "config": ["test2.json"]
          }
        }
      ];

      var config = {
        styles: {
          "config": "config.json"
        }
      };

      lib.mixinExec({}, mixins, config, function(mixins, context) {
        context.config.attributes.styles.should.eql({
          "config": [
            "test.json",
            "test2.json",
            "config.json"
          ],
          "configObject": "foo"
        });
        done();
      });
    });
    it('should create styles config if necessary', function(done) {
      var mixin = {
        name: 'mixin',
        "styles": {
          "config": "foo"
        }
      };

      lib.mixinExec({}, [], {}, function(mixins, context) {
        mixins.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            "config": ["foo"]
          });
          done();
        });
      });
    });
    it('should update path references', function(done) {
      var mixin = {
        name: 'mixin',
        "styles": {
          "config": ['foo', 'bar']
        }
      };

      lib.mixinExec({}, [], {}, function(mixins, context) {
        mixin.root = 'a/';
        mixins.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            "config": ['a/foo', 'a/bar']
          });
          done();
        });
      });
    });
  });
});
