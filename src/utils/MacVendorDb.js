import { macToPrefix } from './NetworkUtils.js';
import { loadJson } from './AssetLoader.js';

let vendorMap;

function ensureLoaded() {
  if (!vendorMap) {
    vendorMap = loadJson('data/mac-vendors.json');
  }
}

export function findVendor(macAddress) {
  if (!macAddress) {
    return null;
  }

  ensureLoaded();

  const prefix = macToPrefix(macAddress);
  return vendorMap[prefix] || null;
}
