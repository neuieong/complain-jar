// Animated SVG jar that fills proportionally to the number of complaints.
// The fill level is clamped between 0–100 and animates smoothly via CSS.

import { useId } from 'react'

interface JarVisualProps {
  fillPercent: number  // 0–100
  busted?: boolean
}

export function JarVisual({ fillPercent, busted = false }: JarVisualProps) {
  const clipId = useId()
  const fill = Math.min(100, Math.max(0, fillPercent))

  // The jar interior spans roughly y=72 to y=230 (158px tall in SVG coords).
  // We compute the top of the liquid based on fill percentage.
  const jarTopY = 72
  const jarBottomY = 230
  const jarHeight = jarBottomY - jarTopY
  const liquidTopY = jarBottomY - (fill / 100) * jarHeight

  return (
    <div className="flex flex-col items-center select-none">
      <svg
        viewBox="0 0 160 260"
        width="180"
        height="260"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Complain jar, ${Math.round(fill)}% full`}
        role="img"
      >
        <defs>
          {/* Clip to the jar interior so liquid doesn't overflow */}
          <clipPath id={clipId}>
            <path d="M38,72 Q30,72 26,80 L18,228 Q17,240 30,242 L130,242 Q143,240 142,228 L134,80 Q130,72 122,72 Z" />
          </clipPath>

          {/* Wavy liquid top edge */}
          <style>{`
            @keyframes wave {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .wave-anim {
              animation: wave 2.4s linear infinite;
            }
          `}</style>
        </defs>

        {/* ── Jar lid ── */}
        <rect x="42" y="18" width="76" height="14" rx="4" fill="#d97706" />
        <rect x="36" y="30" width="88" height="10" rx="3" fill="#b45309" />

        {/* ── Jar neck ── */}
        <rect x="38" y="40" width="84" height="32" rx="6" fill="#fde68a" opacity="0.85" />

        {/* ── Jar body (background glass) ── */}
        <path
          d="M38,72 Q30,72 26,80 L18,228 Q17,240 30,242 L130,242 Q143,240 142,228 L134,80 Q130,72 122,72 Z"
          fill="#fef3c7"
          opacity="0.5"
        />

        {/* ── Liquid fill (clipped to jar shape) ── */}
        <g clipPath={`url(#${clipId})`}>
          {/* Solid fill below the wave */}
          <rect
            x="0"
            y={liquidTopY + 6}
            width="160"
            height={jarBottomY - liquidTopY + 10}
            fill={busted ? '#6ee7b7' : '#fbbf24'}
            opacity="0.85"
            style={{ transition: 'y 0.6s ease, height 0.6s ease' }}
          />

          {/* Wave on top of liquid */}
          {fill > 0 && (
            <g
              style={{
                transform: `translateY(${liquidTopY - 6}px)`,
                transition: 'transform 0.6s ease',
              }}
            >
              <g className="wave-anim">
                <path
                  d="M0,6 C20,0 40,12 60,6 C80,0 100,12 120,6 C140,0 160,12 180,6 C200,0 220,12 240,6 C260,0 280,12 300,6 C320,0 340,12 360,6 L360,20 L0,20 Z"
                  fill={busted ? '#6ee7b7' : '#fbbf24'}
                  opacity="0.85"
                />
              </g>
            </g>
          )}
        </g>

        {/* ── Jar body outline (glass sheen) ── */}
        <path
          d="M38,72 Q30,72 26,80 L18,228 Q17,240 30,242 L130,242 Q143,240 142,228 L134,80 Q130,72 122,72 Z"
          fill="none"
          stroke="#d97706"
          strokeWidth="2.5"
        />

        {/* ── Glass shine ── */}
        <path
          d="M46,90 Q44,130 46,170"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* ── Jar neck outline ── */}
        <rect
          x="38"
          y="40"
          width="84"
          height="32"
          rx="6"
          fill="none"
          stroke="#d97706"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}
