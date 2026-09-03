import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface VideoCallProps {
  /** Already carries the entry token, so it is per person and short-lived. */
  url: string;
  title: string;
  onClose: () => void;
}

/*
 * The call, filling the screen.
 *
 * Daily's prebuilt room is loaded in an iframe rather than through their
 * JavaScript SDK: the SDK is a sizeable dependency, and the only things this
 * needs are a URL and a way to leave — both of which a plain frame gives.
 *
 * The `allow` list is what actually grants the camera and microphone to the
 * frame. Without it the call loads and then cannot see or hear anything, which
 * looks like a broken call rather than a missing permission.
 */
export const VideoCall: React.FC<VideoCallProps> = ({ url, title, onClose }) => {
  /*
   * The page behind must not scroll while a call is up — on a phone, dragging
   * on the video would otherwise move the app underneath it.
   */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-void" role="dialog" aria-modal="true" aria-label={title}>
      <div className="shrink-0 safe-area-top bg-surface-high border-b border-hairline-soft">
        <div className="flex items-center justify-between gap-3 p-3">
          <p className="text-sm text-ink truncate">{title}</p>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-pill bg-red-500/20 border border-red-500/50 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-colors"
          >
            <X size={16} />
            Leave
          </button>
        </div>
      </div>

      <iframe
        title={title}
        src={url}
        className="flex-1 w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
      />
    </div>
  );
};
