var handlebars = require('handlebars');

const DEFAULT_CONFIG_TEMPLATE = "{{{name}}} = {{{data}}};\n";
var packageConfigTemplate = handlebars.compile(DEFAULT_CONFIG_TEMPLATE);

function loadPackageConfig(name, configFile, fileUtil, callback) {
  if (!configFile) {
    return callback(new Error('package_config.json specified without file being set'));
  }

  fileUtil.readFile(configFile, function(err, data) {
    if (err) {
      callback(new Error('Failed to load package config "' + configFile + '"\n\t' + err));
      return;
    }

    callback(
      undefined,
      packageConfigTemplate({
        name: name,
        data: data
      })
    );
  });
};

module.exports = {
  mode: 'scripts',
  priority: 50,

  resource: function(context, next, complete) {
    var resource = context.resource,
        config = context.config,
        options = context.options;

    if (resource['package-config']) {
      var packageConfigGen = function(context, callback) {
        var packageConfig = config.attributes.packageConfig || 'module.exports.config';
        loadPackageConfig(packageConfig, options.packageConfigFile, context.fileUtil, function(err, data) {
          callback(err, data && {data: data, noSeparator: true});
        });
      };
      packageConfigGen.sourceFile = undefined;
      complete(undefined, packageConfigGen);
    } else {
      next(complete);
    }
  }
};
