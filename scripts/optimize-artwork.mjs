import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const [source, logo, zero] = process.argv.slice(2);
const cansOnly = source === '--cans';
if (!source || !logo || (cansOnly && !zero)) {
  throw new Error(
    'Usage: node scripts/optimize-artwork.mjs <unpacked asset directory> <white logo PNG>, or --cans <Original PNG> <Zero PNG>',
  );
}

const destination = 'public/assets/artwork';
await mkdir(destination, { recursive: true });
await Promise.all([
  ...['coca-cola-original', 'coca-cola-zero'].flatMap((name) =>
    [240, 420].map((width) =>
      sharp(
        cansOnly
          ? name === 'coca-cola-original'
            ? logo
            : zero
          : join(source, `${name}.png`),
      )
        .trim()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90, effort: 6 })
        .toFile(join(destination, `${name}-${width}.webp`)),
    ),
  ),
  ...(!cansOnly
    ? [
        sharp(logo)
          .trim()
          .resize({ width: 640 })
          .webp({ quality: 85, effort: 6 })
          .toFile(join(destination, 'cocapair-white.webp')),
      ]
    : []),
  ...(cansOnly
    ? []
    : ['red-condensation.webp', 'ice-texture.webp', 'red-light-wave.webp']
  ).map((name) => copyFile(join(source, name), join(destination, name))),
]);
console.log('Optimized standalone CocaPair artwork.');
