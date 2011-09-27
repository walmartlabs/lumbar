var _ = require('underscore'),
    fu = require('./fileUtil'),
    path = require('path');

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

exports.load = function(configFile) {
  fu.lookupPath('');

  var data = fu.readFileSync(configFile);

  config = JSON.parse(data);
  exports.attributes = config;

  fu.lookupPath(path.dirname(configFile));

  loadPackageList();
  loadModuleList();
};

exports.loadPrefix = function() {
  return config.loadPrefix || '';
};

exports.packageList = function() {
  return packageList;
};

exports.combineModules = function(package) {
  return config.packages[package].combine;
};
exports.platformList = function(package) {
  if (!package) {
    return config.platforms || [''];
  } else {
    return config.packages[package].platforms || exports.platformList();
  }
};

exports.moduleList = function(package) {
  return config.packages[package].modules || moduleList;
};

exports.module = function(name) {
  var ret = config.modules[name];
  if (ret) {
    ret.name = name;
  }
  return ret;
};
exports.isAppModule = function(module) {
  var app = config.application;
  return (app && app.module) === (module.name || module);
};
exports.scopedAppModuleName = function(module) {
  var app = config.application;
  if (exports.isAppModule(module)) {
    return 'module.exports';
  } else {
    var app = config.application;
    return app && app.name;
  }
};

exports.routeList = function(module) {
  return config.modules[module].routes;
};

exports.fileList = function(plugins, context) {
  var module = context.module;

  var ret = [],
      files = plugins.moduleResources(context);

  function filterResource(resource) {
    if (_.isString(resource)) {
      resource = { src: resource };
    }

    if (exports.filterResource(resource, context)) {
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
  };

  for (var i = 0, len = files.length; i < len; i++) {
    if(fu.isDirectory(files[i])) {
      fu.filesWithExtension(files[i],/\.(js|json)/).forEach(iterator);
    } else {
      iterator(files[i]);
    }
  }

  return ret;
};
exports.filterResource = function(resource, context) {
  var platform = context.platform;

  if (resource.platform) {
    return resource.platform === platform;
  } else if (resource.platforms) {
    return resource.platforms.reduce(function(found, filePlatform) {
        return found || filePlatform === platform;
      }, false);
  }

  return true;
};
