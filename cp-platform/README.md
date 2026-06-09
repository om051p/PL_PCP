# CP Designer — Permanent ICCP Engineering Platform

Professional engineering design tool for Impressed Current Cathodic Protection (ICCP) systems.

## Stack
- **React 19** + **Vite 8**
- **Zustand** + **Immer** — state management with persistence
- **Recharts** — charts (wired for future analytics)
- **jsPDF** — PDF report generation
- **Lucide React** — icons

## Architecture
Domain-Driven Modular Layered Architecture (DDMLA) — 8 layers:

```
src/
├── constants/      Layer 0 — Engineering constants registry
├── types/          Layer 0 — Type definitions (JSDoc)
├── engine/
│   ├── modules/    Layer 4 — Pure calculation functions
│   ├── rules/      Layer 3 — Rules engine + BOM engine
│   └── optimizer/  Layer 5 — Design alternatives generator
├── store/          Layer 2 — Zustand project store
├── components/     Layer 1 — Shared UI primitives
├── pages/          Layer 1 — Page-level components
└── integration/    Layer 8 — Future API / AI integration
```

## Local Development
```bash
npm install
npm run dev        # http://localhost:3000
```

## Production Build
```bash
npm run build      # outputs to /dist
npm run preview    # preview production build
```

## Deploy

### Netlify / Vercel (drag-and-drop)
Upload the `/dist` folder.

### Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy --dir=dist --prod
```

### Nginx (self-hosted)
```nginx
server {
  listen 80;
  root /var/www/cp-platform/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

### Docker
```bash
docker build -t cp-platform .
docker run -p 80:80 cp-platform
```

## Design Modes (Implemented + Roadmap)
| Mode | Status |
|------|--------|
| Deepwell ICCP | ✅ Complete |
| Shallow Vertical Groundbed | ✅ Complete |
| Distributed Anode | 🔲 Architecture ready |
| Tank Bottom ICCP | 🔲 Architecture ready |
| Plant Piping ICCP | 🔲 Architecture ready |
| Sacrificial Anode | 🔲 Architecture ready |

## Engineering Standards
- NACE SP0169 — CP of Underground Metallic Piping Systems
- 17-SAMSS-003 — TR Unit specification
- 17-SAMSS-016 — Anode specification
- 17-SAMSS-008 — Junction box specification
- Dwight (1936) — Deepwell groundbed resistance
- Sunde (1968) — Shallow vertical parallel groundbed resistance
