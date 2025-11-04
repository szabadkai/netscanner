const { macToPrefix } = require('./NetworkUtils');
const { loadJson } = require('./AssetLoader');

let vendorMap;

function ensureLoaded() {
  if (!vendorMap) {
    vendorMap = loadJson('data/mac-vendors.json');
  }
}

function findVendor(macAddress) {
  if (!macAddress) {
    return null;
  }

  ensureLoaded();

  const prefix = macToPrefix(macAddress);
  return vendorMap[prefix] || null;
}

module.exports = {
  findVendor
};
