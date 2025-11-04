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
      const color = isSelected ? 'green' : 'white';
      const marker = isSelected ? '▶' : '•';
      const key = `${device.mac || device.ip}-${index}`;

      return createElement(
        Text,
        { key, color },
        `${marker} ${device.ip || 'unknown'} | ${device.hostname || 'n/a'} | ${device.manufacturer || 'unknown'}`
      );
    })
  );
};

export default DeviceList;
