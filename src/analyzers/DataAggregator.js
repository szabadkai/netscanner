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

    const context = { ...existing, ...partialDevice };

    if (this.manufacturerResolver) {
      const vendor = this.manufacturerResolver.lookup(existing.mac || partialDevice.mac);
      if (vendor) {
        existing.manufacturer = vendor;
      }
    }

    if (this.osDetector) {
      const detectedOs = this.osDetector.detect(context);
      if (detectedOs) {
        existing.os = detectedOs;
      }
    }

    if (this.usageInferrer) {
      const usage = this.usageInferrer.infer(context);
      if (usage) {
        existing.usage = usage;
      }
    }

    this.devices.set(key, existing);
    return existing;
  }

  all() {
    return Array.from(this.devices.values());
  }
}
