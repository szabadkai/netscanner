import { EventEmitter } from 'events';

export default class BaseScanner extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.options = options;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
  }

  async stop() {
    this.isRunning = false;
  }
}
