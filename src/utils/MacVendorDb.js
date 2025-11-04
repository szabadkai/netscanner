import { createRequire } from 'module';
import { macToPrefix } from './NetworkUtils.js';
import { loadJson } from './AssetLoader.js';

let vendorMap;
let loadAttempted = false;

function ensureLoaded() {
  if (loadAttempted && vendorMap) {
    return;
  }

  if (!loadAttempted) {
    loadAttempted = true;
    const mapFromPackage = loadFromMacOuiJson();
    if (mapFromPackage) {
      vendorMap = mapFromPackage;
      return;
    }
  }

  if (!vendorMap) {
    vendorMap = buildMap(loadJson('data/mac-vendors.json'));
  }
}

export function findVendor(macAddress) {
  if (!macAddress) {
    return null;
  }

  ensureLoaded();

  const prefix = macToPrefix(macAddress);
  return vendorMap.get(prefix) || null;
}

function loadFromMacOuiJson() {
  try {
    const require = createRequire(import.meta.url);
    const dataset = require('mac-oui-json');
    return buildMap(dataset);
  } catch (error) {
    return null;
  }
}

function buildMap(source = {}) {
  const map = new Map();

  Object.entries(source).forEach(([rawKey, rawValue]) => {
    if (!rawKey || !rawValue) return;

    const normalizedKey = rawKey.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (normalizedKey.length < 6) {
      return;
    }

    const prefix = normalizedKey.slice(0, 6).match(/.{1,2}/g).join(':');
    const vendorName = formatVendorName(rawValue);
    if (!map.has(prefix)) {
      map.set(prefix, vendorName);
    }
  });

  return map;
}

function formatVendorName(name) {
  if (typeof name !== 'string') {
    return String(name);
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return 'Unknown Vendor';
  }

  return trimmed;
}
