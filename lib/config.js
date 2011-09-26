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

exports.loadPrefix = function() {
  return config.loadPrefix || '';
};
exports.templateCache = function() {
  return config.templateCache;
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

exports.routeList = function(module) {
  return config.modules[module].routes;
};

exports.fileList = function(plugins, context) {
  var module = context.module,
      platform = context.platform;

  var ret = [],
      files = plugins.moduleResources(context);

  function filterResource(resource) {
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

      var original = resource;
      resource = new String(resource.src);
      resource.original = original;
    }

    ret.push(resource);
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
