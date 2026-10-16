export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'X-XSRF-TOKEN';

export function readCookie(name: string, cookie: string): string | undefined {
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export const isUnsafe = (method: string) => !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
