var build = require('../lib/build'),
    fu = require('../lib/fileUtil');

describe('build utils', function() {
  describe('#filterResource', function() {
    it('should filter on platform', function() {
      build.filterResource({}, {platform: 'web'}).should.be.true;
      build.filterResource({platform: 'web'}, {platform: 'web'}).should.be.true;

      build.filterResource({platform: 'web'}, {platform: 'ipad'}).should.be.false;

      build.filterResource({platforms: ['web', 'iphone']}, {platform: 'iphone'}).should.be.true;
      build.filterResource({platforms: ['web', 'iphone']}, {platform: 'ipad'}).should.be.false;
    });
    it('should filter on not platform', function() {
      build.filterResource({platform: {not: 'ipad'}}, {platform: 'web'}).should.be.true;

      build.filterResource({platform: {not: 'ipad'}}, {platform: 'ipad'}).should.be.false;

      build.filterResource({platforms: {not: ['ipad', 'iphone']}}, {platform: 'web'}).should.be.true;
      build.filterResource({platforms: {not: ['ipad', 'iphone']}}, {platform: 'ipad'}).should.be.false;
    });

    it('should filter on package', function() {
      build.filterResource({}, {package: 'web'}).should.be.true;
      build.filterResource({package: 'web'}, {package: 'web'}).should.be.true;

      build.filterResource({package: 'web'}, {package: 'ipad'}).should.be.false;

      build.filterResource({packages: ['web', 'iphone']}, {package: 'iphone'}).should.be.true;
      build.filterResource({packages: ['web', 'iphone']}, {package: 'ipad'}).should.be.false;
    });
    it('should filter on not package', function() {
      build.filterResource({package: {not: 'ipad'}}, {package: 'web'}).should.be.true;

      build.filterResource({package: {not: 'ipad'}}, {package: 'ipad'}).should.be.false;

      build.filterResource({packages: {not: ['ipad', 'iphone']}}, {package: 'web'}).should.be.true;
      build.filterResource({packages: {not: ['ipad', 'iphone']}}, {package: 'ipad'}).should.be.false;
    });

    it('should filter on combined mode', function() {
      build.filterResource({}, {combined: true}).should.be.true;
      build.filterResource({}, {combined: false}).should.be.true;

      build.filterResource({combined: true}, {combined: true}).should.be.true;
      build.filterResource({combined: true}, {combined: false}).should.be.false;
      build.filterResource({combined: true}, {}).should.be.false;

      build.filterResource({combined: false}, {combined: true}).should.be.false;
      build.filterResource({combined: false}, {combined: false}).should.be.true;
      build.filterResource({combined: false}, {}).should.be.true;
    });

    it('should combine filters', function() {
      build.filterResource({}, {package: 'web', platform: 'foo'}).should.be.true;
      build.filterResource({package: 'web', platform: 'foo'}, {package: 'web', platform: 'foo'}).should.be.true;

      build.filterResource({package: 'iphone', platform: 'foo'}, {package: 'web', platform: 'foo'}).should.be.false;
      build.filterResource({package: 'web', platform: 'bar'}, {package: 'web', platform: 'foo'}).should.be.false;
    });

    it('should combine original resource', function() {
      build.filterResource({originalResource: {}}, {package: 'web'}).should.be.true;
      build.filterResource({package: 'web', originalResource: {}}, {package: 'web'}).should.be.true;
      build.filterResource({originalResource: {package: 'web'}}, {package: 'web'}).should.be.true;

      build.filterResource({package: 'web', originalResource: {package: 'iphone'}}, {package: 'web'}).should.be.false;
    });
  });

  describe('#loadResources', function() {
    it('should handle moduleResources error', function() {
      var context = {
        plugins: {
          moduleResources: function(context, callback) {
            callback(new Error('FAILED'));
          }
        }
      };

      var spy = this.spy(function(err) {
        err.should.be.instanceOf(Error);
      });
      build.loadResources(context, spy);
      spy.should.have.been.calledOnce;
    });
    it('should handle fileList error', function() {
      var context = {
        plugins: {
          moduleResources: function(context, callback) {
            callback();
          },
          fileFilter: function() {}
        }
      };
      this.stub(fu, 'fileList', function(files, filter, callback) {
        callback(new Error('FAILED'));
      });

      var spy = this.spy(function(err) {
        err.should.be.instanceOf(Error);
      });
      build.loadResources(context, spy);
      spy.should.have.been.calledOnce;
    });
  });

  describe('#processResources', function() {
    it('should handle resource errors', function() {
      var context = {
        clone: function() {
          return this;
        },
        plugins: {
          resource: function(context, callback) {
            callback(new Error('FAILED'));
          }
        }
      };

      var spy = this.spy(function(err) {
        err.should.be.instanceOf(Error);
      });
      build.processResources([1], context, spy);
      spy.should.have.been.calledOnce;
    });
  });
});
