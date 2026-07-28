import { describe, expect, it } from 'vitest';
import { getSquareCrop } from './imageCrop';

describe('square image crop', () => {
  it('centres a square crop and respects zoom and position', () => {
    expect(getSquareCrop(1600, 1200, 1, 50, 50)).toEqual({
      sourceX: 200,
      sourceY: 0,
      sourceSize: 1200,
    });
    expect(getSquareCrop(1600, 1200, 2, 100, 0)).toEqual({
      sourceX: 1000,
      sourceY: 0,
      sourceSize: 600,
    });
  });

  it('clamps editor values to the supported range', () => {
    expect(getSquareCrop(900, 1200, 10, -20, 120)).toEqual({
      sourceX: 0,
      sourceY: 900,
      sourceSize: 300,
    });
  });
});
