const Logger = {
  prefix: '[AVA.AI]',
  log: function(message, ...args) {
    console.log(`${this.prefix} ${message}`, ...args);
  },
  error: function(message, ...args) {
    console.error(`${this.prefix} ${message}`, ...args);
  },
  warn: function(message, ...args) {
    console.warn(`${this.prefix} ${message}`, ...args);
  },
  info: function(message, ...args) {
    console.info(`${this.prefix} ${message}`, ...args);
  },
};

module.exports = Logger; 