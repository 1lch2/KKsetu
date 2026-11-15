// TXT imports accept Base64 image data only, never HTML or arbitrary URLs.
export const parseImageText = (text: string): string | null => {
  const value = text.trim();
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]*)$/i);
  if (/^data:/i.test(value) && !match) return null;

  const mimeType = match ? match[1].toLowerCase() : 'image/png';
  const base64 = (match ? match[2] : value).replace(/\s/g, '');
  if (
    !base64 ||
    !/^[a-z0-9+/]*={0,2}$/i.test(base64) ||
    base64.length % 4 === 1 ||
    (base64.includes('=') && base64.length % 4 !== 0)
  ) {
    return null;
  }

  return `data:${mimeType};base64,${base64}`;
};
