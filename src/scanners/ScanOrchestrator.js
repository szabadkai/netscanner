import { EventEmitter } from 'events';
import ArpScanner from './ArpScanner.js';
import NmapScanner from './NmapScanner.js';
import TcpdumpScanner from './TcpdumpScanner.js';
import DataAggregator from '../analyzers/DataAggregator.js';
import ManufacturerResolver from '../analyzers/ManufacturerResolver.js';
import OsDetector from '../analyzers/OsDetector.js';
import UsageInferrer from '../analyzers/UsageInferrer.js';

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
  }

  initializeScanners() {
    const sharedOptions = {
      range: this.options.range,
      passive: this.options.passive
    };

    const scanners = [new ArpScanner(sharedOptions), new NmapScanner(sharedOptions)];

    if (this.options.passive || this.options.watch) {
      scanners.push(new TcpdumpScanner(sharedOptions));
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

      if (this.stats.scannersCompleted >= this.stats.scannersTotal && !this.options.watch) {
        this.emit('complete', { devices: this.aggregator.all() });
      }
    });

    scanner.on('error', (error) => {
      this.emit('error', error);
    });

    scanner.on('log', (log) => {
      this.emit('log', log);
    });
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.aggregator = new DataAggregator({
      manufacturerResolver: new ManufacturerResolver(),
      osDetector: new OsDetector(),
      usageInferrer: new UsageInferrer()
    });

    this.stats = {
      totalDevices: 0,
      startedAt: new Date(),
      lastUpdate: null,
      scannersCompleted: 0,
      scannersTotal: 0
    };

    this.scanners = this.initializeScanners();
    this.stats.scannersTotal = this.scanners.length;

    this.emit('progress', { ...this.stats });

    await Promise.all(
      this.scanners.map(async (scanner) => {
        this.attachScannerListeners(scanner);
        await scanner.start();
      })
    );
  }

  async stop() {
    await Promise.all(this.scanners.map((scanner) => scanner.stop()));
    this.isRunning = false;
    this.emit('stopped');
  }
}
