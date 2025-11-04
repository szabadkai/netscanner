#!/usr/bin/env node

import fs from 'fs';
import { createElement } from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import App from './components/App.js';
import { resolveAssetPath } from './utils/AssetLoader.js';
import { buildScanOptions } from './utils/ConfigLoader.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

function runAssetTest() {
  const macVendors = resolveAssetPath('data/mac-vendors.json');
  const configPath = resolveAssetPath('config/default-config.json');

  return {
    macVendorsExists: fs.existsSync(macVendors),
    configExists: fs.existsSync(configPath),
    macVendorSample: JSON.parse(fs.readFileSync(macVendors, 'utf8'))['00:1A:2B']
  };
}

const program = new Command();

program
  .name('netscanner')
  .description('Real-time animated network scanner CLI')
  .version(pkg.version)
  .option('-r, --range <cidr>', 'Specify scan range, e.g., 10.0.0.0/24')
  .option('-p, --passive', 'Enable passive mode only')
  .option('-w, --watch', 'Continuously monitor network')
  .option('-e, --export <file>', 'Export results to JSON file')
  .option('--export-format <format>', 'Export format (default json)')
  .option('--timeout <ms>', 'Scanner timeout in milliseconds')
  .option('--refresh-interval <ms>', 'Watch refresh interval in milliseconds')
  .option('--hide-unknown', 'Hide devices that only have an IP address and no additional metadata')
  .option('--test-assets', 'Verify bundled assets are accessible')
  .parse(process.argv);

const rawOptions = program.opts();

if (rawOptions.testAssets) {
  const result = runAssetTest();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (rawOptions.export) {
  rawOptions.exportPath = rawOptions.export;
}

const valueSources = {
  range: program.getOptionValueSource('range'),
  passive: program.getOptionValueSource('passive'),
  watch: program.getOptionValueSource('watch'),
  export: program.getOptionValueSource('export'),
  exportFormat: program.getOptionValueSource('exportFormat'),
  timeout: program.getOptionValueSource('timeout'),
  refreshInterval: program.getOptionValueSource('refreshInterval'),
  hideUnknown: program.getOptionValueSource('hideUnknown')
};

const options = buildScanOptions(rawOptions, valueSources, process.cwd());

render(createElement(App, { options }), { exitOnCtrlC: true });
