var fs = require('fs'),
    fu = require('./fileUtil'),
    path = require('path'),
    templateUtil = require('./templateUtil');

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

function templatesListByViewNameFromModuleName(moduleName) {
  var list = {},
    templates = config.templates,
    module = config.modules[moduleName],
    views = module.views || [];

  //add implicit path to views list, and list files in directories 
  if (path.existsSync(exports.viewsPath() + moduleName) && views.indexOf(moduleName) === -1) {
    views.push(moduleName);
  }
  views.forEach(function(view) {
    if (fu.isDirectory(exports.viewsPath() + view)) {
      fu.filesWithExtension(exports.viewsPath() + view, /\.(js|json)/).forEach(function(view) {
        view = view.substring(exports.viewsPath().length, view.length);
        if (views.indexOf(view) === -1) {
          views.push(view);
        }
      });
    }
  });

  //remove directories
  views = views.filter(function(view) {
    return !fu.isDirectory(exports.viewsPath() + view);
  });

  //views array is now built, build template list
  views.forEach(function(view) {
    //add templates specified in config
    list[view] = templates[view] || [];
    
    //add template matching filename if exists
    if (path.existsSync(exports.templatesPath() + view.replace(/\.js$/, '.handlebars'))) {
      var template_to_add = view.replace(/\.js$/, '.handlebars');
      if (list[view].indexOf(template_to_add) === -1) {
        list[view].push(template_to_add);
      }
    } else if (path.existsSync(exports.templatesPath() + view.replace(/\.js$/, '.hb'))) {
      var template_to_add = view.replace(/\.js$/, '.hb');
      if (list[view].indexOf(template_to_add) === -1) {
        list[view].push(template_to_add);
      }
    }

    //add files in implicit directory if exists
    var implicit_teplate_path = exports.templatesPath() + view.replace(/\.js$/, '');
    if (path.existsSync(implicit_teplate_path)) {
      fu.filesWithExtension(implicit_teplate_path, /\.(hb|handlebars)$/).forEach(function(template) {
        var template_to_add = template.substring(exports.templatesPath().length, template.length);
        if (list[view].indexOf(template_to_add) === -1) {
          list[view].push(template_to_add);
        }
      });
    }
    
    //add files matching name-*.handlebars or name_*.handlebars
    var templates_dir = path.dirname(exports.templatesPath() + view.replace(/\.js$/, ''));
    fs.readdirSync(templates_dir).forEach(function(template) {
      var template_name = path.basename(template);
      var tester = new RegExp(path.basename(view.replace(/\.js$/, '')) + '(-|_).+\\.(hb|handlebars)$');
      if (tester.exec(template_name)) {
        var template_to_add = templates_dir.substring(exports.templatesPath().length, templates_dir.length) + '/' + template;
        if (list[view].indexOf(template_to_add) === -1) {
          list[view].push(template_to_add);
        }
      }
    });
  });

  return list;
}

exports.load = function(path) {
  var data = fs.readFileSync(path, 'utf8');

  config = JSON.parse(data);

  loadPackageList();
  loadModuleList();

  if (config.routerTemplate || config.controllerTemplate) {
    templateUtil.setControllerTemplate(config.routerTemplate || config.controllerTemplate);
  }
};

exports.namespace = function() {
  return config.namespace || 'Application';
};

exports.modelsNamespace = function() {
  return config.modelsNamespace || exports.namespace() + '.Models';
};

exports.viewsNamespace = function() {
  return config.viewsNamespace || exports.namespace() + '.Views';
};

exports.collectionsNamespace = function() {
  return config.collectionsNamespace || exports.namespace() + '.Collections';
};

exports.templatesPath = function() {
  return config.templatesPath || 'templates/';
};

exports.viewsPath = function() {
  return config.modelsPat || 'js/views/';
};

exports.modelsPath = function() {
  return config.modelsPath || 'js/models/';
};

exports.collectionsPath = function() {
  return config.collectionsPath || 'js/collections/';
};

exports.routersPath = function() {
  return config.routersPath || 'js/routers/';
};

exports.moduleMap = function() {
  return config.moduleMap || exports.namespace() + '.moduleMap';
};

exports.loadPrefix = function() {
  return config.loadPrefix || '';
};

exports.templateCache = function() {
  return config.templateCache || exports.namespace() + '.templateCache';
};

exports.packageConfig = function() {
  return config.packageConfig || exports.namespace() + '.packageConfig';
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

exports.modules = function() {
  return config.modules;
};

exports.fileList = function(module, platform) {
  var moduleName = module;
  module = config.modules[module];
  var templates = templatesListByViewNameFromModuleName(moduleName),
      ret = [];

  var iterator = function(resource, type) {
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

    if (resource === 'module_map.json') {
      ret.push({ map: true });
    } else if (resource === 'package_config.json') {
      ret.push({ packageConfig: true });
    } else if (type) {
      var value = {};
      //singularize type ({model: value} instead of {models: value})
      value[type.replace(/s$/, '')] = resource;
      ret.push(value);
    } else {
      ret.push(resource);
    }

    if (templates[resource]) {
      templates[resource].forEach(function(template) {
        ret.push({ template: template });
      });
    }
  };

  //support files / module that is only a file list
  var files = module.support || module;
  for (var i = 0, len = files.length; i < len; i++) {
    if(fu.isDirectory(files[i])) {
      fu.filesWithExtension(files[i],/\.(js|json)/).forEach(function(file){
        iterator(file);
      });
    } else {
      iterator(files[i]);
    }
  }

  //views / models / collections
  ['views','models','collections'].forEach(function(type) {
    var files = module[type] ? [].concat(module[type]) : [];
    if (path.existsSync(exports[type + 'Path']() + moduleName) && files.indexOf(moduleName) === -1) {
      files.push(moduleName);
    }
    files.forEach(function(file) {
      if(fu.isDirectory(exports[type + 'Path']() + file)) {
        fu.filesWithExtension(exports[type + 'Path']() + file,/\.(js|json)/).forEach(function(file) {
          iterator(file.substring(exports[type + 'Path']().length, file.length), type);
        });
      } else {
        iterator(file, type);
      }
    });
  });

  // Generate the controller if we have the info for it
  var router = module.router || module.controller;
  if (!router) {
    var test_path = exports.routersPath() + moduleName + '.js';
    if (path.existsSync(test_path)) {
      router = test_path;
    }
  }
  if (router) {
    ret.push({ router: router, routes: module.routes });
  }

  //console.log('========');
  //console.log(ret);
  //console.log('++++++++');

  return ret;
};
