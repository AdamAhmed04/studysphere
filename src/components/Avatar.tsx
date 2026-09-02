import React, { useEffect, useState } from 'react';

interface AvatarProps {
  /** Used for the fallback initial, and only for that. */
  name: string;
  /** The stored public URL, when this person has set a photo. */
  src?: string | null;
  /** Sizing and any extra chrome for the circle, e.g. "w-12 h-12". */
  className?: string;
  /** Sizing for the fallback initial, e.g. "text-lg". */
  textClassName?: string;
  /** Tailwind gradient stops shown behind the fallback initial. */
  gradient?: string;
  /**
   * Left empty by default: every caller shows the person's name next to the
   * circle, so alt text here would only make a screen reader say it twice.
   */
  alt?: string;
}

/*
 * The one place a person is drawn as a circle.
 *
 * Every screen already had the avatar URL in hand - the services fetch and map
 * it - and every screen but two dropped it and rendered an initial instead. So
 * a photo set from Profile appeared on Profile and nowhere else: not in chat,
 * not in the friends list, not to anyone on another device. Centralising it
 * means a new screen gets avatars by construction rather than by remembering.
 */
export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  className = 'w-10 h-10',
  textClassName = 'text-base',
  gradient = 'from-sand to-sand-lo',
  alt = '',
}) => {
  const [failed, setFailed] = useState(false);

  // A replaced photo is a new URL (the ?v= cache-buster), so an earlier failure
  // says nothing about this one.
  useEffect(() => setFailed(false), [src]);

  return (
    <div
      className={`rounded-full bg-gradient-to-r ${gradient} flex flex-shrink-0 items-center justify-center overflow-hidden ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          // A deleted file or a broken URL should degrade to the initial rather
          // than to a broken-image icon.
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={`text-white font-bold ${textClassName}`}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};
