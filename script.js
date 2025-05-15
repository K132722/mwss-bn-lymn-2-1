// Load saved data from localStorage or use default
const steelData = JSON.parse(localStorage.getItem('steelData')) || {
  bundles: {
      "18": { weightPerBundle: 1.968, rodsPerBundle: 82 },
      "16": { weightPerBundle: 1.972, rodsPerBundle: 104 },
      "14": { weightPerBundle: 1.975, rodsPerBundle: 136 },
      "12": { weightPerBundle: 1.918, rodsPerBundle: 180 },
      "10": { weightPerBundle: 1.999, rodsPerBundle: 270 },
      "8": { weightPerBundle: 1.991, rodsPerBundle: 420 }
  },
  rods: {
      "18": 40,
      "16": 50,
      "14": 66,
      "12": 90,
      "10": 130,
      "8": 200
  }
};

// تسجيل Service Worker لتثبيت PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(registration => {
          console.log('ServiceWorker registration successful');
      }).catch(err => {
          console.log('ServiceWorker registration failed: ', err);
      });
  });
}

// وظيفة نسخ النتائج
function copyResult(resultText) {
  navigator.clipboard.writeText(resultText).then(() => {
      alert("تم نسخ النتيجة");
  }).catch(err => {
      console.error('Failed to copy: ', err);
      alert("فشل نسخ النتيجة");
  });
}