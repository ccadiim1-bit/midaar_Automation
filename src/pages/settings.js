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

                <form action="/api/settings/save" method="POST" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <div class="bg-[#140827] p-6 rounded-2xl border border-purple-900/40 shadow-lg flex flex-col">
                        <h3 class="text-white font-semibold mb-4 text-center">🔗 Xiriirka WhatsApp</h3>
                        
                        <div class="mb-4">
                            <label class="block text-slate-400 text-sm mb-2">Phone Number ID</label>
                            <input type="text" name="phone_id" placeholder="Tusaale: 123456789012345" value="${escapeHTML(storeData.phone_id || '')}" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                            <p class="text-[10px] text-slate-500 mt-1.5">Phone Number ID-ga aad ka heshay Meta Developers.</p>
                        </div>

                        <div class="mb-4">
                            <label class="block text-slate-400 text-sm mb-2">Access Token (WhatsApp API)</label>
                            <input type="password" name="whatsappAPI" placeholder="EAAD..." value="${escapeHTML(storeData.whatsappAPI || '')}" class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                            <p class="text-[10px] text-slate-500 mt-1.5">Permanent Token-ka rasmiga ah ee Meta API.</p>
                        </div>

                        <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" class="mt-auto text-center text-[11px] text-blue-400 hover:text-blue-300 hover:underline transition">
                            📖 Sida loo helo Meta API →
                        </a>
                    </div>

                    <div class="bg-[#140827] p-6 rounded-2xl border border-purple-900/40 shadow-lg lg:col-span-2">
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
                                    <p id="prompt_warning" class="text-xs hidden">⚠️ Xadka 900 xaraf ayaad gaadhtay!</p>
                                    <p class="text-[11px] text-slate-500 ml-auto">
                                        <span id="word_count" class="font-bold text-purple-400">0</span>
                                        <span class="text-slate-500"> / 900 xaraf</span>
                                    </p>
                                </div>
                            </div>
                            <button type="submit" onclick="return checkWordLimit()" class="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30 px-6 py-2.5 rounded-xl font-semibold transition mt-2">
                                💾 Keydi Xogta Settings-ka
                            </button>
                        </div>
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
                const MAX_CHARS = 900;

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
                        warningEl.textContent = '⛔ Xadka 900 xaraf waa la dhaafay! Fadlan yaree.';
                    } else if (chars >= 800) {
                        countEl.className = 'font-bold text-yellow-400';
                        ta.classList.remove('border-red-500/70', 'border-purple-900/40');
                        ta.classList.add('border-yellow-500/60');
                        warningEl.classList.remove('hidden', 'text-red-400');
                        warningEl.classList.add('text-yellow-400');
                        warningEl.textContent = '⚠️ Waad u dhawaatay xadka (900 xaraf)!';
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
                        alert('❌ System Prompt-ku wuxuu leeyahay ' + chars + ' xaraf. Fadlan u yaree 900 xaraf ama ka hooseeya.');
                        return false;
                    }
                    return true;
                }

                // Count on page load (in case there is existing content)
                document.addEventListener('DOMContentLoaded', countWords);
                // JS logic for settings

            </script>
        </body>
        </html>
    `;
}

module.exports = settingsPage;