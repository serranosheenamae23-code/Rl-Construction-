import React from 'react';

interface RLLogoProps {
  className?: string;
  lightMode?: boolean;
}

export const RLLogo: React.FC<RLLogoProps> = ({ className = 'h-11', lightMode = false }) => {
  return (
    <svg
      viewBox="0 0 160 66"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      id="rl-construction-logo-svg"
    >
      <defs>
        {/* High-fidelity metallic gold gradient to simulate the gold embossed look */}
        <linearGradient id="gold-metallic" x1="0" y1="0" x2="160" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E5C060" />
          <stop offset="20%" stopColor="#FDF2A9" />
          <stop offset="40%" stopColor="#D8A53A" />
          <stop offset="60%" stopColor="#FFF2B2" />
          <stop offset="85%" stopColor="#C4932D" />
          <stop offset="100%" stopColor="#EAD284" />
        </linearGradient>
        {/* Smooth gradient shadow overlay for extra depth */}
        <filter id="gold-emboss-shadow" x="-5%" y="-5%" width="110%" height="110%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Gold metallic house architectural stroke */}
      {/* 
        M 148 48 - Extends right to underline the text
        L 22 48 - Horizontal base line
        L 22 28 - Vertical left side wall
        L 12 28 - Mini left overhang for the roof
        L 45 11 - Peak of the roof (centered at 45)
        L 78 28 - Right side of the roof
        L 70 28 - Inset right step-back
        L 70 34 - Drop-down vertical tail
      */}
      <path
        d="M 148 48 L 22 48 L 22 28 L 12 28 L 45 11 L 78 28 L 70 28 L 70 34"
        stroke="url(#gold-metallic)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#gold-emboss-shadow)"
      />

      {/* "RL" Text - Gold embossed */}
      <text
        x="33"
        y="42"
        fill="url(#gold-metallic)"
        fontFamily='"Space Grotesk", "Outfit", "Inter", sans-serif'
        fontWeight="900"
        fontSize="17.5"
        letterSpacing="0.2"
        filter="url(#gold-emboss-shadow)"
      >
        RL
      </text>

      {/* "CON" Text - Crisp contrast (white on dark background, dark slate on light mode) */}
      <text
        x="61"
        y="42"
        fill={lightMode ? '#1E293B' : '#FFFFFF'}
        fontFamily='"Space Grotesk", "Outfit", "Inter", sans-serif'
        fontWeight="900"
        fontSize="17.5"
        letterSpacing="0.2"
        filter="url(#gold-emboss-shadow)"
      >
        CON
      </text>

      {/* Subtitle text "BUILD | DESIGN | LANDSCAPE" */}
      <text
        x="82"
        y="57"
        fill={lightMode ? '#475569' : '#94A3B8'}
        fontFamily='"Inter", system-ui, sans-serif'
        fontWeight="bold"
        fontSize="4.5"
        letterSpacing="1.2"
        textAnchor="middle"
        opacity="0.95"
      >
        BUILD | DESIGN | LANDSCAPE
      </text>
    </svg>
  );
};
