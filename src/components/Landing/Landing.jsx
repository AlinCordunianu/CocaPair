import './Landing.scss';
import { assets } from '../../constants/assets';
import CameraIcon from 'lucide-react/icons/camera';
import ArrowRight from 'lucide-react/icons/arrow-right';
import { ProductPair } from '../ProductPair/ProductPair';

export function Landing({ onStart, onHelp }) {
  return (
    <section className="landing">
      <header className="landing__header">
        <img src={assets.logo} alt="CocaPair" width="154" height="52" />
      </header>
      <div className="landing__intro">
        <p className="eyebrow">A little closer. A little magic.</p>
        <h1>
          Good things.
          <br />
          <span>Better together.</span>
        </h1>
        <p>
          Two cans. One shared moment.
          <br />
          Find your CocaPair with a hug.
        </p>
      </div>
      <div className="landing__art">
        <ProductPair />
      </div>
      <div className="landing__actions">
        <button className="button" onClick={onStart}>
          <CameraIcon className="icon" aria-hidden="true" /> Start scanning{' '}
          <ArrowRight className="icon" aria-hidden="true" />
        </button>
        <button className="button button--secondary" onClick={onHelp}>
          How it works
        </button>
        <p className="landing__privacy">
          Live on your camera. Only on your device.
        </p>
      </div>
    </section>
  );
}
