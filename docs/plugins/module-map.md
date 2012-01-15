# Module Map Plugin #

## Introduction ##

This plugin will write the lumbar module mapping code used to load modules in a
meaningful way.  The easiest way to use the module loader is with a backbone
application however it is possible to create a custom module loader.

To output the module mapping javascript code in your project, you need to add a
resource reference in the `files` data.  This reference should be in the base
module after the `lumbar-loader.js` reference but before an loader implementation
references.  See [lumbar-loader](https://github.com/walmartlabs/lumbar-loader) for more details.

## Example ##

This example is from the [sample todos app](https://github.com/walmartlabs/thorax-todos)

    "modules": {
      "base": [
        ...
        {"src": "lib/backbone.js", "global": true},
        {"src": "lib/thorax.js", "global": true},
        {"src": "lib/lumbar-loader.js"},
        {"module-map": true},
        {"src": "lib/lumbar-loader-standard.js"},
        {"src": "lib/lumbar-loader-backbone.js"},
        ...
      ],

The code produced from the module map with the [sample todos app lumbar file](https://github.com/walmartlabs/thorax-todos/blob/master/lumbar.json)

    module.exports.moduleMap({"modules":{"todo":{"js":"todo.js"}},"routes":{"":"todo","todo":"todo"},"base":{"js":"base.js"}}, './');

