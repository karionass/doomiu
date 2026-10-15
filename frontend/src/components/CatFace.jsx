// Цветные котики для настроения: 1 — грустный ... 5 — счастливый
export const MOODS = [
  { level: 1, color: '#F4B6B6' },
  { level: 2, color: '#F8D2B0' },
  { level: 3, color: '#F7EBB0' },
  { level: 4, color: '#CDE8C4' },
  { level: 5, color: '#A8DCC8' },
];

const INK = '#4A4560';

export default function CatFace({ level, size = 80, label }) {
  const mood = MOODS.find((m) => m.level === level) || MOODS[2];
  const stroke = { stroke: INK, strokeWidth: 2.5, strokeLinecap: 'round', fill: 'none' };

  let eyes, mouth, extra = null;

  if (level === 1) {
    eyes = (
      <>
        <circle cx="36" cy="56" r="3.8" fill={INK} />
        <circle cx="64" cy="56" r="3.8" fill={INK} />
        <path d="M27 49 L43 44" {...stroke} />
        <path d="M73 49 L57 44" {...stroke} />
      </>
    );
    mouth = <path d="M42 77 Q50 69 58 77" {...stroke} />;
    extra = <path d="M33 62 Q30 69 33 72 Q37 69 33 62 Z" fill="#8EC9F0" />;
  } else if (level === 2) {
    eyes = (
      <>
        <circle cx="36" cy="55" r="3.8" fill={INK} />
        <circle cx="64" cy="55" r="3.8" fill={INK} />
        <path d="M29 47 L42 47" {...stroke} />
        <path d="M71 47 L58 47" {...stroke} />
      </>
    );
    mouth = <path d="M43 75 Q50 71 57 75" {...stroke} />;
  } else if (level === 3) {
    eyes = (
      <>
        <circle cx="36" cy="55" r="3.8" fill={INK} />
        <circle cx="64" cy="55" r="3.8" fill={INK} />
      </>
    );
    mouth = <path d="M43 73 L57 73" {...stroke} />;
  } else if (level === 4) {
    eyes = (
      <>
        <circle cx="36" cy="55" r="4" fill={INK} />
        <circle cx="64" cy="55" r="4" fill={INK} />
        <circle cx="37.3" cy="53.6" r="1.2" fill="#fff" />
        <circle cx="65.3" cy="53.6" r="1.2" fill="#fff" />
      </>
    );
    mouth = <path d="M41 70 Q50 79 59 70" {...stroke} />;
    extra = (
      <>
        <circle cx="25" cy="66" r="5" fill="#F7B6C2" opacity="0.55" />
        <circle cx="75" cy="66" r="5" fill="#F7B6C2" opacity="0.55" />
      </>
    );
  } else {
    eyes = (
      <>
        <path d="M29 57 Q36 47 43 57" {...stroke} />
        <path d="M57 57 Q64 47 71 57" {...stroke} />
      </>
    );
    mouth = <path d="M39 69 Q50 88 61 69 Z" fill="#F29BA6" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />;
    extra = (
      <>
        <circle cx="24" cy="67" r="5.5" fill="#F7B6C2" opacity="0.7" />
        <circle cx="76" cy="67" r="5.5" fill="#F7B6C2" opacity="0.7" />
        <path d="M86 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#FFE08A" />
      </>
    );
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label}>
      {/* уши */}
      <path d="M16 44 L20 10 L47 27 Z" fill={mood.color} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M84 44 L80 10 L53 27 Z" fill={mood.color} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M23 34 L24.5 19 L38 27.5 Z" fill="#fff" opacity="0.55" />
      <path d="M77 34 L75.5 19 L62 27.5 Z" fill="#fff" opacity="0.55" />
      {/* голова */}
      <ellipse cx="50" cy="58" rx="38" ry="33" fill={mood.color} stroke={INK} strokeWidth="2.5" />
      {/* щёчки-полоски */}
      <path d="M44 28 L44 35 M50 26 L50 34 M56 28 L56 35" stroke={INK} strokeWidth="2.2" strokeLinecap="round" opacity="0.25" />
      {extra}
      {eyes}
      {/* носик */}
      <path d="M46.5 62 L53.5 62 L50 66 Z" fill="#E98A9B" stroke="#E98A9B" strokeWidth="1.5" strokeLinejoin="round" />
      {mouth}
      {/* усы */}
      <path d="M14 62 L28 64 M14 70 L28 68 M86 62 L72 64 M86 70 L72 68" stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
