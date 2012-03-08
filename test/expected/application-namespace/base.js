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
module.exports.moduleMap({"base":{"js":"base.js"},"modules":{"home":{"js":"home.js"},"loader":{"js":"loader.js"}},"routes":{"home":"home"}});
module.exports.config = {"dev": true}
;
return module.exports;
}).call(this);
