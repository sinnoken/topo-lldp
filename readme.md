# 🌐 Network Admin Suite — Topo LLDP Viewer

> A **pure-frontend**, zero-backend web application for visualizing network topology, auditing VLANs, mapping ARP tables, and analyzing routes — all from pasted device logs, directly in the browser.

![Static Site](https://img.shields.io/badge/deployment-static-blue)
![JavaScript](https://img.shields.io/badge/language-JavaScript%20ES6%2B-yellow)
![Tailwind CSS](https://img.shields.io/badge/styling-TailwindCSS%20v3.4-38bdf8)
![vis.js](https://img.shields.io/badge/visualization-vis--network%20v10.0.2-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation & Deployment](#-installation--deployment)
- [Usage Guide](#-usage-guide)
- [Configuration](#-configuration)
- [Architecture](#-architecture)
- [Data Flow](#-data-flow)
- [Export Options](#-export-options)
- [License](#-license)

---

## 🔍 Overview

**Network Admin Suite — Topo LLDP Viewer** is a client-side-only network engineering toolset that requires no backend, no package installation, and no external API keys. Simply open the HTML in a browser, paste your device outputs, and instantly get interactive topology maps, VLAN audits, ARP-to-MAC-to-IP mappings, and route trace visualizations.

All parsing, visualization, and export logic runs entirely in the browser. Data is persisted transiently via `localStorage` with an 8-hour expiry to support workflow continuity without a server.

---

## ✨ Features

### 🗺️ LLDP Topology Viewer (`topo-lldp.html`)
- **Multi-vendor LLDP/OSPF parsing** — supports Juniper, Cisco, Fortinet output formats
- **Device auto-categorization** — identifies firewalls, switches, servers, Windows hosts, and endpoints via configurable regex rules
- **SVG-based device icons** — distinct visual icons per device category
- **Interactive force-directed & hierarchical layouts** — ForceAtlas2, hierarchical (BFS), and static/manual drag modes
- **Persistent node positions** — layout saved to `localStorage`, restored on reload
- **Port style mapping** — OOB, L4, AGGREGATE, VLAN, HIGHSPEED, DEFAULT port styles with distinct edge visuals
- **Layer slider** — BFS-based layer selection for scoped topology views
- **Export selected nodes/edges** — copy compact JSON to clipboard
- **Double-click recursive selection** — select and copy entire sub-topologies

### 🔬 VLAN Auditor (`vlan.html`)
- Paste and parse switch config, VLAN table, MAC address table, ARP table, and topology data
- Real-time analysis result with node count and status badge
- **OUI vendor detection** — MAC prefix lookup via bundled `silverwind.oui-data.json` (cached 24 hours)
- **Excel, CSV, and JSON export** — auto column width, UTF-8 BOM for Excel compatibility
- LocalStorage-based data persistence with 8-hour expiry

### 🔀 Route Analyzer (`route-analyzer.html`)
- CIDR parsing and longest prefix match (LPM)
- Recursive path tracing with ECMP (Equal-Cost Multi-Path) support
- Gateway and connected-route detection
- Visual highlight of traced paths on the vis.js topology
- Persistent route cache

### 📡 ARP Mapper (`arp.html`)
- Parse nested ARP JSON from multiple devices
- Maps MAC → IP → Vendor (via OUI)
- Integrated with VLAN Auditor for enriched reporting

---

## 🛠️ Technology Stack

| Category         | Technology                              |
|------------------|-----------------------------------------|
| Core Language    | JavaScript ES6+ (Vanilla, no framework) |
| Styling          | Tailwind CSS v3.4.17, DaisyUI           |
| Network Visualization | vis-network v10.0.2 (vis.js)       |
| Excel Export     | SheetJS / xlsx v0.18.5                  |
| Icons            | FontAwesome 6.4.0, Material Symbols     |
| Data Persistence | Browser `localStorage`                  |
| Build Tool       | Tailwind CSS CLI (for `output.css`)     |
| Deployment       | Static files — no server required       |

---

## 📁 Project Structure

```
.
├── index.html                  # Landing page / tool selector
├── topo-lldp.html              # LLDP Topology Viewer
├── vlan.html                   # VLAN Auditor
├── arp.html                    # ARP Mapper
├── route-analyzer.html         # Route Analyzer
├── label.html                  # Label utility page
├── table.html                  # Table utility page
├── coll.html                   # Collapsed view
├── testReport.html             # Test report page
├── favicon.svg                 # Site favicon
├── package.json                # Build scripts (Tailwind)
├── tailwind.config.js          # Tailwind theme configuration
│
├── js/
│   ├── topo-lldp.js            # Core topology viewer logic
│   ├── vlan.js                 # VLAN auditor logic (VlanAuditor class)
│   ├── route-analyzer.js       # Route analyzer (NetworkAnalyzer class)
│   ├── Edge.js                 # Custom vis.js edge label rendering
│   ├── sample.json             # Sample node/edge data
│   ├── sample2.json            # Additional sample data
│   ├── sample_Extended.json    # Extended sample data
│   ├── silverwind.oui-data.json# MAC OUI vendor database
│   ├── vis-network.min.js      # vis.js network library (bundled)
│   ├── vis.js / vis.min.js     # vis.js full library
│   ├── tailwindcss.3.4.17.js   # Tailwind CSS runtime
│   └── font-awesome.6.4.0.all.min.js
│
├── css/
│   ├── input.css               # Tailwind source CSS
│   ├── output.css              # Compiled Tailwind CSS
│   ├── vis-network.min.css     # vis.js network styles
│   ├── vis.css / vis.min.css   # vis.js full styles
│
├── docs/
│   ├── readme.md               # Internal documentation
│   ├── topo-lldp.md            # Topology viewer design notes
│   ├── vlan.md                 # VLAN auditor design notes
│   ├── route-analyzer.md       # Route analyzer design notes
│   ├── REQUIREMENTS.md         # Feature requirements
│   └── cicd-requirements.md    # CI/CD pipeline specification
│
└── .opencode/
    └── skills/
        ├── frontend-design/SKILL.md   # Frontend design guidelines
        └── replicate/SKILL.md         # AI model integration docs
```

---

## 🚀 Installation & Deployment

This project requires **no build step** and **no package manager** for regular use.

### Option 1: Open Locally
```bash
# Clone the repository
git clone https://github.com/<your-org>/sinnoken-topo-lldp.git
cd sinnoken-topo-lldp

# Simply open in a browser
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

### Option 2: Static Hosting (Recommended)

Deploy the entire project directory to any static file host:

| Platform       | Command / Method                                     |
|----------------|------------------------------------------------------|
| GitHub Pages   | Push to `gh-pages` branch or configure Pages in repo settings |
| AWS S3         | `aws s3 sync . s3://your-bucket --acl public-read`  |
| Vercel         | `vercel deploy`                                      |
| Nginx/Apache   | Copy files to web root (`/var/www/html/`)            |

### Option 3: Rebuild Tailwind CSS (optional)
Only needed if you modify `css/input.css` or `tailwind.config.js`:

```bash
npm install
npm run build   # Compiles Tailwind → css/output.css
```

---

## 📘 Usage Guide

### LLDP Topology Viewer
1. Open `topo-lldp.html`
2. Paste your LLDP neighbor output or topology JSON into the **Data Editor** panel
3. Optionally paste additional enrichment data (VLANs, labels) into the **Additional Data** panel
4. The network topology will auto-render with device icons, port styles, and edge labels
5. Use the layout toggle to switch between **Static**, **Hierarchical**, and **Physics** modes
6. Drag nodes to position manually; positions are auto-saved
7. Use the **Layer Slider** to isolate network layers (BFS depth)
8. Double-click a node to recursively select it and its neighbors
9. Click **Copy Selected** to export the selection as compact JSON

### VLAN Auditor
1. Open `vlan.html`
2. Paste the following into their respective editors:
   - Switch running config
   - VLAN table output
   - MAC address table
   - ARP table (JSON or text)
   - Topology data
3. The tool auto-parses all inputs and generates a unified result
4. Export results via **Excel**, **CSV**, or **JSON** buttons

### Route Analyzer
1. Open `route-analyzer.html`
2. Provide node/edge data representing your routed topology
3. Select a source and destination node
4. The analyzer performs LPM + ECMP path tracing and highlights the path graph
5. View per-hop route tables and log cards

---

## ⚙️ Configuration

### Device Categorization (`js/topo-lldp.js`)
Devices are identified via `CONFIG.GROUP_RULES` — a list of regex patterns mapped to device groups:

```js
CONFIG.GROUP_RULES = [
  { pattern: /firewall|fortigate|palo|asa/i, group: 'firewall' },
  { pattern: /switch|sw|catalyst/i,          group: 'switch' },
  { pattern: /windows|win|desktop/i,         group: 'windows' },
  // Add custom rules here
];
```

### Port Styles (`CONFIG.PORT_STYLES`)
```js
CONFIG.PORT_STYLES = {
  OOB:       { color: '#888', dashes: true },
  L4:        { color: '#4ade80' },
  AGGREGATE: { color: '#facc15', width: 3 },
  VLAN:      { color: '#60a5fa' },
  HIGHSPEED: { color: '#f97316', width: 3 },
  DEFAULT:   { color: '#94a3b8' }
};
```

### Environment Flags
| Variable            | Default | Description                        |
|---------------------|---------|------------------------------------|
| `IS_DEBUG`          | `false` | Enable test mode with sample data  |
| `TEST_DATA_URL`     | `''`    | Path to external test data JS file |

### LocalStorage Keys
| Key                      | Expiry  | Purpose                      |
|--------------------------|---------|------------------------------|
| `networkNodesPosition`   | 8 hours | Saved node positions         |
| `networkTopologyData`    | 8 hours | Cached topology JSON         |
| `networkArpMap`          | 8 hours | ARP MAC→IP mapping           |
| `storageExpiry`          | 8 hours | Expiry timestamp             |
| `vlan_auditor_oui_cache` | 24 hours| OUI vendor database cache    |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Browser (Client)                    │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ topo-lldp  │  │ vlan.js    │  │ route-analyzer.js  │ │
│  │    .js     │  │(VlanAudit- │  │(NetworkAnalyzer    │ │
│  │            │  │  or class) │  │     class)         │ │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬─────────┘ │
│        │               │                     │           │
│        └───────────────┼─────────────────────┘           │
│                        │                                  │
│              ┌─────────▼──────────┐                      │
│              │   vis-network.js   │  ← Force / Hierarchical│
│              │  (Network Graph)   │     / Static layouts  │
│              └─────────┬──────────┘                      │
│                        │                                  │
│              ┌─────────▼──────────┐                      │
│              │   localStorage     │  ← Positions, Cache  │
│              └────────────────────┘                      │
│                                                          │
│              ┌────────────────────┐                      │
│              │  SheetJS (xlsx)    │  ← Excel/CSV Export  │
│              └────────────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

### Key Classes & Modules

| Module / Class       | File                   | Responsibility                              |
|----------------------|------------------------|---------------------------------------------|
| `initApp()`          | `topo-lldp.js`         | Bootstrap topology viewer, bind events      |
| `convertLldpToJson()`| `topo-lldp.js`         | Parse raw LLDP/OSPF text → JSON             |
| `applyDataUpdate()`  | `topo-lldp.js`         | Merge new nodes/edges into vis.js datasets  |
| `identifyDeviceCategory()` | `topo-lldp.js`  | Regex-based device classification           |
| `VlanAuditor`        | `vlan.js`              | ARP parsing, OUI lookup, vendor mapping     |
| `NetworkAnalyzer`    | `route-analyzer.js`    | Route tracing, LPM, ECMP, path highlight    |
| `Edge.js`            | `Edge.js`              | Override vis.js edge label rendering        |

---

## 🔄 Data Flow

```
User Pastes Device Output
         │
         ▼
   Regex / JSON Parsing
   (convertLldpToJson / VlanAuditor.parseArpData)
         │
         ▼
   Normalization & Deduplication
   (node/edge ID dedup, MAC cleaning, port matching)
         │
         ▼
   OUI Lookup (MAC → Vendor via silverwind.oui-data.json)
         │
         ▼
   vis.js DataSet (nodes + edges)
         │
         ▼
   vis-network Rendering (force / hierarchical / static)
         │
         ▼
   User Interaction (drag, zoom, search, select)
         │
         ▼
   Export (PNG / CSV / XLSX / JSON clipboard)
```

---

## 📤 Export Options

| Format   | Tool(s)                    | Notes                                         |
|----------|----------------------------|-----------------------------------------------|
| PNG      | Topology Viewer            | Exports current canvas view                   |
| JSON     | Topology Viewer, VLAN      | Compact format, clipboard or download         |
| CSV      | VLAN Auditor               | UTF-8 BOM for Excel compatibility             |
| Excel    | VLAN Auditor               | Auto column width, requires SheetJS CDN load  |

---

## 📄 License

© 2026 Network Admin Suite. Open Source — MIT License.

> This project is provided as-is for network engineers and NOC operators. Contributions, bug reports, and feature requests are welcome via GitHub Issues and Pull Requests.
