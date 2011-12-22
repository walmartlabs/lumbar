var _ = require('underscore'),
    fu = require('./fileUtil'),
    path = require('path');

exports.load = function(configFile) {
  var config, packageList, moduleList;

  function loadPackageList() {
    packageList = [];
    if (!config.packages) {
      config.packages = { web: { name: '' } };
    }

    for (var name in config.packages) {
      packageList.push(name);
    }
  }
  function loadModuleList() {
    moduleList = [];
    for (var name in config.modules) {
      moduleList.push(name);
    }
  }

  fu.lookupPath('');

  var data = fu.readFileSync(configFile);

  config = JSON.parse(data);

  fu.lookupPath(path.dirname(configFile));

  loadPackageList();
  loadModuleList();

  return {
    attributes: config,
    loadPrefix: function() {
      return config.loadPrefix || '';
    },

    packageList: function() {
      return packageList;
    },

    combineModules: function(package) {
      return config.packages[package].combine;
    },
    platformList: function(package) {
      if (!package) {
        return config.platforms || [''];
      } else {
        return config.packages[package].platforms || this.platformList();
      }
    },

    moduleList: function(package) {
      return config.packages[package].modules || moduleList;
    },

    module: function(name) {
      var ret = config.modules[name];
      if (ret) {
        ret.name = name;
      }
      return ret;
    },
    isAppModule: function(module) {
      var app = config.application;
      return (app && app.module) === (module.name || module);
    },
    scopedAppModuleName: function(module) {
      var app = config.application;
      if (this.isAppModule(module)) {
        return 'module.exports';
      } else {
        var app = config.application;
        return app && app.name;
      }
    },

    routeList: function(module) {
      return config.modules[module].routes;
    },

    fileList: function(plugins, context, callback) {
      var module = context.module,
          self = this;

      var files = plugins.moduleResources(context);
      var ret = [];

      function filterResource(resource) {
        if (_.isString(resource)) {
          resource = { src: resource };
        }

        if (self.filterResource(resource, context)) {
          ret.push(resource);
        }
      }

      function iterator(resource) {
        // Allow plugins to add to or modify the resource, but only one level deep.
        context.resource = resource;
        resource = plugins.resourceList(context);
        if (resource) {
          resource.forEach(filterResource);
        }
      }

      fu.fileList(files, /\.(js|json)$/, function(err, files) {
        if (err) {
          callback(err);
          return;
        }

        files.forEach(iterator);

        callback(undefined, ret);
      });
    },
    filterResource: function(resource, context) {
      var platform = context.platform;

      if (resource.platform) {
        return resource.platform === platform;
      } else if (resource.platforms) {
        return resource.platforms.reduce(function(found, filePlatform) {
            return found || filePlatform === platform;
          }, false);
      }

      return true;
    }
  };
};