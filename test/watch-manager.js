var fu = require('../lib/fileUtil'),
    WatchManager = require('../lib/watch-manager'),
    watcher = require('../lib/util/watcher');

describe('watch-manager', function() {
  var watch;
  beforeEach(function() {
    watch = new WatchManager();
    this.stub(watch, '_exec');
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

    describe('fileCache', function() {
      beforeEach(function() {
        this.stub(fu, 'resetCache');
      });

      it('should reset fileCache on change', function() {
        watch.pushChange({sourceChange: 'foo'});
        fu.resetCache.callCount.should.equal(1);
        fu.resetCache.calledWithExactly('foo').should.be.true;
      });
      it('should reset entire fileCache on config change', function() {
        watch.pushChange({config: true});
        fu.resetCache.callCount.should.equal(1);
        fu.resetCache.calledWithExactly(undefined).should.be.true;
      });
      it('should reset parent fileCache on remove', function() {
        watch.pushChange({sourceChange: 'foo/bar', type: 'remove'});
        fu.resetCache.callCount.should.equal(2);
        fu.resetCache.calledWithExactly('foo/bar').should.be.true;
        fu.resetCache.calledWithExactly('foo').should.be.true;
      });
      it('should reset the file cache on ignored changes', function() {
        watch.pushChange({'config': true});
        watch.pushChange({sourceChange: 'bar'});
        fu.resetCache.callCount.should.equal(2);
        fu.resetCache.calledWithExactly(undefined).should.be.true;
        fu.resetCache.calledWithExactly('bar').should.be.true;
      });
    });

    it('should reset on config changes', function() {
      this.stub(watch, 'reset');
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
      var stub = this.stub();
      watch.pushChange({callback: stub});
      watch.pushChange({callback: stub});
      watch.flushQueue();
      stub.callCount.should.equal(2);
    });
  });
});
