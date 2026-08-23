// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const supabase = require('../config/supabaseClient.js');
const { isLoggedIn } = require('../middleware/authMiddleware.js'); // 🟢 WAA LAGU DARAY: Middleware la wadaago

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB file size limit
});

router.use(isLoggedIn);

// KUDARISTA ALAABTA CUSUB EE DB-KA (HAL-HAL)
router.post('/add', async (req, res) => {
    const { product_name, product_price, product_desc } = req.body;
    const storeId = req.session.storeData.id;

    try {
        // --- XADKA ALAABTA (LIMIT CHECK) ---
        const { data: storeInfo } = await supabase.from('stores').select('is_pro').eq('id', storeId).single();
        if (!storeInfo?.is_pro) {
            const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeId);
            if (count >= 20) {
                return res.send(`
                    <script>
                        alert('❌ Xadka alaabta (20) waa la gaaray. Fadlan u dalac Pro si aad xad la\'aan ugu darto.');
                        window.location.href = '/dashboard';
                    </script>
                `);
            }
        }
        // -----------------------------------

        const { error } = await supabase
            .from('products')
            .insert([
                {
                    store_id: storeId,
                    product_name: product_name,
                    product_price: product_price,
                    product_desc: product_desc
                }
            ]);

        if (error) {
            console.error("⚠️ Khalad geynta xogta Supabase:", error.message);
            return res.send("Khalad ayaa dhacay markii alaabta la keydinayay.");
        }

        console.log(`✅ Alaab cusub ayaa la geliyay DB-ka`);
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.status(500).send("Cilad dhinaca server-ka ah ayaa dhacday.");
    }
});

// SHAQADA CUSUB OO LA HABEEYAY (SMART EXCEL PARSER)
router.post('/upload', upload.single('excelFile'), async (req, res) => {
    try {
        const storeId = req.session.storeData.id;
        const file = req.file;

        if (!file) {
            return res.send("Fadlan soo geli fayl.");
        }

        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const productsToInsert = sheetData.map(row => {
            let productName = null;
            let productPrice = null;
            let productDesc = null;

            for (let key in row) {
                let val = row[key];
                if (val === undefined || val === null || String(val).trim() === '') continue;
                
                let safeKey = key.toLowerCase().trim();

                if (!productName && (safeKey.includes('name') || safeKey.includes('magac') || safeKey.includes('alaab') || safeKey.includes('item') || safeKey.includes('badeeco') || safeKey.includes('product') || safeKey.includes('title'))) {
                    productName = String(val);
                }
                else if (!productPrice && (safeKey.includes('price') || safeKey.includes('qiim') || safeKey.includes('lacag') || safeKey.includes('qarash') || safeKey.includes('cost') || safeKey.includes('amount'))) {
                    productPrice = String(val);
                }
                else if (!productDesc && (safeKey.includes('desc') || safeKey.includes('faah') || safeKey.includes('detail') || safeKey.includes('info') || safeKey.includes('xog') || safeKey.includes('sharax'))) {
                    productDesc = String(val);
                }
            }

            const keys = Object.keys(row);
            if (!productName && keys.length > 0) productName = String(row[keys[0]]);
            if (!productPrice && keys.length > 1) productPrice = String(row[keys[1]]);
            if (!productDesc && keys.length > 2) productDesc = String(row[keys[2]]);

            return {
                store_id: storeId,
                product_name: productName || 'Magac La\'aan',
                product_price: productPrice || '$0',
                product_desc: productDesc || ''
            };
        });

        if (productsToInsert.length > 0) {
            // --- XADKA ALAABTA (LIMIT CHECK) ---
            const { data: storeInfo } = await supabase.from('stores').select('is_pro').eq('id', storeId).single();
            if (!storeInfo?.is_pro) {
                const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeId);
                if (count + productsToInsert.length > 20) {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    const allowed = 20 - count;
                    const rem = allowed > 0 ? allowed : 0;
                    return res.send(`
                        <script>
                            alert('❌ Xadka alaabta waa 20. Waxaa kuu harsan oo kaliya ${rem} alaab, adiguna waxaad isku deyaysaa ${productsToInsert.length}. Fadlan yaree excel-ka ama Upgrade garee account-kaaga.');
                            window.location.href = '/dashboard';
                        </script>
                    `);
                }
            }
            // -----------------------------------

            const { error } = await supabase.from('products').insert(productsToInsert);
            if (error) {
                console.error("⚠️ Khalad geynta Excel-ka Supabase:", error.message);
                return res.send("Khalad ayaa dhacay markii alaabta la keydinayay.");
            }
        }

        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        console.log(`✅ ${productsToInsert.length} alaab ayaa laga soo geliyay Excel-ka oo DB-ka la geeyay.`);
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Cilad Upload-ka Excel-ka ah:", err);
        res.status(500).send("Cilad ayaa dhacday markii faylka la akhrinayay. Hubi inuu yahay Excel sax ah.");
    }
});

// SHAQADA CUSUB: BEDDELIDA ALAABTA (EDIT)
router.post('/edit', async (req, res) => {
    const { productId, product_name, product_price, product_desc } = req.body;
    const storeId = req.session.storeData.id;

    try {
        const { error } = await supabase
            .from('products')
            .update({ 
                product_name: product_name, 
                product_price: product_price, 
                product_desc: product_desc 
            })
            .eq('id', productId)
            .eq('store_id', storeId);

        if (error) {
            console.error("⚠️ Khalad cusboonaysiinta xogta Supabase:", error.message);
            return res.send("Khalad ayaa dhacay markii alaabta la beddelayay.");
        }

        console.log(`✏️ Alaabta ID: ${productId} waa la beddelay`);
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.status(500).send("Cilad dhinaca server-ka ah ayaa dhacday.");
    }
});

// TIRTIRISTA ALAABTA EE DB-KA
router.post('/delete', async (req, res) => {
    const { productId } = req.body;
    const storeId = req.session.storeData.id;

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)
            .eq('store_id', storeId);

        if (error) {
            console.error("⚠️ Khalad tirtirista xogta Supabase:", error.message);
            return res.send("Khalad ayaa dhacay markii alaabta la tirtirayay.");
        }

        console.log(`🗑️ Alaabta ID: ${productId} waa laga tirtiray DB-ka`);
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.status(500).send("Cilad dhinaca server-ka ah ayaa dhacday.");
    }
});

module.exports = router;