const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateFeatureGraphic() {
  const outDir = path.join(__dirname, '..', 'android', 'play-store');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const width = 1024;
  const height = 500;

  // Create an SVG banner with crisp typography and branding
  const svgBanner = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="40%" stop-color="#1e3a8a" />
          <stop offset="100%" stop-color="#172554" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4" />
        </filter>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

      <!-- Subtle geometric decorative accents -->
      <circle cx="920" cy="80" r="160" fill="#3b82f6" opacity="0.08" />
      <circle cx="100" cy="420" r="140" fill="#60a5fa" opacity="0.05" />
      <path d="M 0,460 L 1024,380 L 1024,500 L 0,500 Z" fill="#000000" opacity="0.2" />

      <!-- Top Tagline -->
      <text x="512" y="110" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#93c5fd" letter-spacing="3" text-anchor="middle" text-transform="uppercase">
        GOVERNMENT OF INDIA &#8226; MSDE &#8226; NIMI CHENNAI
      </text>

      <!-- Main Title -->
      <text x="512" y="180" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="800" fill="#ffffff" text-anchor="middle" filter="url(#shadow)">
        PM e-Vidya Portal
      </text>

      <!-- Gold Accent Line -->
      <rect x="432" y="205" width="160" height="4" rx="2" fill="url(#goldGrad)" />

      <!-- Subtitle -->
      <text x="512" y="255" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="500" fill="#e2e8f0" text-anchor="middle">
        Digital Learning &amp; Video Production Tracking System
      </text>

      <!-- Feature Badges -->
      <g transform="translate(187, 310)">
        <!-- Badge 1: Official Documents -->
        <g transform="translate(0, 0)">
          <rect width="200" height="48" rx="8" fill="#1e293b" opacity="0.8" stroke="#334155" stroke-width="1.5" />
          <text x="100" y="30" font-family="Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="#38bdf8" text-anchor="middle">
            📄 Approval &amp; Completion
          </text>
        </g>

        <!-- Badge 2: SME Workflows -->
        <g transform="translate(225, 0)">
          <rect width="200" height="48" rx="8" fill="#1e293b" opacity="0.8" stroke="#334155" stroke-width="1.5" />
          <text x="100" y="30" font-family="Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="#4ade80" text-anchor="middle">
            👥 SME Management
          </text>
        </g>

        <!-- Badge 3: Real-Time Sync -->
        <g transform="translate(450, 0)">
          <rect width="200" height="48" rx="8" fill="#1e293b" opacity="0.8" stroke="#334155" stroke-width="1.5" />
          <text x="100" y="30" font-family="Segoe UI, Roboto, sans-serif" font-size="14" font-weight="600" fill="#fbbf24" text-anchor="middle">
            ⚡ Real-Time Tracking
          </text>
        </g>
      </g>

      <!-- Bottom Authority Note -->
      <text x="512" y="440" font-family="Segoe UI, Roboto, sans-serif" font-size="13" font-weight="400" fill="#64748b" text-anchor="middle">
        National Instructional Media Institute &#8226; Official Mobile Gateway
      </text>
    </svg>
  `;

  const outPath = path.join(outDir, 'feature_graphic_1024x500.png');
  await sharp(Buffer.from(svgBanner))
    .png({ quality: 100 })
    .toFile(outPath);

  const stats = fs.statSync(outPath);
  console.log(`✔ Feature graphic generated successfully: ${outPath} (${stats.size} bytes, 1024x500)`);
}

generateFeatureGraphic().catch(err => {
  console.error('Failed to generate feature graphic:', err);
  process.exit(1);
});
