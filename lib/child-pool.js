var _ = require('underscore'),
    cp = require('child_process');

var numCPUs = require('os').cpus().length;

exports = module.exports = function(module, options) {
  this.module = module;
  this.options = _.defaults({workers: numCPUs, keepAlive: 100}, options);
  this.workers = [];
  this.queue = [];
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
        return console.log(msg.log);
      }

      var callback = worker.callback;
      worker.callback = undefined;

      if (self.queue.length) {
        var queued = self.queue.shift();
        self.send(queued.message, queued.callback);
      } else {
        // Check for process culling
        worker.cullTimeout = setTimeout(function() {
          // Kill
          worker.process.kill();
          self.workers = _.without(self.workers, worker);
        }, self.options.keepAlive);
      }

      // Dispatch
      process.nextTick(function() {
        callback(msg.err, msg.data);
      });
    });
    self.workers.push(worker);
  }

  var worker = _.find(this.workers, function(worker) { return !worker.callback; });
  if (!worker) {
    if (this.workers.length < this.options.workers) {
      // Fork!
      fork();
    } else {
      // Queue!
      self.queue.push({message: message, callback: callback});
      return;
    }
  }

  clearTimeout(worker.cullTimeout);
  worker.callback = callback;
  worker.process.send(message);
};
