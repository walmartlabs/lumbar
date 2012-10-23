var WatchManager = require('../lib/watch-manager'),
    watcher = require('../lib/watcher');

describe('watch-manager', function() {
  describe('change queue', function() {
    var watch;
    beforeEach(function() {
      watch = new WatchManager();
    });

    it('should track changes', function() {
      watch.queue.should.be.empty;
      watch.pushChange({'foo': 'bar'});
      watch.pushChange({'bar': 'bar'});
      watch.queue.should.eql([{'foo': 'bar'}, {'bar': 'bar'}]);
    });

    it('should reset on config changes', function() {
      watch.pushChange({'foo': 'bar'});
      watch.pushChange({'config': true});
      watch.queue.should.eql([{'config': true}]);
    });

    it('should ignore changes when config is pending', function() {
      watch.pushChange({'config': true});
      watch.pushChange({'foo': 'bar'});
      watch.queue.should.eql([{'config': true}]);
    });
    it('should ignore changes when on the same file', function() {
      watch.pushChange({'fileName': 'foo'});
      watch.pushChange({'fileName': 'foo'});
      watch.queue.should.eql([{'fileName': 'foo'}]);
    });
  });
});
