# 2.0.0 Beta 2

Changes:

- Separated handlebars processing from template includes

  Handlebar templates may now be included in script array or the template lookup field. Templates
  in the lookup field are no longer required to be handlebars templates.

- Template plugin now supports pattern matching includes.

  Example mapping for thorax template structure:
  ```javascript
    "templates": {
      "auto-include": {
        "js/views/(.*)\\.(?:js|coffee)": [
          "templates/$1.handlebars",
          "templates/$1-item.handlebars",
          "templates/$1-empty.handlebars"
        ]
      }
    }
  ```

- Local module reference support

  Module variables are now aliased internally meaning that a module with a top level name
  `Application` can access it's exported members by accessing the `Application` object at any point
  in time. Previously initialization logic was only able to access this through the `exports` or
  `module.exports` references.

  Note that for top level objects this is an alias so assigning to this variable will not update the
  external reference. The default template is configured to warn in the event that it detects this
  situation.

# 2.0.0 Beta 1 - Oct 9th 2012

Changes:

- Mixin support

- Breaking: Stylus useNib flag

  Updates nib include in stylus to utilize a named attribute. This was necessary to support mixins
  of the nib plugin. Update path for nib users is to remove the `nib` entry from the styles includes
  list and to add a `useNib` attribute to the styles object set to true.

  Old:
  ```javascript
    "styles": { "includes": ["nib"] }
  ```

  New:
  ```javascript
    "styles: { "useNib": true }
  ```

- Scope
  - Possible to define both a scope and template value.

- API Changes
  - config.readConfig utility method

    Helper method that strips out comments and other comments that causes the JSON parse to blow up.
    It's recommended that all interaction with lumbar config files use this helper method.

  - config.create factor method

    Method used for creating a config object from a javascript key-value object rather than directly
    from a file.

  - Moved config.fileList and config.filterResource to static lumbar.build object

  - Created new loadMixin and loadConfig plugin points. Plugins that need to perform mixin-specific
    behavior should implement these methods.
