// index_2.js
const fs = require('fs');
const path = require('path');

// 🟢 KUSOO DARISTA LIBRARY-YADA EXCEL UPLOAD-KA
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ dest: 'uploads/' }); // Galka kumeel gaarka ah ee faylasha la soo geliyo

// 🟢 ISBEDELKA: Waxaan halkan ku soo darnay stopWhatsApp
const { startWhatsApp, getLatestQR, stopWhatsApp } = require('./src/services/whatsappService.js');
const settingsPage = require('./src/pages/settings.js');
const express = require('express');
const session = require('express-session'); 
const dashboardPage = require('./src/pages/dashboard.js');
const registerPage = require('./src/pages/register.js');
const loginPage = require('./src/pages/login.js');
const supabase = require('./src/config/supabaseClient.js'); 

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'midaar_sir_culus_123',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// ----- BOGAGGA (PAGES ROUTES) -----
app.get('/', (req, res) => {
    res.send(registerPage());
});

app.get('/register', (req, res) => {
    res.send(registerPage());
});

app.get('/login', (req, res) => {
    res.send(loginPage()); 
});

// 1. SOO JIIDISTA XOGTA ALAABTA EE DB-KA
app.get('/dashboard', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }

    try {
        const storeId = req.session.storeData.id;
        
        // Soo jiid kaliya alaabta dukaankan leeyahay
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Cilad dhanka soo jiidista alaabta ah:", error.message);
            return res.send(dashboardPage([]));
        }

        res.send(dashboardPage(products));

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.send(dashboardPage([]));
    }
});

// SOO JIIDISTA XOGTA BOGGA SETTINGS-KA
app.get('/settings', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }

    try {
        // Waxaan soo jiidanaynaa xogta dukaanka ee ugu dambaysay
        const storeId = req.session.storeData.id;
        const { data: store, error } = await supabase
            .from('stores')
            .select('*')
            .eq('id', storeId)
            .single();

        if (error) {
            console.error("Cilad dhanka soo jiidista xogta Settings-ka ah:", error.message);
            return res.send(settingsPage(req.session.storeData)); 
        }

        // Cusboonaysii xusuusta nidaamka oo u dir bogga
        req.session.storeData = store;
        res.send(settingsPage(store));

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.send(settingsPage(req.session.storeData));
    }
});

// 🟢 ISBEDELKA: Halkan waxaan ka saarnay tirtiristii Galka (Folder-ka)
app.get('/logout', (req, res) => {
    if (req.session.storeData) {
        const storeId = req.session.storeData.id;
        
        // 🟢 KALIYA HAKI SHAQADA BOT-KA (Session-kalama tirtirayo)
        stopWhatsApp(storeId);
    }
    
    // Nidaamka ka saar qofka (Session destroy)
    req.session.destroy();
    res.redirect('/login');
});

// ----- SHAQADA (API ROUTES) -----

app.post('/api/register', async (req, res) => {
    const { storeName, whatsapp, password } = req.body;
    try {
        const { data, error } = await supabase
            .from('stores')
            .insert([{ store_name: storeName, whatsapp: whatsapp, password: password }]);

        if (error) {
            return res.send(loginPage("Khalad ayaa dhacay: " + error.message));
        }
        res.redirect('/login');
    } catch (err) {
        res.status(500).send("Cilad dhinaca server-ka ah ayaa dhacday.");
    }
});

app.post('/api/login', async (req, res) => {
    const { whatsapp, password } = req.body;
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('whatsapp', whatsapp)
            .eq('password', password)
            .single(); 

        if (error || !data) {
            return res.send(loginPage("Nambarka WhatsApp-ka ama furaha sirta ah ayaa qaldan. Fadlan hubi."));
        }

        req.session.isLoggedIn = true;
        req.session.storeData = data;

        console.log(`✅ Gelitaan guulaystay: ${data.store_name}`);
        
        // 🟢 ISBEDELKA: KICI BOT-KA ISLA MARKA UU QOFKA SOO GALO (LOGIN)
        startWhatsApp(data.id).catch(err => console.error("Cilad kicinta tooska ah ee Login:", err));

        res.redirect('/dashboard'); 

    } catch (err) {
        res.status(500).send("Cilad dhinaca server-ka ah ayaa dhacday.");
    }
});

