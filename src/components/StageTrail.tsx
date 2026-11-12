import { motion } from 'framer-motion';

/**
 * Picture-only progress through the three learning stages:
 * look & discover → challenge → speak & create. No text for children to read.
 */
const ICONS = [
  // magnifier (discover)
  <path key="d" d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 2.4a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2ZM15.3 16.6l1.7-1.7 4.3 4.3-1.7 1.7Z" fill="currentColor" />,
  // puzzle piece (challenge)
  <path
    key="c"
    d="M9 3.5a2.2 2.2 0 0 1 4.4 0V5h3.1c.8 0 1.5.7 1.5 1.5v3.1h1.5a2.2 2.2 0 0 1 0 4.4H18v3.5c0 .8-.7 1.5-1.5 1.5H13v-1.4a2.2 2.2 0 0 0-4.4 0V19H5.5c-.8 0-1.5-.7-1.5-1.5V14h1.4a2.2 2.2 0 0 0 0-4.4H4V6.5C4 5.7 4.7 5 5.5 5H9Z"
    fill="currentColor"
  />,
  // microphone + sparkle (speak & create)
  <g key="s" fill="currentColor">
    <rect x="7.5" y="3" width="6" height="10.5" rx="3" />
    <path d="M5 11a5.5 5.5 0 0 0 11 0h-1.8a3.7 3.7 0 0 1-7.4 0Zm4.6 7.4h1.8V21H9.6Z" />
    <path d="m19 3 .8 1.7 1.7.8-1.7.8L19 8l-.8-1.7-1.7-.8 1.7-.8Z" />
  </g>,
];

export function StageTrail({ stage, progress = 0 }: { stage: 0 | 1 | 2 | 3; progress?: number }) {
  return (
    <div className="stage-trail" aria-label={`Part ${Math.min(stage + 1, 3)} of 3`}>
      {ICONS.map((icon, i) => (
        <div key={i} className={`stage-trail__step ${i < stage ? 'is-done' : i === stage ? 'is-now' : ''}`}>
          <motion.span className="stage-trail__icon" animate={i === stage ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ repeat: i === stage ? Infinity : 0, duration: 1.8 }}>
            <svg viewBox="0 0 24 24" width="62%" height="62%" aria-hidden>
              {icon}
            </svg>
          </motion.span>
          {i < 2 && (
            <span className="stage-trail__bar">
              <span style={{ width: `${i < stage ? 100 : i === stage ? Math.round(progress * 100) : 0}%` }} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
