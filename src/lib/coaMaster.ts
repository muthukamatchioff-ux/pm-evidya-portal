// Chart of Accounts (CoA) Master Data for PM e-Vidya

export interface CoaEntry {
  code: string;
  name: string;
  description: string;
}

// Component 4 Approved CoA Master (Digital Infrastructure, Archive & Network Services)
export const COMPONENT_4_COA_MASTER: CoaEntry[] = [
  {
    code: '4.1',
    name: 'Archive, Cloud Storage & Data Repository',
    description: 'Cloud storage tiers, archival systems, tape backups, and data repository hosting',
  },
  {
    code: '4.2',
    name: 'Bandwidth & Dedicated Leased Line Connectivity',
    description: 'High-speed internet leased lines, studio uplink, and distribution bandwidth',
  },
  {
    code: '4.3',
    name: 'Networking Hardware, CDN Services & Cloud Infrastructure',
    description: 'Content Delivery Network (CDN) edge caching, cloud streaming, switches, and routers',
  },
  {
    code: '4.4',
    name: 'Server Hosting, Telecast Uplink & Streaming Infrastructure',
    description: 'Web/application server hosting, RTMP encoders, and telecast streaming feeds',
  },
  {
    code: '4.5',
    name: 'Cybersecurity, Firewall & SSL Certification',
    description: 'Perimeter firewall, DDoS protection, Web Application Firewall, and SSL certificates',
  },
  {
    code: '4.6',
    name: 'Digital Asset Management (DAM) & Media Archiving',
    description: 'Video indexing, asset metadata cataloging, and media ingestion pipeline software',
  },
];

export const PERMITTED_TXN_TYPES: string[] = [
  'Journal Voucher',
  'Payment Voucher',
  'Bank Advice',
  'Invoice / Bill',
  'Debit Note',
  'Sanction Order',
  'Contingent Bill',
];