// 2. KUDARISTA ALAABTA CUSUB EE DB-KA (HAL-HAL)
app.post('/api/products/add', async (req, res) => {
    if (!req.session.isLoggedIn || !req.session.storeData) {
        return res.redirect('/login');
    }

    const { product_name, product_price, product_desc } = req.body;
    const storeId = req.session.storeData.id; 

    try {
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

// 🟢 SHAQADA CUSUB OO LA HABEEYAY (SMART EXCEL PARSER)
app.post('/api/products/upload', upload.single('excelFile'), async (req, res) => {
    if (!req.session.isLoggedIn || !req.session.storeData) {
        return res.redirect('/login');
    }

    try {
        const storeId = req.session.storeData.id;
        const file = req.file;

        if (!file) {
            return res.send("Fadlan soo geli fayl.");
        }

        // Akhri faylka Excel ama CSV
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0]; 
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Habee xogta si caqli badan
        const productsToInsert = sheetData.map(row => {
            let productName = null;
            let productPrice = null;
            let productDesc = null;

            // 1. Baaris ereyada la yaqaano ah:
            for (let key in row) {
                let val = row[key];
                if (val === undefined || val === null || String(val).trim() === '') continue;
                
                // Ka nadiifi xuruufaha waaweyn iyo space-ka si loo baaro
                let safeKey = key.toLowerCase().trim();

                // Baarista Magaca Alaabta (Wax kasta oo suurtogal ah)
                if (!productName && (safeKey.includes('name') || safeKey.includes('magac') || safeKey.includes('alaab') || safeKey.includes('item') || safeKey.includes('badeeco') || safeKey.includes('product') || safeKey.includes('title'))) {
                    productName = String(val);
                }
                // Baarista Qiimaha (Wax kasta oo suurtogal ah)
                else if (!productPrice && (safeKey.includes('price') || safeKey.includes('qiim') || safeKey.includes('lacag') || safeKey.includes('qarash') || safeKey.includes('cost') || safeKey.includes('amount'))) {
                    productPrice = String(val);
                }
                // Baarista Faahfaahinta
                else if (!productDesc && (safeKey.includes('desc') || safeKey.includes('faah') || safeKey.includes('detail') || safeKey.includes('info') || safeKey.includes('xog') || safeKey.includes('sharax'))) {
                    productDesc = String(val);
                }
            }

            // 2. HADDI UU WALI QABAN WAAyO: Waxay noqon kartaa in User-ka ciwaan kaba tegin. 
            // Markaas waxaan qabanaynaa column-ka 1aad, 2aad, iyo 3aad.
            const keys = Object.keys(row);
            if (!productName && keys.length > 0) productName = String(row[keys[0]]);
            if (!productPrice && keys.length > 1) productPrice = String(row[keys[1]]);
            if (!productDesc && keys.length > 2) productDesc = String(row[keys[2]]);

            // 3. Xogta U Dambaysa
            return {
                store_id: storeId,
                product_name: productName || 'Magac La\'aan',
                product_price: productPrice || '$0',
                product_desc: productDesc || ''
            };
        });

        // Geli Database-ka (Supabase)
        if (productsToInsert.length > 0) {
            const { error } = await supabase.from('products').insert(productsToInsert);
            if (error) {
                console.error("⚠️ Khalad geynta Excel-ka Supabase:", error.message);
                return res.send("Khalad ayaa dhacay markii alaabta la keydinayay.");
            }
        }

        // Tirtir faylkii kumeel gaarka ahaa ee server-ka soo galay
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

// 🟢 SHAQADA CUSUB: BEDDELIDA ALAABTA (EDIT)
app.post('/api/products/edit', async (req, res) => {
    if (!req.session.isLoggedIn || !req.session.storeData) {
        return res.redirect('/login');
    }

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

// 3. TIRTIRISTA ALAABTA EE DB-KA
app.post('/api/products/delete', async (req, res) => {
    if (!req.session.isLoggedIn || !req.session.storeData) {
        return res.redirect('/login');
    }

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

// QABASHADA IYO KEYDINTA XOGTA MASKAXDA BOT-KA (SETTINGS) 
app.post('/api/settings/save', async (req, res) => {
    if (!req.session.isLoggedIn || !req.session.storeData) {
        return res.redirect('/login');
    }

    const { gemini_key, location, work_hours, system_prompt } = req.body;
    const storeId = req.session.storeData.id;

    try {
        const { error } = await supabase
            .from('stores')
            .update({ 
                gemini_key: gemini_key, 
                location: location, 
                work_hours: work_hours, 
                system_prompt: system_prompt 
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

// --- KICINTA WHATSAPP IYO QR CODE-KA ---

app.post('/api/whatsapp/start', (req, res) => {
    if (!req.session.isLoggedIn || !req.session.storeData) {
        return res.status(401).send({ error: "Fadlan soo gal nidaamka" });
    }
    
    const storeId = req.session.storeData.id;
    
    startWhatsApp(storeId).catch(err => {
        console.error(`❌ Cilad ayaa ka dhacday kicinita Bot-ka dukaanka ${storeId}:`, err.message || err);
    });
    
    res.send({ status: 'started' });
});

app.get('/api/whatsapp/qr', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).send({ error: "Fadlan soo gal nidaamka" });
    }
    
    const qrImage = getLatestQR(); 
    res.send({ qrImage: qrImage });
});

app.listen(PORT, () => {
    console.log(`Bismillah! Nidaamku wuxuu ka shaqaynayaa: http://localhost:${PORT}`);
});