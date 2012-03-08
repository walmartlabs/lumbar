var _ = require('underscore'),
    async = require('async'),
    fs = require('fs'),
    fu = require('./fileUtil');

function Context(options, config, plugins, event) {
  this._package = options.package;
  this._platform = options.platform;
  this._plugins = plugins;
  this.mode = options.mode;
  this.module = options.module;
  this.fileConfig = options.fileConfig;
  this.resource = options.resource;
  this.config = config;
  this.event = event || options.event;
}
Context.prototype = {
  fileUtil: fu,

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

    this.plugins.outputConfigs(context, function(err, configs) {
      if (err) {
        return callback(err);
      }

      async.map(configs, function(config, callback) {
        var fileContext = context.clone();
        fileContext.fileConfig = config;
        fileContext._plugins.fileName(fileContext, function(err, fileName) {
          config.fileName = fileName;
          callback(err, config);
        });
      },
      callback);
    });
  },

  loadResource: function(resource, callback) {
    if (!callback) {
      // if only single param, assume as callback and resource from context
      resource = this.resource;
      callback = resource;
    }
    
    var fileInfo = {name: resource.hasOwnProperty('sourceFile') ? resource.sourceFile : resource.src};

    function loaded(err, data) {
      if (err) {
        var json = '';
        try {
          // Output JSON for the resource... but protect ourselves from a failure masking a failure
          json = '\n\t' + JSON.stringify(resource);
        } catch(err) { /* NOP */ }

        callback(new Error('Failed to load resource "' + fileInfo.name + '"' + json + '\n\t' + (err.stack || err)));
        return;
      }
      fileInfo.inputs = data.inputs;
      fileInfo.noSeparator = data.noSeparator;
      fileInfo.content = data.data != null ? data.data : data;

      // Ensure that we dump off the stack
      _.defer(function() {
        callback(err, fileInfo);
      });
    }

    if (typeof resource === 'function') {
      resource(this, loaded);
    } else if (resource.src) {
      // Assume a file page, attempt to load
      fu.readFile(resource.src, loaded);
    } else {
      loaded(undefined, {data: '', noSeparator: true, inputs: resource.dir ? [resource.dir] : []});
    }

    return fileInfo;
  },

  outputFile: function(writer, callback) {
    var context = this;
    context.plugins.file(context, function(err) {
      if (err) {
        return callback(err);
      }

      context.plugins.fileName(context, function(err, fileName) {
        if (err) {
          return callback(err);
        }

        context.buildPath = (fileName.root ? '' : context.platformPath) + fileName.path + '.' + fileName.extension;
        context.fileName = context.outdir + '/' + context.buildPath;
        writer(function(err, data) {
          data = _.defaults({
              fileConfig: context.fileConfig,
              platform: context.platform,
              package: context.package,
              mode: context.mode
            }, data);

          if (err) {
            fs.unlink(context.fileName);
          } else {
            context.event.emit('output', data);
          }
          context.fileCache = undefined;
          callback(err, data);
        });
      });
    });
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
