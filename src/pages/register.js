// src/pages/register.js

function registerPage() {
    return `
        <!DOCTYPE html>
        <html lang="so">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Is-diiwaangali - Midaar Automation</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0b0314] text-white flex items-center justify-center min-h-screen">
            <div class="bg-[#140827] p-8 rounded-2xl border border-purple-900/40 shadow-xl max-w-md w-full">
                
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        M
                    </div>
                    <div>
                        <h1 class="text-xl font-black text-white">Midaar</h1>
                        <p class="text-[10px] text-purple-300 tracking-widest uppercase">Automation</p>
                    </div>
                </div>

                <h2 class="text-2xl font-bold mb-2">Is-diiwaangeli Hadda</h2>
                <p class="text-xs text-slate-400 mb-6">Sameyso akoon cusub si aad u isticmaasho nidaamka.</p>

                <form action="/api/register" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Magaca Dukaanka *</label>
                        <input name="storeName" type="text" placeholder="Tus: Somerset Fashion" required class="w-full px-4 py-2.5 bg-[#251244] border border-purple-900/60 rounded-xl text-white outline-none focus:border-purple-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Nambarka WhatsApp-ka *</label>
                        <input name="whatsapp" type="text" placeholder="Tus: 25261XXXXXX" required class="w-full px-4 py-2.5 bg-[#251244] border border-purple-900/60 rounded-xl text-white outline-none focus:border-purple-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Password (Furaha) *</label>
                        <input name="password" type="password" placeholder="Geli furaha sirta ah" required class="w-full px-4 py-2.5 bg-[#251244] border border-purple-900/60 rounded-xl text-white outline-none focus:border-purple-500">
                    </div>
                    <!-- Badhankan waxaan ka dhignay type="submit" si uu xogta u diro -->
                    <button type="submit" class="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold mt-4 transition">
                        Abuur Akoon Cusub
                    </button>
                </form>

                <p class="text-center text-sm text-slate-400 mt-6">
                    Horey ma u leedahay akoon? 
                    <a href="/login" class="text-purple-400 font-bold hover:text-purple-300">Gal Halkan (Log In)</a>
                </p>
            </div>
        </body>
        </html>
    `;
}

module.exports = registerPage;