'use client';

import React, { useMemo } from 'react';

type Variant = 'big728x90' | 'small320x50';

const ADS = {
  big728x90: {
    key: 'ef7e57bb7f2850aae0df56ef5653bdfa',
    width: 728,
    height: 90,
    src: 'https://prototypesorting.com/ef7e57bb7f2850aae0df56ef5653bdfa/invoke.js',
  },
  small320x50: {
    key: '14f993d5500e0af99b2e87dc91d55f00',
    width: 320,
    height: 50,
    src: 'https://prototypesorting.com/14f993d5500e0af99b2e87dc91d55f00/invoke.js',
  },
} as const;

export default function AdSlot({
  variant,
  className,
  label,
}: {
  variant: Variant;
  className?: string;
  label?: string;
}) {
  const ad = ADS[variant];

  const srcDoc = useMemo(() => {
    const opts = {
      key: ad.key,
      format: 'iframe',
      height: ad.height,
      width: ad.width,
      params: {},
    };

    // Render the ad inside a sandboxed iframe so the network script can't inject elements elsewhere (e.g. top-left).
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;overflow:hidden;background:transparent;">
    <script>
      window.atOptions = ${JSON.stringify(opts)};
    </script>
    <script src="${ad.src}"></script>
  </body>
</html>`;
  }, [ad.height, ad.key, ad.src, ad.width]);

  return (
    <div className={className}>
      <div className="glass-card p-3">
        {label ? <div className="text-xs opacity-60 mb-2">{label}</div> : null}
        <iframe
          title="Advertisement"
          sandbox="allow-scripts allow-same-origin"
          scrolling="no"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{
            width: ad.width,
            height: ad.height,
            maxWidth: '100%',
            border: 0,
            overflow: 'hidden',
            display: 'block',
            background: 'transparent',
          }}
          srcDoc={srcDoc}
        />
      </div>
    </div>
  );
}
