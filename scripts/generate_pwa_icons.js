const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const srcLogo = path.join(__dirname, '..', 'public', 'pm-evidya-logo.png');
  if (!fs.existsSync(srcLogo)) {
    console.error('Source logo not found:', srcLogo);
    process.exit(1);
  }

  console.log('Generating PWA icons from:', srcLogo);

  // 192x192 standard icon
  await sharp(srcLogo)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(iconsDir, 'icon-192x192.png'));
  console.log('Created icon-192x192.png');

  // 512x512 high-res icon
  await sharp(srcLogo)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('Created icon-512x512.png');

  // 512x512 maskable icon (with 10% safe zone padding and solid white / navy background)
  await sharp(srcLogo)
    .resize(410, 410, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));
  console.log('Created icon-maskable-512x512.png');

  // Apple touch icon 180x180
  await sharp(srcLogo)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  console.log('All PWA icons successfully generated!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
