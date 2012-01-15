# Stylus Plugin #

## Introduction ##

The stylus plugin allows for generation of CSS from [stylus](http://learnboost.github.com/stylus/) input.

In addition to the core stylus features this lumbar plugin

* Defines platform variables to allow conditional stylus generation.
* Allows for generate of pixelDensity targeted stylesheets.
* Manages image dependencies within the build.
* Includes the [nib](http://visionmedia.github.com/nib/) and
    [stylus-images](https://github.com/kpdecker/stylus-images) plugins by default.

## Usage ##

The stylus plugin will compile any resources whose name ends with '.styl' defined on the `styles` object.
It can be configured through a `styles` object located on the root lumbar configuration project.

Within the stylus pages themselves, the platform variables allow for conditional code like

    body
      color $primaryBack if $web

Note that if multiple stylus files are defined for a given module they are all combined into a single
stylus build. As a consequence the stylus variable state will be common across the module.

### Configuration ###

  * `pixelDensity` : Defines the pixel densities, either per-platform as a hash of arrays containing density
      targets or for all platforms as an array containing the density targets, that will be generated. For
      each pixel density a file **name@{density}x.css** will be generated, where **{density}** is the value
      defined in the array. This value is used by stylus-image to select the appropriate source image for
      the `url()` method.
  * `urlSizeLimit` : Maximum size of images that will be inlined as data URIs. Larger images will be left
      as url('path') references.
  * `copyFiles` : Truthy to copy non-inlined source files into a build directory relative to the output
  * `includes` : List of paths that are included in all generated stylus files
  * `styleRoot` : Directory to add to the stylus lookup path. This is relative to the configuration file.

## Example ##

    {
      "platforms": [ "iphone", "web" ],
      "modules": {
        "base": {
          "styles": [
            "styles/base.styl",
            {"src": "styles/iphone.styl", "platform": "iphone"},
            {"src": "styles/web.styl", "platform": "web"}
          ]
        }
      },

      "styles": {
        "pixelDensity": {
          "iphone": [ 1, 2 ]
        },
        "urlSizeLimit": 103,
        "copyFiles": true,
        "styleRoot": "static",
        "includes": [
          "nib",
          "styles/global.styl"
        ]
      }
    }
