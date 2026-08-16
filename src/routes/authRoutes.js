// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient.js');
const { startWhatsApp, stopWhatsApp } = require('../services/whatsappService.js');

// TALLAABADA 1-AAD: Soo-galitaanka Google OAuth Callback (Browser handling)
router.get('/auth/callback', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="so">
        <head>
            <meta charset="UTF-8">
            <title>Waa lagu xaqiijinayaa...</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0b0314] text-white flex flex-col items-center justify-center min-h-screen">
            <div class="text-center">
                <h2 class="text-xl font-bold mb-2">Fadlan sug... ⏳</h2>
                <p class="text-sm text-slate-400">Nidaamka ayaa xaqiijinaya aqoonsigaaga Google.</p>
            </div>
            <script>
                // Qabashada xogta calaamadda '#' ka dambaysa ee Google
                const hash = window.location.hash;
                
                if (hash && hash.includes('access_token')) {
                    // U dir xogtaas Express Server-ka
                    fetch('/api/auth/set-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ hashInfo: hash })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            window.location.href = data.redirect;
                        } else {
                            window.location.href = '/login?error=Cilad_Server_ka';
                        }
                    })
                    .catch(() => window.location.href = '/login');
                } else {
                    // Haddii uusan jirin access_token, ku celi login
                    window.location.href = '/login';
                }
            </script>
        </body>
        </html>
    `);
});

// TALLAABADA 2-AAD: Xaqiijinta Isticmaalaha & Dejinta Session-ka (Server handling)
router.post('/api/auth/set-session', async (req, res) => {
    const { hashInfo } = req.body;

    if (!hashInfo) {
        return res.status(400).json({ success: false, error: "Hash info maqan" });
    }

    const params = new URLSearchParams(hashInfo.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) {
        return res.status(400).json({ success: false, error: "Access token maqan" });
    }

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        if (sessionError || !session || !session.user) {
            console.error("Cilad dejinta session-ka Supabase:", sessionError?.message);
            return res.status(500).json({ success: false, redirect: '/login?error=session_error' });
        }

        const user = session.user;

        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (storeError && storeError.code !== 'PGRST116') {
            console.error("Cilad hubinta dukaanka:", storeError.message);
            return res.status(500).json({ success: false, redirect: '/login?error=db_check_error' });
        }

        if (store) {
            req.session.isLoggedIn = true;
            req.session.storeData = store;
            startWhatsApp(store.id).catch(err => console.error("Cilad kicinta tooska ah:", err));
            res.json({ success: true, redirect: '/dashboard' });
        } else {
            req.session.tempUser = { id: user.id, email: user.email };
            res.json({ success: true, redirect: '/register-setup' });
        }
    } catch (err) {
        console.error("Cilad weyn oo ka dhacday /api/auth/set-session:", err.message);
        res.status(500).json({ success: false, redirect: '/login?error=server_error' });
    }
});

router.get('/logout', async (req, res) => {
    if (req.session.storeData) {
        const storeId = req.session.storeData.id;
        stopWhatsApp(storeId);
    }
    
    await supabase.auth.signOut();
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;