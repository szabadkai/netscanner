import { createElement, useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import Header from './Header.js';
import ScanProgress from './ScanProgress.js';
import DeviceList from './DeviceList.js';
import DeviceCard from './DeviceCard.js';
import StatusBar from './StatusBar.js';
import LoadingSpinner from './LoadingSpinner.js';
import ScanOrchestrator from '../scanners/ScanOrchestrator.js';

const defaultStats = {
  totalDevices: 0,
  startedAt: null,
  lastUpdate: null,
  scannersCompleted: 0,
  scannersTotal: 0
};

const App = ({ options = {} }) => {
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing scanners...');
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const orchestratorRef = useRef(null);
  const { exit } = useApp();

  useEffect(() => {
    const orchestrator = new ScanOrchestrator(options);
    orchestratorRef.current = orchestrator;

    const handleDevicesUpdate = (list) => {
      setDevices(list);
      setSelectedIndex((prev) => {
        if (list.length === 0) {
          return 0;
        }
        return Math.min(prev, list.length - 1);
      });
    };

    orchestrator.on('devices:update', handleDevicesUpdate);
    orchestrator.on('device:discovered', (device) => {
      setStatusMessage(`Discovered ${device.ip || device.mac}`);
    });
    orchestrator.on('progress', (nextStats) => setStats(nextStats));
    orchestrator.on('complete', () => {
      setStatusMessage('Scan complete');
      setIsComplete(true);
    });
    orchestrator.on('error', (err) => {
      setError(err);
      setStatusMessage('Encountered an error');
    });

    orchestrator.start().catch((err) => {
      setError(err);
      setStatusMessage('Failed to start scanners');
    });

    return () => {
      orchestrator.removeAllListeners();
      orchestrator.stop();
    };
  }, [options]);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(devices.length - 1, prev + 1));
    }

    if (input === 'r' && orchestratorRef.current) {
      setStatusMessage('Restarting scan...');
      setIsComplete(false);
      orchestratorRef.current.stop().then(() => orchestratorRef.current.start());
    }
  });

  const selectedDevice = devices[selectedIndex] || null;

  const children = [
    createElement(Header, { key: 'header' }),
    error
      ? createElement(
          Box,
          { key: 'error', borderStyle: 'round', borderColor: 'red', paddingX: 1, paddingY: 0 },
          createElement(Text, { color: 'red' }, `Error: ${error.message || String(error)}`)
        )
      : null,
    createElement(ScanProgress, { key: 'progress', stats }),
    createElement(DeviceList, { key: 'list', devices, selectedIndex }),
    createElement(DeviceCard, { key: 'card', device: selectedDevice }),
    createElement(StatusBar, {
      key: 'status',
      message: statusMessage,
      hint: '↑↓ navigate • r rescan • q quit'
    }),
    !isComplete && devices.length === 0
      ? createElement(
          Box,
          { key: 'loading', marginTop: 1 },
          createElement(LoadingSpinner, { label: 'Waiting for first device', color: 'cyan' })
        )
      : null
  ].filter(Boolean);

  return createElement(Box, { flexDirection: 'column' }, ...children);
};

export default App;
