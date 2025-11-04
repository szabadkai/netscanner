export default class Device {
  constructor(data = {}) {
    this.ip = data.ip || null;
    this.mac = data.mac || null;
    this.hostname = data.hostname || null;
    this.os = data.os || null;
    this.manufacturer = data.manufacturer || null;
    this.model = data.model || null;
    this.usage = data.usage || null;
    this.lastSeen = data.lastSeen || new Date();
    this.sources = new Set(data.sources || []);
    this.services = Array.isArray(data.services) ? [...data.services] : [];
    this.extra = data.extra || {};
  }

  updateFrom(partial = {}) {
    Object.entries(partial).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (key === 'sources' && Array.isArray(value)) {
        value.forEach((source) => this.sources.add(source));
        return;
      }

      if (key === 'extra') {
        this.extra = mergeExtras(this.extra, value);
        return;
      }

      if (key === 'services' && Array.isArray(value)) {
        this.services = mergeServices(this.services, value);
        return;
      }

      this[key] = value;
    });

    this.lastSeen = new Date();
  }
}

function mergeServices(existing = [], incoming = []) {
  const map = new Map();

  existing.forEach((service) => {
    if (!service || (!service.port && !service.service)) return;
    map.set(createServiceKey(service), { ...service });
  });

  incoming.forEach((service) => {
    if (!service || (!service.port && !service.service)) return;
    const key = createServiceKey(service);
    const current = map.get(key) || {};
    map.set(key, { ...current, ...service, lastSeen: new Date() });
  });

  return Array.from(map.values());
}

function createServiceKey(service) {
  if (service.port) {
    const proto = service.protocol || '';
    return `${service.port}/${proto}`;
  }

  return service.service || JSON.stringify(service);
}

function mergeExtras(existing = {}, incoming = {}) {
  const result = { ...existing, ...incoming };

  if (existing.nmap || incoming.nmap) {
    const current = existing.nmap || {};
    const next = incoming.nmap || {};
    result.nmap = { ...current, ...next };
    if (Array.isArray(current.services) || Array.isArray(next.services)) {
      result.nmap.services = mergeServices(
        Array.isArray(current.services) ? current.services : [],
        Array.isArray(next.services) ? next.services : []
      );
    }
  }

  if (existing.mdns || incoming.mdns) {
    const current = existing.mdns || {};
    const next = incoming.mdns || {};
    result.mdns = { ...current, ...next };
    if (Array.isArray(current.services) || Array.isArray(next.services)) {
      result.mdns.services = mergeMdnsServices(
        Array.isArray(current.services) ? current.services : [],
        Array.isArray(next.services) ? next.services : []
      );
    }
  }

  return result;
}

function mergeMdnsServices(existing = [], incoming = []) {
  const map = new Map();

  const add = (service) => {
    if (!service) return;
    const key = `${service.service || service.name || ''}:${service.instanceName || ''}`;
    const current = map.get(key) || {};
    map.set(key, { ...current, ...service, lastSeen: new Date() });
  };

  existing.forEach(add);
  incoming.forEach(add);

  return Array.from(map.values());
}
