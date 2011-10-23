function Context(options, config) {
  this._package = options.package;
  this._platform = options.platform;
  this.mode = options.mode;
  this.module = options.module;
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
      this.parent.resources = value;
    } else {
      this._resources = value;
    }
  }
};

module.exports = Context;
