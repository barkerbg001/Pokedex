export const typeColors = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

export function getTypeColor(type) {
  return typeColors[type] || '#888';
}

function relativeLuminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const DARK_TEXT = '#1a1a1a';

// White or near-black text, whichever contrasts more with the type's color
// (WCAG AA for every type; white alone fails on 13 of the 18).
export function getTypeTextColor(type) {
  const bg = relativeLuminance(getTypeColor(type));
  const onWhite = 1.05 / (bg + 0.05);
  const onDark = (bg + 0.05) / (relativeLuminance(DARK_TEXT) + 0.05);
  return onWhite >= onDark ? '#fff' : DARK_TEXT;
}
