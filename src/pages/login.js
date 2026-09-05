// src/pages/login.js

function loginPage(errorMsg = '') {
    let errorAlert = errorMsg ? `
        <div class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-4 rounded-xl mt-6 text-sm flex items-start gap-3 shadow-lg">
            <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p leading-relaxed>${errorMsg}</p>
        </div>
    ` : '';

    return `
        <!DOCTYPE html>
        <html lang="so">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gal Nidaamka - Midaar Automation</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <!-- CDN JS ee Supabase -->
            <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
        </head>
        <body class="bg-[#0b0314] text-white min-h-screen font-sans flex flex-col selection:bg-indigo-500/30">
            <div class="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-8 lg:p-12 gap-10 lg:gap-16 items-center justify-center">
                
                <!-- Qaybta Bidix: Macluumaadka & Badhanka -->
                <div class="w-full lg:w-1/2 flex flex-col gap-6 lg:pr-8">
                    <div class="flex items-center gap-4 mb-2">
                        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                            M
                        </div>
                        <div>
                            <h1 class="text-3xl lg:text-4xl font-black text-white tracking-tight">Midaar</h1>
                            <p class="text-xs lg:text-sm text-blue-400 tracking-[0.2em] uppercase font-bold">Automation</p>
                        </div>
                    </div>
                    
                    <h2 class="text-4xl lg:text-5xl font-bold leading-tight mt-4">
                        Maamul Ganacsigaaga si <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Casri ah</span>
                    </h2>
                    <p class="text-slate-400 text-base lg:text-lg leading-relaxed mt-2 max-w-lg">
                        Midaar Automation waa nidaam kuu fududeynaya inaad maamusho iibkaaga, xiriirka macaamiisha, iyo xayeysiinta WhatsApp-ka si toos ah, casri ah, oo ammaan ah.
                    </p>
                    
                    <div class="flex flex-col gap-4 mt-6">
                        <div class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div class="p-3 bg-blue-500/20 rounded-xl text-blue-400 shrink-0">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-white mb-1.5">Ammaan Sugan (100% Secure)</h3>
                                <p class="text-sm text-slate-400 leading-relaxed">Xogtaada waa mid si buuxda loo ilaaliyay. Waxaan isticmaalnaa nidaamka Google Authentication si aad ammaan ugu soo gasho adigoon u baahnayn in aad sameysato password cusub.</p>
                            </div>
                        </div>
                        <div class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div class="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-white mb-1.5">Is-wadis & Fududeyn (Automation)</h3>
                                <p class="text-sm text-slate-400 leading-relaxed">Ku xir WhatsApp-kaaga nidaamka si aad u dirto fariimo toos ah, ula socoto macaamiishaada oo aad u kordhiso iibkaaga adigoo waqti badbaadinaya.</p>
                            </div>
                        </div>
                    </div>

                    ${errorAlert}

                    <div class="mt-8 max-w-md">
                        <!-- Badhanka Google Login -->
                        <button type="button" onclick="handleGoogleLogin()" class="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:shadow-[0_10px_40px_rgba(255,255,255,0.2)] hover:-translate-y-1">
                            <svg class="w-6 h-6" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                            </svg>
                            <span class="text-lg">Continue with Google</span>
                        </button>
                    </div>
                </div>

                <!-- Qaybta Midig: Fiidiyowyada & Support -->
                <div class="w-full lg:w-1/2 mt-8 lg:mt-0 relative">
                    <div class="absolute inset-0 bg-gradient-to-bl from-indigo-600/20 via-purple-600/10 to-transparent rounded-[3rem] blur-3xl z-0 pointer-events-none"></div>
                    
                    <div class="relative z-10 bg-[#120721]/80 backdrop-blur-xl p-6 lg:p-10 rounded-[2rem] border border-purple-900/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
                            <h3 class="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
                                <svg class="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                                Hagaha Nidaamka
                            </h3>
                            
                            <!-- Support Button -->
                            <a href="https://wa.me/252684199835" target="_blank" rel="noopener noreferrer" class="hidden sm:flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 py-2.5 px-5 rounded-xl text-sm font-bold transition-colors">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.031 21c-1.637 0-3.235-.429-4.649-1.242L2 21l1.32-5.184A8.932 8.932 0 0 1 2.062 12c0-4.963 4.04-9 9.006-9 2.408 0 4.671.938 6.37 2.64 1.7 1.7 2.637 3.963 2.637 6.37 0 4.962-4.04 8.99-9.044 8.99h-.001zm0-16.5c-4.137 0-7.5 3.363-7.5 7.5 0 1.323.346 2.616 1.003 3.754l.107.185-.783 3.076 3.146-.826.18.106A7.447 7.447 0 0 0 12.03 19.5c4.136 0 7.5-3.363 7.5-7.5 0-2.003-.78-3.886-2.196-5.304A7.47 7.47 0 0 0 12.031 4.5zM16.14 14.856c-.226-.113-1.336-.66-1.543-.735-.207-.075-.357-.113-.508.113-.15.226-.582.735-.714.886-.131.15-.262.17-.488.056-2.012-1.007-3.242-2.39-4.122-4.32-.113-.245.105-.23.328-.675.075-.15.038-.282-.019-.395-.056-.113-.508-1.225-.695-1.677-.182-.441-.368-.382-.508-.389h-.433c-.15 0-.395.056-.602.282C6.182 8.243 5.5 8.883 5.5 10.183c0 1.3.846 2.558.96 2.708.113.15 1.848 2.82 4.475 3.948.625.268 1.113.43 1.493.551.626.198 1.196.17 1.646.103.504-.076 1.336-.546 1.524-1.071.188-.525.188-.977.131-1.071-.056-.094-.207-.15-.433-.263z"/>
                                </svg>
                                Support
                            </a>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-3 md:gap-4">
                            <!-- Video 1 -->
                            <div class="flex flex-col gap-3 group">
                                <div class="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-[#0b0314] shadow-[0_5px_15px_rgba(0,0,0,0.4)] border border-white/5 group-hover:border-indigo-500/50 transition-all duration-300">
                                    <iframe 
                                        src="https://www.youtube.com/embed/w2VFsYPMxUg" 
                                        title="Sidee Whatsapp loogu xirtaa midaarAutomation"
                                        class="absolute top-0 left-0 w-full h-full"
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen>
                                    </iframe>
                                </div>
                                <p class="text-xs font-semibold text-slate-300 leading-snug group-hover:text-white transition-colors">
                                    Sidee Whatsapp loogu xirtaa midaarAutomation
                                </p>
                            </div>

                            <!-- Video 2 -->
                            <div class="flex flex-col gap-3 group">
                                <div class="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-[#0b0314] shadow-[0_5px_15px_rgba(0,0,0,0.4)] border border-white/5 group-hover:border-indigo-500/50 transition-all duration-300">
                                    <iframe 
                                        src="https://www.youtube.com/embed/sU8SXEMUlLs" 
                                        title="Sidee alaab loogu daraa midaarautomation"
                                        class="absolute top-0 left-0 w-full h-full"
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen>
                                    </iframe>
                                </div>
                                <p class="text-xs font-semibold text-slate-300 leading-snug group-hover:text-white transition-colors">
                                    Sidee alaab loogu daraa midaarautomation
                                </p>
                            </div>

                            <!-- Video 3 -->
                            <div class="flex flex-col gap-3 group">
                                <div class="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-[#0b0314] shadow-[0_5px_15px_rgba(0,0,0,0.4)] border border-white/5 group-hover:border-indigo-500/50 transition-all duration-300">
                                    <iframe 
                                        src="https://www.youtube.com/embed/NTtBaseXg-w" 
                                        title="Sidee xirmo loo iibsadaa midaarau"
                                        class="absolute top-0 left-0 w-full h-full"
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen>
                                    </iframe>
                                </div>
                                <p class="text-xs font-semibold text-slate-300 leading-snug group-hover:text-white transition-colors">
                                    Sidee xirmo loo iibsadaa midaarautomation
                                </p>
                            </div>
                        </div>

                        <!-- Mobile Support Button -->
                        <a href="https://wa.me/252684199835" target="_blank" rel="noopener noreferrer" class="sm:hidden mt-8 flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 py-3.5 px-5 rounded-xl text-sm font-bold transition-colors w-full border border-[#25D366]/20">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.031 21c-1.637 0-3.235-.429-4.649-1.242L2 21l1.32-5.184A8.932 8.932 0 0 1 2.062 12c0-4.963 4.04-9 9.006-9 2.408 0 4.671.938 6.37 2.64 1.7 1.7 2.637 3.963 2.637 6.37 0 4.962-4.04 8.99-9.044 8.99h-.001zm0-16.5c-4.137 0-7.5 3.363-7.5 7.5 0 1.323.346 2.616 1.003 3.754l.107.185-.783 3.076 3.146-.826.18.106A7.447 7.447 0 0 0 12.03 19.5c4.136 0 7.5-3.363 7.5-7.5 0-2.003-.78-3.886-2.196-5.304A7.47 7.47 0 0 0 12.031 4.5zM16.14 14.856c-.226-.113-1.336-.66-1.543-.735-.207-.075-.357-.113-.508.113-.15.226-.582.735-.714.886-.131.15-.262.17-.488.056-2.012-1.007-3.242-2.39-4.122-4.32-.113-.245.105-.23.328-.675.075-.15.038-.282-.019-.395-.056-.113-.508-1.225-.695-1.677-.182-.441-.368-.382-.508-.389h-.433c-.15 0-.395.056-.602.282C6.182 8.243 5.5 8.883 5.5 10.183c0 1.3.846 2.558.96 2.708.113.15 1.848 2.82 4.475 3.948.625.268 1.113.43 1.493.551.626.198 1.196.17 1.646.103.504-.076 1.336-.546 1.524-1.071.188-.525.188-.977.131-1.071-.056-.094-.207-.15-.433-.263z"/>
                            </svg>
                            La Xiriir Support
                        </a>
                    </div>
                </div>
            </div>

            <script>
                const SUPABASE_URL = "${process.env.SUPABASE_URL || ''}";
                const SUPABASE_KEY = "${process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ''}";
                const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

                async function handleGoogleLogin() {
                    try {
                        const { data, error } = await client.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                redirectTo: window.location.origin + '/auth/callback'
                            }
                        });
                        if (error) alert("Qalad ayaa dhacay: " + error.message);
                    } catch (err) {
                        alert("Qalad: " + err.message);
                    }
                }
            </script>
        </body>
        </html>
    `;
}

module.exports = loginPage;