var Mocha = require('mocha'),
    chai = require("chai"),
    sinonChai = require("sinon-chai");

// If we are run by global mocha, sniff for that case.
process.mainModule.children.forEach(function(child) {
  if (/mocha[\/\\]index.js/.test(child.filename)) {
    Mocha = child.exports;
  }
});

global.should = chai.should();
chai.use(sinonChai);

var sinon = require('sinon');

sinon.config = {
  injectIntoThis: true,
  injectInto: null,
  properties: ['spy', 'stub', 'mock', 'sandbox'],
  useFakeTimers: false,
  useFakeServer: false
};

var loadFiles = Mocha.prototype.loadFiles;
Mocha.prototype.loadFiles = function() {
  this.suite.beforeEach(function() {
    var config = sinon.getConfig(sinon.config);
    config.injectInto = this;
    this.sandbox = sinon.sandbox.create(config);
  });
  this.suite.afterEach(function() {
    this.sandbox.verifyAndRestore();
  });

  return loadFiles.apply(this);
};

