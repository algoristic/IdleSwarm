export interface ParallaxPan {
  x: number;
  y: number;
}

export interface ParallaxLayerStyle {
  transform: string;
  filter: string;
}

export interface ParallaxLayers {
  far: ParallaxLayerStyle;
  haze: ParallaxLayerStyle;
  map: ParallaxLayerStyle;
}

export function clampPan(x: number, y: number, max: number): ParallaxPan {
  const length = Math.hypot(x, y);
  if (length <= max) return { x, y };
  return { x: (x * max) / length, y: (y * max) / length };
}

function layerStyle(
  pan: ParallaxPan,
  depth: number,
  scale: number,
  blur: string,
  rest: string,
): ParallaxLayerStyle {
  const filter = [blur, rest].filter((part) => part !== '').join(' ');
  return {
    transform: `translate(${pan.x * depth}px, ${pan.y * depth}px) scale(${scale})`,
    filter: filter === '' ? 'none' : filter,
  };
}

export function parallaxLayers(pan: ParallaxPan, blur: boolean): ParallaxLayers {
  return {
    far: layerStyle(pan, 0.35, 1.15, blur ? 'blur(4px)' : '', 'brightness(0.95)'),
    haze: layerStyle(pan, 0.65, 1.05, blur ? 'blur(1.5px)' : '', ''),
    map: layerStyle(pan, 1, 1, '', ''),
  };
}
