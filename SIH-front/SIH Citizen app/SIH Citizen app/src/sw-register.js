export async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js',);
      console.log('SW registered', reg);
    } catch (err) {
      console.warn('SW reg failed', err);
    }
  }
}
