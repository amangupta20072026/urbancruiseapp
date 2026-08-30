/* eslint-disable no-bitwise */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map(w => w.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean);
  const two = letters
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  return two || '?';
}

const AVATAR_PALETTE = [
  { bg: '#DCFCE7', fg: '#16A34A' }, // green
  { bg: '#FFEDD5', fg: '#EA580C' }, // orange
  { bg: '#DBEAFE', fg: '#2563EB' }, // blue
  { bg: '#F3E8FF', fg: '#7C3AED' }, // purple
  { bg: '#FEF3C7', fg: '#D97706' }, // amber
  { bg: '#FCE7F3', fg: '#DB2777' }, // pink
];

export function avatarColorFor(id: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
