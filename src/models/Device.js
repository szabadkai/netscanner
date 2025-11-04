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
        this.extra = { ...this.extra, ...value };
        return;
      }

      this[key] = value;
    });

    this.lastSeen = new Date();
  }
}
