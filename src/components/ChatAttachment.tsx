import React, { useEffect, useState } from 'react';
import { FileText, Download, ImageOff } from 'lucide-react';
import { groupService } from '../services/groupService';

interface ChatAttachmentProps {
  /** Storage path, not a URL — the bucket is private. */
  path: string;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];

/** The original filename is the last path segment; the rest is routing. */
const displayName = (path: string) => decodeURIComponent(path.split('/').pop() || 'file');

const isImage = (path: string) => {
  const extension = displayName(path).split('.').pop()?.toLowerCase();
  return !!extension && IMAGE_EXTENSIONS.includes(extension);
};

/*
 * One file shared in a chat.
 *
 * There is no permanent URL to render: the bucket is private, so what the
 * message stores is a path and a link has to be minted per view. That is the
 * point — someone removed from the group cannot mint one, where a public
 * bucket would keep serving the file to anyone who ever saw the URL.
 *
 * The link is fetched when the component mounts rather than up front for
 * every message, so a long history does not sign hundreds of files nobody
 * scrolls to.
 */
export const ChatAttachment: React.FC<ChatAttachmentProps> = ({ path }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    groupService
      .signedAttachmentUrl(path)
      .then((signed) => {
        if (!active) return;
        if (signed) setUrl(signed);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true));

    // The component can unmount while the request is in flight — on a fast
    // scroll, or when the chat closes.
    return () => { active = false; };
  }, [path]);

  const name = displayName(path);

  if (failed) {
    return (
      <div className="flex items-center gap-2 mt-2 text-xs text-muted">
        <ImageOff size={14} className="shrink-0" />
        <span className="truncate">{name} — unavailable</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="mt-2 h-10 w-40 rounded-md bg-surface-high animate-pulse" aria-hidden="true" />
    );
  }

  if (isImage(path)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 w-fit">
        <img
          src={url}
          alt={name}
          loading="lazy"
          className="max-h-64 max-w-full rounded-md border border-hairline-soft"
          onError={() => setFailed(true)}
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-surface border border-hairline-soft hover:border-sand/40 transition-colors max-w-full"
    >
      <FileText size={16} className="shrink-0 text-muted" />
      <span className="text-xs text-ink truncate">{name}</span>
      <Download size={14} className="shrink-0 text-muted" />
    </a>
  );
};
