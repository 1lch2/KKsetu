const isDevelopment =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const BASE_URL = isDevelopment
  ? `${window.location.protocol}//${window.location.host}`
  : 'https://kksetu.pages.dev';
