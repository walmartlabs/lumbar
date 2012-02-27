var nib = require('nib'),
    path = require('path'),
    stylus = require('stylus'),
    stylusImages = require('stylus-images');

process.on('message', function(msg) {
  var files = msg.files,
      lookupPath = msg.lookupPath,
      minimize = msg.minimize,
      outdir = msg.outdir,
      currentPlatform = msg.platform,
      platforms = msg.platforms,
      styleConfig = msg.styleConfig,
      styleRoot = msg.styleRoot,

      includes = styleConfig.includes || [],
      pixelDensity = msg.pixelDensity;

  includes = includes.concat(files);

  var options = { _imports: [] };

  var compiler = stylus(includes.map(function(include) { return '@import ("' + include + '")\n'; }).join(''), options)
    .set('filename', files.join(';'))
    .set('compress', minimize)
    .include(nib.path)
    .include(lookupPath)
    .use(nib)
    .use(stylusImages({
      outdir: outdir,
      res: pixelDensity,
      limit: styleConfig.urlSizeLimit,
      copyFiles: styleConfig.copyFiles
    }));

  if (styleRoot) {
    compiler.include(styleRoot);
  }

  platforms.forEach(function(platform) {
    compiler.define('$' + platform, platform === currentPlatform ? stylus.nodes.true : stylus.nodes.false);
  });

  try {
    compiler.render(function(err, data) {
      var inputs = compiler.options._imports
              .map(function(file) { return file.path; })
              // Filter out nib files from any watch as these are known and not likely to change
              .filter(function(file) { return file.indexOf('/nib/') === -1 && file.indexOf('\\nib\\') === -1; });
      process.send({
        err: err,
        data: {
          data: data,
          inputs: inputs,
          noSeparator: true
        }
      });
    });
  } catch (err) {
    process.send({ err: err });
  }
});
