import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
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
  scannersTotal: 0,
  cycle: 0
};

const cloneOptions = (value) => JSON.parse(JSON.stringify(value));
const sanitizeScanOptions = (value) => {
  const clone = cloneOptions(value);
  if (clone && typeof clone === 'object') {
    delete clone.hideUnknownDevices;
  }
  return clone;
};

const App = ({ options = {} }) => {
  const [scanOptions, setScanOptions] = useState(() => sanitizeScanOptions(options));
  const [hideUnknown, setHideUnknown] = useState(Boolean(options.hideUnknownDevices));
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing scanners...');
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toolStatus, setToolStatus] = useState({});
  const [flashBanner, setFlashBanner] = useState(null);
  const orchestratorRef = useRef(null);
  const optionsSignatureRef = useRef(JSON.stringify(options));
  const flashTimerRef = useRef(null);
  const { exit } = useApp();

  const filteredDevices = useMemo(() => {
    if (!hideUnknown) {
      return devices;
    }

    return devices.filter((device) => {
      if (!device) return false;
      const hasHostname = Boolean(device.hostname && device.hostname !== '?');
      const hasMac = Boolean(device.mac);
      const hasManufacturer = Boolean(device.manufacturer);
      const hasUsage = Boolean(device.usage);
      const hasExtra =
        (device.extra && Object.keys(device.extra).length > 0) ||
        (Array.isArray(device.services) && device.services.length > 0);

      if (!hasHostname && !hasMac && !hasManufacturer && !hasUsage && !hasExtra) {
        return false;
      }

      if (!hasHostname && !hasMac && !hasExtra) {
        return false;
      }

      return true;
    });
  }, [devices, hideUnknown]);

  useEffect(() => {
    const nextSignature = JSON.stringify(options);
    if (nextSignature !== optionsSignatureRef.current) {
      optionsSignatureRef.current = nextSignature;
      setScanOptions(sanitizeScanOptions(options));
      setHideUnknown(Boolean(options.hideUnknownDevices));
    }
  }, [options]);

  useEffect(() => () => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  }, []);

  const showFlash = (message, color = 'magenta', duration = 2000) => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    setFlashBanner({ message, color });
    flashTimerRef.current = setTimeout(() => {
      setFlashBanner(null);
      flashTimerRef.current = null;
    }, duration);
  };

  useEffect(() => {
    const orchestrator = new ScanOrchestrator(scanOptions);
    orchestratorRef.current = orchestrator;

    setDevices([]);
    setSelectedIndex(0);
    setStats(defaultStats);
    setStatusMessage('Starting scan...');
    showFlash('Starting scan...', 'cyan');
    setIsComplete(false);
    setError(null);
    setShowDetails(false);
    setToolStatus({});
    setIsExporting(false);

    const handleDevicesUpdate = (list) => {
      setDevices(list);
      setSelectedIndex((prev) => {
        if (list.length === 0) {
          return 0;
        }
        return Math.min(prev, list.length - 1);
      });
    };

    orchestrator.on('tools:verified', (result) => {
      setToolStatus(result);
      const relevant = new Set(['arp', 'arpScan', 'nmap', 'tcpdump']);
      const missing = Object.entries(result).filter(
        ([key, status]) => relevant.has(key) && status && status.available === false
      );
      if (missing.length > 0) {
        const names = missing.map(([key]) => key).join(', ');
        setStatusMessage(`Degraded: missing tools (${names})`);
        showFlash(`Missing tools: ${names}`, 'yellow', 4000);
      }
    });
    orchestrator.on('devices:update', handleDevicesUpdate);
    orchestrator.on('device:discovered', (device) => {
      setStatusMessage(`Discovered ${device.ip || device.mac || 'device'}`);
    });
    orchestrator.on('progress', (nextStats) => setStats(nextStats));
    orchestrator.on('run:complete', (payload) => {
      if (payload.watch) {
        setStatusMessage(`Cycle ${payload.cycle} complete - watching...`);
        setIsComplete(false);
        showFlash(`Cycle ${payload.cycle} complete`, 'cyan');
      }
    });
    orchestrator.on('complete', (payload) => {
      setStatusMessage('Scan complete');
      setIsComplete(!payload.watch);
      showFlash('Scan complete', 'green');
    });
    orchestrator.on('export:completed', (payload) => {
      setIsExporting(false);
      setStatusMessage(`Exported ${payload.count} devices to ${payload.path}`);
      showFlash(`Exported ${payload.count} devices`, 'green');
    });
    orchestrator.on('error', (err) => {
      setError(err);
      setStatusMessage('Encountered an error');
      showFlash(err.message || 'Scanner error', 'red', 4000);
    });

    orchestrator
      .start()
      .catch((err) => {
        setError(err);
        setStatusMessage('Failed to start scanners');
        showFlash(err.message || 'Failed to start scanners', 'red', 4000);
      });

    return () => {
      orchestrator.removeAllListeners();
      orchestrator.stop();
    };
  }, [scanOptions]);

  useEffect(() => {
    if (filteredDevices.length === 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((prev) => Math.min(prev, filteredDevices.length - 1));
  }, [filteredDevices.length]);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      setStatusMessage('Exiting...');
      showFlash('Exiting...', 'red');
      setTimeout(() => exit(), 150);
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => {
        if (filteredDevices.length === 0) return 0;
        return Math.max(0, prev - 1);
      });
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => {
        if (filteredDevices.length === 0) return 0;
        const maxIndex = filteredDevices.length - 1;
        return Math.min(maxIndex, prev + 1);
      });
    }

    if (input === 'r' && orchestratorRef.current) {
      setStatusMessage('Restarting scan...');
      setIsComplete(false);
      setShowDetails(false);
      setError(null);
      showFlash('Restarting scan...', 'cyan');
      orchestratorRef.current.stop().then(() => orchestratorRef.current.start());
    }

    if (key.return) {
      setShowDetails((prev) => {
        const next = !prev;
        setStatusMessage(next ? 'Detailed view expanded' : 'Detailed view hidden');
        showFlash(next ? 'Detailed view expanded' : 'Detailed view hidden', 'magenta');
        return next;
      });
    }

    if (key.space) {
      const nextPassive = !scanOptions.passive;
      setStatusMessage(`Passive mode ${nextPassive ? 'enabled' : 'disabled'} - restarting...`);
      showFlash(`Passive mode ${nextPassive ? 'enabled' : 'disabled'}`, 'cyan');
      setShowDetails(false);
      setScanOptions((prev) => ({
        ...prev,
        passive: nextPassive
      }));
    }

    if (input === 'u') {
      const nextHide = !hideUnknown;
      setStatusMessage(nextHide ? 'Hiding unknown devices' : 'Showing unknown devices');
      showFlash(nextHide ? 'Hiding unknown devices' : 'Showing unknown devices', 'cyan');
      setShowDetails(false);
      setHideUnknown(nextHide);
    }

    if (input === 'e' && orchestratorRef.current) {
      if (!scanOptions.exportPath) {
        setStatusMessage('No export path configured');
        showFlash('No export path configured', 'yellow', 3000);
        return;
      }

      if (isExporting) {
        return;
      }

      setIsExporting(true);
      setStatusMessage(`Exporting to ${scanOptions.exportPath}...`);
      showFlash(`Exporting to ${scanOptions.exportPath}`, 'magenta', 3000);
      orchestratorRef.current
        .exportResults({ path: scanOptions.exportPath, format: scanOptions.exportFormat })
        .catch((err) => {
          setIsExporting(false);
          setError(err);
          setStatusMessage('Export failed');
          showFlash(err.message || 'Export failed', 'red', 4000);
        });
    }
  });

  const boundedIndex = Math.min(selectedIndex, filteredDevices.length - 1);
  const adjustedIndex = filteredDevices.length > 0 ? Math.max(0, boundedIndex) : 0;
  const selectedDevice = filteredDevices[adjustedIndex] || null;
  const relevant = new Set(['arp', 'arpScan', 'nmap', 'tcpdump']);
  const missingTools = Object.entries(toolStatus)
    .filter(([key, status]) => relevant.has(key) && status && status.available === false)
    .map(([key]) => key);

  const hiddenCount = hideUnknown ? devices.length - filteredDevices.length : 0;

  const children = [
    missingTools.length > 0
      ? createElement(
          Box,
          { key: 'tools', borderStyle: 'round', borderColor: 'yellow', paddingX: 1, paddingY: 0, marginBottom: 1 },
          createElement(Text, { color: 'yellow' }, `Some scanners disabled: ${missingTools.join(', ')}`)
        )
      : null,
    error
      ? createElement(
          Box,
          { key: 'error', borderStyle: 'round', borderColor: 'red', paddingX: 1, paddingY: 0 },
          createElement(Text, { color: 'red' }, `Error: ${error.message || String(error)}`)
        )
      : null,
    flashBanner
      ? createElement(
          Box,
          { key: 'flash', borderStyle: 'round', borderColor: flashBanner.color, paddingX: 1, paddingY: 0 },
          createElement(Text, { color: flashBanner.color }, flashBanner.message)
        )
      : null,
    hideUnknown && hiddenCount > 0
      ? createElement(
          Box,
          { key: 'filter', borderStyle: 'round', borderColor: 'cyan', paddingX: 1, paddingY: 0 },
          createElement(Text, { color: 'cyan' }, `Hidden ${hiddenCount} unknown devices (toggle with 'u')`)
        )
      : null,
    createElement(ScanProgress, { key: 'progress', stats }),
    createElement(DeviceList, { key: 'list', devices: filteredDevices, selectedIndex: adjustedIndex }),
    createElement(DeviceCard, { key: 'card', device: selectedDevice, showDetails }),
    createElement(StatusBar, {
      key: 'status',
      message: statusMessage,
      hint: '↑↓ navigate • enter details • space passive • u hide unknown • e export • r rescan • q quit'
    }),
    !isComplete && devices.length === 0
      ? createElement(
          Box,
          { key: 'loading', marginTop: 1 },
          createElement(LoadingSpinner, { label: 'Waiting for first device', color: 'cyan' })
        )
      : null,
    isExporting
      ? createElement(
          Box,
          { key: 'exporting', marginTop: 1 },
          createElement(LoadingSpinner, { label: 'Exporting...', color: 'magenta' })
        )
      : null
  ].filter(Boolean);

  return createElement(Box, { flexDirection: 'column' }, ...children);
};

export default App;
