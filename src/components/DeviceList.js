import { createElement } from 'react';
import { Box, Text } from 'ink';

const DeviceList = ({ devices = [], selectedIndex = 0 }) => {
  if (devices.length === 0) {
    return createElement(
      Box,
      { flexDirection: 'column', borderStyle: 'round', borderColor: 'gray', paddingX: 1, paddingY: 0 },
      createElement(Text, { color: 'gray' }, 'No devices discovered yet.')
    );
  }

  return createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'round', borderColor: 'green', paddingX: 1, paddingY: 0 },
    devices.map((device, index) => {
      const isSelected = index === selectedIndex;
      const color = isSelected ? 'greenBright' : 'white';
      const marker = isSelected ? '▶' : '•';
      const key = `${device.mac || device.ip || index}-${index}`;
      const sources = Array.isArray(device.sources) ? device.sources : Array.from(device.sources || []);
      const sourceLabel = sources.length > 0 ? `${sources.length} src` : 'no src';
      const usage = truncate(device.usage || 'unspecified', 14);
      const osLabel = truncate(device.os || 'unknown OS', 16);
      const manufacturer = truncate(device.manufacturer || 'unknown vendor', 18);
      const deviceType = truncate(device.deviceType || device.extra?.nmap?.deviceType || 'unknown type', 16);
      const serviceCount = Array.isArray(device.services) ? device.services.length : 0;
      const mdnsCount = Array.isArray(device.extra?.mdns?.services) ? device.extra.mdns.services.length : 0;
      const serviceSummary = serviceCount + mdnsCount > 0 ? `${serviceCount + mdnsCount} svc` : 'no svc';
      const hostname = truncate(device.hostname || 'n/a', 24);
      const ip = truncate(device.ip || 'unknown', 15);

      const line = [
        `${marker} ${ip}`,
        hostname,
        osLabel,
        deviceType,
        manufacturer,
        usage,
        sourceLabel,
        serviceSummary
      ].join(' | ');

      return createElement(Text, { key, color }, line);
    })
  );
};

export default DeviceList;

function truncate(value, maxLength) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (stringValue.length <= maxLength) {
    return stringValue;
  }

  if (maxLength <= 3) {
    return stringValue.slice(0, maxLength);
  }

  return `${stringValue.slice(0, maxLength - 3)}...`;
}
