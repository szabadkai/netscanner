#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createElement } from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import App from './components/App.js';
import { resolveAssetPath } from './utils/AssetLoader.js';
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
  .option('-p, --passive', 'Enable passive mode only', false)
  .option('-w, --watch', 'Continuously monitor network', false)
  .option('-e, --export <file>', 'Export results to JSON file')
  .option('--test-assets', 'Verify bundled assets are accessible')
  .parse(process.argv);

const options = program.opts();

if (options.testAssets) {
  const result = runAssetTest();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (options.export) {
  const exportPath = path.resolve(process.cwd(), options.export);
  options.exportPath = exportPath;
}

render(createElement(App, { options }), { exitOnCtrlC: true });
