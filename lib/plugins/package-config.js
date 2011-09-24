var templateUtil = require('../templateUtil');

module.exports = function(context, next) {
  var resource = context.resource,
      package = context.package,
      config = context.config,
      options = context.options;

  if (resource === 'package_config.json' || resource === 'package-config.json') {
    var packageConfigGen = function(callback) {
      templateUtil.loadPackageConfig(config.packageConfig(), options.packageConfigFile, callback);
    };
    packageConfigGen.sourceFile = 'package_config.json';
    return packageConfigGen;
  }

  return next();
};
