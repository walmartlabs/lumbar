var fs = require('fs');

function loadConfig(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}
exports.init = function(configFile, outdir) {
    var config = loadConfig(configFile),
        moduleList = [];

    for (var name in config.modules) {
        moduleList.push(name);
    }

    return {
        build: function(moduleName, callback) {
        },
        watch: function(moduleName, callback) {
        }
    };
};
