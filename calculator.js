// calculator.js

document.addEventListener('DOMContentLoaded', function() {
    // متغيّرات التطبيق
    let calculatorOpen = false;
    let isDragging = false;
    let startX, startY, offsetX, offsetY;
    let isDraggingScroll = false;
    let startScrollX, scrollLeft;

    // متغيّرات الأرشيف (history)
    let sessions = [];
    let history = [];

    // كل شاشة نعرّفها كمجرّد كائن يحتوي على العنصرين: displayElement و resultElement
    let screens = [];
    let activeScreen = null;   // الكائن الذي يشير إلى الشاشة الحالية (editable)
    let caretPos = 0;          // موضع المؤشر في شاشة الإدخال الحالية
    let currentExpr = '';      // التعبير الجاري إدخاله في الشاشة الحالية

    // ==========================================
    // 🔊 دالة توليد صوت نقرة الأزرار (Web Audio API)
    // ==========================================
    function playClickSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine'; 
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); // تردد النغمة
            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // مستوى الصوت

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.05);
            oscillator.stop(audioCtx.currentTime + 0.05);
        } catch (e) {
            console.log("تفاعل المستخدم مطلوب أولاً لتشغيل الصوت");
        }
    }

    // ==========================================
    // 🔢 دالة تنسيق الأرقام بمسافات (كل 3 أرقام)
    // ==========================================
    function formatNumbersInExpression(expr) {
        // نستخدم التعبير النمطي للبحث عن الأرقام وتنسيقها بمسافات دون التأثير على العمليات الحسابية
        return expr.replace(/\d+(\.\d+)?/g, function(match) {
            let parts = match.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            return parts.join('.');
        });
    }

    // إنشاء عناصر DOM لزر الحاسبة والأرشيف والآلة الحاسبة
    const calcTab = document.createElement('div');
    calcTab.className = 'calc-tab';
    calcTab.id = 'calcTab';
    calcTab.innerHTML = '<i class="fas fa-calculator"></i>';
    calcTab.style.left = '20px';
    calcTab.style.bottom = '20px';
    calcTab.style.position = 'fixed';
    calcTab.style.zIndex = '1000'; 

    const historyPanel = document.createElement('div');
    historyPanel.className = 'history-panel';
    historyPanel.id = 'historyPanel';
    historyPanel.innerHTML = `
        <div class="history-header">
            <div class="history-title">الأرشيف (0)</div>
            <button class="history-clear" id="historyClear">
                <i class="fas fa-trash"></i>
            </button>
            <button class="history-close" id="historyClose">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="history-controls">
            <input type="text" id="historySearch" placeholder="بحث في الأرشيف...">
        </div>
        <div id="historyItems"></div>
    `;
    historyPanel.style.zIndex = '1003';
    historyPanel.style.transition = 'none';

    const calculatorContainer = document.createElement('div');
    calculatorContainer.className = 'calculator-container';
    calculatorContainer.id = 'calculatorContainer';
    calculatorContainer.style.zIndex = '1000'; 
    calculatorContainer.style.transition = 'none';
    calculatorContainer.innerHTML = `
        <div class="calculator-header">
            <img src="png 2.png" class="result-logo1" alt="شعار المؤسسة">
            <div class="result-inst1">
              مؤسسة بناء اليمن<br>
              لـــــحديـــــد الــتســلـيــح
            </div>
            <div class="calculator-title">الحاسبة</div>
            <button class="calculator-close" id="calculatorClose">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="calc-screens-container" id="calcScreensContainer">
            </div>
        <div class="arrow-controls">
            <div class="arrow-row">
                <button class="arrow-btn right" onclick="moveCaret('right')">▶</button>
                <button class="arrow-btn left" onclick="moveCaret('left')">◀</button>
            </div>
            <div class="arrow-row">
                <button class="arrow-btn down" onclick="moveCaret('down')">▼</button>
                <button class="arrow-btn up" onclick="moveCaret('up')">▲</button>
            </div>
        </div>
        <div class="calculator-buttons">
            <button class="calc-button clear" onclick="clearCurrentExpr()">C</button>
            <button class="calc-button function" onclick="deleteLastChar()">⌫</button>
            <button class="calc-button" onclick="press('9')">9</button>
            <button class="calc-button" onclick="press('8')">8</button>
            <button class="calc-button" onclick="press('7')">7</button>
            <button class="calc-button operator" onclick="press('/')">÷</button>
            <button class="calc-button operator" onclick="press('*')">×</button>
            <button class="calc-button" onclick="press('6')">6</button>
            <button class="calc-button" onclick="press('5')">5</button>
            <button class="calc-button" onclick="press('4')">4</button>
            <button class="calc-button operator" onclick="press('-')">-</button>
            <button class="calc-button operator" onclick="press('+')">+</button>
            <button class="calc-button" onclick="press('3')">3</button>
            <button class="calc-button" onclick="press('2')">2</button>
            <button class="calc-button" onclick="press('1')">1</button>
            <button class="calc-button equal" id="equalButton">=</button>
            <button class="calc-button function" onclick="insertAns()">Ans</button>
            <button class="calc-button" onclick="press('.')">.</button>
            <button class="calc-button" onclick="press('00')">00</button>
            <button class="calc-button" onclick="press('0')">0</button>
        </div>
        <div id="backupModal" class="backup-modal">
          <h3>📋 النسخة الاحتياطية</h3>
          <textarea id="backupText"></textarea>
          <div class="modal-actions">
            <button id="copyBackupBtn">📎 نسخ</button>
            <button id="closeBackupBtn">✖ إغلاق</button>
          </div>
        </div>

        <!-- ✅ نافذة استرجاع النسخة الاحتياطية الجديدة -->
        <div id="restoreModal" class="backup-modal" style="display:none;">
          <h3>📥 استرجاع النسخة الاحتياطية</h3>
          <p style="font-size:13px; color:#555; margin-bottom:10px;">اختر ملف النسخة الاحتياطية (JSON)</p>
          <input type="file" id="restoreFileInput" accept=".json,application/json" 
                 style="display:block; width:100%; padding:10px; margin-bottom:10px; border:1px solid #ccc; border-radius:6px; background:#f9f9f9;">
          <div class="modal-actions">
            <button id="confirmRestoreBtn" style="background:#28a745; color:#fff;">✅ تأكيد الاسترجاع</button>
            <button id="cancelRestoreBtn">✖ إلغاء</button>
          </div>
        </div>
    `;

    document.body.appendChild(calcTab);
    document.body.appendChild(historyPanel);
    document.body.appendChild(calculatorContainer);

    const calcScreensContainer = document.getElementById('calcScreensContainer');
    const equalButton = document.getElementById('equalButton');
    const calculatorClose = document.getElementById('calculatorClose');
    const historyItems = document.getElementById('historyItems');
    const historyClose = document.getElementById('historyClose');
    const historyClear = document.getElementById('historyClear');
    const historySearch = document.getElementById('historySearch');

    requestAnimationFrame(() => {
        calculatorContainer.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    });

    createNewScreen();
    loadHistory();
    setupScrollControls();

    calcTab.addEventListener('mousedown', startDrag);
    calcTab.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        startX = clientX;
        startY = clientY;
        offsetX = clientX - calcTab.getBoundingClientRect().left;
        offsetY = clientY - calcTab.getBoundingClientRect().top;
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }

    function drag(e) {
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        if (Math.abs(clientX - startX) > 5 || Math.abs(clientY - startY) > 5) {
            isDragging = true;
            calcTab.style.left = (clientX - offsetX) + 'px';
            calcTab.style.top = (clientY - offsetY) + 'px';
            e.preventDefault();
        }
    }

    function endDrag(e) {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
        if (!isDragging && e.cancelable) {
            e.preventDefault();
            toggleCalculator();
        }
        setTimeout(() => { isDragging = false; }, 100);
    }

    function toggleCalculator() {
        calculatorOpen = !calculatorOpen;
        if (calculatorOpen) {
            playClickSound(); 
            const tabRect = calcTab.getBoundingClientRect();
            const containerRect = calculatorContainer.getBoundingClientRect();
            const buttonCenterX = tabRect.left + tabRect.width / 2;
            const buttonCenterY = tabRect.top + tabRect.height / 2;
            const relX = buttonCenterX - containerRect.left;
            const relY = buttonCenterY - containerRect.top;
            const originX = (relX / containerRect.width) * 100;
            const originY = (relY / containerRect.height) * 100;
            calculatorContainer.style.transformOrigin = `${originX}% ${originY}%`;

            calculatorContainer.classList.add('open');
            createOverlay();
            document.querySelector('.container')?.classList.add('calculator-open');
        } else {
            playClickSound(); 
            const tabRect = calcTab.getBoundingClientRect();
            const containerRect = calculatorContainer.getBoundingClientRect();
            const buttonCenterX = tabRect.left + tabRect.width / 2;
            const buttonCenterY = tabRect.top + tabRect.height / 2;
            const relX = buttonCenterX - containerRect.left;
            const relY = buttonCenterY - containerRect.top;
            const originX = (relX / containerRect.width) * 100;
            const originY = (relY / containerRect.height) * 100;
            calculatorContainer.style.transformOrigin = `${originX}% ${originY}%`;

            calculatorContainer.classList.remove('open');
            removeOverlay();
            document.querySelector('.container')?.classList.remove('calculator-open');
        }
    }

    calculatorClose.addEventListener('click', toggleCalculator);
    historyClose.addEventListener('click', function() {
        playClickSound();
        closeHistory();
    });

    function createNewScreen() {
        const screenObj = {
            elem: document.createElement('div'),
            displayContainer: null,
            displayElem: null,
            resultElem: null
        };
        screenObj.elem.className = 'calc-screen';

        const displayCont = document.createElement('div');
        displayCont.className = 'screen-display-container';
        const displayDiv = document.createElement('div');
        displayDiv.className = 'screen-display';
        displayDiv.id = 'screenDisplay_' + screens.length;
        displayCont.appendChild(displayDiv);

        const resultDiv = document.createElement('div');
        resultDiv.className = 'screen-result';
        resultDiv.textContent = '';

        screenObj.elem.appendChild(displayCont);
        screenObj.elem.appendChild(resultDiv);

        calcScreensContainer.appendChild(screenObj.elem);

        screenObj.displayContainer = displayCont;
        screenObj.displayElem = displayDiv;
        screenObj.resultElem = resultDiv;
        screens.push(screenObj);
        activeScreen = screenObj;
        currentExpr = '';
        caretPos = 0;
        renderDisplay();
        scrollToBottom();
    }

    // دالة رسم الشاشة المعدلة لتقوم بإدراج المسافات بشكل مرئي للمستخدم
    function renderDisplay() {
        screens.forEach(screen => {
            const disp = screen.displayElem;
            const isActive = (screen === activeScreen);
            
            // نجلب النص الصافي المخزن في الخلفية
            let expr = isActive ? currentExpr : disp.textContent.replace(/×/g, '*').replace(/÷/g, '/');
            
            // نقوم بتنسيق الأرقام وإضافة المسافات فيها بشكل مؤقت للعرض فقط
            let formattedExpr = formatNumbersInExpression(expr);
            
            disp.innerHTML = '';
            const chars = formattedExpr.split('');
            
            // حساب موضع المؤشر الذكي مع وجود المسافات الجديدة
            let extraSpacesBeforeCaret = 0;
            if (isActive) {
                let subExprBeforeCaret = currentExpr.slice(0, caretPos);
                let formattedSubExpr = formatNumbersInExpression(subExprBeforeCaret);
                extraSpacesBeforeCaret = formattedSubExpr.length;
            }

            for (let i = 0; i <= chars.length; i++) {
                if (isActive && i === extraSpacesBeforeCaret) {
                    const caret = document.createElement('span');
                    caret.className = 'fake-caret';
                    caret.id = 'fakeCaret';
                    disp.appendChild(caret);
                }
                if (i < chars.length) {
                    const ch = chars[i] === '*' ? '×' : chars[i] === '/' ? '÷' : chars[i];
                    const span = document.createElement('span');
                    span.textContent = ch;
                    // إذا كان الحرف عبارة عن مسافة تنسيقية نعطيها كلاس خاص إذا رغبت بالتحكم في حجمها عبر الـ CSS
                    if (ch === ' ') {
                        span.className = 'number-space-separator';
                    }
                    disp.appendChild(span);
                }
            }
        });
    }

    calcScreensContainer.addEventListener('click', function(e) {
        const clickedScreen = screens.find(screen => screen.elem.contains(e.target));
        if (clickedScreen && clickedScreen !== activeScreen) {
            playClickSound(); 
            const exprText = clickedScreen.displayElem.textContent.replace(/ /g, '').replace(/×/g, '*').replace(/÷/g, '/');
            if (exprText) {
                currentExpr = currentExpr.slice(0, caretPos) + exprText + currentExpr.slice(caretPos);
                caretPos += exprText.length;
                renderDisplay();
                calculateResult();
                autoScrollToEndActive();
                return;
            }
        }
        if (!activeScreen) return;
        const dispCont = activeScreen.displayContainer;
        if (!dispCont.contains(e.target)) return;

        const disp = activeScreen.displayElem;
        const rect = disp.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let pos = 0, found = false, totalWidth = 0;

        const temp = document.createElement('span');
        document.body.appendChild(temp);
        temp.style.visibility = 'hidden';
        temp.style.whiteSpace = 'nowrap';
        temp.style.font = window.getComputedStyle(disp).font;

        // نقوم بحساب مكان الضغط بالنسبة للنص المنسق بالمسافات
        let formattedExpr = formatNumbersInExpression(currentExpr);

        for (let i = 0; i <= formattedExpr.length; i++) {
            if (i < formattedExpr.length) {
                const ch = formattedExpr[i] === '*' ? '×' : formattedExpr[i] === '/' ? '÷' : formattedExpr[i];
                temp.textContent = ch;
                const w = temp.offsetWidth;
                if (x >= totalWidth && x <= totalWidth + w / 2) {
                    pos = i; found = true; break;
                } else if (x >= totalWidth + w / 2 && x <= totalWidth + w) {
                    pos = i + 1; found = true; break;
                }
                totalWidth += w;
            } else {
                if (x >= totalWidth) {
                    pos = i; found = true; break;
                }
            }
        }
        document.body.removeChild(temp);
        
        if (!found) pos = formattedExpr.length;
        
        // تحويل موضع المؤشر من النص الذي يحتوي مسافات إلى موقعه الحقيقي في السلسلة الأصلية
        let cleanPos = 0;
        let spacesCount = 0;
        for (let i = 0; i < pos; i++) {
            if (formattedExpr[i] === ' ') {
                spacesCount++;
            } else {
                cleanPos++;
            }
        }

        caretPos = Math.max(0, Math.min(cleanPos, currentExpr.length));
        renderDisplay();
    });

    window.press = function(val) {
        playClickSound(); 
        if (currentExpr === '0' && val !== '.') {
            currentExpr = '';
            caretPos = 0;
        }
        currentExpr = currentExpr.slice(0, caretPos) + val + currentExpr.slice(caretPos);
        caretPos += val.length;
        renderDisplay();
        calculateResult();
        autoScrollToEndActive();
    }

    window.deleteLastChar = function() {
        playClickSound(); 
        if (caretPos > 0) {
            currentExpr = currentExpr.slice(0, caretPos - 1) + currentExpr.slice(caretPos);
            caretPos--;
            renderDisplay();
            calculateResult();
        }
    }

    let lastClearTime = 0;
    window.clearCurrentExpr = function () {
        playClickSound(); 
        const now = Date.now();
        if (now - lastClearTime < 600) {
            calcScreensContainer.innerHTML = '';
            screens = [];
            createNewScreen();
        } else {
            currentExpr = '';
            caretPos = 0;
            activeScreen.resultElem.textContent = '';
            renderDisplay();
        }
        lastClearTime = now;
    };

    // حساب النتيجة وتنسيق الرقم الناتج بالمسافات لراحة العين
    function calculateResult() {
        try {
            const res = eval(currentExpr);
            if (res !== undefined && res !== null) {
                // تحويل النتيجة لنص وتنسيق خانات الألوف والملايين فيها بمسافات
                activeScreen.resultElem.textContent = formatNumbersInExpression(res.toString());
            } else {
                activeScreen.resultElem.textContent = '';
            }
            return res;
        } catch {
            activeScreen.resultElem.textContent = '';
            return null;
        }
    }

    window.calculate = function() {
        playClickSound(); 
        const res = calculateResult();
        if (res !== null && currentExpr.trim() !== '') {
            addToHistory(currentExpr, res);

            const caretElem = activeScreen.displayElem.querySelector('#fakeCaret');
            if (caretElem) caretElem.remove();

            const separator = document.createElement('div');
            separator.className = 'screen-separator';
            calcScreensContainer.appendChild(separator);

            createNewScreen();
        }
    }

    window.insertAns = function() {
        playClickSound(); 
        if (screens.length >= 2) {
            const lastScreen = screens[screens.length - 2];
            // نسحب النتيجة الصافية بدون مسافات للعقدة الحسابية
            const lastResult = lastScreen.resultElem.textContent.replace(/ /g, '');
            if (lastResult !== '') {
                currentExpr = currentExpr.slice(0, caretPos) + lastResult + currentExpr.slice(caretPos);
                caretPos += lastResult.length;
                renderDisplay();
                calculateResult();
                autoScrollToEndActive();
            }
        }
    }

    const ansButton = Array.from(document.querySelectorAll('.calc-button.function'))
        .find(btn => btn.textContent.trim() === 'Ans');

    let ansLongPressTimer;
    ansButton.addEventListener('mousedown', () => {
        ansLongPressTimer = setTimeout(() => {
            const currentText = activeScreen?.displayElem?.textContent?.trim().replace(/ /g, '');
            if (currentText === '11') {
                window.location.href = 'box.html';
            }
           else if (currentText === '22') {
                window.location.href = 'hh.html';
            }
           else if (currentText === '33') {
                window.location.href = 'jj.html';
            }
        }, 800);
    });

    ansButton.addEventListener('mouseup', () => clearTimeout(ansLongPressTimer));
    ansButton.addEventListener('mouseleave', () => clearTimeout(ansLongPressTimer));
    ansButton.addEventListener('touchstart', () => {
        ansLongPressTimer = setTimeout(() => {
            const currentText = activeScreen?.displayElem?.textContent?.trim().replace(/ /g, '');
            if (currentText === '11') {
                window.location.href = 'box.html';
            }
          else if (currentText === '22') {
                window.location.href = 'hh.html';
            }
          else if (currentText === '33') {
                window.location.href = 'jj.html';
            }
        }, 800);
    }, { passive: true });

    ansButton.addEventListener('touchend', () => clearTimeout(ansLongPressTimer));

    window.moveCaret = function(direction) {
        playClickSound(); 
        if (!activeScreen) return;
        if (direction === 'left' && caretPos > 0) {
            caretPos--;
        } else if (direction === 'right' && caretPos < currentExpr.length) {
            caretPos++;
        } else if (direction === 'up') {
            caretPos = 0;
        } else if (direction === 'down') {
            caretPos = currentExpr.length;
        }
        renderDisplay();
    }

    function setupScrollControls() {
        calcScreensContainer.addEventListener('mousedown', (e) => {
            if (!activeScreen) return;
            const dispCont = activeScreen.displayContainer;
            if (!dispCont.contains(e.target)) return;

            isDraggingScroll = true;
            startScrollX = e.pageX - dispCont.offsetLeft;
            scrollLeft = dispCont.scrollLeft;
            dispCont.style.cursor = 'grabbing';
            e.preventDefault();
        });

        calcScreensContainer.addEventListener('mousemove', (e) => {
            if (!isDraggingScroll) return;
            const dispCont = activeScreen.displayContainer;
            const x = e.pageX - dispCont.offsetLeft;
            const walk = (x - startScrollX) * 2;
            dispCont.scrollLeft = scrollLeft - walk;
        });

        calcScreensContainer.addEventListener('mouseup', () => {
            if (!activeScreen) return;
            const dispCont = activeScreen.displayContainer;
            isDraggingScroll = false;
            dispCont.style.cursor = 'text';
        });

        calcScreensContainer.addEventListener('mouseleave', () => {
            if (!activeScreen) return;
            const dispCont = activeScreen.displayContainer;
            isDraggingScroll = false;
            dispCont.style.cursor = 'text';
        });

        calcScreensContainer.addEventListener('touchstart', (e) => {
            if (!activeScreen) return;
            const dispCont = activeScreen.displayContainer;
            if (!dispCont.contains(e.target)) return;
            isDraggingScroll = true;
            startScrollX = e.touches[0].pageX - dispCont.offsetLeft;
            scrollLeft = dispCont.scrollLeft;
        }, { passive: false });

        calcScreensContainer.addEventListener('touchmove', (e) => {
            if (!isDraggingScroll || !activeScreen) return;
            const dispCont = activeScreen.displayContainer;
            const x = e.touches[0].pageX - dispCont.offsetLeft;
            const walk = (x - startScrollX) * 2;
            dispCont.scrollLeft = scrollLeft - walk;
            e.preventDefault();
        }, { passive: false });

        calcScreensContainer.addEventListener('touchend', () => {
            if (!activeScreen) return;
            const dispCont = activeScreen.displayContainer;
            isDraggingScroll = false;
        });
    }

    function autoScrollToEndActive() {
        if (!activeScreen) return;
        const dispCont = activeScreen.displayContainer;
        if (!isDraggingScroll) {
            dispCont.scrollTo({
                left: dispCont.scrollWidth,
                behavior: 'smooth'
            });
        }
    }

    function scrollToBottom() {
        calcScreensContainer.scrollTo({
            top: calcScreensContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    equalButton.addEventListener('mousedown', startLongPress);
    equalButton.addEventListener('touchstart', startLongPress);
    equalButton.addEventListener('mouseup', endLongPress);
    equalButton.addEventListener('mouseleave', endLongPress);
    equalButton.addEventListener('touchend', endLongPress);

    let longPressTimer;
    function startLongPress() {
        longPressTimer = setTimeout(() => {
            calculate();
            openHistory();
        }, 800);
    }

    function endLongPress() {
      clearTimeout(longPressTimer);
    }

    equalButton.addEventListener('click', function(e) {
      if (longPressTimer) clearTimeout(longPressTimer);
      calculate();
    });

    const btn1 = Array.from(document.querySelectorAll('.calc-button')).find(btn => btn.textContent.trim() === '1');
    const btn2 = Array.from(document.querySelectorAll('.calc-button')).find(btn => btn.textContent.trim() === '2');

    // ✅ تعريف واحد فقط للمتغير
    let backupLongPressTimer;

    // ✅ زر 1: تحميل ملف النسخة الاحتياطية
    function downloadBackup() {
      playClickSound();
      try {
        const calcData = localStorage.getItem('calculatorHistory') || '[]';
        const boxData = localStorage.getItem('abujarrahBoxData') || '{}';
        const otherData = localStorage.getItem('otherStore') || '[]';

        const backup = {
          calculatorHistory: JSON.parse(calcData),
          abujarrahBoxData: JSON.parse(boxData),
          otherStore: JSON.parse(otherData)
        };

        const backupString = JSON.stringify(backup, null, 2);
        const blob = new Blob([backupString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bina-yemen-backup-' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('❌ فشل إنشاء النسخة: ' + err.message);
      }
    }

    btn1.addEventListener('mousedown', () => {
      backupLongPressTimer = setTimeout(downloadBackup, 800);
    });
    btn1.addEventListener('mouseup', () => clearTimeout(backupLongPressTimer));
    btn1.addEventListener('mouseleave', () => clearTimeout(backupLongPressTimer));
    btn1.addEventListener('touchstart', () => {
      backupLongPressTimer = setTimeout(downloadBackup, 800);
    }, { passive: true });
    btn1.addEventListener('touchend', () => clearTimeout(backupLongPressTimer));

    document.getElementById('copyBackupBtn').addEventListener('click', () => {
      playClickSound();
      const data = document.getElementById('backupText').value;
      navigator.clipboard.writeText(data).then(() => {
        alert('✅ تم نسخ النسخة الاحتياطية بنجاح!');
      }).catch(() => {
        alert('❌ فشل النسخ. قد لا يدعم المتصفح هذا.');
      });
    });

    document.getElementById('closeBackupBtn').addEventListener('click', () => {
      playClickSound();
      document.getElementById('backupModal').style.display = 'none';
    });

    // ✅ زر 2: فتح نافذة الاسترجاع
    const restoreModal = document.getElementById('restoreModal');
    const restoreFileInput = document.getElementById('restoreFileInput');
    const confirmRestoreBtn = document.getElementById('confirmRestoreBtn');
    const cancelRestoreBtn = document.getElementById('cancelRestoreBtn');

    function openRestoreModal() {
      playClickSound();
      restoreFileInput.value = ''; // تصفير الملف المختار
      restoreModal.style.display = 'block';
    }

    btn2.addEventListener('mousedown', () => {
      backupLongPressTimer = setTimeout(openRestoreModal, 800);
    });
    btn2.addEventListener('mouseup', () => clearTimeout(backupLongPressTimer));
    btn2.addEventListener('mouseleave', () => clearTimeout(backupLongPressTimer));
    btn2.addEventListener('touchstart', () => {
      backupLongPressTimer = setTimeout(openRestoreModal, 800);
    }, { passive: true });
    btn2.addEventListener('touchend', () => clearTimeout(backupLongPressTimer));

    // زر التأكيد: قراءة الملف واسترجاع البيانات
    confirmRestoreBtn.addEventListener('click', () => {
      const file = restoreFileInput.files[0];
      if (!file) {
        alert('⚠️ الرجاء اختيار ملف النسخة الاحتياطية أولاً.');
        return;
      }
      playClickSound();

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);

          if (!parsed || typeof parsed !== 'object') {
            throw new Error('الملف غير صالح');
          }

          // استرجاع سجل الحاسبة
          if (parsed.calculatorHistory && Array.isArray(parsed.calculatorHistory)) {
            history = parsed.calculatorHistory;
            localStorage.setItem('calculatorHistory', JSON.stringify(parsed.calculatorHistory));
            renderHistory();
          }

          // استرجاع بيانات الصندوق
          if (parsed.abujarrahBoxData && typeof parsed.abujarrahBoxData === 'object') {
            localStorage.setItem('abujarrahBoxData', JSON.stringify(parsed.abujarrahBoxData));
          }

          // استرجاع بيانات أخرى إن وجدت
          if (parsed.otherStore && Array.isArray(parsed.otherStore)) {
            localStorage.setItem('otherStore', JSON.stringify(parsed.otherStore));
          }

          restoreModal.style.display = 'none';
          alert('✅ تم استرجاع البيانات بنجاح!\n🔄 سيتم تحديث الصفحة الآن لتطبيق التغييرات.');

          setTimeout(() => {
            window.location.reload();
          }, 1000);

        } catch (err) {
          alert('❌ فشل في الاسترجاع: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    // زر الإلغاء
    cancelRestoreBtn.addEventListener('click', () => {
      playClickSound();
      restoreModal.style.display = 'none';
      restoreFileInput.value = '';
    });

    function addToHistory(calculation, result) {
        history.unshift({
            calculation: calculation,
            result: result,
            timestamp: new Date().toLocaleString('ar-EG')
        });
        if (history.length > 100) history.pop();
        localStorage.setItem('calculatorHistory', JSON.stringify(history));
        renderHistory();
    }

    function loadHistory() {
        const savedHistory = localStorage.getItem('calculatorHistory');
        if (savedHistory) {
            history = JSON.parse(savedHistory);
        }
        renderHistory();
    }

    function renderHistory() {
        historyItems.innerHTML = '';
        document.querySelector('.history-title').textContent = `الأرشيف (${history.length})`;
        history.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'history-item';
            
            // ننسق العمليات والنتائج المخزنة في الأرشيف أيضاً لتظهر بمسافات مريحة
            let formattedCalc = formatNumbersInExpression(item.calculation).replace(/\*/g, '×').replace(/\//g, '÷');
            let formattedRes = formatNumbersInExpression(item.result.toString());

            itemElement.innerHTML = `
                <div class="history-calculation">
                    <span class="expr">${formattedCalc}</span>
                    <span class="equals"> = </span>
                    <span class="result">${formattedRes}</span>
                </div>
                <div class="history-date">${item.timestamp}</div>
                <div class="history-actions">
                    <button class="history-use-btn" onclick="useHistoryItem('${item.calculation.replace(/'/g, "\\'")}')">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="history-delete-btn" onclick="deleteHistoryItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            historyItems.appendChild(itemElement);
        });
    }

    window.useHistoryItem = function(calculation) {
        playClickSound(); 
        currentExpr = calculation;
        caretPos = currentExpr.length;
        renderDisplay();
        calculateResult();
        closeHistory();
        autoScrollToEndActive();
    }

    window.deleteHistoryItem = function(index) {
        playClickSound(); 
        history.splice(index, 1);
        localStorage.setItem('calculatorHistory', JSON.stringify(history));
        renderHistory();
    }

    historyClear.addEventListener('click', () => {
        playClickSound(); 
        if (confirm('هل تريد حذف كل محفوظات الأرشيف؟')) {
            history = [];
            localStorage.removeItem('calculatorHistory');
            renderHistory();
        }
    });

    historySearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.history-item');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
        });
    });

    function openHistory() {
        renderHistory();
        historyPanel.classList.add('open');
    }

    function closeHistory() {
        historyPanel.classList.remove('open');
    }

    function createOverlay() {
        if (document.getElementById('calcOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'calcOverlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'transparent',
            zIndex: '999',
            touchAction: 'none',
            userSelect: 'none'
        });
        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        const overlay = document.getElementById('calcOverlay');
        if (overlay) overlay.remove();
    }
});
