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
      const args = this.buildArguments(range);
      const { stdout, stderr, code } = await CommandRunner.run('nmap', args, {
        rejectOnError: false
      });

      if (code !== 0 && !stdout) {
        this.emit('error', { source: this.name, error: new Error(stderr || 'nmap command failed') });
        return;
      }

      const hostBlocks = parseHostBlocks(stdout);
      hostBlocks.forEach((block) => {
        const parsed = parseHostBlock(block);
        if (!parsed || !parsed.ip) {
          return;
        }

        this.emit('result', parsed);
      });
    } catch (error) {
      this.emit('error', { source: this.name, error });
    } finally {
      this.emit('done', { source: this.name });
    }
  }

  buildArguments(range) {
    const versionIntensity = this.options.versionIntensity || '3';
    const args = ['-Pn', '-sV', '--version-intensity', versionIntensity, '-T4'];

    if (this.options.osScan !== false) {
      args.push('-O');
    }

    if (this.options.topPorts) {
      args.push('--top-ports', String(this.options.topPorts));
    }

    if (Array.isArray(this.options.nmapScripts) && this.options.nmapScripts.length > 0) {
      args.push('--script', this.options.nmapScripts.join(','));
    }

    args.push(range);
    return args;
  }
}

function parseHostBlocks(stdout) {
  const lines = stdout.split('\n');
  const blocks = [];
  let current = [];

  lines.forEach((line) => {
    if (line.startsWith('Nmap scan report for')) {
      if (current.length > 0) {
        blocks.push(current);
      }
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
  });

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

function parseHostBlock(lines) {
  if (!lines || lines.length === 0) {
    return null;
  }

  const header = lines[0];
  const { ip, hostname } = parseHeader(header);
  if (!ip) {
    return null;
  }

  const device = {
    ip,
    hostname,
    services: [],
    extra: {
      nmap: {
        raw: lines.join('\n'),
        services: []
      }
    }
  };

  let currentService = null;

  lines.slice(1).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      currentService = null;
      return;
    }

    if (trimmed.startsWith('Host is up')) {
      device.extra.nmap.hostStatus = trimmed;
      return;
    }

    if (trimmed.startsWith('MAC Address:')) {
      const macMatch = trimmed.match(/MAC Address:\s+([0-9A-F:]+)\s+\(([^)]+)\)/i);
      if (macMatch) {
        device.mac = macMatch[1];
        device.manufacturer = macMatch[2];
      }
      return;
    }

    if (trimmed.startsWith('Device type:')) {
      const value = trimmed.replace('Device type:', '').trim();
      device.deviceType = value;
      device.extra.nmap.deviceType = value;
      return;
    }

    if (trimmed.startsWith('Running:')) {
      const value = trimmed.replace('Running:', '').trim();
      device.serviceOsHint = value;
      device.extra.nmap.running = value;
      return;
    }

    if (trimmed.startsWith('OS details:')) {
      const value = trimmed.replace('OS details:', '').trim();
      device.osGuess = value;
      device.extra.nmap.osDetails = value;
      return;
    }

    if (trimmed.startsWith('Aggressive OS guesses:')) {
      const value = trimmed.replace('Aggressive OS guesses:', '').trim();
      device.osGuess = device.osGuess || value;
      device.extra.nmap.osGuess = value;
      return;
    }

    if (trimmed.startsWith('Network Distance:')) {
      device.extra.nmap.networkDistance = trimmed.replace('Network Distance:', '').trim();
      return;
    }

    if (trimmed.startsWith('Service Info:')) {
      device.extra.nmap.serviceInfo = parseServiceInfo(trimmed.replace('Service Info:', '').trim());
      return;
    }

    if (trimmed.startsWith('PORT')) {
      return;
    }

    if (/^\d+\/\w+/.test(trimmed)) {
      currentService = parsePortLine(trimmed);
      if (currentService) {
        device.services.push(currentService);
        device.extra.nmap.services.push(currentService);
      }
      return;
    }

    if (trimmed.startsWith('|') && currentService) {
      const scriptOutput = trimmed.replace(/^\|[_ ]*/, '');
      currentService.scripts = currentService.scripts || [];
      currentService.scripts.push(scriptOutput);
      return;
    }
  });

  if (device.services.length === 0) {
    delete device.services;
  }

  if (device.extra.nmap.services.length === 0) {
    delete device.extra.nmap.services;
  }

  return device;
}

function parseHeader(header) {
  const matchWithHost = header.match(/^Nmap scan report for (.+) \(([\d.]+)\)$/);
  if (matchWithHost) {
    return { hostname: matchWithHost[1], ip: matchWithHost[2] };
  }

  const matchWithoutHost = header.match(/^Nmap scan report for ([\d.]+)$/);
  if (matchWithoutHost) {
    return { hostname: null, ip: matchWithoutHost[1] };
  }

  return { hostname: null, ip: null };
}

function parsePortLine(line) {
  const firstSpace = line.indexOf(' ');
  if (firstSpace === -1) {
    return null;
  }

  const portToken = line.slice(0, firstSpace).trim();
  const rest = line.slice(firstSpace).trim();
  const [state, service, ...versionParts] = rest.split(/\s+/);
  const [portStr, protocol] = portToken.split('/');

  const port = Number(portStr);
  if (Number.isNaN(port)) {
    return null;
  }

  return {
    port,
    protocol,
    state,
    service,
    version: versionParts.join(' ').trim() || null
  };
}

function parseServiceInfo(info) {
  const result = {};
  info
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const [key, value] = segment.split(':').map((chunk) => chunk.trim());
      if (key && value) {
        result[key.toLowerCase()] = value;
      }
    });
  return result;
}
