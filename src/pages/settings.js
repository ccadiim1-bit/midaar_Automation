// src/pages/settings.js
const { escapeHTML } = require('../utils/escape.js');

function settingsPage(storeData = {}) {
    return `
        <!DOCTYPE html>
        <html lang="so">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Settings - Midaar Automation</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0b0314] text-white flex min-h-screen font-sans relative">
            
            <aside class="w-64 bg-[#140827] border-r border-purple-900/40 p-6 hidden md:block">
                <div class="flex items-center gap-3 mb-10">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        M
                    </div>
                    <div>
                        <h1 class="text-xl font-black text-white">Midaar</h1>
                        <p class="text-[10px] text-purple-300 tracking-widest uppercase">Automation</p>
                    </div>
                </div>

                <nav class="space-y-2">
                    <a href="/dashboard" class="block px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl font-semibold transition">
                        📦 Xogta Alaabta (Dashboard)
                    </a>
                    <a href="/settings" class="block px-4 py-3 bg-purple-600/20 text-purple-400 rounded-xl font-semibold border border-purple-500/30">
                        ⚙️ Settings (Dejinta)
                    </a>
                    <a href="https://wa.me/252684199835" target="_blank" class="block px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-green-400 rounded-xl font-semibold transition">
                        💬 Support (Taageero)
                    </a>
                </nav>

                <div class="absolute bottom-6 left-6">
                    <a href="/logout" class="text-slate-400 hover:text-red-400 font-semibold text-sm transition">
                        🚪 Ka bax nidaamka (Logout)
                    </a>
                </div>
            </aside>

            <main class="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
                <header class="mb-8 md:mb-10">
                    <h2 class="text-2xl md:text-3xl font-bold text-white">Dejinta Nidaamka</h2>
                    <p class="text-slate-400 mt-1 text-sm md:text-base">Halkan ku xir WhatsApp-ka oo AI-ga ku bar xogta aasaasiga ah.</p>
                </header>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <div class="bg-[#140827] p-6 rounded-2xl border border-purple-900/40 shadow-lg flex flex-col">
                        <h3 class="text-white font-semibold mb-4 text-center">Xiriirka WhatsApp</h3>
                        
                        <div class="mb-6">
                            <label class="block text-slate-400 text-sm mb-2">Dooro Qaabka Isku-xirka</label>
                            <select id="apiSelector" onchange="toggleApiView()" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 cursor-pointer">
                                <option value="baileys">📱 QR Code (Baileys - Scan)</option>
                                <option value="pairing">🔢 Pairing Code (Nambar)</option>
                                <option value="greenapi">🟢 Green API (Cloud Instance)</option>
                                <option value="meta">🌐 Meta API (Official WhatsApp)</option>
                            </select>
                        </div>

                        <!-- TAB 1: Baileys (QR Code) -->
                        <div id="baileys-section" class="flex flex-col items-center border-t border-purple-900/40 pt-4">
                            <p class="text-slate-400 text-xs text-center mb-4" id="qr-instruction">Taabo badhanka hoose si aad u soo saarto QR Code-ka dhabta ah, kadibna iskaan garee.</p>
                            
                            <div class="bg-white p-2 rounded-xl mb-4 w-48 h-48 flex items-center justify-center relative overflow-hidden" id="qr-container">
                                <div id="qr-loading" class="text-slate-800 text-sm text-center font-bold">
                                    QR Code ma jiro<br><span class="text-xs font-normal">Taabo 'Soo saar QR'</span>
                                </div>
                                <img id="qr-image" src="" alt="QR Code" class="w-full h-full object-contain hidden">
                            </div>

                            <button type="button" onclick="startQRScan()" id="btn-scan" class="bg-purple-600 hover:bg-purple-500 text-white w-full py-3 rounded-xl font-semibold transition text-sm">
                                🔄 Soo saar QR Code
                            </button>
                        </div>

                        <!-- 🟢 TAB CUSUB: Pairing Code -->
                        <div id="pairing-section" class="hidden flex-col items-center border-t border-purple-900/40 pt-4">
                            <p class="text-slate-400 text-xs text-center mb-4">Geli nambarka WhatsApp-ka ee aad rabto inaad ka dhigto Bot. (Tusaale: 252615000000)</p>
                            
                            <input type="text" id="pairing-number" placeholder="25261..." class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm mb-4 text-center tracking-widest font-bold">

                            <div id="pairing-code-display" class="hidden bg-white p-3 rounded-xl mb-4 w-full flex items-center justify-center border-2 border-indigo-500 border-dashed">
                                <span id="the-code" class="text-3xl font-black text-slate-800 tracking-[0.2em]"></span>
                            </div>

                            <p id="pairing-status" class="text-emerald-400 text-xs text-center mb-4 hidden">✅ Koodhka hoos ka muuqda ku qor WhatsApp-kaaga (Linked Devices > Link with phone number).</p>

                            <button type="button" onclick="requestPairingCode()" id="btn-pairing" class="bg-indigo-600 hover:bg-indigo-500 text-white w-full py-3 rounded-xl font-semibold transition text-sm">
                                🔢 Codso Koodhka Isku-xirka
                            </button>
                        </div>

                        <!-- TAB 3 & 4: API kale -->
                        <div id="greenapi-section" class="hidden border-t border-purple-900/40 pt-4">
                            <p class="text-slate-400 text-xs text-center">Tani hadda ma shaqaynayso, waxaan diiradda saaraynaa Baileys QR iyo Pairing.</p>
                        </div>
                        <div id="meta-section" class="hidden border-t border-purple-900/40 pt-4">
                            <p class="text-slate-400 text-xs text-center">Tani hadda ma shaqaynayso, waxaan diiradda saaraynaa Baileys QR iyo Pairing.</p>
                        </div>
                    </div>

                    <form action="/api/settings/save" method="POST" class="bg-[#140827] p-6 rounded-2xl border border-purple-900/40 shadow-lg lg:col-span-2">
                        <h3 class="text-white font-semibold mb-4 flex items-center gap-2">🧠 Xogta Dukaanka & Goobta</h3>
                        
                        <div class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-slate-400 text-sm mb-1">Nambarka Maamulka (Admin)</label>
                                    <input type="text" name="admin_number" placeholder="25261..." value="${escapeHTML(storeData.admin_number)}" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                                    <p class="text-[10px] text-slate-500 mt-1">Halkan ayaa lala wadaagayaa xogta dalabka.</p>
                                </div>
                                <div>
                                    <label class="block text-slate-400 text-sm mb-1">Nambarada Shaqaalaha (Delivery)</label>
                                    <input type="text" name="delivery_numbers" placeholder="252..., 252..." value="${escapeHTML(storeData.delivery_numbers)}" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                                    <p class="text-[10px] text-slate-500 mt-1">Haddii ay badan yihiin, u dhaxaysii hakad (,).</p>
                                </div>
                            </div>
                            
                            <hr class="border-purple-900/40 my-2">

                            <div>
                                <label class="block text-slate-400 text-sm mb-1">Gemini API Key (Optional)</label>
                                <input type="password" name="gemini_key" value="${escapeHTML(storeData.gemini_key)}" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                            </div>
                            <div>
                                <label class="block text-slate-400 text-sm mb-1">Magaalada / Location-ka</label>
                                <input type="text" name="location" value="${escapeHTML(storeData.location)}" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                            </div>
                            <div>
                                <label class="block text-slate-400 text-sm mb-1">Saacadaha Shaqada</label>
                                <input type="text" name="work_hours" value="${escapeHTML(storeData.work_hours)}" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                            </div>
                            <div>
                                <label class="block text-slate-400 text-sm mb-1">Tilmaamaha Bot-ka (System Prompt)</label>
                                <textarea id="system_prompt_ta" name="system_prompt" rows="5" oninput="countWords()" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm resize-none transition-colors duration-200">${escapeHTML(storeData.system_prompt)}</textarea>
                                <div class="flex items-center justify-between mt-1.5">
                                    <p id="prompt_warning" class="text-xs hidden">⚠️ Xadka 200 xaraf ayaad gaadhtay!</p>
                                    <p class="text-[11px] text-slate-500 ml-auto">
                                        <span id="word_count" class="font-bold text-purple-400">0</span>
                                        <span class="text-slate-500"> / 200 xaraf</span>
                                    </p>
                                </div>
                            </div>
                            <button type="submit" onclick="return checkWordLimit()" class="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30 px-6 py-2.5 rounded-xl font-semibold transition mt-2">
                                💾 Keydi Xogta Settings-ka
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <nav class="md:hidden fixed bottom-0 left-0 w-full bg-[#140827] border-t border-purple-900/40 flex justify-around items-center p-3 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <a href="/dashboard" class="flex flex-col items-center text-slate-400 hover:text-white transition">
                    <span class="text-xl mb-1">📦</span>
                    <span class="text-[10px] font-bold">Dashboard</span>
                </a>
                <a href="/settings" class="flex flex-col items-center text-purple-400">
                    <span class="text-xl mb-1">⚙️</span>
                    <span class="text-[10px] font-bold">Settings</span>
                </a>
                <a href="https://wa.me/252684199835" target="_blank" class="flex flex-col items-center text-slate-400 hover:text-green-400 transition">
                    <span class="text-xl mb-1">💬</span>
                    <span class="text-[10px] font-bold">Support</span>
                </a>
                <a href="/logout" class="flex flex-col items-center text-red-400/80 hover:text-red-400 transition">
                    <span class="text-xl mb-1">🚪</span>
                    <span class="text-[10px] font-bold">Ka bax</span>
                </a>
            </nav>

            <script>
                const MAX_CHARS = 200;

                function countWords() {
                    const ta = document.getElementById('system_prompt_ta');
                    const countEl = document.getElementById('word_count');
                    const warningEl = document.getElementById('prompt_warning');
                    const chars = ta.value.length;

                    countEl.textContent = chars;

                    // Color coding
                    if (chars > MAX_CHARS) {
                        countEl.className = 'font-bold text-red-400';
                        ta.classList.remove('focus:border-purple-500', 'border-purple-900/40', 'border-yellow-500/60');
                        ta.classList.add('border-red-500/70');
                        warningEl.classList.remove('hidden', 'text-yellow-400');
                        warningEl.classList.add('text-red-400');
                        warningEl.textContent = '⛔ Xadka 200 xaraf waa la dhaafay! Fadlan yaree.';
                    } else if (chars >= 180) {
                        countEl.className = 'font-bold text-yellow-400';
                        ta.classList.remove('border-red-500/70', 'border-purple-900/40');
                        ta.classList.add('border-yellow-500/60');
                        warningEl.classList.remove('hidden', 'text-red-400');
                        warningEl.classList.add('text-yellow-400');
                        warningEl.textContent = '⚠️ Waad u dhawaatay xadka (200 xaraf)!';
                    } else {
                        countEl.className = 'font-bold text-purple-400';
                        ta.classList.remove('border-red-500/70', 'border-yellow-500/60');
                        ta.classList.add('border-purple-900/40');
                        warningEl.classList.add('hidden');
                    }
                }

                function checkWordLimit() {
                    const ta = document.getElementById('system_prompt_ta');
                    const chars = ta.value.length;
                    if (chars > MAX_CHARS) {
                        alert('❌ System Prompt-ku wuxuu leeyahay ' + chars + ' xaraf. Fadlan u yaree 200 xaraf ama ka hooseeya.');
                        return false;
                    }
                    return true;
                }

                // Count on page load (in case there is existing content)
                document.addEventListener('DOMContentLoaded', countWords);
                function toggleApiView() {
                    const selector = document.getElementById('apiSelector').value;
                    document.getElementById('baileys-section').style.display = selector === 'baileys' ? 'flex' : 'none';
                    document.getElementById('pairing-section').style.display = selector === 'pairing' ? 'flex' : 'none';
                    document.getElementById('greenapi-section').style.display = selector === 'greenapi' ? 'block' : 'none';
                    document.getElementById('meta-section').style.display = selector === 'meta' ? 'block' : 'none';
                }

                let qrInterval;

                document.addEventListener("DOMContentLoaded", () => {
                    fetch('/api/whatsapp/qr')
                        .then(res => res.json())
                        .then(data => {
                            if (data.qrImage === 'connected') {
                                showConnectedState();
                            } else if (data.qrImage) {
                                showQRState(data.qrImage);
                                qrInterval = setInterval(checkQRStatus, 2000);
                            }
                        })
                        .catch(err => console.log("Lama hubin karin xaaladda QR-ka."));
                });

                function showConnectedState() {
                    const loadingText = document.getElementById('qr-loading');
                    const qrImage = document.getElementById('qr-image');
                    const btn = document.getElementById('btn-scan');
                    const instruction = document.getElementById('qr-instruction');

                    if(instruction) instruction.innerHTML = "Bot-kaagu wuxuu diyaar u yahay inuu u adeego macaamiishaada.";
                    
                    if(loadingText) {
                        loadingText.innerHTML = "✅<br>WhatsApp waa<br>ku xiran yahay!";
                        loadingText.classList.remove('hidden', 'text-slate-800');
                        loadingText.classList.add('text-emerald-600', 'text-lg', 'font-black');
                    }
                    if(qrImage) qrImage.classList.add('hidden');
                    
                    if(btn) {
                        btn.innerText = "Is-xirka waa guuleystay 🎉";
                        btn.disabled = true; 
                        btn.classList.replace('bg-purple-600', 'bg-emerald-600');
                        btn.classList.replace('hover:bg-purple-500', 'hover:bg-emerald-600');
                        btn.classList.add('cursor-not-allowed', 'opacity-80');
                    }

                    // Sidoo kale bedel badhanka Pairing Code-ka haddii la isku xiray
                    const btnPairing = document.getElementById('btn-pairing');
                    if(btnPairing) {
                        btnPairing.innerText = "Waa ku xiran yahay 🎉";
                        btnPairing.disabled = true;
                        btnPairing.classList.replace('bg-indigo-600', 'bg-emerald-600');
                        btnPairing.classList.replace('hover:bg-indigo-500', 'hover:bg-emerald-600');
                        btnPairing.classList.add('cursor-not-allowed', 'opacity-80');
                    }
                }

                function showQRState(qrImgSrc) {
                    const loadingText = document.getElementById('qr-loading');
                    const qrImage = document.getElementById('qr-image');
                    const btn = document.getElementById('btn-scan');

                    qrImage.src = qrImgSrc;
                    qrImage.classList.remove('hidden');
                    loadingText.classList.add('hidden');
                    
                    btn.innerText = "QR Waa Diyaar - Iskaan garee!";
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                }

                function startQRScan() {
                    const loadingText = document.getElementById('qr-loading');
                    const qrImage = document.getElementById('qr-image');
                    const btn = document.getElementById('btn-scan');

                    loadingText.innerHTML = "Wuxuu soo saarayaa QR... ⏳";
                    loadingText.classList.remove('hidden');
                    qrImage.classList.add('hidden');
                    btn.innerText = "Fadlan sug...";
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');

                    fetch('/api/whatsapp/start', { method: 'POST' })
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === 'started') {
                                qrInterval = setInterval(checkQRStatus, 2000);
                            }
                        })
                        .catch(err => {
                            loadingText.innerHTML = "❌ Cilad ayaa dhacday";
                            btn.innerText = "Dib u isku day";
                            btn.disabled = false;
                            btn.classList.remove('opacity-50', 'cursor-not-allowed');
                        });
                }

                function checkQRStatus() {
                    fetch('/api/whatsapp/qr')
                        .then(res => res.json())
                        .then(data => {
                            if (data.qrImage === 'connected') {
                                clearInterval(qrInterval); 
                                showConnectedState();
                            } else if (data.qrImage) {
                                showQRState(data.qrImage);
                            }
                        });
                }

                // 🟢 SHAQADA CUSUB: JAVASCRIPT-KA SOO CODsanaya PAIRING CODE-KA
                function requestPairingCode() {
                    const phoneInput = document.getElementById('pairing-number').value;
                    const btn = document.getElementById('btn-pairing');
                    const codeDisplay = document.getElementById('pairing-code-display');
                    const theCodeText = document.getElementById('the-code');
                    const statusText = document.getElementById('pairing-status');

                    if (!phoneInput) {
                        alert("Fadlan gali nambarka WhatsApp-ka!");
                        return;
                    }

                    btn.innerText = "Wuxuu raadinayaa koodhka... ⏳";
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');

                    fetch('/api/whatsapp/pair', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ phoneNumber: phoneInput })
                    })
                    .then(res => res.json())
                    .then(data => {
                        btn.innerText = "Dib u codso Koodh cusub";
                        btn.disabled = false;
                        btn.classList.remove('opacity-50', 'cursor-not-allowed');

                        if (data.status === 'success' && data.code) {
                            codeDisplay.classList.remove('hidden');
                            statusText.classList.remove('hidden');
                            
                            // Koodhka ka dhig mid kala go'an si loo akhrin karo (Tusaale: ABCD-1234)
                            let formattedCode = data.code;
                            if(formattedCode.length === 8) {
                                formattedCode = formattedCode.slice(0, 4) + '-' + formattedCode.slice(4);
                            }
                            theCodeText.innerText = formattedCode;

                            // Bilow inuu hubiyo inuu xirmay (sida QR-ka oo kale)
                            qrInterval = setInterval(checkQRStatus, 2000);
                        } else {
                            alert(data.error || "Lama soo saari karin koodhka. Hubi in bot-ku kacsan yahay.");
                        }
                    })
                    .catch(err => {
                        btn.innerText = "❌ Cilad - Dib u isku day";
                        btn.disabled = false;
                        btn.classList.remove('opacity-50', 'cursor-not-allowed');
                        alert("Cilad ayaa dhacday dhanka Server-ka.");
                    });
                }
            </script>
        </body>
        </html>
    `;
}

module.exports = settingsPage;