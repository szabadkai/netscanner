const { EventEmitter } = require('events');

// Shared event bus so scanners, analyzers, and UI can communicate.
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }
}

module.exports = new EventBus();
