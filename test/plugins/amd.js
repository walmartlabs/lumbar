var _ = require('underscore'),
    amd = require('../../lib/plugins/amd'),
    build = require('../../lib/build'),
    fu = require('../../lib/fileUtil');

describe('amd plugin', function() {
  var appModule,
      context,
      expectedCache,
      next;
  beforeEach(function() {
    appModule = false;
    next = this.spy(function(callback) { callback(undefined, [context.resource]); });
    context = {
      platformCache: {
        amdAppModules: {}
      },
      fileCache: {},
      config: {
        isAppModule: function() {
          return appModule;
        },
        attributes: {
          amd: true
        }
      }
    };

    expectedCache = {
      'foo/bar': {
        defined: [{
          name: 'foo/bar',
          loc: {
            start: {
              line: 1,
              column: 20
            },
            end: {
              line: 1,
              column: 33
            }
          },
          view: true,
          source: 'function() {}'
        }],
        dependencies: ['baz']
      },
      'baz': {
        defined: [{
          name: 'baz',
          loc: {
            start: {
              line: 1,
              column: 20
            },
            end: {
              line: 1,
              column: 33
            }
          },
          view: true,
          source: 'function() {}'
        }],
        dependencies: ['baz']
      }
    };

    this.stub(fu, 'readFile', function(path, callback) {
      if (path === 'js/foo/foo.js') {
        callback(undefined, 'defineView(["bar"], function() {})');
      } else {
        callback(undefined, 'defineView(["baz"], function() {})');
      }
    });
  });

  it('should NOP if AMD mode is not enabled', function(done) {
    context.config.attributes.amd = false;

    amd.resourceList(
      context, next,
      function() {
        next.should.have.been.calledOnce;
        should.not.exist(context.platformCache.amd);
        done();
      });
  });
  describe('parser', function() {
    it('should parse js files', function(done) {
      context.resource = 'js/foo/bar.js';
      amd.resourceList(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          context.platformCache.amd.should.eql(expectedCache);
          done();
        });
    });
    it('should parse complex files', function(done) {
      context.resource = {'src': 'js/foo/bar.js'};
      amd.resourceList(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          context.platformCache.amd.should.eql(expectedCache);
          done();
        });
    });
    it('should not parse non-js files', function(done) {
      context.resource = 'js/foo/bar.coffee';
      amd.resourceList(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          context.platformCache.amd.should.eql({});
          done();
        });
    });
    it('should recursively parse', function(done) {
      context.resource = 'js/foo/foo.js';
      expectedCache.bar = expectedCache['foo/bar'];
      expectedCache.bar.defined[0].name = 'bar';
      delete expectedCache['foo/bar'];
      expectedCache['foo/foo'] = {
        defined: [{
          name: 'foo/foo',
          loc: {
            start: {
              line: 1,
              column: 20
            },
            end: {
              line: 1,
              column: 33
            }
          },
          view: true,
          source: 'function() {}'
        }],
        dependencies: ['bar']
      };

      amd.resourceList(
        context, next,
        function() {
          next.should.have.been.calledOnce;
          context.platformCache.amd.should.eql(expectedCache);
          done();
        });
    });
  });

  describe('dependencies', function() {
    it('should insert dependencies', function(done) {
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/baz.js', 'js/bar.js', {src: 'js/foo/foo.js'}]);
          done();
        });
    });
    it('should not include filtered files', function(done) {
      this.stub(build, 'filterResource', function() { return false; });

      context.resource = {'src': 'js/foo/foo.js', 'platform': 'foo'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql([{src: 'js/foo/foo.js', 'platform': 'foo'}]);
          should.not.exist(context.platformCache.amd);
          should.not.exist(context.fileCache.amdFileModules);
          done();
        });
    });
    it('should insert recursive cached dependencies', function(done) {
      context.platformCache.amd = expectedCache;
      expectedCache.bar = expectedCache['foo/bar'];
      expectedCache.bar.defined[0].name = 'bar';
      delete expectedCache['foo/bar'];

      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/baz.js', 'js/bar.js', {src: 'js/foo/foo.js'}]);
          fu.readFile.should.have.been.calledOnce;
          done();
        });
    });
    it('should not insert dependencies included in application module', function(done) {
      context.platformCache.amdAppModules.baz = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/bar.js', {src: 'js/foo/foo.js'}]);
          done();
        });
    });
    it('should update the app module include listing if building the app module', function(done) {
      appModule = true;
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/baz.js', 'js/bar.js', {src: 'js/foo/foo.js'}]);
          _.keys(context.platformCache.amdAppModules).should.eql(['foo/foo', 'bar', 'baz']);
          done();
        });
    });
    it('should not duplicate dependencies in the current file', function(done) {
      // Not strictly required that we do this as the combiner logic will remove dupes
      // but we need to track some of this for circular deps handling anyway
      context.resource = {'src': 'js/foo/foo.js'};
      amd.resourceList(
        context, next,
        function(err, resources) {
          resources.should.eql(['js/baz.js', 'js/bar.js', {src: 'js/foo/foo.js'}]);

          amd.resourceList(
            context, next,
            function(err, resources) {
              resources.should.eql([]);
              done();
            });
        });
    });
  });

  describe('config change', function() {
    it('should detect when style config changed');
    it('should detect when applicaiton module impacts modules');
  });

  describe('rewriting', function() {
    it('should output loader for define calls');
  });
});
