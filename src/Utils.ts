export interface Predicate<T> {
  (input: T): boolean;
}

export async function asyncFilter<T>(arr: T[], predicate: Predicate<T>): Promise<T[]> {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
}

export function removeTrailingSlash(path: string): string {
  if (path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

export function removeOngoingSlash(path: string): string {
  if (path.startsWith("/")) {
    return path.slice(1, path.length);
  }
  return path;
}
