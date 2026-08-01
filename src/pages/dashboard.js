// src/pages/dashboard.js

function dashboardPage(products = []) {
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
                <td class="py-4 px-6 font-semibold text-white">${product.product_name}</td>
                <td class="py-4 px-6 text-green-400 font-bold">${product.product_price}</td>
                <td class="py-4 px-6 text-slate-400">${product.product_desc}</td>
                <td class="py-4 px-6 text-right flex justify-end gap-2 items-center h-full">
                    <!-- Batoonka Beddelida oo xambaarsan xogta -->
                    <button type="button" 
                        onclick="openEditModal(this)" 
                        data-id="${product.id}" 
                        data-name="${product.product_name}" 
                        data-price="${product.product_price}" 
                        data-desc="${product.product_desc}" 
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
                <header class="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8 md:mb-10">
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold text-white">Maamulka Alaabta</h2>
                        <p class="text-slate-400 mt-1 text-sm md:text-base">Halkan ku dar, ka beddel, kana tirtir xogta alaabta.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="bg-red-900/30 text-red-400 border border-red-900 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
                            🔴 Bot-ku ma xirna
                        </span>
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