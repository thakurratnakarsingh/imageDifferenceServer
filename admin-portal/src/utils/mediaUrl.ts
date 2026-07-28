export function resolveMediaUrl(value: string | null | undefined, currentOrigin?: string) {
  if (!value) return '';
  const origin = currentOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!origin) return value;
  try {
    const pageUrl = new URL(origin);
    const mediaUrl = new URL(value, pageUrl);
    if (mediaUrl.hostname === pageUrl.hostname) {
      return `${pageUrl.origin}${mediaUrl.pathname}${mediaUrl.search}${mediaUrl.hash}`;
    }
    return mediaUrl.toString();
  } catch {
    return value;
  }
}
