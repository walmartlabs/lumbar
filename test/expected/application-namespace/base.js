var Lumbar;
Lumbar = (function() {
var module = {exports: {}};
var exports = module.exports;
var allYour = true;

exports.belongToUs = function() {
};
;;
/* handsfree : templates/home.handlebars*/
module.exports.templates['templates/home.handlebars'] = Handlebars.compile('home\n');
/* lumbar module map */
module.exports.moduleMap({"modules":{"loader":{"js":"loader.js"},"home":{"js":"home.js"}},"routes":{"home":"home"},"base":{"js":"base.js"}});
module.exports.config = {"dev": true}
;
return module.exports;
}).call(this);
