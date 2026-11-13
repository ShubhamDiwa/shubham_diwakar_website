export function publicName(value) {
  if (typeof value !== 'string') return '';
  const name = value.trim();
  return name.length <= 24 && /[\p{L}\p{N}]/u.test(name) &&
    /^[\p{L}\p{M}\p{N} ._’'-]+$/u.test(name) && !/(?:www\.|\.(?:com|net|org|in)$)/i.test(name) ? name : '';
}
