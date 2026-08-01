import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Rect, Stage, Text } from 'react-konva';
import type { Difference } from '../types';
import { api } from '../api/client';

function useBitmap(src: string) {
  const [image, setImage] = useState<HTMLImageElement>();

  useEffect(() => {
    const next = new Image();
    next.crossOrigin = 'anonymous';
    next.src = src;
    next.onload = () => setImage(next);
    return () => { next.onload = null; };
  }, [src]);

  return image;
}

function useElementWidth(elementRef: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const update = () => setWidth(Math.round(element.getBoundingClientRect().width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef]);

  return width;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

function NumberBadge({ x, y, number }: { x: number; y: number; number: number }) {
  const label = String(number);
  const diameter = number === 10 ? 26 : 23;
  return <Group x={x} y={y} listening={false}>
    <Circle radius={diameter / 2} fill="#102019" stroke="#d8ff52" strokeWidth={2}/>
    <Text
      x={-diameter / 2}
      y={-diameter / 2}
      width={diameter}
      height={diameter}
      text={label}
      align="center"
      verticalAlign="middle"
      fontSize={number === 10 ? 11 : 13}
      fontStyle="bold"
      fill="#ffffff"
    />
  </Group>;
}

export function DifferenceCanvas({ src, differences, onChanged }: { src: string; differences: Difference[]; onChanged: () => void }) {
  const image = useBitmap(src);
  const containerRef = useRef<HTMLDivElement>(null);
  const measuredWidth = useElementWidth(containerRef);
  const width = measuredWidth || 1;
  const height = image ? width * image.height / image.width : width;
  const activeDifferences = useMemo(
    () => differences.filter(difference => difference.isActive).sort((a, b) => a.differenceNumber - b.differenceNumber),
    [differences]
  );

  async function moved(difference: Difference, x: number, y: number) {
    await api.put(`/admin/differences/${difference.id}`, {
      normalizedX: x / width,
      normalizedY: y / height
    });
    onChanged();
  }

  return <div ref={containerRef} className="difference-canvas">
    {image && <Stage width={width} height={height} className="review-stage">
      <Layer>
        <KonvaImage image={image} width={width} height={height}/>
        {activeDifferences.map(difference => {
          if (difference.shapeType === 'circle') {
            const radius = Number(difference.normalizedRadius) * width;
            const x = Number(difference.normalizedX) * width;
            const y = Number(difference.normalizedY) * height;
            return <Group
              key={difference.id}
              x={x}
              y={y}
              draggable
              dragBoundFunc={position => ({
                x: clamp(position.x, radius, width - radius),
                y: clamp(position.y, radius, height - radius)
              })}
              onDragEnd={event => moved(difference, event.target.x(), event.target.y())}
            >
              <Circle radius={radius} stroke="#d8ff52" strokeWidth={3} fill="rgba(216,255,82,.10)"/>
              <NumberBadge x={0} y={0} number={difference.differenceNumber}/>
            </Group>;
          }

          const regionWidth = Number(difference.normalizedWidth) * width;
          const regionHeight = Number(difference.normalizedHeight) * height;
          const x = Number(difference.normalizedX) * width;
          const y = Number(difference.normalizedY) * height;
          return <Group
            key={difference.id}
            x={x}
            y={y}
            draggable
            dragBoundFunc={position => ({
              x: clamp(position.x, 0, width - regionWidth),
              y: clamp(position.y, 0, height - regionHeight)
            })}
            onDragEnd={event => moved(difference, event.target.x(), event.target.y())}
          >
            <Rect width={regionWidth} height={regionHeight} cornerRadius={8} stroke="#d8ff52" strokeWidth={3} fill="rgba(216,255,82,.10)"/>
            <NumberBadge x={regionWidth / 2} y={regionHeight / 2} number={difference.differenceNumber}/>
          </Group>;
        })}
      </Layer>
    </Stage>}
  </div>;
}
