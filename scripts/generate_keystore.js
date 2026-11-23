const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const forge = require('node-forge');

function generateKeystore() {
  console.log('Generating production release keypair (RSA 2048)...');
  const keys = forge.pki.rsa.generateKeyPair(2048);

  console.log('Creating X.509 certificate for PM e-Vidya Android Release...');
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(16));

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 25);

  const attrs = [
    { name: 'commonName', value: 'PM e-Vidya Official Release' },
    { name: 'countryName', value: 'IN' },
    { shortName: 'ST', value: 'Tamil Nadu' },
    { name: 'localityName', value: 'Chennai' },
    { name: 'organizationName', value: 'National Instructional Media Institute (NIMI)' },
    { shortName: 'OU', value: 'PM e-Vidya Digital Content Division' }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Self-sign certificate with SHA-256
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Convert DER to SHA-256 Fingerprint for Digital Asset Links
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const sha256Hash = crypto.createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex');
  const formattedFingerprint = sha256Hash.toUpperCase().match(/.{1,2}/g).join(':');

  console.log('====================================================');
  console.log('SHA-256 Certificate Fingerprint:');
  console.log(formattedFingerprint);
  console.log('====================================================');

  // Package as PKCS#12 keystore
  const password = 'pmevidya_prod_key_2026';
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert],
    password,
    { algorithm: '3des', friendlyName: 'pmevidya' }
  );

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const keystoreBuffer = Buffer.from(p12Der, 'binary');

  // Ensure directories exist
  const androidDir = path.join(__dirname, '..', 'android');
  if (!fs.existsSync(androidDir)) {
    fs.mkdirSync(androidDir, { recursive: true });
  }

  const keystorePath = path.join(androidDir, 'pmevidya-release.keystore');
  fs.writeFileSync(keystorePath, keystoreBuffer);
  console.log('Saved production keystore to:', keystorePath);

  // Save keystore metadata
  const metaPath = path.join(androidDir, 'keystore-info.json');
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        keystorePath: './pmevidya-release.keystore',
        alias: 'pmevidya',
        storePassword: password,
        keyPassword: password,
        sha256Fingerprint: formattedFingerprint,
        createdAt: new Date().toISOString()
      },
      null,
      2
    )
  );
  console.log('Saved keystore metadata to:', metaPath);

  // Write Digital Asset Links
  const wellKnownDir = path.join(__dirname, '..', 'public', '.well-known');
  if (!fs.existsSync(wellKnownDir)) {
    fs.mkdirSync(wellKnownDir, { recursive: true });
  }

  const assetLinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'in.nimi.pmevidya',
        sha256_cert_fingerprints: [formattedFingerprint]
      }
    }
  ];

  const assetLinksPath = path.join(wellKnownDir, 'assetlinks.json');
  fs.writeFileSync(assetLinksPath, JSON.stringify(assetLinks, null, 2));
  console.log('Generated Digital Asset Links:', assetLinksPath);

  return { formattedFingerprint, keystorePath };
}

generateKeystore();
