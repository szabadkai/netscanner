import { createElement } from 'react';
import { Box, Text } from 'ink';

const formatField = (label, value) =>
  createElement(
    Text,
    null,
    createElement(Text, { color: 'cyan' }, `${label}: `),
    createElement(Text, null, value || 'unknown')
  );

const DeviceCard = ({ device }) => {
  if (!device) {
    return createElement(
      Box,
      { borderStyle: 'round', borderColor: 'gray', paddingX: 1, paddingY: 0, marginTop: 1 },
      createElement(Text, { color: 'gray' }, 'Select a device to see details.')
    );
  }

  return createElement(
    Box,
    { borderStyle: 'round', borderColor: 'magenta', paddingX: 1, paddingY: 0, marginTop: 1, flexDirection: 'column' },
    createElement(Text, { color: 'magentaBright' }, 'Device Details'),
    formatField('IP', device.ip),
    formatField('MAC', device.mac),
    formatField('Hostname', device.hostname),
    formatField('OS', device.os),
    formatField('Manufacturer', device.manufacturer),
    formatField('Model', device.model),
    formatField('Usage', device.usage),
    formatField('Sources', Array.from(device.sources || []).join(', ')),
    formatField('Last Seen', device.lastSeen ? new Date(device.lastSeen).toLocaleString() : null)
  );
};

export default DeviceCard;
