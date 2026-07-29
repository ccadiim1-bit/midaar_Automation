// index.js
const fs = require('fs');
const path = require('path');
const { startWhatsApp, getLatestQR } = require('./src/services/whatsappService.js');
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

// SOO JIIDISTA XOGTA BOGGA SETTINGS-KA (CUSUB)
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
            return res.send(settingsPage(req.session.storeData)); // Isticmaal xogtii hore ee keydsanayd haddii cilad dhacdo
        }

        // Cusboonaysii xusuusta nidaamka oo u dir bogga
        req.session.storeData = store;
        res.send(settingsPage(store));

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.send(settingsPage(req.session.storeData));
    }
});

// 🟢 ISBEDELKA 2: Halkan waxaan ku darnay in galka (folder) la tirtiro markuu qofku Logout dhaho
app.get('/logout', (req, res) => {
    if (req.session.storeData) {
        const storeId = req.session.storeData.id;
        
        // Soo qabo meesha uu ku yaallo folder-ka user-kan
        const authFolder = path.join(__dirname, `auth_info/store_${storeId}`);

        // Haddii folder-kaasi jiro, si buuxda u tirtir
        if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
            console.log(`🗑️ Galka WhatsApp (store_${storeId}) si guul leh ayaa loo tirtiray maxaa yeelay qofka ayaa Logout taabtay.`);
        }
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
        res.redirect('/dashboard'); 

    } catch (err) {
        res.status(500).send("Cilad dhinaca server-ka ah ayaa dhacday.");
    }
});

// 2. KUDARISTA ALAABTA CUSUB EE DB-KA
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
            .eq('store_id', storeId); // Hubi in alaabta ay dukaankaas leedahay

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

// QABASHADA IYO KEYDINTA XOGTA MASKAXDA BOT-KA (SETTINGS) (CUSUB)
app.post('/api/settings/save', async (req, res) => {
    if (!req.session.isLoggedIn || !req.session.storeData) {
        return res.redirect('/login');
    }

    // 1. Soo qabo xogtii uu qofku foomka geliyay
    const { gemini_key, location, work_hours, system_prompt } = req.body;
    const storeId = req.session.storeData.id;

    try {
        // 2. Ku cusboonaysii (Update) miiska 'stores' ee Supabase
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
        
        // 3. Dib ugu celi bogga Settings-ka
        res.redirect('/settings'); 

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.status(500).send("Cilad dhinaca server-ka ah ayaa dhacday.");
    }
});

// --- KICINTA WHATSAPP IYO QR CODE-KA ---

// 1. Dariiqan wuxuu kicinayaa Baileys (Marka badhanka la taabto)
app.post('/api/whatsapp/start', (req, res) => {
    if (!req.session.isLoggedIn || !req.session.storeData) {
        return res.status(401).send({ error: "Fadlan soo gal nidaamka" });
    }
    
    const storeId = req.session.storeData.id;
    
    // 🟢 ISBEDDELKA KALIYA EE LA KU DARI YAHAY:
    // Waxaa ku darnay .catch() si server-ku uusan u dhacin haddii Baileys uu dib u dhaco ama error bixiyo
    startWhatsApp(storeId).catch(err => {
        console.error(`❌ Cilad ayaa ka dhacday kicinita Bot-ka dukaanka ${storeId}:`, err.message || err);
    });
    
    res.send({ status: 'started' });
});

// 2. Dariiqan wuxuu hubinayaa haddii QR-kii diyaar yahay iyo inuu xirmay
app.get('/api/whatsapp/qr', (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).send({ error: "Fadlan soo gal nidaamka" });
    }
    
    const qrImage = getLatestQR(); // Wuxuu soo qabanayaa sawirkii u dambeeyay
    res.send({ qrImage: qrImage });
});

app.listen(PORT, () => {
    console.log(`Bismillah! Nidaamku wuxuu ka shaqaynayaa: http://localhost:${PORT}`);
});