interface StageLayout {
  scale: number;
  height: number;
  transform: string;
}

export function stageLayout(
  available: number,
  width: number,
  height: number,
  maxScale: number,
): StageLayout {
  const scale = available > 0 && width > 0 ? Math.min(maxScale, available / width) : 0;
  const offset = Math.max(0, (available - width * scale) / 2);
  return {
    scale,
    height: height * scale,
    transform: `translate(${offset}px, 0) scale(${scale})`,
  };
}
