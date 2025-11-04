import { createElement } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

const formatDurationSeconds = (start) => {
  if (!start) return '0s';
  const diff = (Date.now() - start.getTime()) / 1000;
  return `${diff.toFixed(1)}s`;
};

const ScanProgress = ({ stats }) => {
  const { scannersTotal, scannersCompleted, totalDevices, startedAt, lastUpdate, cycle } = stats;
  const elapsedSeconds = startedAt ? Math.max(0, (Date.now() - startedAt.getTime()) / 1000) : 0;
  const devicesPerSecond = elapsedSeconds > 0 ? (totalDevices / elapsedSeconds).toFixed(2) : '0.00';

  return createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'round', borderColor: 'cyan', paddingX: 1, marginBottom: 1 },
    createElement(
      Box,
      null,
      createElement(
        Text,
        { color: 'cyan' },
        createElement(Spinner, { type: 'line' }),
        ' ',
        `Scanning... (${scannersCompleted}/${scannersTotal} scanners complete)`
      )
    ),
    createElement(
      Box,
      { justifyContent: 'space-between' },
      createElement(Text, null, `Devices found: ${totalDevices}`),
      createElement(Text, null, `Elapsed: ${formatDurationSeconds(startedAt)}`),
      createElement(Text, null, `Speed: ${devicesPerSecond}/s`),
      createElement(Text, null, `Cycle: ${cycle || 1}`),
      createElement(Text, null, `Last update: ${lastUpdate ? lastUpdate.toLocaleTimeString() : 'pending'}`)
    )
  );
};

export default ScanProgress;
