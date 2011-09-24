var templateUtil = require('../templateUtil');

module.exports = function(context, next) {
  var resource = context.resource;

  if (resource.router) {
    var routerGen = function(callback) {
      templateUtil.loadRouter(resource.router, resource.routes, callback);
    };
    routerGen.sourceFile = resource.router;
    return routerGen;
  }

  return next();
};
