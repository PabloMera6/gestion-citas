// En un diseño en blanco y negro no podemos distinguir entrenadores por
// color, así que cada uno recibe una trama determinista (según su id).
export const PATTERN_COUNT = 6;

export function trainerPatternIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % PATTERN_COUNT;
}

export function trainerPatternClass(id: string): string {
  return `pat-${trainerPatternIndex(id)}`;
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
