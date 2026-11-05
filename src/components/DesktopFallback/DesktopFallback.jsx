import { useEffect, useState } from 'react';
import { assets } from '../../constants/assets';
import { ProductPair } from '../ProductPair/ProductPair';
import CameraIcon from 'lucide-react/icons/camera';
import ArrowRight from 'lucide-react/icons/arrow-right';
import { createPageQr } from '../../services/qrCode';
import './DesktopFallback.scss';

export default function DesktopFallback() {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(false);
  const [url, setUrl] = useState(() => window.location.href);

  useEffect(() => {
    const update = () => setUrl(window.location.href);
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setQr(null);
    setError(false);
    createPageQr(url)
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <main className="desktop">
      <header className="desktop__header">
        <img src={assets.logo} width="210" height="70" alt="CocaPair" />
        <span>Two cans. One shared moment.</span>
      </header>
      <section className="desktop__experience">
        <div className="desktop__copy">
          <p className="eyebrow">Made for a closer connection</p>
          <h1>
            This experience is <br />
            <span>designed for mobile</span>
          </h1>
          <p>
            Some moments are better in your hands.
            <br />
            Grab two Coca-Cola cans and let them share a hug.
          </p>
          <div className="desktop__handoff">
            <div className="desktop__qr">
              {qr ? (
                <img
                  src={qr}
                  width="192"
                  height="192"
                  alt="Scan to open this CocaPair page on your phone"
                />
              ) : (
                <span role="status">
                  {error ? 'QR unavailable' : 'Creating QR…'}
                </span>
              )}
            </div>
            <div>
              <CameraIcon className="icon" aria-hidden="true" />
              <h2>
                Take the moment
                <br />
                to your phone.
              </h2>
              <p>
                Scan with your phone’s camera
                <br />
                to start the experience.
              </p>
              <a href={url}>
                Open this page{' '}
                <ArrowRight className="icon" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <div className="desktop__art">
          <ProductPair hug />
          <span className="desktop__art-caption">
            A little closer. A little magic.
          </span>
        </div>
      </section>
      <footer className="desktop__footer">
        <span>Coca-Cola Original & Zero</span>
        <span>Real-time detection · Private on your device</span>
      </footer>
    </main>
  );
}
