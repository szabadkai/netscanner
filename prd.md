Here's the updated prompt with single executable compilation:

---

**Create a Modern Animated Network Scanner CLI in Node.js (Compiled to Single Executable)**

Build a beautiful, real-time network scanner with a modern animated terminal UI that compiles to a single standalone executable for easy distribution.

**Requirements:**

**Core Functionality:**

- Scan local network and discover all connected devices in real-time
- Collect: IP address, MAC address, hostname, OS type, manufacturer, model, and plausible usage
- Use multiple tools: `tcpdump`, `nmap`, `arp-scan`/`arp`, and `ping`
- Display results with live streaming updates as devices are discovered
- **Compile to single executable binary for Linux, macOS, and Windows**

**UI/UX Requirements:**

- Modern animated interface with React-like components using `ink`
- Live progress indicators with animated spinners
- Real-time device list that updates as scanning progresses
- Smooth transitions and animations
- Color-coded status indicators
- Gradient headers and beautiful formatting
- Stats dashboard showing scan progress, devices found, scan speed

**Technical Stack:**

```json
{
    "dependencies": {
        "ink": "^4.4.1",
        "ink-spinner": "^5.0.0",
        "ink-gradient": "^3.0.0",
        "ink-big-text": "^2.0.0",
        "ink-table": "^3.1.0",
        "ink-text-input": "^5.0.1",
        "react": "^18.2.0",
        "chalk": "^5.3.0",
        "gradient-string": "^2.0.2",
        "commander": "^11.1.0",
        "nanospinner": "^1.1.0",
        "cli-boxes": "^3.0.0"
    },
    "devDependencies": {
        "@yao-pkg/pkg": "^5.11.5"
    }
}
```

**Build Configuration:**

Add to `package.json`:

```json
{
    "name": "netscanner",
    "version": "1.0.0",
    "bin": "src/cli.js",
    "pkg": {
        "scripts": ["src/**/*.js", "node_modules/ink/**/*.js"],
        "assets": ["data/mac-vendors.json", "config/default-config.json"],
        "targets": [
            "node18-linux-x64",
            "node18-macos-x64",
            "node18-macos-arm64",
            "node18-win-x64"
        ],
        "outputPath": "dist"
    },
    "scripts": {
        "start": "node src/cli.js",
        "build": "pkg . --compress GZip",
        "build:linux": "pkg . --targets node18-linux-x64 --compress GZip -o dist/netscanner-linux",
        "build:macos": "pkg . --targets node18-macos-x64,node18-macos-arm64 --compress GZip",
        "build:win": "pkg . --targets node18-win-x64 --compress GZip -o dist/netscanner-win.exe",
        "build:all": "npm run build"
    }
}
```

**Project Structure:**

```
src/
├── components/               # Ink React components
│   ├── App.js               # Main app component
│   ├── Header.js            # Animated gradient header
│   ├── ScanProgress.js      # Progress bar & stats
│   ├── DeviceList.js        # Live updating device table
│   ├── DeviceCard.js        # Individual device component
│   ├── StatusBar.js         # Bottom status bar
│   └── LoadingSpinner.js    # Custom spinner
├── scanners/
│   ├── BaseScanner.js       # Base scanner class
│   ├── ArpScanner.js        # ARP discovery
│   ├── NmapScanner.js       # Nmap scanning
│   ├── TcpdumpScanner.js    # Passive monitoring
│   └── ScanOrchestrator.js  # Coordinates all scanners
├── analyzers/
│   ├── OsDetector.js        # OS fingerprinting
│   ├── ManufacturerResolver.js  # MAC vendor lookup
│   ├── UsageInferrer.js     # Device purpose inference
│   └── DataAggregator.js    # Merge data from sources
├── models/
│   └── Device.js            # Device data model
├── utils/
│   ├── NetworkUtils.js      # Network utilities
│   ├── CommandRunner.js     # Execute system commands
│   ├── EventBus.js          # Event emitter for updates
│   ├── MacVendorDb.js       # MAC vendor database
│   └── AssetLoader.js       # Load bundled assets in PKG
├── cli.js                   # CLI entry point (must have shebang)
└── index.js                 # Main coordinator
data/
├── mac-vendors.json         # MAC vendor database (bundled)
└── .gitkeep
config/
├── default-config.json      # Default configuration
└── .gitkeep
dist/                        # Compiled executables output
└── .gitkeep
```

