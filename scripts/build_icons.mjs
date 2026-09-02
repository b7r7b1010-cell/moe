import sharp from 'sharp';
import fs from 'fs';

// 1. High quality SVG representing the exact Itqan icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Blue Gradient -->
    <linearGradient id="bgGrad" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="35%" stop-color="#0369a1" />
      <stop offset="70%" stop-color="#075985" />
      <stop offset="100%" stop-color="#0c4a6e" />
    </linearGradient>

    <!-- Glossy Top Overlay -->
    <linearGradient id="topGloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- Bar Chart Light Blue 3D Gradient -->
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="30%" stop-color="#bae6fd" />
      <stop offset="70%" stop-color="#7dd3fc" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <linearGradient id="barSideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>

    <!-- Star Gold Gradient -->
    <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#facc15" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>

    <!-- Arrow 3D Gradient -->
    <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e0f2fe" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f0f9ff" />
    </linearGradient>

    <linearGradient id="arrowShadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0369a1" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#0c4a6e" stop-opacity="0.8" />
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35" />
    </filter>

    <filter id="starGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#fde047" flood-opacity="0.8" />
    </filter>

    <filter id="elementShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#075985" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- 1. Squircle App Background -->
  <rect x="20" y="20" width="472" height="472" rx="104" fill="url(#bgGrad)" filter="url(#cardShadow)" />
  
  <!-- Subtle border highlight -->
  <rect x="22" y="22" width="468" height="468" rx="102" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-opacity="0.4" />
  
  <!-- Top gloss arc -->
  <path d="M 22 122 C 22 66, 66 22, 122 22 L 390 22 C 446 22, 490 66, 490 122 C 360 170, 150 170, 22 122 Z" fill="url(#topGloss)" />

  <!-- 2. The 4 Rising 3D Chart Bars -->
  <g filter="url(#elementShadow)">
    <!-- Bar 1 (Lowest) -->
    <rect x="165" y="246" width="32" height="54" rx="4" fill="url(#barGrad)" />
    <path d="M 197 246 L 202 248 L 202 300 L 197 300 Z" fill="url(#barSideGrad)" opacity="0.85" />
    
    <!-- Bar 2 -->
    <rect x="210" y="214" width="32" height="86" rx="4" fill="url(#barGrad)" />
    <path d="M 242 214 L 247 216 L 247 300 L 242 300 Z" fill="url(#barSideGrad)" opacity="0.85" />

    <!-- Bar 3 -->
    <rect x="255" y="182" width="32" height="118" rx="4" fill="url(#barGrad)" />
    <path d="M 287 182 L 292 184 L 292 300 L 287 300 Z" fill="url(#barSideGrad)" opacity="0.85" />

    <!-- Bar 4 (Highest) -->
    <rect x="300" y="150" width="34" height="150" rx="4" fill="url(#barGrad)" />
    <path d="M 334 150 L 339 152 L 339 300 L 334 300 Z" fill="url(#barSideGrad)" opacity="0.85" />
    
    <!-- Glossy reflection on Bar 4 top -->
    <polygon points="300,150 334,150 339,152 305,152" fill="#ffffff" opacity="0.9" />
  </g>

  <!-- 3. Golden Star on Top of Bar 4 -->
  <g filter="url(#starGlow)">
    <polygon points="317,92 324,114 347,114 329,127 335,149 317,136 299,149 305,127 287,114 310,114" fill="url(#starGrad)" />
    <!-- Star core highlight -->
    <polygon points="317,98 322,114 338,114 325,124 329,139 317,130 305,139 309,124 296,114 312,114" fill="#fffbeb" opacity="0.6" />
    <!-- Sparkle accent -->
    <circle cx="342" cy="98" r="3" fill="#ffffff" />
    <circle cx="342" cy="98" r="1.5" fill="#fef08a" />
  </g>

  <!-- 4. Dynamic Swooshing 3D White Arrow -->
  <g filter="url(#elementShadow)">
    <!-- Arrow Lower Shadow Ribbon -->
    <path d="M 130 312 C 180 312, 270 292, 340 190 L 335 186 C 265 284, 180 304, 130 304 Z" fill="url(#arrowShadow)" />

    <!-- Main White Curved Body -->
    <path d="M 130 306 C 190 304, 275 275, 335 182 L 305 198 L 372 170 L 360 240 L 338 214 C 285 292, 195 314, 130 306 Z" fill="url(#arrowGrad)" stroke="#ffffff" stroke-width="1.5" />
    
    <!-- Inner Arrow Highlight -->
    <path d="M 150 303 C 210 296, 280 265, 335 185" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8" />
  </g>

  <!-- 5. Arabic Word "إتقان" (Crafted as high-precision paths) -->
  <g fill="#ffffff" filter="url(#cardShadow)">
    <!-- حرف الألف والهمزة (إ) -->
    <!-- الألف -->
    <rect x="340" y="342" width="16" height="74" rx="8" />
    <!-- همزة القطع تحت الألف -->
    <path d="M 348 426 C 342 426, 338 430, 340 435 C 343 438, 352 436, 355 433 L 344 442 L 354 442" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- الكلمة المتصلة (تقان) -->
    <!-- تـقـا -->
    <path d="M 318 342 L 318 395 C 318 406, 310 414, 298 414 L 195 414 C 185 414, 178 406, 178 396 L 178 342" fill="none" stroke="#ffffff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- الألف الصاعدة في وسط إتقان -->
    <rect x="238" y="342" width="16" height="72" rx="8" />

    <!-- نقطتي حرف التاء -->
    <circle cx="312" cy="326" r="6" />
    <circle cx="328" cy="326" r="6" />

    <!-- نقطة حرف القاف -->
    <circle cx="278" cy="326" r="6.5" />

    <!-- حرف النون المنفصل (ن) -->
    <path d="M 158 372 C 158 402, 138 424, 108 424 C 78 424, 58 402, 58 372" fill="none" stroke="#ffffff" stroke-width="17" stroke-linecap="round" />
    <!-- نقطة النون في الوسط -->
    <circle cx="108" cy="370" r="7" />
  </g>
</svg>`;

async function generateIcons() {
  fs.writeFileSync('public/icon.svg', svgContent);
  console.log('Saved public/icon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // 1. 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile('public/icon-512.png');
  console.log('Generated public/icon-512.png');

  // 2. 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile('public/icon-192.png');
  console.log('Generated public/icon-192.png');

  // 3. Apple Touch Icon 180x180 & 512x512
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png');

  // 4. Favicon 64x64
  await sharp(svgBuffer)
    .resize(64, 64)
    .png({ quality: 100 })
    .toFile('public/favicon.png');
  console.log('Generated public/favicon.png');
}

generateIcons().catch(console.error);
