// Simple service worker to enable PWA install prompt
self.addEventListener('fetch', (event) => {
  // We don't need to cache anything for the basic prompt to work
  // but we must have a functional service worker
});
