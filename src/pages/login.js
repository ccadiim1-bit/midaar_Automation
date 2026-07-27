// src/pages/login.js

function loginPage(errorMsg = '') {
    // Haddii fariin qalad ah lasoo diro, waxaan dhisaynaa naqshad cas oo digniin ah
    let errorAlert = '';
    if (errorMsg) {
        errorAlert = `
            <div class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm text-center">
                ${errorMsg}
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html lang="so">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gal Nidaamka - Midaar Automation</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0b0314] text-white flex items-center justify-center min-h-screen">
            <div class="bg-[#140827] p-8 rounded-2xl border border-purple-900/40 shadow-xl max-w-md w-full">
                
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold">
                        M
                    </div>
                    <div>
                        <h1 class="text-xl font-black text-white">Midaar</h1>
                        <p class="text-[10px] text-blue-300 tracking-widest uppercase">Automation</p>
                    </div>
                </div>

                <h2 class="text-2xl font-bold mb-2">Ku Soo Dhawoow</h2>
                <p class="text-xs text-slate-400 mb-6">Geli xogtaada si aad u maamusho nidaamkaaga.</p>

                <!-- Halkan ayey kasoo muuqan doontaa fariinta qaladku haddii ay jirto -->
                ${errorAlert}

                <form action="/api/login" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Nambarka WhatsApp-ka</label>
                        <input name="whatsapp" type="text" placeholder="Tus: 25261XXXXXX" required class="w-full px-4 py-2.5 bg-[#251244] border border-purple-900/60 rounded-xl text-white outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Password (Furaha)</label>
                        <input name="password" type="password" placeholder="Geli furaha sirta ah" required class="w-full px-4 py-2.5 bg-[#251244] border border-purple-900/60 rounded-xl text-white outline-none focus:border-blue-500">
                    </div>
                    <div class="flex justify-end">
                        <a href="#" class="text-xs text-blue-400 hover:text-blue-300">Ma ilowday furahaaga?</a>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold mt-4 transition">
                        Gal Nidaamka
                    </button>
                </form>

                <p class="text-center text-sm text-slate-400 mt-6">
                    Akoon cusub ma u baahan tahay? 
                    <a href="/register" class="text-blue-400 font-bold hover:text-blue-300">Is-diiwaangeli (Sign Up)</a>
                </p>
            </div>
        </body>
        </html>
    `;
}

module.exports = loginPage;