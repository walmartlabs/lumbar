var _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    fu = require('./fileUtil'),
    path = require('path'),
    watcher = require('./util/watcher');

function WatchManager(eventBus) {
  EventEmitter.call(this);

  this.eventBus = eventBus;
  this.reset();

  this._exec = this.setupExec();
}

WatchManager.prototype = {
  configFile: function(path, mixins, callback) {
    if (_.isFunction(mixins)) {
      callback = mixins;
      mixins = undefined;
    }

    var self = this;
    watcher.watchFile(path, mixins || [], function() {
      self.emit('watch-change', {fileName: path, config: true});

      self.pushChange({callback: callback, fileName: path, config: true});
    });
  },
  moduleOutput: function(status, callback) {
    var self = this;

    function theWatcher(type, filename, sourceChange) {
      self.emit('watch-change', {fileName: sourceChange, output: status.fileName});
      self.pushChange({
        callback: callback,
        type: type,
        fileName: status.fileName,
        sourceChange: sourceChange
      });
    }

    var watchInfo = this.watching[status.fileName] || {},

        eventInputs = status.inputs.filter(function(input) { return input.event; }),
        fileInputs = _.difference(status.inputs, eventInputs).map(function(input) { return fu.resolvePath(input.dir || input); }),

        removedFiles = _.difference(watchInfo.files, fileInputs);

    if (removedFiles.length) {
      watcher.unwatch(status.fileName, removedFiles);
    }
    watcher.watchFile({ virtual: status.fileName }, fileInputs, theWatcher);

    // Remove all events as we will reregister below
    _.each(watchInfo.events, function(event) {
      this.eventBus.removeListener(event, watchInfo.watcher);
    }, this);

    eventInputs = _.pluck(eventInputs, 'event')
    _.each(eventInputs, function(event) {
      this.eventBus.on(event, theWatcher);
    }, this);

    this.watching[status.fileName] = {
      watcher: theWatcher,
      files: fileInputs,
      events: eventInputs
    };
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
    fu.resetCache(change.sourceChange);
    if (change.type === 'remove' && change.sourceChange) {
      fu.resetCache(path.dirname(change.sourceChange));
    }

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

    this.queue.push(change);
    this._exec();
  }
};

WatchManager.prototype.__proto__ = EventEmitter.prototype;

exports = module.exports = WatchManager;
