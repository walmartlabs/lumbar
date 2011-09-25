var fu = require('./fileUtil'),
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

exports.moduleMap = function() {
  return config.moduleMap;
};
exports.loadPrefix = function() {
  return config.loadPrefix || '';
};
exports.templateCache = function() {
  return config.templateCache;
};
exports.packageConfig = function() {
  return config.packageConfig;
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

exports.routeList = function(module) {
  return config.modules[module].routes;
};

exports.fileList = function(plugins, module, platform) {
  module = config.modules[module];

  var views = config.templates || config.views,
      ret = [],

      files = plugins.moduleResources({module: module, config: config}) || module;

  var iterator = function(resource) {
    if (resource.src) {
      var found;
      if (resource.platform) {
        found = resource.platform === platform;
      } else if (resource.platforms) {
        resource.platforms.forEach(function(filePlatform) {
          found = found || filePlatform === platform;
        });
      } else {
        found = true;
      }

      // If we didnt find a match of some sort then ignore
      if (!found) {
        return;
      }

      resource = resource.src;
    }

    ret.push(resource);

    if (views && views[resource]) {
      views[resource].forEach(function(template) {
        ret.push({ template: template });
      });
    }
  };

  for (var i = 0, len = files.length; i < len; i++) {
    if(fu.isDirectory(files[i])) {
      fu.filesWithExtension(files[i],/\.(js|json)/).forEach(iterator);
    } else {
      iterator(files[i]);
    }
  }

  // Generate the router if we have the info for it
  if (module.router || module.controller) {
    ret.push({ router: module.router || module.controller, routes: module.routes });
  }

  return ret;
};
