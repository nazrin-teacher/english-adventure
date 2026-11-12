/** Small UI glyphs (buttons only — all illustrations come from the supplied artwork). */
type P = { size?: number | string; className?: string };
const box = (size: P['size']) => ({ width: size ?? '1em', height: size ?? '1em' });

export const IconHome = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <path d="M3 11.2 12 3.5l9 7.7" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 10v9.2c0 .7.5 1.2 1.2 1.2h3.6v-5.2h3.4v5.2h3.6c.7 0 1.2-.5 1.2-1.2V10L12 4.6Z" fill="currentColor" />
  </svg>
);

export const IconSpeaker = ({ size, className, off }: P & { off?: boolean }) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <path d="M3.5 9.2h3.6L12 5v14l-4.9-4.2H3.5c-.6 0-1-.4-1-1V10.2c0-.6.4-1 1-1Z" fill="currentColor" />
    {off ? (
      <path d="m15.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    ) : (
      <>
        <path d="M15 9a4.2 4.2 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
        <path d="M17.8 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      </>
    )}
  </svg>
);

export const IconGear = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M10.3 2.5h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.8a6.6 6.6 0 0 1 0 2l2 1.8-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-2.9 2-1.8a6.6 6.6 0 0 1 0-2l-2-1.8 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9ZM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z"
    />
  </svg>
);

export const IconMic = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3.5M8.5 21h7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
  </svg>
);

export const IconCheck = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <path d="m4.5 12.5 4.8 4.8L19.5 7" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconPlay = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l10-6.8c.6-.4.6-1.2 0-1.6l-10-6.8c-.7-.5-1.6 0-1.6.8Z" fill="currentColor" />
  </svg>
);

export const IconReplay = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
    <path d="M4 3.5v4.6h4.6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconLock = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <rect x="5" y="10.5" width="14" height="10.5" rx="2.5" fill="currentColor" />
    <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" strokeWidth={2.4} />
  </svg>
);

export const IconClose = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
  </svg>
);

export const Star = ({ filled, size, className }: P & { filled: boolean }) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <defs>
      <linearGradient id={filled ? 'starOn' : 'starOff'} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={filled ? '#fff27a' : '#d7d2ea'} />
        <stop offset="1" stopColor={filled ? '#ffb000' : '#9b93bf'} />
      </linearGradient>
    </defs>
    <path
      d="M12 2.2l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 16.9 6.2 20l1.2-6.5L2.6 9l6.5-.8Z"
      fill={`url(#${filled ? 'starOn' : 'starOff'})`}
      stroke={filled ? '#e07b00' : '#7d74a8'}
      strokeWidth={1.3}
      strokeLinejoin="round"
    />
    <path d="M9.3 8.6 12 4.6l1.2 2.6" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.2} strokeLinecap="round" />
  </svg>
);

export const Heart = ({ size, className }: P) => (
  <svg viewBox="0 0 24 24" style={box(size)} className={className} aria-hidden>
    <path d="M12 21s-8.5-5.2-8.5-11A4.8 4.8 0 0 1 12 7.3 4.8 4.8 0 0 1 20.5 10c0 5.8-8.5 11-8.5 11Z" fill="#ff4f8b" stroke="#fff" strokeWidth={1.6} />
  </svg>
);
