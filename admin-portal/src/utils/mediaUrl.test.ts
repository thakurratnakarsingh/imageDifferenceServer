import { describe, expect, it } from 'vitest';
import { resolveMediaUrl } from './mediaUrl';

describe('admin media URL resolution', () => {
  it('uses the admin page origin for media on the same host', () => {
    expect(resolveMediaUrl(
      'http://13.53.200.162/uploads/levels/1/original.jpg',
      'http://13.53.200.162:5000',
    )).toBe('http://13.53.200.162:5000/uploads/levels/1/original.jpg');
  });

  it('keeps external CDN hosts unchanged', () => {
    expect(resolveMediaUrl(
      'https://cdn.example.com/level.jpg',
      'http://13.53.200.162:5000',
    )).toBe('https://cdn.example.com/level.jpg');
  });
});
