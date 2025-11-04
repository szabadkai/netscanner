import path from 'path';
import { loadJson } from './AssetLoader.js';

let cachedConfig = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getDefaultConfig() {
  if (!cachedConfig) {
    cachedConfig = loadJson('config/default-config.json');
  }

  return clone(cachedConfig);
}

export function buildScanOptions(cliOptions = {}, valueSources = {}, cwd = process.cwd()) {
  const config = getDefaultConfig();
  const scanDefaults = config.scan || {};
  const exportDefaults = config.export || {};
  const uiDefaults = config.ui || {};
  const tools = config.tools || {};
  const nmapDefaults = config.nmap || {};
  const passiveDefaults = config.passive || {};

  const resolveValue = (key, sourceKey, fallback) => {
    const valueSource = valueSources[sourceKey];
    if (valueSource && valueSource !== 'default') {
      return cliOptions[key];
    }

    if (cliOptions[key] !== undefined && valueSource === undefined) {
      return cliOptions[key];
    }

    return fallback;
  };

  const range = resolveValue('range', 'range', scanDefaults.defaultRange);
  const passive = resolveValue('passive', 'passive', scanDefaults.passive);
  const watch = resolveValue('watch', 'watch', scanDefaults.watch);
  const exportPath = resolveValue('exportPath', 'export', exportDefaults.defaultPath);
  const exportFormat = resolveValue('exportFormat', 'exportFormat', exportDefaults.defaultFormat || 'json');
  const timeout = resolveValue('timeout', 'timeout', scanDefaults.timeout || 5000);
  const refreshInterval = resolveValue(
    'refreshInterval',
    'refreshInterval',
    scanDefaults.refreshInterval || 15000
  );
  const versionIntensity = resolveValue(
    'versionIntensity',
    'versionIntensity',
    nmapDefaults.versionIntensity !== undefined ? nmapDefaults.versionIntensity : 3
  );
  const osScan = resolveValue('osScan', 'osScan', nmapDefaults.enableOsScan !== undefined ? nmapDefaults.enableOsScan : true);
  const topPorts = resolveValue('topPorts', 'topPorts', nmapDefaults.topPorts);
  const passiveInterface = resolveValue('passiveInterface', 'passiveInterface', passiveDefaults.interface || null);
  const passiveCaptureDuration = resolveValue(
    'passiveCaptureDuration',
    'passiveCaptureDuration',
    passiveDefaults.captureDuration || refreshInterval
  );
  const hideUnknownDevices = resolveValue(
    'hideUnknownDevices',
    'hideUnknown',
    scanDefaults.hideUnknownDevices || false
  );

  const resolvedExportPath = exportPath ? path.resolve(cwd, exportPath) : null;
  const nmapScripts = Array.isArray(nmapDefaults.scripts) ? nmapDefaults.scripts : [];
  const scriptsFromCli = Array.isArray(cliOptions.nmapScripts) ? cliOptions.nmapScripts : cliOptions.nmapScripts;
  const parsedScripts =
    typeof scriptsFromCli === 'string'
      ? scriptsFromCli
          .split(',')
          .map((script) => script.trim())
          .filter(Boolean)
      : nmapScripts;

  return {
    range,
    passive: Boolean(passive),
    watch: Boolean(watch),
    timeout: Number(timeout),
    refreshInterval: Number(refreshInterval),
    exportPath: resolvedExportPath,
    exportFormat,
    versionIntensity: Number(versionIntensity) || 3,
    osScan: osScan !== false,
    topPorts: topPorts !== undefined && topPorts !== null ? Number(topPorts) : undefined,
    nmapScripts: parsedScripts,
    passiveInterface: passiveInterface || null,
    passiveCaptureDuration: Number(passiveCaptureDuration) || Number(refreshInterval) || 15000,
    hideUnknownDevices: Boolean(hideUnknownDevices),
    tools,
    ui: { ...uiDefaults },
    rawConfig: config
  };
}
