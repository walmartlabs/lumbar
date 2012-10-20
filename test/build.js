var build = require('../lib/build');

describe('build utils', function() {
  describe('#filterResource', function() {
    it('should filter on platform', function() {
      build.filterResource({}, {platform: 'web'}).should.be.true;
      build.filterResource({platform: 'web'}, {platform: 'web'}).should.be.true;

      build.filterResource({platform: 'web'}, {platform: 'ipad'}).should.be.false;

      build.filterResource({platforms: ['web', 'iphone']}, {platform: 'iphone'}).should.be.true;
      build.filterResource({platforms: ['web', 'iphone']}, {platform: 'ipad'}).should.be.false;
    });

    it('should filter on package', function() {
      build.filterResource({}, {package: 'web'}).should.be.true;
      build.filterResource({package: 'web'}, {package: 'web'}).should.be.true;

      build.filterResource({package: 'web'}, {package: 'ipad'}).should.be.false;

      build.filterResource({packages: ['web', 'iphone']}, {package: 'iphone'}).should.be.true;
      build.filterResource({packages: ['web', 'iphone']}, {package: 'ipad'}).should.be.false;
    });

    it('should combine filters', function() {
      build.filterResource({}, {package: 'web', platform: 'foo'}).should.be.true;
      build.filterResource({package: 'web', platform: 'foo'}, {package: 'web', platform: 'foo'}).should.be.true;

      build.filterResource({package: 'iphone', platform: 'foo'}, {package: 'web', platform: 'foo'}).should.be.false;
      build.filterResource({package: 'web', platform: 'bar'}, {package: 'web', platform: 'foo'}).should.be.false;
    });
  });
});
