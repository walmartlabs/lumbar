var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter;

function WatchManager() {
  EventEmitter.call(this);

  this.reset();
}

WatchManager.prototype = {
  reset: function() {
    this.watching = {};
    this.queue = [];
  },
  pushChange: function(change) {
    if (_.find(this.queue, function(existing) {
          return existing.config || (change.fileName && (existing.fileName === change.fileName));
        })) {
      // If we have a pending config change or changes to the same file that has not started then
      // we can ignore subsequent changes
      return;
    }

    if (change.config) {
      this.reset();
    }

    fu.resetCache(change.sourceChange);
    this.queue.push(change);
  }
};

WatchManager.prototype.__proto__ = EventEmitter.prototype;

exports = module.exports = WatchManager;
