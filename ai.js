// ==========================================
// مركز الذكاء الاصطناعي - ai.js (محدث لمفاتيح AQ)
// ==========================================

let selectedBase64Image = null;

// حقن واجهة الشات تلقائياً في الصفحة بمجرد تحميلها
document.addEventListener("DOMContentLoaded", function() {
    const widgetHTML = `
        <button id="aiToggleBtn" onclick="toggleAIChat()">🤖</button>
        <div id="aiChatBox" class="ai-modal" style="display: none;">
            <div class="ai-header">
                <span>🤖 المساعد الذكي (Gemini)</span>
                <button onclick="toggleAIChat()" class="close-btn">✕</button>
            </div>
            <div class="ai-body" id="chatHistory">
                <div class="ai-msg bot">مرحباً أبا جراح! كيف أستطيع مساعدتك في الحسابات أو قراءة الفواتير اليوم؟</div>
            </div>
            <div id="imagePreviewContainer" style="display:none; padding: 5px; text-align: center;">
                <img id="imagePreview" src="" style="max-height: 80px; border-radius: 6px;">
                <button onclick="removeImage()" style="background:red; color:#fff; border:none; border-radius:50%;">✕</button>
            </div>
            <div class="ai-footer">
                <label for="imageInput" class="upload-btn">📷</label>
                <input type="file" id="imageInput" accept="image/*" onchange="handleImageSelect(event)" style="display:none;">
                <input type="text" id="userInput" placeholder="اكتب سؤالك أو ارفق صورة فاتورة...">
                <button onclick="sendToAI()" id="sendBtn">إرسال</button>
            </div>
        </div>
        <style>
            #aiToggleBtn { position: fixed; bottom: 20px; right: 20px; width: 55px; height: 55px; border-radius: 50%; background: #007bff; color: white; font-size: 24px; border: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); cursor: pointer; z-index: 9999; }
            .ai-modal { position: fixed; bottom: 85px; right: 20px; width: 320px; height: 420px; background: #1e1e1e; color: #fff; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.5); display: flex; flex-direction: column; z-index: 9999; border: 1px solid #333; }
            .ai-header { padding: 12px; background: #252525; display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #333; }
            .ai-body { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
            .ai-msg { padding: 8px 12px; border-radius: 8px; font-size: 14px; max-width: 85%; }
            .ai-msg.bot { background: #2a2a2a; align-self: flex-start; }
            .ai-msg.user { background: #007bff; align-self: flex-end; }
            .ai-footer { padding: 8px; display: flex; gap: 6px; background: #252525; align-items: center; }
            .ai-footer input[type="text"] { flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #121212; color: #fff; }
            .upload-btn { cursor: pointer; font-size: 18px; padding: 5px; }
            .close-btn { background: none; border: none; color: #fff; font-size: 16px; cursor: pointer; }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
});

// دالة الفتح والإغلاق مع طلب المفتاح عند الضغط لأول مرة
function toggleAIChat() {
    let apiKey = localStorage.getItem("my_gemini_key");
    
    if (!apiKey) {
        apiKey = prompt("أدخل مفتاح Gemini API الخاص بك لأول مرة فقط:");
        if (apiKey && apiKey.trim() !== "") {
            localStorage.setItem("my_gemini_key", apiKey.trim());
        } else {
            return;
        }
    }

    const box = document.getElementById('aiChatBox');
    box.style.display = box.style.display === 'none' ? 'flex' : 'none';
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedBase64Image = e.target.result.split(',')[1];
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    selectedBase64Image = null;
    document.getElementById('imagePreviewContainer').style.display = 'none';
}

async function sendToAI() {
    const inputEl = document.getElementById('userInput');
    const text = inputEl.value.trim();
    if (!text && !selectedBase64Image) return;

    appendMessage(text || "📷 [مرفق صورة]", 'user');
    inputEl.value = '';

    const parts = [];
    if (text) parts.push({ text: text });
    if (selectedBase64Image) {
        parts.push({
            inline_data: { mime_type: "image/jpeg", data: selectedBase64Image }
        });
    }

    removeImage();
    appendMessage("جاري التفكير...", 'bot-temp');

    const currentApiKey = localStorage.getItem("my_gemini_key");

    try {
        // تم تحديث طريقة الاتصال لتناسب مفاتيح المصادقة الحديثة
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentApiKey}`
            },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            const reply = data.candidates[0].content.parts[0].text;
            document.querySelector('.bot-temp').remove();
            appendMessage(reply, 'bot');
        } else {
            document.querySelector('.bot-temp').remove();
            appendMessage("تأكد أن مفتاح الـ API صحيح وصالح.", 'bot');
        }

    } catch (err) {
        const temp = document.querySelector('.bot-temp');
        if(temp) temp.remove();
        appendMessage("حدث خطأ في الاتصال بالذكاء الاصطناعي.", 'bot');
    }
}

function appendMessage(msg, sender) {
    const history = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = `ai-msg ${sender}`;
    div.innerText = msg;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}
