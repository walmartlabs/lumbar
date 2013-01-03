var sinon = require('sinon');

sinon.config = {
  injectIntoThis: true,
  injectInto: null,
  properties: ['spy', 'stub', 'mock', 'clock', 'sandbox', 'server', 'requests', 'on'],
  useFakeTimers: [10],
  useFakeServer: true
};

module.exports = exports = function() {
  beforeEach(function() {
    var config = sinon.getConfig(sinon.config);
    config.injectInto = this;
    this.sandbox = sinon.sandbox.create(config);
  });
  afterEach(function() {
    this.clock.tick(1000);
    this.sandbox.verifyAndRestore();
  });
};
