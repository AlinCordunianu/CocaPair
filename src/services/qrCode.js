import QRCode from 'qrcode';

// Four modules of white quiet zone and solid black modules preserve scanability.
export const qrOptions = {
  errorCorrectionLevel: 'M',
  margin: 4,
  width: 256,
  color: { dark: '#000000', light: '#ffffff' },
};

export function createPageQr(url) {
  return QRCode.toDataURL(url, qrOptions);
}
