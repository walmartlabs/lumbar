var fu = require('../lib/fileUtil'),
    sinon = require('sinon'),
    WatchManager = require('../lib/watch-manager'),
    watcher = require('../lib/watcher');

describe('watch-manager', function() {
  var watch;
  beforeEach(function() {
    watch = new WatchManager();
    sinon.stub(watch, '_exec');
    watch.queue.should.be.empty;
  });

  describe('#pushChange', function() {
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

    it('should reset on config changes', function() {
      sinon.stub(watch, 'reset');
      watch.pushChange({config: true});
      watch.reset.callCount.should.equal(1);
    });
    it('should begin exec', function() {
      watch.pushChange({'config': true});
      watch._exec.callCount.should.equal(1);
    });
  });

  describe('#flushQueue', function() {
    it('should execute callbacks on flushQueue', function() {
      var stub = sinon.stub();
      watch.pushChange({callback: stub});
      watch.pushChange({callback: stub});
      watch.flushQueue();
      stub.callCount.should.equal(2);
    });
  });
});
