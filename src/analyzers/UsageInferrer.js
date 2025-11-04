export default class UsageInferrer {
  infer(data = {}) {
    if (!data) return null;

    const hostname = (data.hostname || '').toLowerCase();
    const extra = data.extra || {};
    const mdnsServices = Array.isArray(extra.mdns?.services) ? extra.mdns.services : [];
    const nmapServices = Array.isArray(extra.nmap?.services) ? extra.nmap.services : [];
    const combinedServices = []
      .concat(Array.isArray(data.services) ? data.services : [])
      .concat(mdnsServices)
      .concat(nmapServices)
      .filter(Boolean);
    const serviceNames = combinedServices
      .map((service) => (service.name || service.service || '').toLowerCase())
      .filter(Boolean);
    const versionHints = combinedServices
      .map((service) => (service.version || '').toLowerCase())
      .filter(Boolean);

    const deviceType = (data.deviceType || extra.nmap?.deviceType || '').toLowerCase();
    const manufacturer = (data.manufacturer || '').toLowerCase();

    if (hostname.includes('ap') || hostname.includes('router')) {
      return 'Network Infrastructure';
    }

    if (hostname.includes('printer')) {
      return 'Printer';
    }

    if (hostname.includes('cam')) {
      return 'Camera';
    }

    if (deviceType.includes('router') || deviceType.includes('switch')) {
      return 'Network Infrastructure';
    }

    if (deviceType.includes('phone') || hostname.includes('iphone') || hostname.includes('android')) {
      return 'Mobile Device';
    }

    if (deviceType.includes('tablet')) {
      return 'Tablet';
    }

    if (manufacturer.includes('tesla')) {
      return 'Vehicle';
    }

    if (serviceNames.some((name) => name.includes('googlecast') || name.includes('airplay'))) {
      return 'Streaming Device';
    }

    if (serviceNames.some((name) => name.includes('homekit') || name.includes('hap'))) {
      return 'Smart Home Accessory';
    }

    if (serviceNames.some((name) => name.includes('ipp') || name.includes('printer'))) {
      return 'Printer';
    }

    if (serviceNames.some((name) => name.includes('ssh') || name.includes('rdp'))) {
      return 'Workstation';
    }

    if (serviceNames.some((name) => name.includes('smb') || name.includes('afpovertcp'))) {
      return 'File Server';
    }

    if (versionHints.some((hint) => hint.includes('synology'))) {
      return 'Network Storage';
    }

    if (serviceNames.some((name) => name.includes('mqtt') || name.includes('coap'))) {
      return 'IoT Gateway';
    }

    return null;
  }
}
