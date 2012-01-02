var async = require('async');

function Context(options, config, plugins) {
  this._package = options.package;
  this._platform = options.platform;
  this._plugins = plugins;
  this.mode = options.mode;
  this.module = options.module;
  this.fileConfig = options.fileConfig;
  this.config = config;
}
Context.prototype = {
  clone: function() {
    var ret = new Context(this, this.config);
    ret.parent = this;
    var prototype = Object.keys(Context.prototype);
    for (var name in this) {
      if (this.hasOwnProperty(name) && prototype.indexOf(name) === -1) {
        ret[name] = this[name];
      }
    }
    return ret;
  },

  fileNamesForModule: function(mode, moduleName, callback) {
    var context = this.clone();
    context.mode = mode;
    context.module = moduleName && this.config.module(moduleName);

    var configs = this._plugins.generatedFiles(context);
    async.map(configs, function(config, callback) {
      var fileContext = context.clone();
      fileContext.fileConfig = config;
      fileContext._plugins.fileName(fileContext, function(err, fileName) {
        config.fileName = fileName;
        callback(err, config);
      });
    },
    callback);
  },

  get plugins() { return this._plugins; },

  get package() { return this._package; },
  get platform() { return this._platform; },
  get platformPath() {
    return this.platform ? this.platform + '/' : '';
  },

  get combined() {
    return this.config.combineModules(this.package);
  },

  get resources() {
    if (this.parent) {
      return this.parent.resources;
    } else {
      return this._resources;
    }
  },
  set resources(value) {
    if (this.parent) {
      delete this.parent;
    }
    this._resources = value;
  }
};

module.exports = Context;
