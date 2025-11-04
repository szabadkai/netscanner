import { spawn } from 'child_process';
import readline from 'readline';
import BaseScanner from './BaseScanner.js';
import { getLocalInterfaces } from '../utils/NetworkUtils.js';

export default class TcpdumpScanner extends BaseScanner {
  constructor(options = {}) {
    super('tcpdump', options);
    this.process = null;
    this.reader = null;
    this.timeoutHandle = null;
    this.completionResolver = null;
    this.completionPromise = null;
  }

  async start() {
    await super.start();

    const iface = this.selectInterface();
    const args = this.buildArgs(iface);
    const captureDuration = this.captureDuration();

    this.emit('log', {
      level: 'debug',
      message: `Starting tcpdump mDNS capture on ${iface}`,
      payload: { args }
    });

    this.completionPromise = new Promise((resolve) => {
      this.completionResolver = resolve;
    });

    try {
      this.launchProcess(args);
    } catch (error) {
      this.emit('error', { source: this.name, error });
      this.finish();
      return this.completionPromise;
    }

    if (captureDuration > 0) {
      this.timeoutHandle = setTimeout(() => {
        this.emit('log', {
          level: 'debug',
          message: `Stopping tcpdump capture after ${captureDuration}ms`
        });
        this.stop();
      }, captureDuration);
    }

    return this.completionPromise;
  }

  buildArgs(iface) {
    return ['-n', '-l', '-i', iface, 'udp', 'port', '5353'];
  }

  captureDuration() {
    if (this.options.passiveCaptureDuration) {
      return this.options.passiveCaptureDuration;
    }

    if (this.options.watch) {
      return this.options.refreshInterval || this.options.timeout || 15000;
    }

    return this.options.timeout || 10000;
  }

  selectInterface() {
    if (this.options.passiveInterface) {
      return this.options.passiveInterface;
    }

    const interfaces = getLocalInterfaces();
    const preferred = interfaces.find((iface) => iface.name && !iface.name.startsWith('lo'));
    return preferred ? preferred.name : 'en0';
  }

  launchProcess(args) {
    this.process = spawn('tcpdump', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.process.on('error', (error) => {
      this.emit('error', { source: this.name, error });
      this.finish();
    });

    this.process.stderr.on('data', (chunk) => {
      const message = chunk.toString().trim();
      if (message) {
        this.emit('log', { level: 'debug', source: this.name, message });
      }
    });

    this.reader = readline.createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    });

    this.reader.on('line', (line) => {
      const parsed = parseMdnsLine(line);
      if (parsed) {
        this.emit('result', parsed);
      }
    });

    this.process.on('close', (code) => {
      this.emit('log', {
        level: 'debug',
        source: this.name,
        message: `tcpdump exited with code ${code}`
      });
      this.finish();
    });
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    if (this.reader) {
      this.reader.removeAllListeners();
      this.reader.close();
      this.reader = null;
    }

    if (this.process && !this.process.killed) {
      this.process.kill('SIGINT');
    }

    await super.stop();

    if (this.completionPromise) {
      await this.completionPromise;
    }
  }

  finish() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    if (this.reader) {
      this.reader.removeAllListeners();
      this.reader.close();
      this.reader = null;
    }

    if (this.process && !this.process.killed) {
      this.process.kill('SIGINT');
    }

    this.process = null;
    this.isRunning = false;
    this.emit('done', { source: this.name });

    if (this.completionResolver) {
      this.completionResolver();
      this.completionResolver = null;
    }
    this.completionPromise = null;
  }
}

const serviceUsageMap = [
  { keyword: 'googlecast', usage: 'Streaming Device' },
  { keyword: 'airplay', usage: 'Streaming Device' },
  { keyword: 'raop', usage: 'Speaker' },
  { keyword: 'homekit', usage: 'Smart Home Accessory' },
  { keyword: 'hap', usage: 'Smart Home Accessory' },
  { keyword: 'ipp', usage: 'Printer' },
  { keyword: 'printer', usage: 'Printer' },
  { keyword: 'ippusb', usage: 'Printer' },
  { keyword: 'workstation', usage: 'Workstation' },
  { keyword: 'smb', usage: 'File Server' },
  { keyword: 'afpovertcp', usage: 'File Server' },
  { keyword: 'ftp', usage: 'File Server' },
  { keyword: 'mqtt', usage: 'IoT Gateway' },
  { keyword: 'meshcop', usage: 'IoT Gateway' },
  { keyword: 'nut', usage: 'UPS' },
  { keyword: 'spark', usage: 'Development Board' },
  { keyword: 'spotify', usage: 'Streaming Device' }
];

function parseMdnsLine(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('._')) {
    return null;
  }

  const ipMatch = trimmed.match(/\bIP\s+([0-9.]+)\.(\d+)\s>\s/);
  if (!ipMatch) {
    return null;
  }

  const ip = ipMatch[1];
  const services = extractServices(trimmed);
  if (services.length === 0) {
    return null;
  }

  const friendlyService = services.find((service) => service.instanceName);
  const usage = inferUsage(services);

  const hostname = friendlyService ? `${friendlyService.instanceName}.local` : null;

  return {
    ip,
    hostname,
    usage,
    extra: {
      mdns: {
        services,
        raw: trimmed,
        lastAnnouncement: new Date().toISOString(),
        friendlyName: friendlyService ? friendlyService.instanceName : null
      }
    }
  };
}

function extractServices(line) {
  const services = [];
  const regex = /([A-Za-z0-9\-\.]+)\._([A-Za-z0-9\-]+)\._(tcp|udp)\.local/gi;
  let match;

  while ((match = regex.exec(line)) !== null) {
    const full = match[0];
    const namePart = match[1];
    const serviceType = match[2];
    const protocol = match[3];

    const instanceName = namePart.includes('._') ? null : namePart.replace(/\.$/, '');
    const serviceName = serviceType.toLowerCase();

    services.push({
      raw: full,
      name: serviceName,
      protocol,
      instanceName,
      service: `_${serviceType}._${protocol}`
    });
  }

  return dedupeServices(services);
}

function dedupeServices(services) {
  const map = new Map();
  services.forEach((service) => {
    const key = `${service.service}:${service.instanceName || ''}`;
    map.set(key, service);
  });
  return Array.from(map.values());
}

function inferUsage(services) {
  const lowerNames = services.map((service) => (service.name || '').toLowerCase());

  for (const service of serviceUsageMap) {
    if (lowerNames.some((name) => name.includes(service.keyword))) {
      return service.usage;
    }
  }

  return null;
}
