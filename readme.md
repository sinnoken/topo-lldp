# Network Topology & Route Analysis Toolkit

> **Languages: [English] | [繁體中文](readme.zh-TW.md)**

This toolkit is designed to transform raw network device data from vendors like **Juniper, Cisco, and Fortinet** into interactive, insightful visualizations and professional management reports.

## 🚀 Core Features

### 1. Smart Topology Visualization
*   **Multi-vendor Parsing**: Supports parsing of Juniper OSPF output, Fortinet/Cisco OSPF tables, and standard LLDP neighbor tables.
*   **Automated Device Identification**: Uses regex (regular expressions) to automatically categorize devices (e.g., Firewalls, Switches) and assign specific SVG icons based on naming conventions.
*   **Dynamic Layout Engine**: Utilizes the **vis.js ForceAtlas2 algorithm** to calculate optimal spatial positioning, preventing node overlap and offering static, hierarchical, or physics-based views.

### 2. Recursive Route Analysis Engine
*   **LPM (Longest Prefix Match)**: Accurately simulates router behavior by finding the most specific route entry for a target IP within CIDR routing tables.
*   **Recursive Path Tracing**: Simulates packet hops from a starting node until the packet reaches its destination, encounters a routing loop, or hits a "blackhole".
*   **ECMP Support**: Identifies and displays all available branches when multiple Equal-Cost Multi-Path (ECMP) next-hops exist.

### 3. Asset & VLAN Auditing
*   **IP-MAC Correlation**: Maps ARP data to port information to solve the common challenge of identifying the identity of a device on a specific interface.
*   **OUI Manufacturer Identification**: Automatically detects hardware vendors (e.g., Apple, Cisco, VMware) using the first 6 characters of MAC addresses to help classify terminal devices.
*   **Automated Reporting**: Flattens complex, nested JSON data into clean **Excel (XLSX)** or **CSV** reports with optimized column formatting for auditing.

## 🛠️ How It Works

1.  **Data Normalization**: Extracts destination segments and next-hops via regex and standardizes MAC address formats for consistent global mapping.
2.  **Physics Simulation**: Employs gravitational and spring forces to create natural network distributions that prevent visual clutter.
3.  **Visual Status Marking**: Highlighting analyzed paths with dynamic "flow" effects and labeling each node with the specific route entry used for forwarding.
4.  **Persistence & Caching**: Integrates with **localStorage** to remember node positions and settings, featuring an 8-hour cache expiry to balance performance and data accuracy.

## 💡 Use Cases

*   **Virtual Traceroute**: Predict packet paths offline when devices are unreachable or ICMP traffic is blocked by intermediate firewalls.
*   **Datacenter Automation**: Instantly generate physical connection maps by pasting `show lldp neighbors` text, replacing manual Visio drafting.
*   **Security & Asset Inventory**: Identify unauthorized devices and audit virtualization environments (like VMware/Hyper-V) using OUI detection.
*   **Disaster Recovery (DR) Drills**: Simulate node failures or routing weight changes to verify if traffic correctly shifts to backup paths.
*   **VLAN Migration Planning**: Generate a comprehensive list of all devices on a specific VLAN to ensure no critical servers are missed during network migrations.

## 📊 Technical Specifications
*   **Core Engine**: JavaScript, vis.js (Physics-based rendering).
*   **Data Models**: JSON, CIDR-based routing, Regex-driven parsing.
*   **Export Formats**: Interactive Web Interface, PNG images, CSV, and formatted Excel files.

---
*This toolkit bridges the gap between raw low-level data and high-value management information, serving as an ideal assistant for Network Engineers and NOC centers.*