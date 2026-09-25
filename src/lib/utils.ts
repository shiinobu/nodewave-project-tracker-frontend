export { cn } from 'cn';

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function isSafeUrl(url: string) {
  return /^https?:\/\//i.test(url);
}
