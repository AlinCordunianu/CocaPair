import { assets } from '../../constants/assets';
import Heart from 'lucide-react/icons/heart';
import './ProductPair.scss';

export function ProductPair({ hug = false }) {
  return (
    <div
      className={`product-pair ${hug ? 'product-pair--hug' : ''}`}
      role="img"
      aria-label={
        hug
          ? 'Coca-Cola Original and Zero cans sharing a hug'
          : 'Coca-Cola Original and Zero cans'
      }
    >
      {hug ? (
        <span className="product-pair__heart">
          <Heart className="icon" aria-hidden="true" />
        </span>
      ) : null}
      <img
        className="product-pair__original"
        src={assets.original}
        srcSet={`${assets.original} 240w, ${assets.originalLarge} 420w`}
        sizes="(min-width: 900px) 280px, 42vw"
        alt=""
        width="240"
        height="622"
      />
      <img
        className="product-pair__zero"
        src={assets.zero}
        srcSet={`${assets.zero} 240w, ${assets.zeroLarge} 420w`}
        sizes="(min-width: 900px) 280px, 42vw"
        alt=""
        width="240"
        height="627"
      />
    </div>
  );
}
