export default class OsDetector {
  detect(data = {}) {
    if (!data) return null;

    const hints = [data.os, data.serviceOsHint, data.ttl];

    if (data.ttl) {
      const ttl = Number(data.ttl);
      if (ttl >= 60 && ttl <= 70) {
        hints.push('Linux');
      } else if (ttl >= 120 && ttl <= 130) {
        hints.push('Windows');
      }
    }

    const resolved = hints.find(Boolean);
    return resolved || null;
  }
}
