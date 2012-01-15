# Conditional Plugin #

## Introduction ##

This plugin makes it easy to distinguish between a dev and production build in lumbar. It came about after working with locla storage loaders and having to maunally clear local storage every time we
made a change. With this plugin we choose between two different files for lumbar loader, the localstorage and standard versions. In our lumbar.json configuration we have two entries like this

``` javascript
{"src":"lumber-loader-localstorage.js", "env":"production"},
{"src":"lumber-loader-storage.js", "env":"dev"}
```

## Example ##

We then call lumbar with the --use command line argument like this

``` bash
./lumbar --use ../lib/plugins/conditional --with {env:\'dev\'}
```

Note that the single quotes had to be escaped on the bash command line or else they would have been dropped which would give an error.
