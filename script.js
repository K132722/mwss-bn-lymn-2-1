// Load saved data from localStorage or use default
const steelData = JSON.parse(localStorage.getItem('steelData')) || {
  bundles: {
    "20": { weightPerBundle: 1.956, rodsPerBundle: 66 },
    "18": { weightPerBundle: 1.968, rodsPerBundle: 82 },
    "16": { weightPerBundle: 1.972, rodsPerBundle: 104 },
    "14": { weightPerBundle: 1.975, rodsPerBundle: 136 },
    "12": { weightPerBundle: 1.918, rodsPerBundle: 180 },
    "10": { weightPerBundle: 1.999, rodsPerBundle: 270 },
    "8": { weightPerBundle: 1.991, rodsPerBundle: 420 }
  },
  rods: {
    "20": 32,
    "18": 40,
    "16": 50,
    "14": 66,
    "12": 90,
    "10": 130,
    "8": 200
  }
};

// Save data to localStorage and IndexedDB with timestamp
function saveData() {
  const timestamp = Date.now();
  const dataToSave = {
    ...steelData,
    lastUpdated: timestamp
  };

  localStorage.setItem('steelData', JSON.stringify(dataToSave));
  localStorage.setItem('lastSyncTime', timestamp);

  if ('indexedDB' in window) {
    const request = indexedDB.open('binaYemenDB', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('steelData')) {
        db.createObjectStore('steelData');
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['steelData'], 'readwrite');
      const store = transaction.objectStore('steelData');
      store.put(steelData, 'currentData');
    };
  }
}

// Save image offline
async function saveImageOffline(imageBlob, timestamp) {
  // Save to IndexedDB
  if ('indexedDB' in window) {
    const request = indexedDB.open('binaYemenDB', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      store.put(imageBlob, timestamp);
    };
  }

  // Save to ServiceWorker cache
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const arrayBuffer = await imageBlob.arrayBuffer();
    navigator.serviceWorker.controller.postMessage({
      type: 'SAVE_IMAGE',
      imageData: arrayBuffer,
      timestamp
    });
  }
}

// تسجيل Service Worker لتثبيت PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      // Check for updates
      registration.update().then(() => {
        console.log('ServiceWorker update check completed');
      });
    }).catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

// Check if app is running as PWA
function isRunningAsPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
}

// Show install prompt for PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('PWA install prompt available');

  // You can show your custom install button here
  // and call deferredPrompt.prompt() when clicked
});

// وظيفة نسخ النتائج
function copyResult(resultText) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(resultText).then(() => {
      alert("تم نسخ النتيجة");
    }).catch(err => {
      console.error('Failed to copy: ', err);
      alert("فشل نسخ النتيجة");
    });
  } else {
    // Fallback for browsers that don't support clipboard API
    const textarea = document.createElement('textarea');
    textarea.value = resultText;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert("تم نسخ النتيجة");
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert("فشل نسخ النتيجة");
    }
    document.body.removeChild(textarea);
  }
}

// Detect offline status
window.addEventListener('online', () => {
  console.log('Application is online');
  // You can show a message or sync data here
});

window.addEventListener('offline', () => {
  console.log('Application is offline');
  // You can show a message that app is working in offline mode
});

// Offline notification
function showOfflineNotification() {
  const notification = document.createElement('div');
  notification.className = 'offline-notification';
  notification.textContent = 'أنت في وضع عدم الاتصال';
  document.body.appendChild(notification);
  notification.style.display = 'block';
  setTimeout(() => notification.style.display = 'none', 3000);
}

// Handle image sharing
async function shareImage(imageFile) {
  try {
    const imageData = await imageFile.arrayBuffer();
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHARE_IMAGE',
        imageData: imageData
      });
    }
    localStorage.setItem(`shared-image-${Date.now()}`, imageData);
  } catch (error) {
    console.error('Error sharing image:', error);
  }
}

// Initial check
window.addEventListener('load', () => {
  if (!navigator.onLine) {
    showOfflineNotification();
  }
});

window.addEventListener('online', () => {
  console.log('Application is online');
});

window.addEventListener('offline', () => {
  console.log('Application is offline');
  showOfflineNotification();
});

