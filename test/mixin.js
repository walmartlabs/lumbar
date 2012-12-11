var _ = require('underscore'),
    assert = require('assert'),
    fu = require('../lib/fileUtil'),
    fs = require('fs'),
    lib = require('./lib'),
    sinon = require('sinon'),
    watch = require('./lib/watch');

describe('mixins', function() {
  function stripper(resources) {
    // Drop the mixin reference to make testing easier
    _.each(resources, function(resource) { delete resource.mixin; });
    return resources;
  }

  describe('loading', function() {
    var readFileSync = fs.readFileSync,
        statSync = fs.statSync,
        read = [];
    beforeEach(function() {
      read = [];
      fu.lookupPath('');
    });
    before(function() {
      fs.readFileSync = function(path) {
        if (/mixin.*\.json$/.test(path)) {
          read.push(path);
          return '{"foo": "bar"}';
        } else {
          return readFileSync.apply(this, arguments);
        }
      };
      fs.statSync = function(path) {
        if (/mixin/.test(path)) {
          return {isDirectory: function() { return !/\.json$/.test(path); }};
        } else {
          return statSync.apply(this, arguments);
        }
      };
    });
    after(function() {
      fs.readFileSync = readFileSync;
      fs.statSync = statSync;
    });

    it('should load direct mixin config file references', function(done) {
      lib.mixinExec({}, ['mixin/file.json'], function(mixins, context) {
        read.should.eql(['mixin/file.json']);

        mixins.configs.length.should.eql(1);
        mixins.configs[0].root.should.equal('mixin/');
        context.config.attributes.foo.should.equal('bar');

        done();
      });
    });

    it('should load mixin config directory references', function(done) {
      lib.mixinExec({}, ['mixin'], function(mixins, context) {
        read.should.eql(['mixin/lumbar.json']);

        mixins.configs.length.should.eql(1);
        mixins.configs[0].root.should.equal('mixin/');
        context.config.attributes.foo.should.equal('bar');

        done();
      });
    });
  });

  describe('config', function() {
    it('should mixin undefined modules', function(done) {
      var modules = {
        'baz': 'bat',
        'foo': 'bah'
      };

      lib.mixinExec(undefined, [{modules: modules}], {modules: {'foo': 'bar'}}, function(mixins, context) {
        context.config.moduleList().should.eql(['foo', 'baz']);
        context.config.attributes.modules.foo.should.eql('bar');
        context.config.attributes.modules.baz.should.eql('bat');

        done();
      });
    });
    it('should update paths for mixin modules', function(done) {
      var modules = {
        'baz': {
          'scripts': ['foo.js'],
          'styles': ['foo.css'],
          'static': ['foo.html'],
        }
      };

      lib.mixinExec(undefined, [{root: 'bar', modules: modules}], {modules: {'foo': 'bar'}}, function(mixins, context) {
        context.config.moduleList().should.eql(['foo', 'baz']);

        var module = context.config.attributes.modules.baz;
        stripper(module.scripts).should.eql([{src: 'bar/foo.js'}]);
        stripper(module.styles).should.eql([{src: 'bar/foo.css'}]);
        stripper(module.static).should.eql([{src: 'bar/foo.html'}]);

        done();
      });
    });
    it('should apply mixins for mixin modules', function(done) {
      var mixins = {
        'baz': {
          'scripts': ['foo.js'],
          'styles': ['foo.css'],
          'static': ['foo.html'],
        }
      };
      var modules = {
        'bar': {
          'mixins': ['baz']
        }
      };

      lib.mixinExec(undefined, [{root: 'bar', modules: modules, mixins: mixins}], {modules: {'foo': 'bar'}}, function(mixins, context) {
        context.config.moduleList().should.eql(['foo', 'bar']);

        var module = context.config.attributes.modules.bar;
        stripper(module.scripts).should.eql([{src: 'bar/foo.js'}]);
        stripper(module.styles).should.eql([{src: 'bar/foo.css'}]);
        stripper(module.static).should.eql([{src: 'bar/foo.html'}]);

        done();
      });
    });
    it('should apply mixins from mixin modules', function(done) {
      var mixinModules = {
        'baz': {
          'scripts': ['foo.js'],
          'styles': ['foo.css'],
          'static': ['foo.html'],
        }
      };
      var modules = {
        'bar': {
          'mixins': ['baz'],
          'scripts': ['baz.js']
        }
      };

      lib.mixinExec(undefined, [{root: 'bar', modules: mixinModules}], {modules: modules}, function(mixins, context) {
        context.config.moduleList().should.eql(['bar', 'baz']);

        var module = context.config.attributes.modules.bar;
        stripper(module.scripts).should.eql([{src: 'bar/foo.js'}, 'baz.js']);
        stripper(module.styles).should.eql([{src: 'bar/foo.css'}]);
        stripper(module.static).should.eql([{src: 'bar/foo.html'}]);

        done();
      });
    });

    it('should allow mixin module suppression', function(done) {
      var mixinModules = {
        'baz': {
          'scripts': ['foo.js'],
          'styles': ['foo.css'],
          'static': ['foo.html'],
        }
      };
      var modules = {
        'baz': false,
        'bar': {
          'scripts': ['baz.js']
        }
      };

      lib.mixinExec(undefined, [{root: 'bar', modules: mixinModules}], {modules: modules}, function(mixins, context) {
        context.config.moduleList().should.eql(['bar']);

        var module = context.config.attributes.modules.bar;
        stripper(module.scripts).should.eql(['baz.js']);

        done();
      });
    });
  });

  describe('modules', function() {
    it('should mixin module attributes', function(done) {
      var module = {
        mixins: ['mixin1', 'mixin2'],
        bat: 3
      };

      var mixins = {
        mixin1: { foo: 1, baz: 1, bat: 1 },
        mixin2: { bar: 2, baz: 2, bat: 2 }
      };

      lib.mixinExec(module, [{mixins: mixins}], function() {
          assert.equal(module.foo, 1, 'foo should be written');
          assert.equal(module.bar, 2, 'bar should be written');
          assert.equal(module.baz, 2, 'baz should be overwritten');
          assert.equal(module.bat, 3, 'bat should not be overwritten');

          assert.deepEqual(mixins.mixin1, {foo: 1, baz: 1, bat: 1});
          assert.deepEqual(mixins.mixin2, {bar: 2, baz: 2, bat: 2});

          done();
        });
    });

    it('should merge routes', function(done) {
      var module = {
        mixins: ['mixin1', 'mixin2'],
        routes: { bat: 3 }
      };

      var mixins = {
        mixin1: {routes: { foo: 1, baz: 1, bat: 1 }},
        mixin2: {routes: { bar: 2, baz: 2, bat: 2 }}
      };

      lib.mixinExec(module, [{mixins: mixins}], function() {
          assert.equal(module.routes.foo, 1);//, 'foo should be written');
          assert.equal(module.routes.bar, 2, 'bar should be written');
          assert.equal(module.routes.baz, 2, 'baz should be overwritten');
          assert.equal(module.routes.bat, 3, 'bat should not be overwritten');

          assert.deepEqual(mixins.mixin1.routes, {foo: 1, baz: 1, bat: 1});
          assert.deepEqual(mixins.mixin2.routes, {bar: 2, baz: 2, bat: 2});

          done();
        });
    });

    it('should merge routes without modification', function(done) {
      var module = {
        mixins: ['mixin1', 'mixin2']
      };

      var mixins = {
        mixin1: {routes: { foo: 1, baz: 1, bat: 1 }},
        mixin2: {routes: { bar: 2, baz: 2, bat: 2 }}
      };

      lib.mixinExec(module, [{mixins: mixins}], function() {
          assert.equal(module.routes.foo, 1, 'foo should be written');
          assert.equal(module.routes.bar, 2, 'bar should be written');
          assert.equal(module.routes.baz, 2, 'baz should be overwritten');
          assert.equal(module.routes.bat, 2, 'bat should not be overwritten');

          assert.deepEqual(mixins.mixin1.routes, {foo: 1, baz: 1, bat: 1});
          assert.deepEqual(mixins.mixin2.routes, {bar: 2, baz: 2, bat: 2});

          done();
        });
    });

    it('should merge file arrays', function(done) {
      var module = {
        mixins: ['mixin1', 'mixin2'],
        scripts: [ {src: 'foo0', global: true }, {src: 'foo0.1', global: true}, 'bar0.1', 'bar0.2' ],
        styles: [ 'foo0', 'bar0' ]
      };

      var mixins = [
        {
          root: 'mixin1/',
          mixins: {
            mixin1: {
              scripts: [
                {src: 'foo1.1', global: true},
                {src: 'foo1.2', global: true},
                'bar1.1',
                'bar1.2',
                {dir: 'dir!'},
                {notAFile: true}
              ],
              static: [ 'baz1.1', 'baz1.2' ]
            }
          }
        },
        {
          root: 'mixin2/',
          mixins: {
            mixin2: {
              scripts: [ {src: 'foo2.1', global: true}, {src: 'foo2.2', global: true}, 'bar2.1', 'bar2.2'],
              styles: [ 'foo2', 'bar2' ],
              static: [ 'baz2.1', 'baz2.2' ]
            }
          }
        }
      ];

      lib.mixinExec(module, mixins, function(mixins) {
          mixins = mixins.mixins;

          module.scripts.should.eql([
            {src: 'mixin1/foo1.1', global: true, mixin: mixins.mixin1}, {src: 'mixin1/foo1.2', global: true, mixin: mixins.mixin1},
            {src: 'mixin2/foo2.1', global: true, mixin: mixins.mixin2}, {src: 'mixin2/foo2.2', global: true, mixin: mixins.mixin2},
            {src: 'foo0', global: true }, {src: 'foo0.1', global: true},
            {src: 'mixin1/bar1.1', mixin: mixins.mixin1}, {src: 'mixin1/bar1.2', mixin: mixins.mixin1},
            {dir: 'mixin1/dir!', mixin: mixins.mixin1}, {notAFile: true, mixin: mixins.mixin1},
            {src: 'mixin2/bar2.1', mixin: mixins.mixin2}, {src: 'mixin2/bar2.2', mixin: mixins.mixin2},
            'bar0.1', 'bar0.2'
          ]);
          module.styles.should.eql([
            {src: 'mixin2/foo2', mixin: mixins.mixin2}, {src: 'mixin2/bar2', mixin: mixins.mixin2},
            'foo0', 'bar0'
          ]);
          module.static.should.eql([
            {src: 'mixin1/baz1.1', mixin: mixins.mixin1}, {src: 'mixin1/baz1.2', mixin: mixins.mixin1},
            {src: 'mixin2/baz2.1', mixin: mixins.mixin2}, {src: 'mixin2/baz2.2', mixin: mixins.mixin2}
          ]);

          mixins.mixin1.attributes.scripts.should.eql([{src: 'foo1.1', global: true}, {src: 'foo1.2', global: true}, 'bar1.1', 'bar1.2', {dir: 'dir!'}, {notAFile: true}]);
          mixins.mixin1.attributes.static.should.eql([ 'baz1.1', 'baz1.2' ]);

          mixins.mixin2.attributes.scripts.should.eql([{src: 'foo2.1', global: true}, {src: 'foo2.2', global: true}, 'bar2.1', 'bar2.2']);
          mixins.mixin2.attributes.styles.should.eql([ 'foo2', 'bar2' ]);
          mixins.mixin2.attributes.static.should.eql([ 'baz2.1', 'baz2.2' ]);
          done();
        });
    });

    it('should allow files to be overriden', function(done) {
      var mixinDecl = {
        name: 'mixin1',
        overrides: {
          'baz1.1': 'foo',
          'baz1.2': true
        }
      };
      var module = {
        mixins: [
          mixinDecl,
          'mixin2'
        ],
        static: [ 'baz1.1' ]
      };

      var mixins = [
        {
          root: 'mixin1/',
          mixins: {
            mixin1: {
              static: [ 'baz1.1', 'baz1.2' ]
            }
          }
        },
        {
          root: 'mixin2/',
          mixins: {
            mixin2: {
              static: [ 'baz1.1', 'baz1.2' ]
            }
          }
        }
      ];

      lib.mixinExec(module, mixins, function(mixins) {
          mixins = mixins.mixins;

          var mixin1 = _.extend({}, mixinDecl, mixins.mixin1);

          module.static.should.eql([
            {src: 'foo', originalSrc: 'mixin1/baz1.1', mixin: mixin1},
            {src: 'baz1.2', originalSrc: 'mixin1/baz1.2', mixin: mixin1},
            {src: 'mixin2/baz1.1', mixin: mixins.mixin2},
            {src: 'mixin2/baz1.2', mixin: mixins.mixin2},
            'baz1.1'
          ]);

          mixins.mixin1.attributes.static.should.eql([ 'baz1.1', 'baz1.2' ]);
          mixins.mixin2.attributes.static.should.eql([ 'baz1.1', 'baz1.2' ]);
          done();
        });
    });
  });

  describe('conditional include', function() {
    var module,
        mixins;
    beforeEach(function() {
      module = {
        mixins: [
          {'name': 'mixin1', 'platform': 'web', 'env': 'dev'},
          {'name': 'mixin2', 'package': 'native'}
        ],
        bat: 3,
        scripts: [ {src: 'foo0.1', global: true}, 'bar0.1'],
        styles: [ 'foo0' ],
        static: [ 'baz0.1' ]
      };

      mixins = {
        mixin1: {
          foo: 1,
          scripts: [ {src: 'foo1.1', global: true}, 'bar1.1'],
          styles: [ 'foo1' ],
          static: [ 'baz1.1' ]
        },
        mixin2: {
          bar: 2,
          scripts: [ {src: 'foo2.1', global: true}, 'bar2.1'],
          styles: [ 'foo2' ],
          static: [ 'baz2.1' ]
        }
      };
    });

    it('should conditionally include platform mixins', function(done) {
      lib.mixinExec(module, [{mixins: mixins}], function() {
          module.foo.should.eql(1, 'foo should be written');
          module.bar.should.eql(2, 'bar should be written');
          module.bat.should.eql(3, 'bat should not be overwritten');

          stripper(module.scripts);
          stripper(module.styles);
          stripper(module.static);

          module.scripts.should.eql([
            {src: 'foo1.1', global: true, platform: 'web', env: 'dev'},
            {src: 'foo2.1', global: true, package: 'native'},
            {src: 'foo0.1', global: true},
            {src: 'bar1.1', platform: 'web', env: 'dev'},
            {src: 'bar2.1', package: 'native'},
            'bar0.1'
          ]);
          module.styles.should.eql([
            {src: 'foo1', platform: 'web', env: 'dev'},
            {src: 'foo2', package: 'native'},
            'foo0'
          ]);
          module.static.should.eql([
            {src: 'baz1.1', platform: 'web', env: 'dev'},
            {src: 'baz2.1', package: 'native'},
            'baz0.1'
          ]);

          done();
        });
    });
  });

  describe('watch', function() {
    var config = {};
    lib.mockFileList(config);

    var mock;
    beforeEach(function() {
      var readFile = fs.readFile;

      mock = watch.mockWatch();

      sinon.stub(fs, 'readFileSync', function() {
        return JSON.stringify({
          modules: {
            module: {scripts: ['js/views/test.js']}
          },
          mixins: 'mixin'
        });
      });

      sinon.stub(fs, 'readFile', function(path, callback) {
        if (/test.(js|foo)$/.test(path)) {
          return callback(undefined, 'foo');
        } else {
          return readFile.apply(this, arguments);
        }
      });
    });
    afterEach(function() {
      fs.readFileSync.restore();
      fs.readFile.restore();
      mock.cleanup();
    });


    function runWatchTest(srcdir, config, operations, expectedFiles, done) {
      watch.runWatchTest.call(this, srcdir, config, operations, expectedFiles, {}, done);
    }

    it('should rebuild on config change', function(done) {
      var expectedFiles = ['/module.js', '/module.js'],
          operations = {
            1: function(testdir) {
              mock.trigger('change', testdir + 'mixin/lumbar.json');
            }
          };

      runWatchTest.call(this,
        'test/artifacts', 'lumbar.json',
        operations, expectedFiles,
        done);
    });
  });

  describe('integration', function() {
    it('should mixin all content', lib.runTest('test/artifacts/mixin.json', 'test/expected/mixin'));
  });
});

