import { EventEmitter } from 'events';

// Shared event bus so scanners, analyzers, and UI can communicate.
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }
}

const eventBus = new EventBus();

export default eventBus;
