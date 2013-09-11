var _ = require('underscore'),
    assert = require('assert'),
    bower = require('bower'),
    EventEmitter = require('events').EventEmitter,
    fu = require('../lib/fileUtil'),
    fs = require('fs'),
    lib = require('./lib'),
    watch = require('./lib/watch');

describe('mixins', function() {
  function stripper(resources) {
    // Drop the mixin reference to make testing easier
    _.each(resources, function(resource) { delete resource.mixin; delete resource.library; });
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
    beforeEach(function() {
      this.stub(fs, 'readFileSync', function(path) {
        if (/library.*\.json$/.test(path)) {
          read.push(path);
          return '{"name": "loading", "foo": "bar"}';
        } else {
          return readFileSync.apply(this, arguments);
        }
      });
      this.stub(fs, 'statSync', function(path) {
        if (/library/.test(path)) {
          return {isDirectory: function() { return !/\.json$/.test(path); }};
        } else {
          return statSync.apply(this, arguments);
        }
      });
    });

    it('should load direct mixin config file references', function(done) {
      lib.mixinExec({}, ['library/file.json'], function(libraries, context) {
        read.should.eql(['library/file.json']);

        libraries.configs.length.should.eql(1);
        libraries.configs[0].root.should.equal('library/');
        context.config.attributes.foo.should.equal('bar');

        done();
      });
    });

    it('should load mixin config directory references', function(done) {
      lib.mixinExec({}, ['library'], function(libraries, context) {
        read.should.eql(['library/lumbar.json']);

        libraries.configs.length.should.eql(1);
        libraries.configs[0].root.should.equal('library/');
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

      lib.mixinExec(undefined, [{name: 'config', modules: modules}], {modules: {'foo': 'bar'}}, function(libraries, context) {
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

      lib.mixinExec(undefined, [{name: 'update', root: 'bar', modules: modules}], {modules: {'foo': 'bar'}}, function(libraries, context) {
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

      lib.mixinExec(undefined, [{name: 'apply', root: 'bar', modules: modules, mixins: mixins}], {modules: {'foo': 'bar'}}, function(libraries, context) {
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

      lib.mixinExec(undefined, [{name: 'apply', root: 'bar', modules: mixinModules}], {modules: modules}, function(libraries, context) {
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

      lib.mixinExec(undefined, [{name: 'supress', root: 'bar', modules: mixinModules}], {modules: modules}, function(libraries, context) {
        context.config.moduleList().should.eql(['bar']);

        var module = context.config.attributes.modules.bar;
        stripper(module.scripts).should.eql(['baz.js']);

        done();
      });
    });
  });

  describe('mixin namespace', function() {
    it('should lookup default mixin', function(done) {
      var mixinModules = {
        'baz': {
          'scripts': ['foo.js']
        }
      };
      var modules = {
        'bar': {
          'mixins': ['baz'],
          'scripts': ['baz.js']
        }
      };

      lib.mixinExec(undefined, [{name: 'bar', root: 'bar', modules: mixinModules}], {modules: modules}, function(libraries, context) {
        context.config.moduleList().should.eql(['bar', 'baz']);

        var module = context.config.attributes.modules.bar;
        stripper(module.scripts).should.eql([{src: 'bar/foo.js'}, 'baz.js']);

        done();
      });
    });
    it('should lookup mixin by container', function(done) {
      var mixin1 = {
        root: '1',
        name: '1',
        'modules': {
          'baz': {
            'scripts': ['foo1.js']
          }
        }
      };
      var mixin2 = {
        root: '2',
        name: '2',
        'modules': {
          'baz': {
            'scripts': ['foo2.js']
          }
        }
      };
      var modules = {
        'bar': {
          'mixins': [{name: 'baz', container: '2'}],
          'scripts': ['baz.js']
        }
      };

      lib.mixinExec(undefined, [mixin1, mixin2], {modules: modules}, function(libraries, context) {
        if (libraries.err) {
          throw libraries.err;
        }

        context.config.moduleList().should.eql(['bar', 'baz']);

        var module = context.config.attributes.modules.bar;
        stripper(module.scripts).should.eql([{src: '2/foo2.js'}, 'baz.js']);

        module = context.config.attributes.modules.baz;
        stripper(module.scripts).should.eql([{src: '1/foo1.js'}]);

        done();
      });
    });
    it('should lookup mixin by library', function(done) {
      var mixin1 = {
        root: '1',
        name: '1',
        'modules': {
          'baz': {
            'scripts': ['foo1.js']
          }
        }
      };
      var mixin2 = {
        root: '2',
        name: '2',
        'modules': {
          'baz': {
            'scripts': ['foo2.js']
          }
        }
      };
      var modules = {
        'bar': {
          'mixins': [{name: 'baz', library: '2'}],
          'scripts': ['baz.js']
        }
      };

      lib.mixinExec(undefined, [mixin1, mixin2], {modules: modules}, function(libraries, context) {
        if (libraries.err) {
          throw libraries.err;
        }

        context.config.moduleList().should.eql(['bar', 'baz']);

        var module = context.config.attributes.modules.bar;
        stripper(module.scripts).should.eql([{src: '2/foo2.js'}, 'baz.js']);

        module = context.config.attributes.modules.baz;
        stripper(module.scripts).should.eql([{src: '1/foo1.js'}]);

        done();
      });
    });
    it('should fail if a mixin library does not define a name', function(done) {
      var mixin1 = {
        root: '1',
        'modules': {
          'baz': {'scripts': ['foo1.js']}
        }
      };
      var modules = {
        'bar': {'scripts': ['baz.js']}
      };

      lib.mixinExec(undefined, [mixin1], {modules: modules}, function(libraries) {
        libraries.err.should.be.an.instanceof(Error);
        libraries.err.message.should.match(/missing a name\./);

        done();
      });
    });
    it('should fail if multiple mixins are defined', function(done) {
      var mixin1 = {
        root: '1',
        name: '1',
        'modules': {
          'baz': {
            'scripts': ['foo1.js']
          }
        }
      };
      var mixin2 = {
        root: '2',
        name: '2',
        'modules': {
          'baz': {
            'scripts': ['foo2.js']
          }
        }
      };
      var modules = {
        'bar': {
          'mixins': [{name: 'baz'}],
          'scripts': ['baz.js']
        }
      };

      lib.mixinExec(undefined, [mixin1, mixin2], {modules: modules}, function(libraries) {
        libraries.err.should.be.an.instanceof(Error);
        libraries.err.message.should.match(/Duplicate mixins found for "baz"/);

        done();
      });
    });
    it('should fail if no mixin from the given library is defined', function(done) {
      var mixin1 = {
        root: '1',
        name: '1',
        'modules': {
          'baz': {
            'scripts': ['foo1.js']
          }
        }
      };
      var modules = {
        'bar': {
          'mixins': [{name: 'baz', library: 2}],
          'scripts': ['baz.js']
        }
      };

      lib.mixinExec(undefined, [mixin1], {modules: modules}, function(libraries) {
        libraries.err.should.be.an.instanceof(Error);
        libraries.err.message.should.match(/Mixin named "baz" not found in library "2"/);

        done();
      });
    });
    it('should select mixin if a mixin has both mixins and module of the same name', function(done) {
      var mixin1 = {
        root: '1',
        name: '1',
        'modules': {
          'baz': {
            'scripts': ['foo1.js']
          }
        },
        'mixins': {
          'baz': {
            'scripts': ['foo2.js']
          }
        }
      };
      var modules = {
        'bar': {
          'mixins': [{name: 'baz'}],
          'scripts': ['baz.js']
        }
      };

      lib.mixinExec(undefined, [mixin1], {modules: modules}, function(libraries, context) {
        context.config.moduleList().should.eql(['bar', 'baz']);

        var module = context.config.attributes.modules.bar;
        stripper(module.scripts).should.eql([{src: '1/foo2.js'}, 'baz.js']);

        module = context.config.attributes.modules.baz;
        stripper(module.scripts).should.eql([{src: '1/foo1.js'}]);

        done();
      });
    });
  });

  describe('mixin file references', function() {
    it('should update paths for mixin modules', function(done) {
      var mixin = {
        name: 'foo',
        root: 'bar'
      };
      var modules = {
        'foo': {
          scripts: [
            {src: 'bar.js', library: 'foo'}
          ]
        }
      };

      lib.mixinExec(undefined, [mixin], {modules: modules}, function(libraries, context) {
        context.config.moduleList().should.eql(['foo']);

        var module = context.config.attributes.modules.foo;
        stripper(module.scripts).should.eql([{src: 'bar/bar.js'}]);

        done();
      });
    });
    it('should update paths for nested mixin modules', function(done) {
      var mixins = [
        {
          name: 'foo',
          mixins: {
            foo: {
              scripts: [
                {src: 'bar.js', library: 'bar'}
              ]
            }
          },
          root: 'foo'
        },
        {
          name: 'bar',
          root: 'bar'
        }
      ];
      var modules = {
        'foo': {
          mixins: ['foo']
        }
      };

      lib.mixinExec(undefined, mixins, {modules: modules}, function(libraries, context) {
        context.config.moduleList().should.eql(['foo']);

        var module = context.config.attributes.modules.foo;
        stripper(module.scripts).should.eql([{src: 'bar/bar.js'}]);

        done();
      });
    });
    it('should throw an error if a mixin is not found', function(done) {
      var mixin = {
        name: 'foo',
        root: 'bar'
      };
      var modules = {
        'foo': {
          scripts: [
            {src: 'bar.js', library: 'bar'}
          ]
        }
      };

      lib.mixinExec(undefined, [mixin], {modules: modules}, function(libraries) {
        (libraries.err + '').should.match(/mixin "bar" not found/i);

        done();
      });
    });
  });

  describe('bower file references', function() {
    beforeEach(function() {
      require('bower').config.directory = 'bower_components';
    });

    it('should update paths for bower packages', function(done) {
      var mixin = {
        name: 'foo',
        root: 'bar'
      };
      var modules = {
        'foo': {
          scripts: [
            {src: 'bar.js', bower: 'foo'}
          ]
        }
      };

      lib.mixinExec(undefined, [mixin], {modules: modules}, function(libraries, context) {
        context.config.moduleList().should.eql(['foo']);

        var module = context.config.attributes.modules.foo;
        stripper(module.scripts).should.eql([{src: 'bower_components/foo/bar.js', bower: 'foo'}]);

        done();
      });
    });
    it('should give priority to bower path over module path', function(done) {
      var mixins = [
        {
          name: 'foo',
          mixins: {
            foo: {
              scripts: [
                {src: 'bar.js', bower: 'foo'}
              ]
            }
          },
          root: 'foo'
        },
        {
          name: 'bar',
          root: 'bar'
        }
      ];
      var modules = {
        'foo': {
          mixins: ['foo']
        }
      };

      lib.mixinExec(undefined, mixins, {modules: modules}, function(libraries, context) {
        context.config.moduleList().should.eql(['foo']);

        var module = context.config.attributes.modules.foo;
        stripper(module.scripts).should.eql([{src: 'bower_components/foo/bar.js', bower: 'foo'}]);

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

      lib.mixinExec(module, [{name: 'attr', mixins: mixins}], function() {
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

      lib.mixinExec(module, [{name: 'routes', mixins: mixins}], function() {
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

      lib.mixinExec(module, [{name: 'routes', mixins: mixins}], function() {
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
          name: '1',
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
          name: '2',
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

      lib.mixinExec(module, mixins, function(libraries) {
          if (libraries.err) {
            throw libraries.err;
          }

          mixins = libraries.mixins;

          module.scripts.should.eql([
            {src: 'mixin1/foo1.1', global: true, library: mixins.mixin1[0]}, {src: 'mixin1/foo1.2', global: true, library: mixins.mixin1[0]},
            {src: 'mixin2/foo2.1', global: true, library: mixins.mixin2[0]}, {src: 'mixin2/foo2.2', global: true, library: mixins.mixin2[0]},
            {src: 'foo0', global: true }, {src: 'foo0.1', global: true},
            {src: 'mixin1/bar1.1', library: mixins.mixin1[0]}, {src: 'mixin1/bar1.2', library: mixins.mixin1[0]},
            {dir: 'mixin1/dir!', library: mixins.mixin1[0]}, {notAFile: true, library: mixins.mixin1[0]},
            {src: 'mixin2/bar2.1', library: mixins.mixin2[0]}, {src: 'mixin2/bar2.2', library: mixins.mixin2[0]},
            'bar0.1', 'bar0.2'
          ]);
          module.styles.should.eql([
            {src: 'mixin2/foo2', library: mixins.mixin2[0]}, {src: 'mixin2/bar2', library: mixins.mixin2[0]},
            'foo0', 'bar0'
          ]);
          module.static.should.eql([
            {src: 'mixin1/baz1.1', library: mixins.mixin1[0]}, {src: 'mixin1/baz1.2', library: mixins.mixin1[0]},
            {src: 'mixin2/baz2.1', library: mixins.mixin2[0]}, {src: 'mixin2/baz2.2', library: mixins.mixin2[0]}
          ]);

          mixins.mixin1[0].attributes.scripts.should.eql([{src: 'foo1.1', global: true}, {src: 'foo1.2', global: true}, 'bar1.1', 'bar1.2', {dir: 'dir!'}, {notAFile: true}]);
          mixins.mixin1[0].attributes.static.should.eql([ 'baz1.1', 'baz1.2' ]);

          mixins.mixin2[0].attributes.scripts.should.eql([{src: 'foo2.1', global: true}, {src: 'foo2.2', global: true}, 'bar2.1', 'bar2.2']);
          mixins.mixin2[0].attributes.styles.should.eql([ 'foo2', 'bar2' ]);
          mixins.mixin2[0].attributes.static.should.eql([ 'baz2.1', 'baz2.2' ]);
          done();
        });
    });

    it('should allow files to be overriden', function(done) {
      var mixinDecl = {
        name: 'mixin1',
        overrides: {
          'baz1.1': 'foo',
          'baz1.2': true,
          'baz1.3': false
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
          name: '1',
          root: 'mixin1/',
          mixins: {
            mixin1: {
              static: [ 'baz1.1', 'baz1.2', 'baz1.3' ]
            }
          }
        },
        {
          name: '2',
          root: 'mixin2/',
          mixins: {
            mixin2: {
              static: [ 'baz1.1', 'baz1.2' ]
            }
          }
        }
      ];

      lib.mixinExec(module, mixins, function(libraries) {
          mixins = libraries.mixins;

          var mixin1 = _.extend({}, mixinDecl, mixins.mixin1[0]);

          module.static.should.eql([
            {src: 'foo', originalSrc: 'mixin1/baz1.1', library: mixin1},
            {src: 'baz1.2', originalSrc: 'mixin1/baz1.2', library: mixin1},
            {src: 'mixin2/baz1.1', library: mixins.mixin2[0]},
            {src: 'mixin2/baz1.2', library: mixins.mixin2[0]},
            'baz1.1'
          ]);

          mixins.mixin1[0].attributes.static.should.eql([ 'baz1.1', 'baz1.2', 'baz1.3' ]);
          mixins.mixin2[0].attributes.static.should.eql([ 'baz1.1', 'baz1.2' ]);
          done();
        });
    });

    it('should allow nested files to be overriden', function(done) {
      var mixinDecl = {
        name: 'mixin1',
        overrides: {
          'baz1.1': 'foo',
          'baz1.2': true,
          'baz1.3': false
        }
      };
      var module = {
        mixins: [
          'mixin2'
        ],
        static: [ 'baz1.1' ]
      };

      var mixins = [
        {
          name: '1',
          root: 'mixin1/',
          mixins: {
            mixin1: {
              static: [ 'baz1.1', 'baz1.2', 'baz1.3' ]
            }
          }
        },
        {
          name: '2',
          root: 'mixin2/',
          mixins: {
            mixin2: {
              mixins: [
                mixinDecl
              ],
              static: [ 'baz1.1', 'baz1.2' ]
            }
          }
        }
      ];

      lib.mixinExec(module, mixins, function(libraries) {
          mixins = libraries.mixins;

          var mixin1 = _.extend({}, mixinDecl, mixins.mixin1[0]);

          _.each(module.static, function(file) { delete file.library; });

          module.static.should.eql([
            {src: 'mixin2/foo', originalSrc: 'mixin1/baz1.1'},
            {src: 'mixin2/baz1.2', originalSrc: 'mixin1/baz1.2'},
            {src: 'mixin2/baz1.1'},
            {src: 'mixin2/baz1.2'},
            'baz1.1'
          ]);

          mixins.mixin1[0].attributes.static.should.eql([ 'baz1.1', 'baz1.2', 'baz1.3' ]);
          mixins.mixin2[0].attributes.static.should.eql([ 'baz1.1', 'baz1.2' ]);
          done();
        });
    });

    it('should allow nested mixins to be overriden at the top level', function(done) {
      var mixinDecl = {
        name: 'mixin2',
        overrides: {
          'baz1.1': 'foo',
          'baz1.2': true,
          'baz1.3': false
        }
      };
      var module = {
        mixins: [
          mixinDecl
        ],
        static: [ 'baz1.1' ]
      };

      var mixins = [
        {
          name: '1',
          root: 'mixin1/',
          mixins: {
            mixin1: {
              static: [ 'baz1.1', 'baz1.2', 'baz1.3' ]
            },
            mixin2: {
              mixins: [
                {
                  name: 'mixin1',
                  overrides: {
                    'baz1.1': 'foo',
                    'baz1.2': true
                  }
                }
              ],
              static: [ 'baz2.1', 'baz2.2' ]
            }
          }
        }
      ];

      lib.mixinExec(module, mixins, function(libraries) {
          if (libraries.err) {
            throw libraries.err;
          }

          mixins = libraries.mixins;

          var mixin1 = _.extend({}, mixinDecl, mixins.mixin1[0]);

          _.each(module.static, function(file) { delete file.library; });

          module.static.should.eql([
            {src: 'foo', originalSrc: 'mixin1/baz1.1'},
            {src: 'baz1.2', originalSrc: 'mixin1/baz1.2'},
            {src: 'mixin1/baz2.1'},
            {src: 'mixin1/baz2.2'},
            'baz1.1'
          ]);

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
          name: '1',
          foo: 1,
          scripts: [ {src: 'foo1.1', global: true}, 'bar1.1', {'module-map': true}],
          styles: [ 'foo1' ],
          static: [ 'baz1.1' ]
        },
        mixin2: {
          name: '2',
          bar: 2,
          scripts: [ {src: 'foo2.1', global: true}, 'bar2.1'],
          styles: [ 'foo2' ],
          static: [ 'baz2.1' ]
        }
      };
    });

    it('should conditionally include platform mixins', function(done) {
      lib.mixinExec(module, [{name: 'conditionally', mixins: mixins}], function() {
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
            {'module-map': true, platform: 'web', env: 'dev'},
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

    it('should allow for nested mixins', function(done) {
      var module = {
        mixins: ['mixin1']
      };

      var mixins = {
        mixin1: {
          mixins: ['mixin2'],
          routes: { foo: 1, baz: 1, bat: 1 }
        },
        mixin2: {mixins: [{name: 'mixin3'}]},
        mixin3: {routes: { bar: 2, baz: 2, bat: 2 }}
      };

      lib.mixinExec(module, [{name: 'routes', mixins: mixins}], function() {
          module.routes.foo.should.equal(1);
          module.routes.bar.should.equal(2);
          module.routes.baz.should.equal(1);
          module.routes.bat.should.equal(1);

          done();
        });
    });

    it('should propagate conditional attributes for nested mixins', function(done) {
      var module = {
        mixins: ['mixin1']
      };

      var mixins = {
        mixin1: {
          mixins: [{name: 'mixin2', platform: 'foo'}],
          scripts: [
            '1.js'
          ]
        },
        mixin2: {mixins: [{name: 'mixin3'}]},
        mixin3: {scripts: [
            '3.js'
          ]
        }
      };

      lib.mixinExec(module, [{name: 'routes', mixins: mixins}], function() {
          stripper(module.scripts);
          module.scripts.should.eql([
            {'src': '3.js', platform: 'foo'},
            {'src': '1.js'}
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

      this.stub(fs, 'readFileSync', function() {
        return JSON.stringify({
          name: 'attr',
          modules: {
            module: {scripts: ['js/views/test.js']}
          },
          libraries: 'library'
        });
      });

      this.stub(fs, 'readFile', function(path, callback) {
        if (/test.(js|foo)$/.test(path)) {
          return callback(undefined, 'foo');
        } else {
          return readFile.apply(this, arguments);
        }
      });
    });
    afterEach(function() {
      mock.cleanup();
    });


    function runWatchTest(srcdir, config, operations, expectedFiles, done) {
      watch.runWatchTest.call(this, srcdir, config, operations, expectedFiles, {}, done);
    }

    it('should rebuild on config change', function(done) {
      var expectedFiles = ['/module.js', '/module.js'],
          operations = {
            1: function(testdir) {
              mock.trigger('change', testdir + 'library/lumbar.json');
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

