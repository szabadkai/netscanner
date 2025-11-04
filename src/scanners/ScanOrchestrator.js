import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import ArpScanner from './ArpScanner.js';
import NmapScanner from './NmapScanner.js';
import TcpdumpScanner from './TcpdumpScanner.js';
import DataAggregator from '../analyzers/DataAggregator.js';
import ManufacturerResolver from '../analyzers/ManufacturerResolver.js';
import OsDetector from '../analyzers/OsDetector.js';
import UsageInferrer from '../analyzers/UsageInferrer.js';
import { verifyTools } from '../utils/ToolChecker.js';

export default class ScanOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.aggregator = new DataAggregator({
      manufacturerResolver: new ManufacturerResolver(),
      osDetector: new OsDetector(),
      usageInferrer: new UsageInferrer()
    });
    this.scanners = [];
    this.isRunning = false;
    this.stats = {
      totalDevices: 0,
      startedAt: null,
      lastUpdate: null,
      scannersCompleted: 0,
      scannersTotal: 0
    };
    this.toolStatus = {};
    this.stopRequested = false;
    this.watchTimer = null;
    this.currentRunPromise = null;
    this.cycleCount = 0;
    this.hasAutoExported = false;
  }

  async prepareTools() {
    try {
      this.toolStatus = await verifyTools(this.options.tools || {});
      this.emit('tools:verified', this.toolStatus);
    } catch (error) {
      this.toolStatus = {};
      this.emit('error', { source: 'tool-check', error });
    }
  }

  initializeScanners() {
    const toolStatus = this.toolStatus || {};
    const isAvailable = (toolKey) => {
      if (!toolStatus[toolKey]) {
        return true;
      }

      return toolStatus[toolKey].available !== false;
    };

    const sharedOptions = {
      range: this.options.range,
      passive: this.options.passive,
      watch: this.options.watch,
      timeout: this.options.timeout,
      refreshInterval: this.options.refreshInterval
    };

    const scanners = [];

    if (isAvailable('arpScan') || isAvailable('arp')) {
      scanners.push(new ArpScanner(sharedOptions));
    } else {
      this.emit('log', { level: 'warn', message: 'Skipping ARP scanner (tool missing)', source: 'orchestrator' });
    }

    if (isAvailable('nmap')) {
      scanners.push(
        new NmapScanner({
          ...sharedOptions,
          versionIntensity: this.options.versionIntensity,
          osScan: this.options.osScan,
          topPorts: this.options.topPorts,
          nmapScripts: this.options.nmapScripts
        })
      );
    } else {
      this.emit('log', { level: 'warn', message: 'Skipping Nmap scanner (tool missing)', source: 'orchestrator' });
    }

    if ((this.options.passive || this.options.watch) && isAvailable('tcpdump')) {
      scanners.push(
        new TcpdumpScanner({
          ...sharedOptions,
          passiveInterface: this.options.passiveInterface,
          passiveCaptureDuration: this.options.passiveCaptureDuration
        })
      );
    } else if (this.options.passive || this.options.watch) {
      this.emit('log', {
        level: 'warn',
        message: 'Tcpdump unavailable; passive monitoring disabled',
        source: 'orchestrator'
      });
    }

    return scanners;
  }

  attachScannerListeners(scanner) {
    scanner.on('result', (payload) => {
      const device = this.aggregator.upsert(payload, { source: scanner.name });
      if (!device) return;

      const devices = this.aggregator.all();
      this.stats.totalDevices = devices.length;
      this.stats.lastUpdate = new Date();
      this.stats.cycle = this.cycleCount;
      this.emit('device:discovered', device);
      this.emit('devices:update', devices);
      this.emit('progress', { ...this.stats });
    });

    scanner.on('heartbeat', (payload) => {
      this.emit('log', { level: 'debug', message: `${scanner.name} heartbeat`, payload });
    });

    scanner.on('done', () => {
      this.stats.scannersCompleted += 1;
      this.emit('progress', { ...this.stats });
    });

    scanner.on('error', (error) => {
      this.emit('error', error);
    });

    scanner.on('log', (log) => {
      this.emit('log', log);
    });
  }

  async exportResults({ path: exportPath, format } = {}) {
    const targetPath = exportPath || this.options.exportPath;
    const targetFormat = format || this.options.exportFormat || 'json';

    if (!targetPath) {
      throw new Error('No export path specified');
    }

    if (targetFormat !== 'json') {
      throw new Error(`Unsupported export format "${targetFormat}"`);
    }

    const devices = this.aggregator.all();
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(devices, null, 2), 'utf8');
    const payload = { path: targetPath, format: targetFormat, count: devices.length };
    this.emit('export:completed', payload);
    return payload;
  }

  scheduleNextRun() {
    if (!this.options.watch || this.stopRequested) {
      return;
    }

    this.watchTimer = setTimeout(async () => {
      if (this.stopRequested) {
        return;
      }

      try {
        await this.runOnce();
      } catch (error) {
        this.emit('error', error);
      }

      if (!this.stopRequested) {
        this.scheduleNextRun();
      }
    }, this.options.refreshInterval || 15000);
  }

  clearWatchTimer() {
    if (this.watchTimer) {
      clearTimeout(this.watchTimer);
      this.watchTimer = null;
    }
  }

  async handleRunFinished() {
    const payload = {
      devices: this.aggregator.all(),
      cycle: this.cycleCount,
      watch: Boolean(this.options.watch)
    };

    this.emit('run:complete', payload);

    if (!this.options.watch) {
      this.emit('complete', payload);
    }

    if (this.options.exportPath && !this.hasAutoExported) {
      try {
        await this.exportResults({ path: this.options.exportPath, format: this.options.exportFormat });
        this.hasAutoExported = true;
      } catch (error) {
        this.emit('error', { source: 'export', error });
      }
    }
  }

  async runOnce() {
    this.cycleCount += 1;
    this.stats.scannersCompleted = 0;
    this.stats.scannersTotal = 0;
    this.stats.startedAt = new Date();
    this.stats.lastUpdate = null;
    this.stats.cycle = this.cycleCount;

    const scanners = this.initializeScanners();
    this.scanners = scanners;
    this.stats.scannersTotal = scanners.length;
    this.emit('progress', { ...this.stats });

    if (scanners.length === 0) {
      await this.handleRunFinished();
      return;
    }

    this.currentRunPromise = Promise.all(
      scanners.map(async (scanner) => {
        this.attachScannerListeners(scanner);
        await scanner.start();
      })
    );

    await this.currentRunPromise;
    this.currentRunPromise = null;
    this.scanners = [];
    await this.handleRunFinished();
  }

  async start() {
    if (this.isRunning) return;
    this.stopRequested = false;
    this.hasAutoExported = false;
    this.cycleCount = 0;
    this.isRunning = true;

    this.aggregator = new DataAggregator({
      manufacturerResolver: new ManufacturerResolver(),
      osDetector: new OsDetector(),
      usageInferrer: new UsageInferrer()
    });

    this.stats = {
      totalDevices: 0,
      startedAt: null,
      lastUpdate: null,
      scannersCompleted: 0,
      scannersTotal: 0,
      cycle: 0
    };

    await this.prepareTools();
    await this.runOnce();

    if (this.options.watch && !this.stopRequested) {
      this.scheduleNextRun();
    } else {
      this.isRunning = false;
    }
  }

  async stop() {
    this.stopRequested = true;
    this.clearWatchTimer();

    if (this.scanners && this.scanners.length > 0) {
      await Promise.all(this.scanners.map((scanner) => scanner.stop()));
    }

    if (this.currentRunPromise) {
      try {
        await this.currentRunPromise;
      } catch (error) {
        this.emit('error', error);
      }
    }

    this.isRunning = false;
    this.scanners = [];
    this.emit('stopped');
  }
}
