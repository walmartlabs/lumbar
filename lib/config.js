var _ = require('underscore'),
    async = require('async'),
    fu = require('./fileUtil'),
    path = require('path');

/**
 *
 * @name load
 * @function This function loads the lumbar JSON file, and returns
 *  helper methods associated with accessing its specific data.
 * @param {string} lumbarFile the location of the lumbar file.
 * @return {Object}
 */
exports.load = function(lumbarFile) {
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

  var data = fu.readFileSync(lumbarFile);

  config = JSON.parse(data);
  fu.lookupPath(path.dirname(lumbarFile));

  loadPackageList();
  loadModuleList();

  return {
    /** @typedef {Object} The raw lumbar file as a JSON object. */
    attributes: config,
    loadPrefix: function() {
      return config.loadPrefix || '';
    },

    /**
     *
     * @name packageList
     * @function This function returns the list of packages found
     *  in the lumbar file.
     * @return {Array.<Object>} array of package(s).
     */
    packageList: function() {
      return packageList;
    },

    /**
     *
     * @name combineModules
     * @function This functions checks to see if the package, pkg,
     *  is going to combine all its modules or not.
     * @param {string} pkg the name of the package
     * @return {boolean} is this package destined to be combined?
     */
    combineModules: function(pkg) {
      if (config && config.packages && config.packages[pkg]) {
        return config.packages[pkg].combine;
      }
      return false;
    },
    platformList: function(pkg) {
      if (!pkg) {
        return config.platforms || [''];
      } else {
        if (config.packages[pkg]) {
          return config.packages[pkg].platforms || this.platformList();
        }
        return this.platformList();
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

      var ret = [];

      function filterResource(resource) {
        if (_.isString(resource)) {
          resource = { src: resource };
        }

        if (self.filterResource(resource, context)) {
          ret.push(resource);
        }
      }

      plugins.moduleResources(context, function(err, files) {
        if (err) {
          return callback(err);
        }

        var fileFilter = plugins.fileFilter(context) || /.*/;
        fu.fileList(files, fileFilter, function(err, files) {
          if (err) {
            callback(err);
            return;
          }

          async.forEach(files, function(resource, callback) {
            var resourceContext = context.clone();
            resourceContext.resource = resource;
            plugins.resourceList(resourceContext, function(err, resource) {;
              if (resource) {
                resource.forEach(filterResource);
              }
              callback(err, resource);
            });
          },
          function(err) {
            callback(err, ret);
          });
        });
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
