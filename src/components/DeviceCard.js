import { createElement } from 'react';
import { Box, Text } from 'ink';

const formatField = (label, value) => {
  const display =
    value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)
      ? value
      : 'unknown';

  return createElement(
    Text,
    null,
    createElement(Text, { color: 'cyan' }, `${label}: `),
    createElement(Text, null, display)
  );
};

const DeviceCard = ({ device, showDetails }) => {
  if (!device) {
    return createElement(
      Box,
      { borderStyle: 'round', borderColor: 'gray', paddingX: 1, paddingY: 0, marginTop: 1 },
      createElement(Text, { color: 'gray' }, 'Select a device to see details.')
    );
  }

  const sources = Array.isArray(device.sources) ? device.sources : Array.from(device.sources || []);
  const extra = device.extra || {};
  const nmapExtra = extra.nmap || {};
  const mdnsExtra = extra.mdns || {};
  const serviceList = Array.isArray(device.services) ? device.services : [];
  const mdnsServices = Array.isArray(mdnsExtra.services) ? mdnsExtra.services : [];
  const deviceType = device.deviceType || nmapExtra.deviceType;
  const osGuess = device.osGuess || nmapExtra.osDetails || nmapExtra.osGuess || nmapExtra.running;
  const summary = [
    formatField('IP', device.ip),
    formatField('Hostname', device.hostname),
    formatField('Manufacturer', device.manufacturer),
    formatField('Usage', device.usage),
    formatField('mDNS Name', mdnsExtra.friendlyName)
  ];

  if (!showDetails) {
    return createElement(
      Box,
      {
        borderStyle: 'round',
        borderColor: 'magenta',
        paddingX: 1,
        paddingY: 0,
        marginTop: 1,
        flexDirection: 'column'
      },
      createElement(Text, { color: 'magentaBright' }, 'Device Summary'),
      ...summary,
      createElement(Text, { color: 'gray' }, 'Press Enter to view detailed device information.')
    );
  }

  const detailChildren = [
    createElement(Text, { color: 'magentaBright' }, 'Device Details'),
    formatField('IP', device.ip),
    formatField('MAC', device.mac),
    formatField('Hostname', device.hostname),
    formatField('Device Type', deviceType),
    formatField('OS', device.os),
    formatField('OS Guess', osGuess),
    formatField('Manufacturer', device.manufacturer),
    formatField('Model', device.model),
    formatField('Usage', device.usage),
    formatField('mDNS Name', mdnsExtra.friendlyName),
    formatField('Sources', sources.length > 0 ? sources.join(', ') : null),
    formatField('Last Seen', device.lastSeen ? new Date(device.lastSeen).toLocaleString() : null),
    renderServiceField('Open Services', serviceList),
    renderMdnsField('mDNS Services', mdnsServices),
    renderServiceInfo(nmapExtra.serviceInfo),
    nmapExtra.networkDistance ? formatField('Network Distance', nmapExtra.networkDistance) : null
  ].filter(Boolean);

  return createElement(
    Box,
    { borderStyle: 'round', borderColor: 'magenta', paddingX: 1, paddingY: 0, marginTop: 1, flexDirection: 'column' },
    ...detailChildren
  );
};

export default DeviceCard;

function renderServiceField(label, services = []) {
  if (!services.length) {
    return null;
  }

  const formatted = services
    .slice(0, 6)
    .map((service) => {
      const parts = [];
      if (service.port) {
        parts.push(`${service.port}/${service.protocol || ''}`.trim());
      }
      if (service.service) {
        parts.push(service.service);
      }
      if (service.version) {
        parts.push(service.version);
      }
      return parts.filter(Boolean).join(' ');
    })
    .join(', ');

  return formatField(label, formatted);
}

function renderMdnsField(label, services = []) {
  if (!services.length) {
    return null;
  }

  const formatted = services
    .slice(0, 6)
    .map((service) => {
      const parts = [];
      if (service.instanceName) {
        parts.push(service.instanceName);
      }
      if (service.service) {
        parts.push(service.service);
      } else if (service.name) {
        parts.push(service.name);
      }
      return parts.filter(Boolean).join(' ');
    })
    .join(', ');

  return formatField(label, formatted);
}

function renderServiceInfo(info = {}) {
  const entries = Object.entries(info);
  if (entries.length === 0) {
    return null;
  }

  const formatted = entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  return formatField('Service Info', formatted);
}
