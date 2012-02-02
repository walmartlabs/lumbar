Lumbar['home'] = (function() {
var module = {exports: {}};
var exports = module.exports;
/* router : home */
module.name = "home";
module.routes = {"home":"home"};
var Home = true;
;;
/* handsfree : templates/home.handlebars*/
Lumbar.templates['templates/home.handlebars'] = Handlebars.compile('home\n');
return module.exports;
}).call(this);
