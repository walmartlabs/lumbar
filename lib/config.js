var _ = require('underscore'),
    async = require('async'),
    fu = require('./fileUtil'),
    path = require('path');

require('./external/json-minify');

/**
 * Reads the RAW JSON for a lumbar config file.
 */
exports.readConfig = function(lumbarFile) {
  var data = fu.readFileSync(lumbarFile);

  return JSON.parse(JSON.minify(data.toString()));
};

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
    if (!config.packages) {
      config.packages = { web: { name: '' } };
    }

    packageList = _.keys(config.packages);
  }
  function loadModuleList() {
    moduleList = _.keys(config.modules);
  }

  fu.lookupPath('');

  var data = fu.readFileSync(lumbarFile);

  config = JSON.parse(JSON.minify(data.toString()));
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

    moduleList: function(pkg) {
      return (config.packages[pkg] || {}).modules || moduleList;
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
    }
  };
};

