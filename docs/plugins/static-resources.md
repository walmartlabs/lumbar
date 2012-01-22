# Static Resources Plugin #

## Introduction ##

Static resource management plug-in. Each module can have a "static" attribute which is an array of resources to be copied from the application path to the outputDir (or platformDir). Each static entry can be a simple string or a hash containing.

* src: the source location (specific file or directory for recursive copy).
* dest: the destination location. Initial '/' indicates use of outputDir path, otherwise platformDir path.
* platform: a single platform to execute the copy (optional and mutually exclusive with platforms)
* platforms: an array of platforms to execute the copy (optional and mutually exclusive with platform)


## Example ##

    {
      "platforms": ["iphone", "android"],
      "modules": {
        "foo": {
          "static": [
            // copy {app}/index.html to {outputDir}/iphone/index.html and {outputDir}/android/index.html
            "index.html",

            // copy {app}/index.html to {outputDir/index.html}
            "/index.html",

            // copy recursively {app}/static to {outputDir}/static
            "/static",

            // copy {app}/index-iphone.html to {app}/iphone/index.html only for the iphone platform
            {"src": "index-iphone.html", "dest": "index.html", "platform": "iphone"}

            // copy recursively {app}/static/iphone to {outputDir}/iphone and {app}/static/android to {outputDir}/android
            // will error if any of the platform directories are missing
            {"src": "static/$platform", "dest": "/$platform"}
          ]
       }
    }

## Notes ##

* outputDir is obtained from a command line argument when invoking lumbar.
* platformdir is the {outputDir}/platform

## Questions ##

* When we say the following, the iphone and android are referring to their respective platform names. In the above example, the platforms are iphone and android.

  <pre><code class="javascript">// copy {app}/index.html to {outputDir}/iphone/index.html and {outputDir}/android/index.html</code></pre>

* What if a '/' was put in front of the src? For example

  <pre><code class="javascript">{"src": "/index-iphone.html", "dest": "index.html", "platform": "iphone"}</code></pre>

Would that mean it would get copied to {outputDir}/index.html? Instead of {outputDir}/iphone/index.html on accident?

A: No, it will go {outputDir}/iphone/index.html. Beacuse, if you have an entry that was just a string, then both src and dest are that value. The dest attribute is used to determine platformDir vs ouputDir.

If dest has a / in front of it, it will still output to the platformDir and not the outputDir if a platform is present.

* What does `{src: "static/$platform", dest: "/${platform}"}` do exactly? Will it copy all files from static/iphone to {outputDir}/iphone or {outputDir}/iphone/iphone?

A: It would copy {app}/static/iphone/* to {outputDir}/iphone/* and {app}/static/android to {outputDir}/android

(this is because the initial dest / indicates outputDir but then the platform variable is used)
