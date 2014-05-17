var _ = require('underscore'),
    ALCE = require('alce'),
    fu = require('./fileUtil'),
    path = require('path'),
    vm = require('vm');

/**
 * Reads the RAW JSON for a lumbar config file.
 */
exports.readConfig = function(lumbarFile, returnAlce) {

  try {
    var data = fu.readFileSync(lumbarFile);
    return ALCE.parse(data, {meta: returnAlce});
  } catch (err) {
    throw new Error('Failed to load config ' + lumbarFile + ': ' + err.message);
  }
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
  fu.lookupPath('');

  var config = exports.readConfig(lumbarFile);
  fu.lookupPath(path.dirname(lumbarFile));

  return exports.create(config);
};

exports.create = function(config) {
  var packageList, moduleList;

  function loadPackageList() {
    if (!config.packages) {
      config.packages = { web: { name: '' } };
    }

    packageList = _.keys(config.packages);
  }
  function loadModuleList() {
    if (!config.modules) {
      throw new Error('No modules object defined: ' + JSON.stringify(config, undefined, 2));
    }
    moduleList = _.keys(config.modules);
  }

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
      return (config.packages[pkg] || {}).modules || _.keys(config.modules);
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

    serialize: function() {
      function objectClone(object) {
        var clone = object;

        if (object && object.serialize) {
          // Allow specialized objects to handle themselves
          clone = object.serialize();
        } else if (_.isArray(object)) {
          clone = _.map(object, objectClone);
        } else if (_.isObject(object)) {
          clone = {};
          _.each(object, function(value, name) {
            clone[name] = objectClone(value);
          });
        }

        // Collapse simple resources
        if (clone && clone.src && _.keys(clone).length === 1) {
          clone = clone.src;
        }

        return clone;
      }

      return objectClone(this.attributes);
    }
  };
};

