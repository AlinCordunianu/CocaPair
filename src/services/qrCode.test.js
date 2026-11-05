import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { createPageQr } from './qrCode';

describe('desktop handoff QR', () => {
  it.each([
    'https://cocapair.example/',
    'https://example.com/cocapair/?campaign=summer&source=desktop#start',
  ])(
    'encodes a scannable PNG preserving the full current URL: %s',
    async (url) => {
      // Exercise the same encoder and options as the desktop UI, then decode its pixels independently.
      const result = await createPageQr(url);
      const { data, info } = await sharp(
        Buffer.from(result.split(',')[1], 'base64'),
      )
        .resize(184, 184)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const decoded = jsQR(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
      );
      expect(decoded?.data).toBe(url);
    },
  );
});
