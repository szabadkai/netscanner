import BaseScanner from './BaseScanner.js';

export default class TcpdumpScanner extends BaseScanner {
  constructor(options = {}) {
    super('tcpdump', options);
    this.interval = null;
  }

  async start() {
    await super.start();
    this.emit('log', { level: 'debug', message: 'Starting passive tcpdump listener (stub)' });

    // Placeholder: emit heartbeat updates while we work on full implementation.
    let counter = 0;
    this.interval = setInterval(() => {
      if (!this.isRunning) return;

      counter += 1;
      this.emit('heartbeat', { source: this.name, packets: counter });

      if (counter >= 3) {
        clearInterval(this.interval);
        this.emit('done', { source: this.name });
      }
    }, 2000);
  }

  async stop() {
    await super.stop();
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
