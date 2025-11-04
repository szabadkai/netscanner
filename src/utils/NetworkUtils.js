import os from 'os';
import net from 'net';

export function getLocalInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    if (!entries) continue;

    entries.forEach((iface) => {
      if (iface.family !== 'IPv4' || iface.internal) {
        return;
      }

      results.push({
        name,
        address: iface.address,
        netmask: iface.netmask,
        mac: iface.mac
      });
    });
  }

  return results;
}

export function macToPrefix(macAddress = '') {
  return macAddress
    .toUpperCase()
    .split(':')
    .slice(0, 3)
    .join(':');
}

export function isValidIp(ip) {
  return net.isIP(ip) !== 0;
}
