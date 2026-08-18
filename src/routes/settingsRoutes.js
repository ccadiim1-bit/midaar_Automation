// src/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient.js');
const { isLoggedIn } = require('../middleware/authMiddleware.js'); // 🟢 WAA LAGU DARAY: Middleware la wadaago

router.use(isLoggedIn);

// QABASHADA IYO KEYDINTA XOGTA MASKAXDA BOT-KA (SETTINGS) 
router.post('/save', async (req, res) => {
    const { gemini_key, location, work_hours, system_prompt, admin_number, delivery_numbers } = req.body;
    const storeId = req.session.storeData.id;

    try {
        const { error } = await supabase
            .from('stores')
            .update({ 
                gemini_key: gemini_key, 
                location: location, 
                work_hours: work_hours, 
                system_prompt: system_prompt,
                admin_number: admin_number,
                delivery_numbers: delivery_numbers
            })
            .eq('id', storeId);

        if (error) {
            console.error("⚠️ Khalad geynta xogta Settings ee Supabase:", error.message);
            return res.send("Khalad ayaa dhacay markii xogta la keydinayay.");
        }

        console.log(`✅ Xogta Settings-ka dukaanka waa la cusboonaysiiyay`);
        res.redirect('/settings'); 

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.status(500).send("Cilad dhinaca server-ka ah ayaa dhacday.");
    }
});

module.exports = router;