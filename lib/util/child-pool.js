var _ = require('underscore'),
    cp = require('child_process');

var numCPUs = require('os').cpus().length,
    queue = [],
    activeTasks = 0,
    isBackground;

exports = module.exports = function(module, options) {
  this.module = module;
  this.options = _.defaults({workers: numCPUs, keepAlive: 500}, options);
  this.workers = [];
  this.cullTimeout = undefined;
};
exports.prototype.sendAll = function(message) {
  _.each(this.workers, function(worker) {
    worker.process.send(message);
  });
};
exports.prototype.send = function(message, callback) {
  var self = this;

  callback = callback || function() {};

  function fork() {
    worker = {
      callback: false,
      process: cp.fork(self.module)
    };
    worker.process.on('message', function(msg) {
      if (msg.log) {
        return console.log.apply(console, msg.log);
      }

      activeTasks--;

      var callback = worker.callback;
      worker.callback = undefined;

      // Check for process culling
      worker.cullTimeout = setTimeout(function() {
        // Kill
        worker.process.kill();
        self.workers = _.without(self.workers, worker);
      }, self.options.keepAlive);

      if (queue.length) {
        var queued = queue.shift();
        queued.pool.send(queued.message, queued.callback);
      }

      // Dispatch
      process.nextTick(function() {
        var err;
        if (msg.err) {
          err = new Error(msg.err);
          if (msg.stack) {
            err.stack = msg.stack;
          }
        }
        callback(err, msg.data);
      });
    });
    self.workers.push(worker);
  }

  // If we are in interactive mode, i.e. watch, leave at least one core free so the machine doesn't
  // lag and annoy the developer.
  // Creating a minimum number of CPUs to prevent starvation on machines with less cores
  var exceedsGlobal = (activeTasks + (isBackground ? 1 : 0) >= Math.max(numCPUs, 2)),
      worker = !exceedsGlobal && _.find(this.workers, function(worker) { return !worker.callback; });
  if (!worker) {
    if (!exceedsGlobal && this.workers.length < this.options.workers) {
      // Fork!
      fork();
    } else {
      // Queue!
      queue.push({pool: self, message: message, callback: callback});
      return;
    }
  }

  activeTasks++;

  clearTimeout(worker.cullTimeout);
  worker.callback = callback;
  worker.process.send(message);
};

/**
 * Set to true to attempt to leave at least one core available to prevent starvation.
 *
 * This is useful for watch mode when the developer might be doing other things while the build is
 * running.
 */
exports.isBackground = function(background) {
  isBackground = background;
};
