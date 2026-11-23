const path = require('path');
const fs = require('fs');
const Color = require('color');
const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');

async function main() {
  const targetDir = path.join(__dirname, '..', 'android');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const log = new ConsoleLog('twa-generator');

  // Load manifest.json
  const webManifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'public', 'manifest.json'), 'utf8')
  );

  const manifestUrl = new URL('https://pmevidyanimi.online/manifest.json');

  const twaManifest = TwaManifest.fromWebManifestJson(manifestUrl, webManifest);
  twaManifest.packageId = 'in.nimi.pmevidya';
  twaManifest.name = 'PM e-Vidya Portal';
  twaManifest.launcherName = 'PM e-Vidya';
  twaManifest.themeColor = new Color('#1e3a8a');
  twaManifest.navigationColor = new Color('#1e3a8a');
  twaManifest.backgroundColor = new Color('#ffffff');
  twaManifest.signingKey = {
    path: './pmevidya-release.keystore',
    alias: 'pmevidya'
  };
  twaManifest.appVersion = '1.0.0';
  twaManifest.appVersionCode = 1;
  twaManifest.enableNotifications = true;
  twaManifest.minSdkVersion = 21;

  console.log('Generating TWA project for package:', twaManifest.packageId);
  const generator = new TwaGenerator();

  // Mock fetchIcon to use local high-res PWA icon without external network dependency
  const localIconBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'icons', 'icon-512x512.png'));
  const localMaskableBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'icons', 'icon-maskable-512x512.png'));

  generator.imageHelper.fetchIcon = async (iconUrl) => {
    const isMaskable = iconUrl.includes('maskable');
    return {
      url: iconUrl,
      data: isMaskable ? localMaskableBuffer : localIconBuffer
    };
  };

  // Mock writeWebManifest to write local manifest directly
  generator.writeWebManifest = async (manifest, destDir) => {
    const assetsDir = path.join(destDir, 'app', 'src', 'main', 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(
      path.join(assetsDir, 'web_app_manifest.json'),
      JSON.stringify(webManifest, null, 2)
    );
  };

  // Save twa-manifest.json
  await twaManifest.saveToFile(path.join(targetDir, 'twa-manifest.json'));
  console.log('Saved twa-manifest.json');

  // Generate TWA Project files
  await generator.createTwaProject(targetDir, twaManifest, log);
  console.log('TWA project generated successfully in:', targetDir);
}

main().catch(err => {
  console.error('Error generating TWA project:', err);
  process.exit(1);
});
