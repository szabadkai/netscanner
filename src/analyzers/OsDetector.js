export default class OsDetector {
  detect(data = {}) {
    if (!data) return null;

    const hints = [];
    const extra = data.extra || {};
    const services = Array.isArray(data.services) ? data.services : [];

    pushIfString(hints, data.os);
    pushIfString(hints, data.osGuess);
    pushIfString(hints, data.serviceOsHint);

    const nmapExtra = extra.nmap || {};
    pushIfString(hints, nmapExtra.running);
    pushIfString(hints, nmapExtra.osDetails);
    pushIfString(hints, nmapExtra.osGuess);

    const serviceOs = inferOsFromServices(services);
    pushIfString(hints, serviceOs);

    if (Array.isArray(nmapExtra.services)) {
      pushIfString(hints, inferOsFromServices(nmapExtra.services));
    }

    if (data.ttl) {
      const ttl = Number(data.ttl);
      if (ttl >= 60 && ttl <= 70) {
        hints.push('Linux');
      } else if (ttl >= 120 && ttl <= 130) {
        hints.push('Windows');
      } else if (ttl >= 30 && ttl <= 40) {
        hints.push('BSD');
      }
    }

    const resolved = hints.find(Boolean);
    return resolved || null;
  }
}

function pushIfString(list, value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    list.push(value.trim());
  }
}

function inferOsFromServices(services = []) {
  for (const service of services) {
    const version = (service.version || '').toLowerCase();
    const name = (service.service || service.name || '').toLowerCase();

    if (version.includes('windows') || name.includes('msrpc')) {
      return 'Windows';
    }

    if (version.includes('synology') || version.includes('linux') || name.includes('ssh')) {
      return 'Linux';
    }

    if (version.includes('darwin') || version.includes('apple') || name.includes('airplay')) {
      return 'Apple';
    }

    if (name.includes('android') || version.includes('android')) {
      return 'Android';
    }
  }

  return null;
}
