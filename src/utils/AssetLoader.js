import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assetCache = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBasePath() {
  if (process.pkg) {
    return path.dirname(process.execPath);
  }

  return process.cwd();
}

export function resolveAssetPath(relativePath) {
  const basePath = getBasePath();
  const resolvedPath = path.join(basePath, relativePath);

  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  // When running from source during development, assets live next to src/
  return path.join(__dirname, '..', '..', relativePath);
}

export function loadJson(relativePath) {
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
