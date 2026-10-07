// src/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient.js');
const { isLoggedIn } = require('../middleware/authMiddleware.js'); // 🟢 WAA LAGU DARAY: Middleware la wadaago

router.use(isLoggedIn);

// QABASHADA IYO KEYDINTA XOGTA MASKAXDA BOT-KA (SETTINGS) 
router.post('/save', async (req, res) => {
    const { gemini_key, location, work_hours, system_prompt, admin_number, delivery_numbers, whatsappAPI: whatsappapi, phone_id } = req.body;
    const storeId = req.session.storeData?.id;

    if (!storeId) {
        console.error("⚠️ Settings /save: storeId lagama helin session-ka.");
        return res.redirect('/login');
    }

    try {
        const updatePayload = { 
            gemini_key:        gemini_key        || null, 
            location:          location          || null, 
            work_hours:        work_hours        || null, 
            system_prompt:     system_prompt     || null,
            admin_number:      admin_number      || null,
            delivery_numbers:  delivery_numbers  || null,
            whatsappapi:       whatsappapi       || null,
            phone_id:          phone_id          || null
        };

        console.log(`[Settings] Keydinta xogta dukaanka ${storeId}:`, JSON.stringify(updatePayload, null, 2));

        const { data, error } = await supabase
            .from('stores')
            .update(updatePayload)
            .eq('id', storeId)
            .select();

        if (error) {
            console.error("⚠️ Supabase Settings Khalad - Code:", error.code);
            console.error("⚠️ Supabase Settings Khalad - Message:", error.message);
            console.error("⚠️ Supabase Settings Khalad - Details:", error.details);
            console.error("⚠️ Supabase Settings Khalad - Hint:", error.hint);
            return res.status(500).send(`Khalad: ${error.message} (Code: ${error.code})`);
        }

        // Cusbooneysii session-ka xogta cusub
        if (data && data.length > 0) {
            req.session.storeData = { ...req.session.storeData, ...data[0] };
        }

        console.log(`✅ Xogta Settings-ka dukaanka ${storeId} waa la cusboonaysiiyay`);
        res.redirect('/settings'); 

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.status(500).send(`Cilad dhinaca server-ka ah: ${err.message}`);
    }
});

module.exports = router;