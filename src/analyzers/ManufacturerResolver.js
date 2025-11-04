import { findVendor } from '../utils/MacVendorDb.js';

export default class ManufacturerResolver {
  lookup(macAddress) {
    return findVendor(macAddress);
  }
}
