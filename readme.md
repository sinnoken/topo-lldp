# LLDP Topology Viewer User Manual

> **Languages: [English] | [繁體中文](readme.zh-TW.md)**

Developed using **Vis.js**, this tool transforms complex network connection data (LLDP/OSPF) into intuitive, interactive 2D/3D topology maps.

## 1. Core Logic Overview

The system, powered by `topo-lldp.js`, operates through three primary stages:

### 🔍 Data Parsing & Transformation (`convertLldpToJson`)

* **Multi-Format Support**: The parser handles **Juniper OSPF**, **Fortinet/Cisco OSPF**, and standard **LLDP** text outputs.
* **Automated Device Classification**: Uses `CONFIG.GROUP_RULES` (Regex) to identify device types:
* `FGT/FG`: Identified as **Firewall** (Green shield icon).
* Specific naming patterns: Identified as **Switch** (Orange switch icon).
* `DESKTOP/PC`: Identified as **Windows** terminal.


* **Smart Port Styling**: Matches `CONFIG.PORT_STYLES` to color-code links. For example, `ae` prefixes indicate **Aggregate Links** (thick blue lines), while `10G/40G` represent **High-Speed Links** (red lines).

### 🎨 Layout & Rendering Modes (`toggleLayoutMode`)

* **Static**: Loads coordinates from `localStorage` to maintain a manually organized layout.
* **Hierarchy**: Automatically arranges devices based on network flow (Upstream/Downstream).
* **Physics Engine (ForceAtlas2)**: Simulates physical repulsion to spread nodes apart, preventing overlap in complex networks.

### 💾 Interaction Features

* **Double-Click Propagation**: Double-clicking a node selects neighbors based on "Selection Depth" and **automatically copies the resulting JSON** to the clipboard for easy sub-topology extraction.
* **Persistent Storage**: Node coordinates and data are cached in the browser with an **8-hour expiry**.

---

## 2. Data Format Guide (`sample.json`)

To render custom topologies, you can provide data in the following JSON structure:

### Sample Code

```json
{
    "nodes": [
        {
            "id": "CORE-SW-01",
            "label": "CORE-SW-01",
            "group": "switch"
        },
        {
            "id": "FGT-EXT-01",
            "label": "FGT-EXT-01",
            "group": "firewall"
        }
    ],
    "edges": [
        {
            "from": "CORE-SW-01",
            "to": "FGT-EXT-01",
            "labelFrom": "ge-0/0/1",
            "labelTo": "port1",
            "width": 3,
            "color": { "color": "#EF4444" }
        }
    ]
}

```

### Field Definitions

* **Nodes**:
* `id`: Unique identifier used for searching and link mapping.
* `group`: Assigns visual styles (e.g., `switch`, `firewall`, `server`, `windows`, `endpoint`).


* **Edges**:
* `from / to`: Defines the IDs of the two connected nodes.
* `labelFrom / labelTo`: Labels the physical port names on each end.
* `width`: Line thickness (Suggested: `3-4` for backbone, `1.5` for standard links).
* `color`: Hex code or object defining the link color.



---

## 3. Advanced Tips

1. **Instant Import**: Paste raw `show lldp neighbors` logs directly into the "Raw Data" area; the tool will parse it into JSON automatically.
2. **Search & Focus**: Use the search bar to find specific devices; the camera will auto-zoom and highlight the target node.
3. **Position Saving**: Dragging nodes triggers an automatic save of coordinates, ensuring your layout persists after a refresh.
4. **Export PNG**: Click **Export PNG** to download a high-resolution map; the tool calculates the optimal canvas size automatically.