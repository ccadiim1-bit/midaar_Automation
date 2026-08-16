// src/pages/register.js

function registerPage(userEmail = '') {
    return `
        <!DOCTYPE html>
        <html lang="so">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dhameystir Is-diiwaangelinta - Midaar</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0b0314] text-white flex items-center justify-center min-h-screen">
            <div class="bg-[#140827] p-8 rounded-2xl border border-purple-900/40 shadow-xl max-w-md w-full">
                
                <h2 class="text-2xl font-bold mb-2">Ku dhawaad waad dhameystirtay! 🎉</h2>
                <p class="text-xs text-slate-400 mb-6">Fadlan geli xogta dukaankaaga si aad u bilowdo.</p>

                <form action="/api/complete-registration" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Email-kaaga Google</label>
                        <input type="text" value="${userEmail}" disabled class="w-full px-4 py-2.5 bg-[#1f0d38] border border-purple-900/30 rounded-xl text-slate-400 outline-none cursor-not-allowed">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Magaca Dukaanka *</label>
                        <input name="storeName" type="text" placeholder="Tus: Somerset Fashion" required class="w-full px-4 py-2.5 bg-[#251244] border border-purple-900/60 rounded-xl text-white outline-none focus:border-purple-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Nambarka WhatsApp-ka *</label>
                        <input name="whatsapp" type="text" placeholder="Tus: 25261XXXXXX" required class="w-full px-4 py-2.5 bg-[#251244] border border-purple-900/60 rounded-xl text-white outline-none focus:border-purple-500">
                    </div>
                    <button type="submit" class="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold mt-4 transition">
                        Kaydi & Gal Dashboard-ka
                    </button>
                </form>
            </div>
        </body>
        </html>
    `;
}

module.exports = registerPage;