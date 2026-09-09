import { useState } from 'react';

type CardImageProps = {
  src: string;
  name: string;
  /** Square thumbnail side in px. Omitted renders the card full width. */
  size?: number;
  radius?: number;
};

/**
 * Every card in the app shows its art. When the image is missing or fails to
 * load (offline, a card seen for the first time) it degrades to the card name
 * instead of a broken frame.
 */
export function CardImage({ src, name, size, radius = 8 }: CardImageProps) {
  const [failed, setFailed] = useState(false);

  const style = size
    ? { width: size, height: size, borderRadius: radius }
    : { width: '100%', aspectRatio: '5 / 7', borderRadius: radius };

  if (!src || failed) {
    return (
      <div className="card-fallback" style={style} title={name}>
        <span>{name}</span>
      </div>
    );
  }

  return (
    <img
      className="card-image"
      src={src}
      alt={name}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