**Important for PKG Compatibility:**

**1. CLI Entry Point (`src/cli.js`):**

```javascript
#!/usr/bin/env node

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

// Detect if running in PKG
const isPkg = typeof process.pkg !== "undefined";

// Get proper paths for bundled assets
function getAssetPath(relativePath) {
    if (isPkg) {
        // In PKG, assets are in the snapshot filesystem
        return join(process.cwd(), relativePath);
    } else {
        // In development, use normal paths
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        return join(__dirname, "..", relativePath);
    }
}

// Export for use in other modules
export { isPkg, getAssetPath };

// ... rest of CLI code
```

**2. Asset Loading (`src/utils/AssetLoader.js`):**

```javascript
import { readFileSync } from "fs";
import { join } from "path";

class AssetLoader {
    static loadMacVendors() {
        const isPkg = typeof process.pkg !== "undefined";

        if (isPkg) {
            // PKG bundles assets in snapshot
            const path = join(process.cwd(), "data", "mac-vendors.json");
            return JSON.parse(readFileSync(path, "utf8"));
        } else {
            // Development mode
            const path = join(process.cwd(), "data", "mac-vendors.json");
            return JSON.parse(readFileSync(path, "utf8"));
        }
    }

    static getConfigPath() {
        const isPkg = typeof process.pkg !== "undefined";
        return isPkg
            ? join(process.cwd(), "config")
            : join(process.cwd(), "config");
    }
}

export default AssetLoader;
```

**3. Avoid Dynamic Requires:**

```javascript
// ❌ DON'T DO THIS (won't work in PKG):
const moduleName = "ink-spinner";
const module = require(moduleName);

// ✅ DO THIS INSTEAD:
import Spinner from "ink-spinner";
```

**UI Design with Ink:**

```javascript
// Example of the animated UI structure:
import React from "react";
import { Box, Text } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import Spinner from "ink-spinner";

// Real-time animated display:
// ═══════════════════════════════════════════════════════
// ▓▒░  NETWORK SCANNER  ░▒▓  (gradient animated)
// ═══════════════════════════════════════════════════════
//
// [◐] Scanning network 192.168.1.0/24...
//
// ┌─ Scan Progress ──────────────────────────────────────┐
// │ ████████████░░░░░░░░░░░░ 45% (115/255 hosts)         │
// │ Found: 12 devices | Active: 8 | Duration: 00:23      │
// └──────────────────────────────────────────────────────┘
//
// ┌─ Discovered Devices ─────────────────────────────────┐
// │ ✓ 192.168.1.1      AA:BB:CC:DD:EE:FF  router.local   │
// │   Router • TP-Link Archer AX50 • Linux               │
// │                                                       │
// │ ⟳ 192.168.1.105    11:22:33:44:55:66  iPhone-Pro     │
// │   Scanning... • Apple • iOS                          │
// │                                                       │
// │ ✓ 192.168.1.50     22:33:44:55:66:77  server-01      │
// │   Server • Dell PowerEdge • Ubuntu 22.04             │
// └──────────────────────────────────────────────────────┘
//
// [↓] Press Ctrl+C to stop scan
```

**Scanning Strategy:**

1. **Phase 1 - Fast Discovery (0-5s):**
    - Start tcpdump in background
    - Run `arp-scan -l` for immediate results
    - Display devices as they appear with spinners

2. **Phase 2 - Deep Scan (5-30s):**
    - Run `nmap -sn` ping sweep
    - For each device, run `nmap -O -sV --version-light`
    - Update UI in real-time as data comes in
    - Show per-device progress indicators