// Enhanced data saving function
function saveAllData() {
  const timestamp = Date.now();
  const dataToSave = {
    steelData,
    calculatorState: {
      display: document.getElementById('calcDisplay')?.value || '',
      history: document.getElementById('calcHistory')?.value || ''
    },
    lastUpdated: timestamp
  };

  // Save to localStorage
  localStorage.setItem('steelData', JSON.stringify(dataToSave));
  localStorage.setItem('lastSyncTime', timestamp);

  // Save to IndexedDB
  if ('indexedDB' in window) {
    const request = indexedDB.open('binaYemenDB', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('steelData')) {
        db.createObjectStore('steelData');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['steelData'], 'readwrite');
      const store = transaction.objectStore('steelData');
      store.put(dataToSave, 'currentData');
    };
  }
}

// Auto-save data periodically and before app closes
setInterval(saveAllData, 30000); // Save every 30 seconds
window.addEventListener('beforeunload', saveAllData);

// Load data when page loads
window.addEventListener('load', async () => {
  try {
    // Try loading from IndexedDB first
    if ('indexedDB' in window) {
      const request = indexedDB.open('binaYemenDB', 2);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['steelData'], 'readonly');
        const store = transaction.objectStore('steelData');
        const getRequest = store.get('currentData');

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const data = getRequest.result;
            steelData = data.steelData;
            if (data.calculatorState) {
              const calcDisplay = document.getElementById('calcDisplay');
              const calcHistory = document.getElementById('calcHistory');
              if (calcDisplay) calcDisplay.value = data.calculatorState.display;
              if (calcHistory) calcHistory.value = data.calculatorState.history;
            }
          }
        };
      };
    }
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to localStorage
    const savedData = localStorage.getItem('steelData');
    if (savedData) {
      const data = JSON.parse(savedData);
      steelData = data.steelData || data;
    }
  }
});

// Load calculator state
function loadCalculatorState() {
  const savedState = localStorage.getItem('calculatorState');
  if (savedState) {
    const state = JSON.parse(savedState);
    const calcDisplay = document.getElementById('calcDisplay');
    const calcHistory = document.getElementById('calcHistory');
    if (calcDisplay && state.display) calcDisplay.value = state.display;
    if (calcHistory && state.history) calcHistory.value = state.history;
  }
}

// Initialize calculator state when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  loadCalculatorState();
});

// Calculator functionality
function openCalculator() {
  const modal = document.getElementById('calculatorModal');
  modal.style.display = 'block';
}

function closeCalculator() {
  const modal = document.getElementById('calculatorModal');
  modal.style.display = 'none';
}

function appendToDisplay(value) {
  const display = document.getElementById('calcDisplay');
  display.value += value;
}

function clearDisplay() {
  const display = document.getElementById('calcDisplay');
  display.value = '';
}

function calculate() {
  const display = document.getElementById('calcDisplay');
  const history = document.getElementById('calcHistory');
  try {
    const expression = display.value;
    const result = eval(expression);
    if (history.value) {
      history.value += '\n' + expression + ' = ' + result;
    } else {
      history.value = expression + ' = ' + result;
    }
    display.value = result;
    history.scrollTop = history.scrollHeight;
  } catch (error) {
    display.value = 'خطأ';
  }
}

function clearAll() {
  const display = document.getElementById('calcDisplay');
  const history = document.getElementById('calcHistory');
  display.value = '';
  history.value = '';
}

function backspace() {
  const display = document.getElementById('calcDisplay');
  display.value = display.value.slice(0, -1);
}

function percentage() {
  const display = document.getElementById('calcDisplay');
  try {
    display.value = eval(display.value) / 100;
  } catch (error) {
    display.value = 'خطأ';
  }
}

function squareRoot() {
  const display = document.getElementById('calcDisplay');
  try {
    display.value = Math.sqrt(eval(display.value));
  } catch (error) {
    display.value = 'خطأ';
  }
}

function power() {
  const display = document.getElementById('calcDisplay');
  try {
    display.value = Math.pow(eval(display.value), 2);
  } catch (error) {
    display.value = 'خطأ';
  }
}

// Close calculator when clicking outside
window.addEventListener('click', (event) => {
  const modal = document.getElementById('calculatorModal');
  if (event.target === modal) {
    closeCalculator();
  }
});

// Calculator functionality
function openCalculator() {
  const modal = document.getElementById('calculatorModal');
  modal.style.display = 'block';
}

function closeCalculator() {
  const modal = document.getElementById('calculatorModal');
  modal.style.display = 'none';
}

function appendToDisplay(value) {
  const display = document.getElementById('calcDisplay');
  display.value += value;
}

