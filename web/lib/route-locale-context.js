import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

export function withRouteLocale(lang, fn) {
  return storage.run(lang || 'de', fn);
}

export function getRouteLocale() {
  return storage.getStore() || 'de';
}
