var _ = require('underscore'),
    assert = require('assert'),
    fs = require('fs'),
    lib = require('./lib'),
    should = require('should');

describe('mixins', function() {
  describe('loading', function() {
    var readFileSync = fs.readFileSync,
        statSync = fs.statSync,
        read = [];
    beforeEach(function() {
      read = [];
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

    it('should load direct mixin file references', function() {
      lib.mixinExec({}, ['mixin/file.json'], function(mixins, context) {
        read.should.eql(['mixin/file.json']);

        mixins.configs.length.should.eql(1);
        mixins.configs[0].root.should.equal('mixin/');
        context.config.attributes.foo.should.equal('bar');
      });
    });

    it('should load mixin directory references', function() {
      lib.mixinExec({}, ['mixin'], function(mixins, context) {
        read.should.eql(['mixin/lumbar.json']);

        mixins.configs.length.should.eql(1);
        mixins.configs[0].root.should.equal('mixin/');
        context.config.attributes.foo.should.equal('bar');
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
              scripts: [ {src: 'foo1.1', global: true}, {src: 'foo1.2', global: true}, 'bar1.1', 'bar1.2'],
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

          assert.deepEqual(module.scripts, [
            {src: 'mixin1/foo1.1', global: true, mixin: mixins.mixin1}, {src: 'mixin1/foo1.2', global: true, mixin: mixins.mixin1},
            {src: 'mixin2/foo2.1', global: true, mixin: mixins.mixin2}, {src: 'mixin2/foo2.2', global: true, mixin: mixins.mixin2},
            {src: 'foo0', global: true }, {src: 'foo0.1', global: true},
            {src: 'mixin1/bar1.1', mixin: mixins.mixin1}, {src: 'mixin1/bar1.2', mixin: mixins.mixin1},
            {src: 'mixin2/bar2.1', mixin: mixins.mixin2}, {src: 'mixin2/bar2.2', mixin: mixins.mixin2},
            'bar0.1', 'bar0.2'
          ]);
          assert.deepEqual(module.styles, [
            {src: 'mixin2/foo2', mixin: mixins.mixin2}, {src: 'mixin2/bar2', mixin: mixins.mixin2},
            'foo0', 'bar0'
          ]);
          assert.deepEqual(module.static, [
            {src: 'mixin1/baz1.1', mixin: mixins.mixin1}, {src: 'mixin1/baz1.2', mixin: mixins.mixin1},
            {src: 'mixin2/baz2.1', mixin: mixins.mixin2}, {src: 'mixin2/baz2.2', mixin: mixins.mixin2}
          ]);

          assert.deepEqual(mixins.mixin1.attributes.scripts, [ {src: 'foo1.1', global: true}, {src: 'foo1.2', global: true}, 'bar1.1', 'bar1.2']);
          assert.deepEqual(mixins.mixin1.attributes.static, [ 'baz1.1', 'baz1.2' ]);

          assert.deepEqual(mixins.mixin2.attributes.scripts, [ {src: 'foo2.1', global: true}, {src: 'foo2.2', global: true}, 'bar2.1', 'bar2.2']);
          assert.deepEqual(mixins.mixin2.attributes.styles, [ 'foo2', 'bar2' ]);
          assert.deepEqual(mixins.mixin2.attributes.static, [ 'baz2.1', 'baz2.2' ]);
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

          assert.deepEqual(module.static, [
            {src: 'foo', originalSrc: 'mixin1/baz1.1', mixin: mixin1},
            {src: 'baz1.2', originalSrc: 'mixin1/baz1.2', mixin: mixin1},
            {src: 'mixin2/baz1.1', mixin: mixins.mixin2},
            {src: 'mixin2/baz1.2', mixin: mixins.mixin2},
            'baz1.1'
          ]);

          assert.deepEqual(mixins.mixin1.attributes.static, [ 'baz1.1', 'baz1.2' ]);
          assert.deepEqual(mixins.mixin2.attributes.static, [ 'baz1.1', 'baz1.2' ]);
          done();
        });
    });
  });

  describe('integration', function() {
    it('should mixin all content', lib.runTest('test/artifacts/mixin.json', 'test/expected/mixin'));
  });
});

