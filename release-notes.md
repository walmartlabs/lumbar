# Release Notes

## Development

[Commits](https://github.com/walmartlabs/lumbar/compare/v4.0.1...master)

## v4.0.1 - June 9th, 2014
- Remap base module when using localPath module map - 5ecab63

[Commits](https://github.com/walmartlabs/lumbar/compare/v4.0.0...v4.0.1)

## v4.0.0 - June 9th, 2014
- Include loadPrefix with Lumbar.moduleMap output - a91b944
- Expose stripPrefix from module map plugin - ce12685
- Flatten module map for projects without platform - 4ae6bb2

Compatibility notes:
- Lumbar.moduleMap output has changed to have both dynamic depth and optional path handling via the `localPath` flag. Consumers should now iterate the structure looking for `isMap` and pass the desired `localPath` flag for their needs.

[Commits](https://github.com/walmartlabs/lumbar/compare/v3.2.0...v4.0.0)

## v3.2.0 - May 17th, 2014
- [#101](https://github.com/walmartlabs/lumbar/issues/101) - Create simple config API ([@kpdecker](https://api.github.com/users/kpdecker))
- Drop travis testing for node 0.8 - 45def31

[Commits](https://github.com/walmartlabs/lumbar/compare/v3.1.5...v3.2.0)

## v3.1.5 - May 17th, 2014
- Provide better default for background attribute - 97ab1e0

[Commits](https://github.com/walmartlabs/lumbar/compare/v3.1.4...v3.1.5)

## v3.1.4 - May 12th, 2014
- Pin cheerio to 0.15.x to avoid cheerio#460 - d1b7315

[Commits](https://github.com/walmartlabs/lumbar/compare/v3.1.3...v3.1.4)

## v3.1.3 - April 12th, 2014
- Do not minimized server builds - 92ee4ad
- Remove unused imports - db0bcdb

[Commits](https://github.com/walmartlabs/lumbar/compare/v3.1.2...v3.1.3)

## v3.1.2 - April 8th, 2014
- Fix update externals under latest cheerio - e2b56e4
- minor typo - 2065220

[Commits](https://github.com/walmartlabs/lumbar/compare/v3.1.1...v3.1.2)

## v3.1.1 - April 1st, 2014
- [#121](https://github.com/walmartlabs/lumbar/pull/121) path separator on windows in handlebar templates with libraries [(@DatenMetzgerX)](https://github.com/DatenMetzgerX)
- Only insert 1 loaderPrefix script - 1e971ec

[Commits](https://github.com/walmartlabs/lumbar/compare/v3.1.0...v3.1.1)

## v3.1.0 - February 10th, 2014
- Allow specific route callbacks in module map - 41e9e60
- Add serverRender flag to moduleMap output - 5e4ba01
- Allow mixin of handlebars server options - ba2da0c

[Commits](https://github.com/walmartlabs/lumbar/compare/v3.0.0...v3.1.0)

## v3.0.0 - February 10th, 2014
- [#119](https://github.com/walmartlabs/lumbar/pull/119) - Fix nib version to 1.0.2 ([@Candid](https://api.github.com/users/Candid))
- Update npm dependencies - f2b535a

Compatibility notes:
- Handlebars has been updated to use the 2.x codeline

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.6.2...v3.0.0)

## v2.6.2 - December 31st, 2013
- Fix externals handling under Cheerio 0.13.0 - c2c727a

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.6.1...v2.6.2)

## v2.6.1 - December 24th, 2013
- Use lumbar exit code in grunt task finalizer - aefe633
- Inherit IO for lumbar exec - 19588a9
- Fix lumbar grunt task parameter handling - ac3c35b

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.6.0...v2.6.1)

## v2.6.0 - December 17th, 2013
- [#117](https://github.com/walmartlabs/lumbar/pull/117) - Expose module map to external sources ([@kpdecker](https://api.github.com/users/kpdecker))
- Relax version dependencies - 6725d91

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.5.2...v2.6.0)

## v2.5.2 - December 13th, 2013

- [#116](https://github.com/walmartlabs/lumbar/pull/116) - Update stylus to 0.41.2 ([@Candid](https://api.github.com/users/Candid))
- Only pass config source path to stylus-config - 6c5994c

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.5.1...v2.5.2)

## v2.5.1 - December 13th, 2013

- [#115](https://github.com/walmartlabs/lumbar/pull/115) - 2 phase build ([@kpdecker](https://api.github.com/users/kpdecker))
- [#110](https://github.com/walmartlabs/lumbar/pull/110) - Fix lumbar:watch command for win32 environment. ([@redrathnure](https://api.github.com/users/redrathnure))

- Handle missing keys on clone - 2fa471c

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.5.0...v2.5.1)

## v2.5.0 - December 5th, 2013

- [#114](https://github.com/walmartlabs/lumbar/pull/114) - Extend and improve grunt task ([@patrickkettner](https://api.github.com/users/patrickkettner))
- [#113](https://github.com/walmartlabs/lumbar/pull/113) - nib -> ~1.0.1, stylus -> 0.41.0 ([@Candid](https://api.github.com/users/Candid))
- [#111](https://github.com/walmartlabs/lumbar/pull/111) - Update grunt example documentation ([@patrickkettner](https://api.github.com/users/patrickkettner))
- Update Handlebars to 1.1 versions
- Update other npm dependencies

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.4.1...v2.5.0)

## v2.4.1 - November 6th, 2013

- Fix server script filtering when disabled - e006531

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.4.0...v2.4.1)

## v2.4.0 - November 6th, 2013

- Always load server-scripts plugin - a030c0e

Compatibility notes:
- The server-scripts plugin is now loaded by default. Any plugins that might have used the `server` key on resources will want to migrate to alternatives or instruct their users to disable this plugin.

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.3.4...v2.4.0)

## v2.3.4 - October 20th, 2013

- Fixup server script errors - f59aa40
- fix bad link for thorax seed/example repo - 6e4b301
- fix several minor spelling typos - 990002f

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.3.3...v2.3.4)

## v2.3.3 - September 11th, 2013

- [#107](https://github.com/walmartlabs/lumbar/issues/107) - Overrides do not nest properly ([@kpdecker](https://api.github.com/users/kpdecker)

- Remove path.relative fork - ad98c29
- Cleanup loadResource error message - a3e4ad2
- Fix callback on missing static file - 12eb8e5
- Always define a module name - 6b7dcd2
- Include additional info for scope order error - cce73f2

[Commits](https://github.com/walmartlabs/lumbar/compare/v2.3.2...v2.3.3)

## 2.3.2 - Aug 8th 2013

- Fixed map error under node 0.10

## 2.3.1 - Aug 8th 2013

- Fixed stylus includes when overriding files in nested mixins

## 2.3.0 - Aug 7th 2013

- Update stylus to 0.36.1
- Fixed root handling when overriding files in nested mixins
- Fixed naming of overriden handlebars templates
- Removed `Library.resolvePath`.

  `Library.mapFile` should be used instead

## 2.2.7 - Aug 5th 2013

- Fix mixin attribute propagation

## 2.2.6 - July 26th 2013

- Ensure that all mixins are iterated over when adding to module
- Update uglify to 2.3

## 2.2.5 - July 15th 2013

- `config` method has been removed

  This has been replaced with the `config(config)` event which is emitted on the lumbar event instance after any changes to the config.

- Fixed error seen when mixins with child mixins where incorrectly included multiple times.

- Refactor state machine and utils

## 2.2.4 - June 14th 2013

- Fix error with ./ mixin in stylus

## 2.2.3 - June 14th 2013

- Remove duplicate library declarations

## 2.2.2 - June 13th 2013

- Allow library loading on CLI via `--library=name`
- Allow CLI output named build or watch without requiring path components
- Allow library specification in template lookup

Compatibility Notes:

- If multiple watch or build commands are specified on the CLI the action will no longer be the last action specified. This could lead to unexpected behavior for improperly formed CLI commands.

## 2.2.1 - June 11th 2013

- Hack around bower config issue when passing config files on CLI

## 2.2.0 - June 11th 2013

- Add bower namespace support through the `bower` resource attribute.

  Resources can no reference specific bower packages by name without needing to know where the bower path is.

- Automatically load lumbar libraries that are in the bower components directory.

- Use global config for template auto include

- Update to Handlebars 1.0.12 / 1.0.0

- Update minimum node version to 0.8

## 2.1.1 - June 4th 2013

- Update stylus-images dependency

## 2.1.0 - May 14th 2013

- Lock down code generating library versions

- #77 - Fix watch tracking if initial build fails

- Allow server mode handlebars options

- #88 - Implement global workers limit

- Allow mixins to specify handlebars known helpers.

  This moves the known helpers declaration from `templates.precompile.knownHelpers` to `template.knownHelpers`. The older path is still available but does not support mixins.

## 2.0.0 - May 8th 2013

- Fix template linking for library modules
- Output templates prior to their referencing file
- Use `library` rather than `container` for fully qualified mixin lookup
- Allow plugins in Grunt task (@stehag)
- Add verbose logging options
- Rename root mixins to libraries.

    Library import declarations have been changed from `mixins` to `libraries` and are otherwise identical. Likewise, resource library references have been changed from `mixin` to `library`.

## 2.0.0 Beta 21 - Apr 3rd 2013

- Allow uglify config via `uglify` project config option.

## 2.0.0 Beta 20 - Mar 22nd 2013

- Implement server-scripts plugin

## 2.0.0 Beta 19 - Mar 12th 2013

- Fix stylus execution outside of the lumbar directory
- Add overrides false flag to prevent output of particular resources from mixins

## 2.0.0 Beta 17 - Feb 21st 2013

- Added `lumbar` grunt task

## 2.0.0 Beta 15 - Feb 5th 2013

Changes:

- Break stylus execution into worker processes

    This change dropped build times across the board, with a large build that was taking 20 seconds
    dropping to 7 seconds. This breaks existing stylus plugins who must now be defined in worker
    files which may then be required into the worker process. Ex:

```
            resource.plugins.push({
              plugin: __dirname + '/stylus-config-worker',
              data: config
            });
```

- Support source map output to alternate locations

## 2.0.0 Beta 14 - Jan 9th 2013

Changes:

- Fix bug while watching template files.

## 2.0.0 Beta 13 - Jan 8th 2013

Changes:

- Cleanup override handling in stylus templates
- Allow template hash references to pull from specific mixins
- Fix stylus mixin compilation under combined compile
- Allow for nested mixin definition

## 2.0.0 Beta 12 - Jan 7th 2013

Changes:

- Add `depends` field to module map for lumbar loader module dependencies
- Fix source map comment output
- Source map parsing performance improvements
- Run uglify in parallel worker process(es)

    Dramatically decreased processing time for large projects on multi-core machines.

## 2.0.0 Beta 10 - Jan 2nd 2013

Changes:

- Fix handling of styleRoot in mixins.

## 2.0.0 Beta 10 - Dec 26th 2012

Changes:

- Added support for source maps

- Update mixin handling for namespaces

  This allows different mixins to define mixins with the same name. Consumers can differentiate
  between the mixins via the `library` attribute on the mixin reference. i.e.

  ```
  "mixins": [
    {"name": "test", "library": "phoenix-build"}
  ]
  ```

  All mixin projects must now define a name field so they may be referenced in this manner.

- Fix incorrect configuration load when using watch mode.
- Fix watch cleanup on file removal.

## 2.0.0 Beta 9 - Dec 21st 2012

Changes:

- Filter duplicate files in the same module

  This behavior may be disabled on the resource level via the `"duplicate": true`
  attribute or at the application level with the `"filterDuplicates": false` top level
  attribute.

- Files added through pattern mapping and auto-includes no longer require a config
  change to watch for changes.

- Allow for disabling of all alliases with `"aliases": false`

- Fix CoffeeScript plugin (@jasonwebster)

## 2.0.0 Beta 8 - Dec 16th 2012

Changes:

- Implement source warning framework

- Update to Uglify 2.2

  NPM will refuse to install this under 0.8 and lower due to an upstream dependency so this is
  now optional.

- Fix filtering of generated resources

## 2.0.0 Beta 7 - Dec 11th 2012

Changes:

- Add support for mixin file references via. mixin resource attribute.

    {"src": "lumbar-loader-backbone.js", "mixin": "lumbar-loader"},

  Mixins must define a name value in the mixin config file to utilize this feature.

- Fix template auto-include in mixin contexts

- Fix execution error in coffeescript plugin (needs unit tests)

## 2.0.0 Beta 6 - Dec 4th 2012

Changes:

- Add `template.root` property for template prefix stripping.

- Removed precompiled template template.

  Moving forward template templates should use `{{handlebarsCall}}` to differentiate between
  precompiled and client compiled mode.

## 2.0.0 Beta 5 - Nov 25th 2012

Changes:

- Watch support for mixin config. Changes to mixin config files will now rebuild the project
  when in watch mode.

- Allow file config independent rebuilds

  Adds isPrimary flag to the file config. When true this will rebuild all
  configs for a given mode. When false will ignore changes to the inputs
  when undefined will continue the default behavior of separate rebuilds.

- Optimize stylus builds when using multiple pixel densities.

  This saves about 50% of the developer build time for mobile.walmart.com.

- stylus-config plugin for sharing variables between stylus and javascript

- Allow lumbar plugins to interact with the stylus compiler at runtime

  Allows plugins to register callbacks on the stylus generator using the `plugins` field. This
  mechanism allows additional plugins and source modifications on stylus compilation steps. The
  stylus-config plugin provides an example of this API's usage.

- Optimize plugin execution loop

  The plugin executor now enforces async execution of async callbacks. This may break plugins that
  incorrectly took advantage of non-contract synchronous behavior in the app.

- Switch to cheerio for update-externals parsing

- Improve various error messages

- Watch package config files for changes

- CLI: Allow multiple --module parameters


## 2.0.0 Beta 4 - Nov 5th 2012

Changes:

- Allow specific modules to disable particular aliases.


## 2.0.0 Beta 3 - Oct 25th 2012

Changes:

- Improves EMFILE error handling.

- Watch unit test library updates


## 2.0.0 Beta 2 - Oct 23rd 2012

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

- Scope aliases

  It's now possible to define aliases globally via the scope.alias config object and locally by
  defining the alias object on specific modules. These alias will create local variable references
  to any javascript statement, allowing for minimization of frequently used references.

  Example global aliases:
  ```javascript
    "scope": {
      "aliases": {
        "View": "Application.View",
        "Application": "Application"
      }
    }
  ```

- Allow filtering of resources via not structures, i.e. `"platform": {"not": "web"}` and
  `"packages": {"not": ["foo", "bar"]}`.

- Allow filtering of resources based on combined module or not via the `combined` attribute.
  Undefined for all modes, true for combined mode only, false for non-combined only.

- Significant rework of tests to focus more on unit testing with better edge case coverage

- Fixed mixin modules implementation. Properly links to mixin files. Mixin modules may now be
  applied as mixins to other modules, have their own mixins, and be suppressed via false module
  value.

## 2.0.0 Beta 1 - Oct 9th 2012

Changes:

- Mixin support

- Stylus useNib flag

  UPDATE: As of beta 2 this is no longer a breaking change. Includes referencing nib directly will
  have this flag applied.

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
