import BaseScanner from './BaseScanner.js';
import CommandRunner from '../utils/CommandRunner.js';

export default class ArpScanner extends BaseScanner {
  constructor(options = {}) {
    super('arp', options);
  }

  async start() {
    await super.start();
    const { range } = this.options;

    this.emit('log', { level: 'debug', message: `Starting ARP scan${range ? ` on ${range}` : ''}` });

    try {
      // Basic placeholder: use `arp -a` to inspect cache.
      const { stdout } = await CommandRunner.run('arp', ['-a'], {
        rejectOnError: false
      });

      stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const match = line.match(/\((?<ip>[\d.]+)\) at (?<mac>[0-9a-f:]+)/i);
          if (!match) return;

          const { ip, mac } = match.groups;
          this.emit('result', {
            ip,
            mac,
            hostname: line.split(' ')[0],
            ttl: null,
            source: this.name
          });
        });
    } catch (error) {
      this.emit('error', { source: this.name, error });
    } finally {
      this.emit('done', { source: this.name });
    }
  }
}
