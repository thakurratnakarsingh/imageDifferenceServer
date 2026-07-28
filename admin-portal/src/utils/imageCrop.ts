export interface CropArea {
  sourceX: number;
  sourceY: number;
  sourceSize: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function getSquareCrop(
  width: number,
  height: number,
  zoom: number,
  horizontalPosition: number,
  verticalPosition: number,
): CropArea {
  const safeZoom = clamp(zoom, 1, 3);
  const sourceSize = Math.min(width, height) / safeZoom;
  const availableX = Math.max(0, width - sourceSize);
  const availableY = Math.max(0, height - sourceSize);
  return {
    sourceX: availableX * (clamp(horizontalPosition, 0, 100) / 100),
    sourceY: availableY * (clamp(verticalPosition, 0, 100) / 100),
    sourceSize,
  };
}
