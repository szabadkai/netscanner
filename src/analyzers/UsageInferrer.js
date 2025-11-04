export default class UsageInferrer {
  infer(data = {}) {
    if (!data) return null;

    const hostname = (data.hostname || '').toLowerCase();
    if (hostname.includes('ap') || hostname.includes('router')) {
      return 'Network Infrastructure';
    }

    if (hostname.includes('printer')) {
      return 'Printer';
    }

    if (hostname.includes('cam')) {
      return 'Camera';
    }

    return null;
  }
}
