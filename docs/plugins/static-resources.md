# Static Resources Plugin #

## Introduction ##

Static resource management plug-in.  Each module can have a "static" attribute which is an array of
resources to be copied from the application path to the build root (or platform root).  Each static
entry can be a simple string or a hash containing

* src: the source location (specific file or directory for recursive copy)
* dest: the destination location.  Initial '/' indicates use of build path and otherwise, will be platform path.
* platform: a single platform to execute the copy (optional and mutually exclusive with platforms)
* platforms: an array of platforms to execute the copy (optional and mutually exclusive with platform)

## Example ##

``` javascript
"platforms": ["iphone", "android"],
"modules": {
  "foo": {
    "static": [
      // copy {app}/index.html to {build}/iphone/index.html and {build}/android/index.html
      "index.html", 
        
      // copy {app}/index.html to {build/index.html
      "/index.html",
      "/static", // copies recursively {app}/static to {build}/static
        
      // copy {app}/index-iphone.html to {app}/iphone/index.html only for the iphone platform
      {"src": "index-iphone.html", "dest": "index.html", "platform": "iphone"}
        
      // copy recursively {app}/static/iphone to {build}/iphone and {app}/static/android to {build}/android
      // will error if any of the platform directories are missing
      {"src": "static/$platform", "dest": "/$platform"}
    ]
  }
}

```
 
