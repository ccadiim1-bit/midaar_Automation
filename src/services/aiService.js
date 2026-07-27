// src/services/aiService.js
const supabase = require('../config/supabaseClient'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function generateAIResponse(storeId, messageText) {
    try {
        const { data: storeInfo, error: storeError } = await supabase
            .from('stores') 
            .select('gemini_key, location, work_hours, system_prompt')
            .eq('id', storeId)
            .single();

        if (storeError) {
            console.error('❌ Cilad akhrinta Dukaanka:', storeError.message);
            return "Waan ka xunnahay, cilad ayaa ka dhacday dhanka kaydka.";
        }

        const { data: products, error: productError } = await supabase
            .from('products')
            .select('product_name, product_price, product_desc')
            .eq('store_id', storeId);

        if (productError) console.error('❌ Cilad akhrinta Alaabta:', productError.message);

        // =========================================================
        // 🔒 HUBINTA FURAHA
        // =========================================================
        let apiKeyToUse = storeInfo?.gemini_key;

        if (!apiKeyToUse || apiKeyToUse.trim() === '' || !apiKeyToUse.startsWith('AIza')) {
            console.log('⚠️ Dukaanku fure sax ah ma laha, waxaan isticmaalaynaa Master Key-ga.');
            apiKeyToUse = process.env.MASTER_GEMINI_API_KEY;
        }

        if (!apiKeyToUse || !apiKeyToUse.startsWith('AIza')) {
            console.log('❌ Ma jiro API Key sax ah oo la helay!');
            return "Cilad farsamo: Nidaamka AI-ga ma haysto fure uu ku shaqeeyo.";
        }

        // =========================================================
        // 🧠 DIYAARINTA XOGTA
        // =========================================================
        let productList = "\n\n📦 ALAABTA HADDA DUKAANKA YAALLA:\n";
        if (products && products.length > 0) {
            products.forEach(p => {
                productList += `- ${p.product_name}: Qiimuhu waa $${p.product_price}. (${p.product_desc})\n`;
            });
        } else {
            productList += "Waqtigan xaadirka ah wax alaab ah ma yaallaan.\n";
        }

        const finalSystemPrompt = `
        ${storeInfo?.system_prompt || 'Waxaad tahay iibiye asluub leh oo matalaya dukaankan.'}
        
        XOGTA DUKAANKA:
        📍 Goobta: ${storeInfo?.location || 'Lama garanayo'}
        ⏰ Saacadaha: ${storeInfo?.work_hours || 'Lama garanayo'}
        ${productList}

        SHURUUDAHA JAWABTA:
        1. Ula hadl sidii qof iibiye ah oo xushmad leh.
        2. Af-Soomaali gaaban oo cad isticmaal.
        3. Haddii wax aan jirin lagu weydiiyo, dheh hadda ma hayno.
        `;

        const genAI = new GoogleGenerativeAI(apiKeyToUse);
        
        // 🚀 LIISKA MODEL-YADA CUSUB EE LAGUU OGOLYAHAY (UPDATED)
        const modelsToTry = [
            "gemini-2.5-flash",    // Midka ugu dhakhsaha badan ee ku jira liiskaaga
            "gemini-flash-latest", // Wuxuu markasta soo qaban doonaa kii ugu dambeeyay ee Google soo daayo
            "gemini-2.5-pro",      // Haddii flash cilad qabto, kan aadka u caqliga badan ayuu u gudbayaa
            "gemini-2.0-flash"     // Keydka ugu dambeeya
        ];

        let aiResponseText = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`🔄 Iskudayga Model-ka: ${modelName}...`);
                
                // Model-yadan cusubi dhammaantood si toos ah ayay u fahmaan 'systemInstruction'
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    systemInstruction: finalSystemPrompt
                });

                const result = await model.generateContent(messageText);
                aiResponseText = result.response.text();
                
                console.log(`✅ Guul! Model-ka [${modelName}] ayaa shaqeeyay.`);
                break; 

            } catch (modelError) {
                console.log(`⚠️ Model-ka [${modelName}] wuu diiday.`);
                console.error(`   👉 SABABTA:`, modelError.message || modelError);
            }
        }

        if (!aiResponseText) {
            throw new Error("Dhammaan noocyadii Gemini Model-s way wada fashilmeen.");
        }

        return aiResponseText;

    } catch (error) {
        console.error('❌ Cilad weyn ayaa ka dhacday nidaamka AI-ga:', error.message);
        return "Cilad farsamo ayaa jirta, fadlan dib u isku day inyar kadib.";
    }
}

module.exports = { generateAIResponse };