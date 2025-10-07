import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const sizes = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon.png' },
];

async function generateIcons() {
  const logoPath = resolve('public/logo.png');
  const outputDir = resolve('public');

  console.log('🎨 Generating PWA icons from logo.png...\n');

  try {
    // Read the logo file
    const logoBuffer = readFileSync(logoPath);

    // Generate each size
    for (const { size, name } of sizes) {
      const outputPath = resolve(outputDir, name);

      await sharp(logoBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    // Generate favicon.ico (32x32)
    const faviconBuffer = await sharp(logoBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    // For now, just save as PNG (browsers support it)
    writeFileSync(resolve(outputDir, 'favicon.ico'), faviconBuffer);
    console.log('✅ Generated favicon.ico (32x32)');

    console.log('\n🎉 All PWA icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
