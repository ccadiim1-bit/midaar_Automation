// src/pages/dashboard.js
const { escapeHTML } = require('../utils/escape.js');

function dashboardPage(products = [], isBotConnected = false, storeStatus = {}) {
    const { is_pro = false, monthly_message_count = 0, message_limit = 50, plan_type = 'free' } = storeStatus;
    // Si firfircoon u samee calaamadda xaaladda bot-ka
    const statusIndicatorHTML = isBotConnected 
        ? `
            <span class="bg-green-900/30 text-green-400 border border-green-900 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
                🟢 Bot-ku wuu ku xiran yahay
            </span>
        ` 
        : `
            <span class="bg-red-900/30 text-red-400 border border-red-900 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
                🔴 Bot-ku ma xirna
            </span>
        `;

    // 🟢 TASK 5: Create subscription status banner
    let subscriptionBannerHTML = '';
    const remainingMessages = message_limit - monthly_message_count;

    if (is_pro) {
        subscriptionBannerHTML = `
            <div class="bg-green-900/30 text-green-300 border border-green-800 p-4 rounded-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="text-center md:text-left flex-grow">
                    <p class="font-bold">Xisaabtaadu waa Pro (${escapeHTML(plan_type)}) 🚀.</p>
                    <p class="text-sm">Waxaa kuu haray <b class="text-white">${remainingMessages > 0 ? remainingMessages : 0}</b> fariimood oo kamid ah ${message_limit}-kaaga bishan.</p>
                </div>
                <button onclick="openPricingModal()" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap">Cusboonaysii Xirmada</button>
            </div>
        `;
    } else {
        subscriptionBannerHTML = `
            <div class="bg-yellow-900/50 text-yellow-300 border border-yellow-700 p-4 rounded-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="text-center md:text-left flex-grow">
                    <p class="font-bold">Digniin: Nooca bilaashka ah ayaa ku jiraa.</p>
                    <p class="text-sm">Waxaa kuu haray <b class="text-white">${remainingMessages > 0 ? remainingMessages : 0}</b> fariimood oo kamid ah ${message_limit}-ka fariimood ee tijaabada ah.</p>
                </div>
                <button onclick="openPricingModal()" class="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap">
                    Upgrade to Pro
                </button>
            </div>
        `;
    }

    // Halkan waxaan ku dhisaynaa liiska alaabta oo toos ah (Dynamic)
    let productsHTML = '';

    if (products.length === 0) {
        productsHTML = `
            <tr>
                <td colspan="4" class="py-8 px-6 text-center text-slate-400 font-medium">
                    📦 Wali wax alaab ah kuma darin. Fadlan isticmaal foomka kore si aad ugu darto.
                </td>
            </tr>
        `;
    } else {
        productsHTML = products.map(product => `
            <tr class="border-b border-purple-900/20 hover:bg-purple-900/10 transition">
                <td class="py-4 px-6 font-semibold text-white">${escapeHTML(product.product_name)}</td>
                <td class="py-4 px-6 text-green-400 font-bold">${escapeHTML(product.product_price)}</td>
                <td class="py-4 px-6 text-slate-400">${escapeHTML(product.product_desc)}</td>
                <td class="py-4 px-6 text-right flex justify-end gap-2 items-center h-full">
                    <!-- Batoonka Beddelida oo xambaarsan xogta -->
                    <button type="button" 
                        onclick="openEditModal(this)" 
                        data-id="${product.id}" 
                        data-name="${escapeHTML(product.product_name)}" 
                        data-price="${escapeHTML(product.product_price)}" 
                        data-desc="${escapeHTML(product.product_desc)}" 
                        class="text-blue-400 hover:text-blue-300 text-xs font-semibold px-3 py-1 bg-blue-400/10 rounded-lg">
                        Beddel
                    </button>
                    <!-- Batoonka Tirtirida -->
                    <form action="/api/products/delete" method="POST" class="inline m-0">
                        <input type="hidden" name="productId" value="${product.id}">
                        <button type="submit" class="text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1 bg-red-400/10 rounded-lg">Tirtir</button>
                    </form>
                </td>
            </tr>
        `).join('');
    }

    return `
        <!DOCTYPE html>
        <html lang="so">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dashboard - Midaar Automation</title>
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
                    <a href="/dashboard" class="block px-4 py-3 bg-purple-600/20 text-purple-400 rounded-xl font-semibold border border-purple-500/30">
                        📦 Xogta Alaabta (Dashboard)
                    </a>
                    <a href="/settings" class="block px-4 py-3 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl font-semibold transition">
                        ⚙️ Settings (Dejinta)
                    </a>
                </nav>

                <div class="absolute bottom-6 left-6">
                    <a href="/logout" class="text-slate-400 hover:text-red-400 font-semibold text-sm transition">
                        🚪 Ka bax nidaamka (Logout)
                    </a>
                </div>
            </aside>

            <!-- Waxaan badalay paddings si mobile-ka uusan ugu weynaan -->
            <main class="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
                ${subscriptionBannerHTML}
                <header class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 md:mb-10">
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold text-white">Maamulka Alaabta</h2>
                        <p class="text-slate-400 mt-1 text-sm md:text-base">Halkan ku dar, ka beddel, kana tirtir xogta alaabta.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        ${statusIndicatorHTML}
                        <div class="w-10 h-10 md:w-12 md:h-12 bg-[#140827] rounded-full flex items-center justify-center text-xl shadow-lg border border-purple-900/40 hidden md:flex">
                            👤
                        </div>
                    </div>
                </header>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    <!-- QAYBTA HAL ALAAB LAGU DARO -->
                    <div class="bg-[#140827] p-6 rounded-2xl border border-purple-900/40 shadow-lg">
                        <h3 class="text-lg font-semibold text-white mb-4">➕ Kudar Alaab Cusub</h3>
                        <form action="/api/products/add" method="POST" class="flex flex-col gap-4">
                            <input type="text" name="product_name" placeholder="Magaca Alaabta (Tusaale: Kabo)" required class="bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                            <input type="text" name="product_price" placeholder="Qiimaha (Tusaale: $25)" required class="bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                            <input type="text" name="product_desc" placeholder="Faahfaahin gaaban..." required class="bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                            <button type="submit" class="bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-xl text-sm font-semibold transition">
                                Kudar Alaabta
                            </button>
                        </form>
                    </div>

                    <!-- QAYBTA EXCEL/CSV LAGU SOO GELINAYO -->
                    <div class="bg-[#140827] p-6 rounded-2xl border border-purple-900/40 shadow-lg flex flex-col justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-white mb-2">📤 Soo Geli Excel</h3>
                            <p class="text-slate-400 text-sm mb-4">
                                Faylku waa inuu lahaadaa: <b class="text-purple-400">Magac</b>, <b class="text-purple-400">Qiimo</b>, <b class="text-purple-400">Faahfaahin</b>
                            </p>
                        </div>
                        <form action="/api/products/upload" method="POST" enctype="multipart/form-data" class="flex flex-col gap-4 mt-auto">
                            <input type="file" name="excelFile" accept=".csv, .xlsx, .xls" required 
                                class="bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-2 text-white focus:outline-none text-sm 
                                file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold 
                                file:bg-purple-600/20 file:text-purple-400 hover:file:bg-purple-600/30 cursor-pointer">
                            <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-semibold transition">
                                Soo Geli Faylka
                            </button>
                        </form>
                    </div>
                </div>

                <div class="bg-[#140827] rounded-2xl border border-purple-900/40 shadow-lg overflow-hidden">
                    <div class="p-6 border-b border-purple-900/40">
                        <h3 class="text-lg font-semibold text-white">Liiska Alaabta Keydsan</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse min-w-[600px]">
                            <thead class="bg-[#0b0314]/50">
                                <tr>
                                    <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-purple-900/40">Magaca Alaabta</th>
                                    <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-purple-900/40">Qiimaha</th>
                                    <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-purple-900/40">Faahfaahin</th>
                                    <th class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-purple-900/40 text-right">Maamul</th>
                                </tr>
                            </thead>
                            <tbody class="text-sm text-slate-200">
                                ${productsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <!-- 📱 MENU-KA HOOSE EE MOOBILKA (Bottom Navigation) -->
            <nav class="md:hidden fixed bottom-0 left-0 w-full bg-[#140827] border-t border-purple-900/40 flex justify-around items-center p-3 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <a href="/dashboard" class="flex flex-col items-center text-purple-400">
                    <span class="text-xl mb-1">📦</span>
                    <span class="text-[10px] font-bold">Dashboard</span>
                </a>
                <a href="/settings" class="flex flex-col items-center text-slate-400 hover:text-white transition">
                    <span class="text-xl mb-1">⚙️</span>
                    <span class="text-[10px] font-bold">Settings</span>
                </a>
                <a href="/logout" class="flex flex-col items-center text-red-400/80 hover:text-red-400 transition">
                    <span class="text-xl mb-1">🚪</span>
                    <span class="text-[10px] font-bold">Ka bax</span>
                </a>
            </nav>

            <!-- 🟢 TASK 5: PRICING MODAL -->
            <div id="pricingModal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300">
                <div class="bg-[#1f0d38] w-full max-w-4xl rounded-2xl border border-purple-900/40 shadow-2xl transform transition-all duration-300 scale-95 opacity-0 max-h-[90vh] overflow-y-auto" id="modalContent">
                    <div class="p-6 border-b border-purple-900/40 flex justify-between items-center">
                        <h3 class="text-xl font-bold text-white">Dooro Xirmo (Choose a Plan)</h3>
                        <button onclick="closePricingModal()" class="text-slate-400 hover:text-white transition text-2xl font-light">
                            &times;
                        </button>
                    </div>
                    
                    <div class="p-6 pb-8">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <!-- Weekly Plan -->
                            <div class="pricing-card bg-[#140827] border border-purple-900/40 rounded-xl p-6 text-center flex flex-col transition-all duration-300 hover:border-purple-600/80">
                                <h4 class="text-lg font-semibold text-purple-400">Xirmo Toddobaadle</h4>
                                <p class="text-4xl font-bold my-4 text-white">$4.99</p>
                                <ul class="text-slate-400 text-sm space-y-2 flex-grow">
                                    <li><b class="text-white">500</b> Fariimood</li>
                                    <li>Full AI Capabilities</li>
                                    <li>7 Maalmood oo Adeeg ah</li>
                                </ul>
                                <button onclick="selectPlan(this, 4.99)" class="mt-6 bg-purple-600/50 hover:bg-purple-600 text-white w-full py-2.5 rounded-lg font-semibold transition">Dooro Xirmadan</button>
                            </div>

                            <!-- Monthly Plan (Recommended) -->
                            <div class="pricing-card bg-[#140827] border-2 border-purple-500 rounded-xl p-6 text-center flex flex-col relative transform scale-105 shadow-lg shadow-purple-900/50">
                                <span class="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">RECOMMENDED</span>
                                <h4 class="text-lg font-semibold text-purple-300">Xirmo Bille</h4>
                                <p class="text-4xl font-bold my-4 text-white">$9.99</p>
                                <ul class="text-slate-300 text-sm space-y-2 flex-grow">
                                    <li><b class="text-white">5,000</b> Fariimood</li>
                                    <li>Full AI Capabilities</li>
                                    <li>30 Maalmood oo Adeeg ah</li>
                                </ul>
                                <button onclick="selectPlan(this, 9.99)" class="mt-6 bg-purple-600 hover:bg-purple-500 text-white w-full py-2.5 rounded-lg font-semibold transition">Dooro Xirmadan</button>
                            </div>

                            <!-- Premium Plan -->
                            <div class="pricing-card bg-[#140827] border border-purple-900/40 rounded-xl p-6 text-center flex flex-col transition-all duration-300 hover:border-purple-600/80">
                                <h4 class="text-lg font-semibold text-purple-400">Xirmo Premium</h4>
                                <p class="text-4xl font-bold my-4 text-white">$99.99</p>
                                <ul class="text-slate-400 text-sm space-y-2 flex-grow">
                                    <li>Fariimo <b class="text-white">Aan Xad Lahayn</b></li>
                                    <li>Full AI Capabilities</li>
                                    <li>30 Maalmood oo Adeeg ah</li>
                                </ul>
                                <button onclick="selectPlan(this, 99.99)" class="mt-6 bg-purple-600/50 hover:bg-purple-600 text-white w-full py-2.5 rounded-lg font-semibold transition">Dooro Xirmadan</button>
                            </div>
                        </div>

                        <!-- Payment Instructions -->
                        <div id="paymentStepsContainer" class="hidden mt-6 transition-all duration-500">
                            <div id="providerSelectionStep" class="hidden">
                                <h4 class="font-bold text-yellow-200 mb-4 text-center">Tallaabada 1: Dooro Bixiyaha Adeeggaaga</h4>
                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <!-- Hormuud -->
                                    <button onclick="selectProvider('Hormuud', '252')" class="provider-btn bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/30 text-sky-300 py-3 px-2 rounded-lg flex flex-col items-center justify-center transition text-center">
                                        <span class="font-semibold text-sm">Hormuud</span>
                                        <span class="text-xs">(EVC Plus)</span>
                                    </button>
                                    <!-- Somnet -->
                                    <button onclick="selectProvider('Somnet', '25268')" class="provider-btn bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/30 text-pink-300 py-3 px-2 rounded-lg flex flex-col items-center justify-center transition text-center">
                                        <span class="font-semibold text-sm">Somnet</span>
                                        <span class="text-xs">(Jeep)</span>
                                    </button>
                                    <!-- Golis -->
                                    <button onclick="selectProvider('Golis', '2529')" class="provider-btn bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-green-300 py-3 px-2 rounded-lg flex flex-col items-center justify-center transition text-center">
                                        <span class="font-semibold text-sm">Golis</span>
                                        <span class="text-xs">(Sahal)</span>
                                    </button>
                                    <!-- eDahab -->
                                    <button onclick="selectProvider('eDahab', '25262')" class="provider-btn bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/30 text-orange-300 py-3 px-2 rounded-lg flex flex-col items-center justify-center transition text-center">
                                        <span class="font-semibold text-sm">eDahab</span>
                                        <span class="text-xs">(eDahab)</span>
                                    </button>
                                </div>
                            </div>

                            <div id="paymentExecutionStep" class="hidden mt-6">
                                <h4 class="font-bold text-yellow-200 mb-3 text-center">Tallaabada 2: Geli Nambarkaaga oo Bixi</h4>
                                <div class="bg-black/20 p-4 rounded-lg flex flex-col items-center space-y-4">
                                    <p class="text-sm text-yellow-200 text-center">Fadlan geli nambarka aad lacagta ka soo dirayso. Nidaamka ayaa si toos ah kuugu furaya adeegga.</p>
                                    <input type="tel" id="paymentSenderNumber" placeholder="Geli nambarkaaga..." class="w-full text-center bg-[#0b0314] border border-purple-900/60 rounded-xl p-3 text-white text-base sm:text-sm font-bold tracking-wider focus:outline-none focus:border-purple-500">
                                    <button id="payButton" onclick="proceedToPay()" class="w-full bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition text-lg">
                                        Bixi Lacagta Hadda
                                    </button>
                                    <p id="payment-note" class="text-xs text-yellow-300/80 text-center">
                                        <b class="font-bold">Fiiro Gaar ah:</b> Markaad riixdo badhanka, wuxuu si toos ah u furayaa barnaamijka wicitaanka taleefankaaga isagoo wata USSD code-ka lacag bixinta.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL-KA BEDDELKA ALAABTA -->
            <div id="editModal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-[#140827] w-full max-w-md rounded-2xl border border-purple-900/40 shadow-2xl p-6 transform transition-all">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-white">✏️ Beddel Xogta Alaabta</h3>
                        <button onclick="closeEditModal()" class="text-slate-400 hover:text-white transition text-xl">
                            ✕
                        </button>
                    </div>
                    
                    <form action="/api/products/edit" method="POST" class="flex flex-col gap-4">
                        <input type="hidden" name="productId" id="edit_productId">
                        
                        <div>
                            <label class="block text-slate-400 text-xs font-semibold mb-2">Magaca Alaabta</label>
                            <input type="text" name="product_name" id="edit_name" required class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                        </div>
                        
                        <div>
                            <label class="block text-slate-400 text-xs font-semibold mb-2">Qiimaha</label>
                            <input type="text" name="product_price" id="edit_price" required class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                        </div>
                        
                        <div>
                            <label class="block text-slate-400 text-xs font-semibold mb-2">Faahfaahin</label>
                            <input type="text" name="product_desc" id="edit_desc" required class="w-full bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                        </div>
                        
                        <div class="flex gap-3 mt-4">
                            <button type="button" onclick="closeEditModal()" class="flex-1 bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-800 px-4 py-3 rounded-xl text-sm font-semibold transition">
                                Jooji
                            </button>
                            <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-sm font-semibold transition">
                                Keydi Isbedelka
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <script>
                const pricingModal = document.getElementById('pricingModal');
                const modalContent = document.getElementById('modalContent');
                // New global state variables
                let selectedAmountForPayment = 0;
                let selectedProvider = '';

                function openPricingModal() {
                    pricingModal.classList.remove('hidden');
                    setTimeout(() => {
                        pricingModal.style.opacity = '1';
                        modalContent.style.opacity = '1';
                        modalContent.style.transform = 'scale(1)';
                    }, 10);
                }

                function closePricingModal() {
                    pricingModal.style.opacity = '0';
                    modalContent.style.opacity = '0';
                    modalContent.style.transform = 'scale(0.95)';
                    setTimeout(() => pricingModal.classList.add('hidden'), 300);
                }

                function selectPlan(buttonElement, amount) {
                    // Highlight selected plan
                    document.querySelectorAll('.pricing-card').forEach(card => card.classList.remove('border-purple-500', 'scale-105', 'shadow-lg', 'shadow-purple-900/50', 'border-2'));
                    buttonElement.closest('.pricing-card').classList.add('border-purple-500', 'scale-105', 'shadow-lg', 'shadow-purple-900/50', 'border-2');

                    // Store selected amount
                    selectedAmountForPayment = amount;

                    // Show the next step (provider selection)
                    document.getElementById('paymentStepsContainer').classList.remove('hidden');
                    document.getElementById('providerSelectionStep').classList.remove('hidden');
                    
                    // Hide the final payment step in case user changes plan
                    document.getElementById('paymentExecutionStep').classList.add('hidden');
                    
                    // Reset provider selection highlight
                    document.querySelectorAll('.provider-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-offset-2', 'ring-offset-black/50', 'ring-yellow-400'));
                }

                // New function to select a provider
                function selectProvider(provider, prefix) {
                    selectedProvider = provider;

                    // Highlight selected provider
                    document.querySelectorAll('.provider-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-offset-2', 'ring-offset-black/50', 'ring-yellow-400'));
                    event.currentTarget.classList.add('ring-2', 'ring-offset-2', 'ring-offset-black/50', 'ring-yellow-400');

                    // Show payment step
                    const paymentStep = document.getElementById('paymentExecutionStep');
                    paymentStep.classList.remove('hidden');

                    // Set prefix and focus
                    const numberInput = document.getElementById('paymentSenderNumber');
                    numberInput.value = prefix;
                    numberInput.focus();
                }

                // New function to proceed with payment
                async function proceedToPay() {
                    const payButton = document.getElementById('payButton');
                    const senderNumber = document.getElementById('paymentSenderNumber').value;

                    if (!senderNumber || senderNumber.length < 9) {
                        alert('Fadlan geli nambar sax ah.');
                        return;
                    }

                    payButton.disabled = true;
                    payButton.innerText = 'Waa la socdaa...';

                    try {
                        // Save the number to the DB so the webhook can find it
                        await fetch('/api/payments/set-expected-number', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ senderNumber })
                        });

                        // Generate USSD code
                        const ussdCodes = {
                            'Hormuud': '*712*770822402*' + selectedAmountForPayment + '#',
                            'Somnet': '*812*770822402*' + selectedAmountForPayment + '#',
                            'Golis': '*883*0770822402*' + selectedAmountForPayment + '#',
                            'eDahab': '*712*629633408*' + selectedAmountForPayment + '#'
                        };
                        const ussdCode = ussdCodes[selectedProvider];

                        // Trigger dialer
                        window.location.href = 'tel:' + encodeURIComponent(ussdCode);
                        setTimeout(() => closePricingModal(), 3000);

                    } catch (error) {
                        console.error('Payment process failed:', error);
                        alert('Cilad ayaa dhacday. Fadlan dib u isku day.');
                    } finally {
                        payButton.disabled = false;
                        payButton.innerText = 'Bixi Lacagta Hadda';
                    }
                }

                function openEditModal(buttonElement) {
                    const id = buttonElement.getAttribute('data-id');
                    const name = buttonElement.getAttribute('data-name');
                    const price = buttonElement.getAttribute('data-price');
                    const desc = buttonElement.getAttribute('data-desc');

                    document.getElementById('edit_productId').value = id;
                    document.getElementById('edit_name').value = name;
                    document.getElementById('edit_price').value = price;
                    document.getElementById('edit_desc').value = desc;

                    document.getElementById('editModal').classList.remove('hidden');
                }

                function closeEditModal() {
                    document.getElementById('editModal').classList.add('hidden');
                }
            </script>
        </body>
        </html>
    `;
}

module.exports = dashboardPage;