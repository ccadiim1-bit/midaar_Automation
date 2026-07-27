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
                <td class="py-4 px-6 text-right">
                    <form action="/api/products/delete" method="POST" class="inline">
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
        <body class="bg-[#0b0314] text-white flex min-h-screen font-sans">
            
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

            <main class="flex-1 p-8 overflow-y-auto">
                <header class="flex justify-between items-center mb-10">
                    <div>
                        <h2 class="text-3xl font-bold text-white">Maamulka Alaabta</h2>
                        <p class="text-slate-400 mt-1">Halkan ku dar, ka beddel, kana tirtir xogta alaabta dukaankaaga.</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="bg-red-900/30 text-red-400 border border-red-900 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
                            🔴 Bot-ku ma xirna
                        </span>
                        <div class="w-12 h-12 bg-[#140827] rounded-full flex items-center justify-center text-xl shadow-lg border border-purple-900/40">
                            👤
                        </div>
                    </div>
                </header>

                <div class="bg-[#140827] p-6 rounded-2xl border border-purple-900/40 shadow-lg mb-8">
                    <h3 class="text-lg font-semibold text-white mb-4">Kudar Alaab Cusub</h3>
                    <form action="/api/products/add" method="POST" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" name="product_name" placeholder="Magaca Alaabta (Tusaale: Kabo)" required class="md:col-span-1 bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                        <input type="text" name="product_price" placeholder="Qiimaha (Tusaale: $25)" required class="md:col-span-1 bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                        <input type="text" name="product_desc" placeholder="Faahfaahin gaaban (Tusaale: Kabo orodka...)" required class="md:col-span-1 bg-[#0b0314] border border-purple-900/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm">
                        <button type="submit" class="md:col-span-1 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-xl text-sm font-semibold transition">
                            ➕ Kudar Alaabta
                        </button>
                    </form>
                </div>

                <div class="bg-[#140827] rounded-2xl border border-purple-900/40 shadow-lg overflow-hidden">
                    <div class="p-6 border-b border-purple-900/40">
                        <h3 class="text-lg font-semibold text-white">Liiska Alaabta Keydsan</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
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
        </body>
        </html>
    `;
}

module.exports = dashboardPage;