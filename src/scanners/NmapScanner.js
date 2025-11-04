import BaseScanner from './BaseScanner.js';
import CommandRunner from '../utils/CommandRunner.js';

export default class NmapScanner extends BaseScanner {
  constructor(options = {}) {
    super('nmap', options);
  }

  async start() {
    await super.start();
    const range = this.options.range || '192.168.1.0/24';

    this.emit('log', { level: 'debug', message: `Starting nmap scan on ${range}` });

    try {
      const args = ['-sn', range];
      const { stdout } = await CommandRunner.run('nmap', args, {
        rejectOnError: false
      });

      const entries = stdout.split('\n\n').map((section) => section.trim()).filter(Boolean);

      entries.forEach((entry) => {
        const lines = entry.split('\n');
        const statusLine = lines.find((line) => line.startsWith('Nmap scan report for'));
        if (!statusLine) return;

        const ipMatch = statusLine.match(/for (.*) \(([\d.]+)\)/);
        const ip = ipMatch ? ipMatch[2] : null;
        const hostname = ipMatch ? ipMatch[1] : null;

        const macLine = lines.find((line) => line.includes('MAC Address'));
        const macMatch = macLine ? macLine.match(/MAC Address: ([0-9A-F:]+)\s+\(([^)]+)\)/i) : null;

        this.emit('result', {
          ip,
          hostname,
          mac: macMatch ? macMatch[1] : null,
          manufacturer: macMatch ? macMatch[2] : null,
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
