const fs = require('fs');
const path = require('path');

const assetCache = new Map();

function getBasePath() {
  if (process.pkg) {
    return path.dirname(process.execPath);
  }

  return process.cwd();
}

function resolveAssetPath(relativePath) {
  const basePath = getBasePath();
  const resolvedPath = path.join(basePath, relativePath);

  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  // When running from source during development, assets live next to src/
  return path.join(__dirname, '..', '..', relativePath);
}

function loadJson(relativePath) {
  const cacheKey = `json:${relativePath}`;
  if (assetCache.has(cacheKey)) {
    return assetCache.get(cacheKey);
  }

  const filePath = resolveAssetPath(relativePath);
  const contents = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(contents);
  assetCache.set(cacheKey, parsed);
  return parsed;
}

module.exports = {
  resolveAssetPath,
  loadJson
};
