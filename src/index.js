import ScanOrchestrator from './scanners/ScanOrchestrator.js';

export function createOrchestrator(options = {}) {
  return new ScanOrchestrator(options);
}

export default {
  createOrchestrator
};
