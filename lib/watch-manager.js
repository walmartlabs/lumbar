var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    fu = require('./fileUtil'),
    watcher = require('./watcher');

function WatchManager() {
  EventEmitter.call(this);

  this.reset();

  this._exec = this.setupExec();
}

WatchManager.prototype = {
  configFile: function(path, callback) {
    var self = this;
    watcher.watchFile(path, [], function(type, filename, sourceChange) {
      self.emit('watch-change', {fileName: path, config: true});

      self.pushChange({callback: callback, fileName: path, config: true});
    });
  },
  moduleOutput: function(status, callback) {
    var self = this;

    // If we are already watching a file don't do it again. Note that this prevents inputs
    // from changing without the config also changing.
    // TODO : Figure out how to add/remove inputs for a given watch name
    if (this.watching[status.fileName]) {
      return;
    }

    var input = status.inputs.map(function(input) { return fu.resolvePath(input.dir || input); });
    watcher.watchFile({ virtual: status.fileName }, input, function(type, filename, sourceChange) {
      self.emit('watch-change', {fileName: sourceChange, output: status.fileName});
      self.pushChange({callback: callback, fileName: status.fileName, sourceChange: sourceChange});
    });
    this.watching[status.fileName] = true;
  },


  setupExec: function() {
    return _.debounce(_.bind(this.flushQueue, this), 500);
  },
  flushQueue: function() {
    if (this.queue.length) {
      _.each(this.queue, function(change) {
        change.callback();
      });
      this.queue = [];
    }
  },

  reset: function() {
    // Cleanup what we can, breaking things along the way
    // WARN: This prevents concurrent execution within the same process.
    watcher.unwatchAll();

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
    this._exec();
  }
};

WatchManager.prototype.__proto__ = EventEmitter.prototype;

exports = module.exports = WatchManager;