3. **Phase 3 - Passive Analysis (continuous):**
    - Parse tcpdump capture for additional insights
    - Analyze traffic patterns for usage inference
    - Update device info dynamically

**Key Features:**

**Ink Components to Create:**

- `<Header />` - Animated gradient title with big text
- `<ScanProgress />` - Progress bar with live stats
- `<DeviceList />` - Scrollable list of devices with animations
- `<DeviceCard />` - Animated card for each device (appears with fade-in)
- `<StatusBar />` - Bottom bar with tips and controls
- `<ScannerAnimation />` - Visual representation of scanning activity

**Event-Driven Updates:**

```javascript
// Use EventEmitter for real-time updates
scanOrchestrator.on("device:discovered", (device) => {
    // Update UI immediately
});

scanOrchestrator.on("device:updated", (device) => {
    // Refresh device info in UI
});

scanOrchestrator.on("progress", (stats) => {
    // Update progress bar
});
```

**Interactive Features:**

- Arrow keys to navigate device list
- Enter to see detailed device view
- Space to toggle passive mode
- 'e' to export results
- 'r' to refresh/rescan
- Ctrl+C graceful shutdown

**Building & Distribution:**

**Build Process:**

```bash
# Install dependencies
npm install

# Development mode
npm start

# Build for all platforms
npm run build:all

# Build for specific platform
npm run build:linux
npm run build:macos
npm run build:win

# Output:
# dist/netscanner-linux       (Linux x64)
# dist/netscanner-macos-x64   (macOS Intel)
# dist/netscanner-macos-arm64 (macOS Apple Silicon)
# dist/netscanner-win.exe     (Windows x64)
```

**Installation & Usage:**

```bash
# After building, copy binary to system path:
sudo cp dist/netscanner-linux /usr/local/bin/netscanner
sudo chmod +x /usr/local/bin/netscanner

# Then use anywhere:
sudo netscanner                      # Interactive UI mode
sudo netscanner --range 10.0.0.0/24  # Specific range
sudo netscanner --passive            # Passive mode only
sudo netscanner --export devices.json # Export and exit
sudo netscanner --watch              # Continuous monitoring
```

**PKG-Specific Considerations:**

1. **Use ESM carefully** - PKG has better CommonJS support. Consider using CommonJS (`require/module.exports`) if you encounter issues

2. **Bundle all assets** - Ensure MAC vendor DB and configs are included in `pkg.assets`

3. **Test before building:**

```bash
# Test that all assets load correctly
node src/cli.js --test-assets
```

4. **Dynamic imports won't work** - All imports must be static and at the top of files

5. **File paths** - Always use the asset loader utility for bundled files

6. **Native modules** - Stick to pure JS, avoid native addons

**Animations to Include:**

- Spinner while scanning each device
- Progress bar with smooth animations
- Device cards fade in as discovered
- Status icons animate (✓, ⟳, ⚠, ✗)
- Gradient title pulses
- Live updating timestamps
- Network activity indicator (animated wave/signal)

**Code Style:**

- Modern ES6+ JavaScript (async/await, destructuring, etc.)
- JSDoc comments for documentation
- Event-driven architecture
- Modular scanner plugins
- Easy to extend with new scanner types
- Use React hooks (useState, useEffect) in Ink components

**Error Handling:**

- Check for required tools (nmap, tcpdump, arp-scan)
- Verify sudo/root permissions with helpful messages
- Graceful degradation if tools missing
- Display errors inline in UI with colored warnings
- Check if running as compiled binary and show appropriate messages

**Performance:**
`

- Run scanners in parallel where possible
- Throttle UI updates (max 60fps)
- Cache MAC vendor lookups
- Optimize bundle size with compression

**Distribution:**

- Single binary < 50MB (with compression)
- No dependencies required (Node.js bundled)
- Works offline (MAC vendor DB included)
- Cross-platform compatible

Start by setting up the project with PKG configuration, create the asset loader utility, then build the Ink UI components. Ensure everything works in development before compiling to executable!
