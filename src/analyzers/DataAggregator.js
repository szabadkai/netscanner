import Device from '../models/Device.js';

export default class DataAggregator {
  constructor({ manufacturerResolver, osDetector, usageInferrer } = {}) {
    this.devices = new Map();
    this.manufacturerResolver = manufacturerResolver;
    this.osDetector = osDetector;
    this.usageInferrer = usageInferrer;
  }

  upsert(partialDevice, metadata = {}) {
    const key = partialDevice.mac || partialDevice.ip;
    if (!key) {
      return null;
    }

    const existing = this.devices.get(key) || new Device();
    existing.updateFrom(partialDevice);

    if (metadata.source) {
      existing.sources.add(metadata.source);
    }

    if (!existing.manufacturer && this.manufacturerResolver) {
      existing.manufacturer = this.manufacturerResolver.lookup(existing.mac);
    }

    if (!existing.os && this.osDetector) {
      existing.os = this.osDetector.detect(partialDevice);
    }

    if (!existing.usage && this.usageInferrer) {
      existing.usage = this.usageInferrer.infer(partialDevice);
    }

    this.devices.set(key, existing);
    return existing;
  }

  all() {
    return Array.from(this.devices.values());
  }
}
