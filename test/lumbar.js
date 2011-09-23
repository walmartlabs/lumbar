var assert = require('assert'),
    fs = require('fs'),
    lumbar = require('../lib/lumbar'),
    wrench = require('wrench');

function runTest(callback) {
  var outdir = '/tmp/lumbar-test-' + Date.now() + Math.random();
  console.log('Creating test directory: ' + outdir);
  fs.mkdirSync(outdir, 0755);

  callback(outdir, function() {
    // Cleanup
    wrench.rmdirSyncRecursive(outdir);
  });
}