function clearDisplay() {
  const display = document.getElementById('calcDisplay');
  display.value = '';
}

function addNewScreen() {
  const container = document.getElementById('screensContainer');
  const screen = document.createElement('div');
  screen.className = 'calc-screen';
  screen.innerHTML = `
    <input type="text" class="calc-display" value="0" readonly>
    <textarea class="calc-history" readonly></textarea>
  `;
  container.appendChild(screen);
  container.scrollTop = container.scrollHeight;
}

function calculate() {
  const activeScreen = document.activeElement.closest('.calc-screen');
  if (!activeScreen) return;

  const display = activeScreen.querySelector('.calc-display');
  const history = activeScreen.querySelector('.calc-history');

  try {
    const expression = display.value;
    const result = eval(expression);
    if (history.value) {
      history.value += '\n' + expression + ' = ' + result;
    } else {
      history.value = expression + ' = ' + result;
    }
    display.value = result;
    history.scrollTop = history.scrollHeight;
  } catch (error) {
    display.value = 'خطأ';
  }
}

function appendToDisplay(value) {
  const activeScreen = document.activeElement.closest('.calc-screen');
  if (!activeScreen) return;

  const display = activeScreen.querySelector('.calc-display');
  if (display.value === '0' && value !== '.') {
    display.value = value;
  } else {
    display.value += value;
  }
}

function clearDisplay() {
  const activeScreen = document.activeElement.closest('.calc-screen');
  if (!activeScreen) return;

  const display = activeScreen.querySelector('.calc-display');
  display.value = '0';
}

function clearAll() {
  const display = document.getElementById('calcDisplay');
  const history = document.getElementById('calcHistory');
  display.value = '';
  history.value = '';
}

function backspace() {
  const display = document.getElementById('calcDisplay');
  display.value = display.value.slice(0, -1);
}

function percentage() {
  const display = document.getElementById('calcDisplay');
  try {
    display.value = eval(display.value) / 100;
  } catch (error) {
    display.value = 'خطأ';
  }
}

function squareRoot() {
  const display = document.getElementById('calcDisplay');
  try {
    display.value = Math.sqrt(eval(display.value));
  } catch (error) {
    display.value = 'خطأ';
  }
}

function power() {
  const display = document.getElementById('calcDisplay');
  try {
    display.value = Math.pow(eval(display.value), 2);
  } catch (error) {
    display.value = 'خطأ';
  }
}

// Close calculator when clicking outside
window.addEventListener('click', (event) => {
  const modal = document.getElementById('calculatorModal');
  if (event.target === modal) {
    closeCalculator();
  }
});

function toggleCalculator() {
    calculatorOpen = !calculatorOpen;
    const body = document.body;

    if (calculatorOpen) {
        calculatorContainer.classList.add('open');
        mainContainer.classList.add('calculator-open');
        body.classList.remove('zoom-enabled');
        body.classList.add('zoom-disabled');
        document.querySelector('meta[name="viewport"]').content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    } else {
        calculatorContainer.classList.remove('open');
        mainContainer.classList.remove('calculator-open');
        body.classList.remove('zoom-disabled');
        body.classList.add('zoom-enabled');
        document.querySelector('meta[name="viewport"]').content = 'width=device-width, initial-scale=1.0';
    }
}

// Initialize zoom state on page load
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    body.classList.add('zoom-enabled');
});

function clearDisplay() {
    current = '0';
    calcDisplay.textContent = current;
}

function toggleSign() {
    current = (parseFloat(current) * -1).toString();
    calcDisplay.textContent = current;
}

function percentage() {
    current = (parseFloat(current) / 100).toString();
    calcDisplay.textContent = current;
}

function press(val) {
    if (calcDisplay.textContent === '0' && val !== '.') {
        current = val;
    } else {
        current = calcDisplay.textContent + val;
    }
    calcDisplay.textContent = current;
}

function clearDisplay() {
    current = '0';
    calcDisplay.textContent = current;
}

function toggleSign() {
    current = (parseFloat(current) * -1).toString();
    calcDisplay.textContent = current;
}

function percentage() {
    current = (parseFloat(current) / 100).toString();
    calcDisplay.textContent = current;
}

function press(val) {
    if (calcDisplay.textContent === '0' && val !== '.') {
        current = val;
    } else {
        current = calcDisplay.textContent + val;
    }
    calcDisplay.textContent = current;
}