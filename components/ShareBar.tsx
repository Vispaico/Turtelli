'use client';

import React, { useMemo, useState } from 'react';
import { Copy, Link as LinkIcon, Mail, Share2 } from 'lucide-react';

type Props = {
  title: string;
  path: string; // e.g. /articles/slug
};

function buildUrl(path: string) {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

export default function ShareBar({ title, path }: Props) {
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => buildUrl(path), [path]);
  const encodedUrl = useMemo(() => encodeURIComponent(url), [url]);
  const encodedTitle = useMemo(() => encodeURIComponent(title), [title]);

  const shareTargets = useMemo(
    () => [
      {
        label: 'X',
        href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      },
      {
        label: 'LinkedIn',
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      },
      {
        label: 'Facebook',
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        label: 'Email',
        href: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%0A%0A${encodedUrl}`,
      },
    ],
    [encodedTitle, encodedUrl],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const onNativeShare = async () => {
    if (typeof navigator === 'undefined' || !('share' in navigator)) return;
    try {
      await navigator.share({ title, url });
    } catch {
      // ignore
    }
  };

  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 opacity-80">
          <LinkIcon className="w-4 h-4" />
          <span className="text-sm break-all">{url}</span>
        </div>
        <button
          onClick={onCopy}
          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
          aria-label="Copy link"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onNativeShare}
          className="px-3 py-2 rounded-lg bg-accent-green text-black font-semibold text-sm flex items-center gap-2"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        {shareTargets.map((t) => (
          <a
            key={t.label}
            href={t.href}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
          >
            {t.label === 'Email' ? <Mail className="w-4 h-4" /> : null}
            {t.label}
          </a>
        ))}
      </div>
    </div>
  );
}
