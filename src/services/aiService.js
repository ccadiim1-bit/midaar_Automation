// src/services/aiService.js
const supabase = require('../config/supabaseClient'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai'); // 🟢 KORDHIN CUSUB: Maktabadda DeepSeek (Plan C)
require('dotenv').config();

// 🟢 KORDHIN: Waxaan ku darnay 'chatHistory' oo ah liiska fariimihii hore
// 🟢 KUDARISTA CUSUB (SAWIRADA): Waxaan ku darnay 'imageData' parameter-ka ugu dambeeya
async function generateAIResponse(storeId, messageText, chatHistory = [], imageData = null) {
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
        // 🔒 HUBINTA FURAHA IYO KALA SAARISTA
        // =========================================================
        let apiKeyToUse = storeInfo?.gemini_key;
        let isMasterKey = false; 

        // Waxaan ogolaanay in furuhu ka bilowdo 'AIza' AMA 'AQ.'
        if (!apiKeyToUse || apiKeyToUse.trim() === '' || !(apiKeyToUse.startsWith('AIza') || apiKeyToUse.startsWith('AQ.'))) {
            console.log('⚠️ Dukaanku fure sax ah ma laha, waxaan isticmaalaynaa Master Key-ga.');
            apiKeyToUse = process.env.MASTER_GEMINI_API_KEY;
            isMasterKey = true; 
        }

        if (!apiKeyToUse || !(apiKeyToUse.startsWith('AIza') || apiKeyToUse.startsWith('AQ.'))) {
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

        // 🟢 KORDHIN: Shuruudo adag oo hubinaya Magaca, Nambarka iyo Goobta iyo XUSUUSTA ALAABTA inta aan la dirin ORDER_TRIGGERED
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
        4. KALA SAAR WEYDIINTA IYO DALABKA RASMIGA AH:
           - WEYDIIN (Inquiry): Haddii qofku weydiinayo qiimaha, midabka, ama "ma haysaa?", u sharax alaabta hana soo saarin ORDER_TRIGGERED.
           - DALAB DHAB AH (Order): MARNABA ha soo saarin ORDER_TRIGGERED haddii uusan macmiilku si cad u soo qorin 3-daan qodob: 1. Magaciisa 2. Nambarkiisa Telefoonka 3. Goobtiisa/Magaalada.
           - HADDII XOGTU DHIMAN TAHAY: Haddii uu yiraahdo "waan iibsanayaa" ama "ii keena" balse uusan soo wada raacinin Magaca, Nambarka iyo Goobta, weydii xogta dhiman si xushmad leh (tusaale: "Fadlan iisoo qor magacaaga, nambarkaaga iyo goobta lagugu keenayo si aan dalabka kuugu diiwaangeliyo"), hana soo saarin ORDER_TRIGGERED.
        5. XUSUUSTA DALABKA IYO LA SAXIDA XOGTA (CORRECTION & UPDATE):
           - Haddii macmiilku horay u dalbaday oo uu kaliya sheeko caadi ah wado, ha celinin ORDER_TRIGGERED mar labaad.
           - HADDII MACMIILKU SAXO AMA KA BEDDELO XOGTII DALABKA (tusaale: uu yiraahdo "nambarka baan qalday", "nambarkayga saxda ah waa X", ama uu goobta beddelo), WAA IN AAD MAR LABAAD SOO SAARTAA ORDER_TRIGGERED iyadoo nambarka/xogta cusub ee la saxay ay ku jirto!
        6. KA SOO NIDAAMI ALAABTA XUSUUSTA (PRODUCT INFERENCE):
           - Haddii uu macmiilku yiraahdo "ii keena", "waan iibsanayaa", ama uu soo diro Magac, Nambar iyo Goob ISAGOON MAGACA ALAABTA MAR KALE SOO SAARIN:
           - Ka raadi sheekada hore (chatHistory) alaabtii ugu dambaysay ee uu qiimaheeda ama xogteeda weydiinayay.
           - Ku buuxi magaca alaabtaas qaybta [Alaabta La Dalbaday] ee ORDER_TRIGGERED.
        7. QAABKA SOO SAARISTA DALABKA: Kaliya marka macmiilku uu soo wada gudbiyo xogta oo dhan (Magac, Nambar, Goob), soo saar fariin qaabkan ah (adigoon raacinin sheeko kale):
           ORDER_TRIGGERED: [Magaca Macmiilka] | [Nambarka Telefoonka] | [Goobta/Magaalada] | [Alaabta La Dalbaday]
        `;

        const genAI = new GoogleGenerativeAI(apiKeyToUse);
        
        // =========================================================
        // 🚀 KALA DOORASHO MODEL-YADA CUSUB (COST SAVING LOGIC)
        // =========================================================
        let modelsToTry = [];

       if (isMasterKey) {
            console.log('💰 Master Key baa shaqaynaya: Waxaan dooranaynaa Lite iyo Models-ka ugu jaban');
            modelsToTry = [
                 "gemini-flash-latest",
                "gemini-2.0-flash-lite",
                "gemini-2.0-flash",
                "gemini-flash-latest"
            ];
        } else {
    console.log('👑 Store Key baa shaqaynaya: Waxaan isku dayaynaa Models-ka ugu jaban ee cusub');
    modelsToTry = [
        "gemini-flash-latest",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest"
    ];
        }

        // 🟢 KORDHIN: Habaynta Xusuusta (History Formatting) ee Gemini API
        const formattedHistory = chatHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user', 
            parts: [{ text: msg.text }]
        }));

        // 🛠️ XALINTA CILADDA: Gemini wuxuu shardi ka dhigayaa in xusuustu ka bilaabato fariin 'user' ah
        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift(); 
        }

        let aiResponseText = null;

        // 🟢 KUDARISTA CUSUB (SAWIRADA): Diyaarinta fariinta Gemini loo dirayo (Prompt Parts)
        let promptParts = [];
        
        if (messageText) {
            promptParts.push(messageText);
        } else if (imageData) {
            promptParts.push("Fadlan sawirkan maxaa ku jira ee iib ah, iina sharax si kooban.");
        }
        
        if (imageData) {
            promptParts.push(imageData);
        }

        for (const modelName of modelsToTry) {
            try {
                console.log(`🔄 Iskudayga Model-ka: ${modelName}...`);
                
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    systemInstruction: finalSystemPrompt
                });

                const chatSession = model.startChat({
                    history: formattedHistory
                });

                // 🟢 KUDARISTA CUSUB (SAWIRADA): Halkan waxaa la dirayaa array-gii xambaarsanaa qoraalka iyo sawirka
                const result = await chatSession.sendMessage(promptParts);
                aiResponseText = result.response.text();
                
                console.log(`✅ Guul! Model-ka [${modelName}] ayaa shaqeeyay.`);
                break; 

            } catch (modelError) {
                console.log(`⚠️ Model-ka [${modelName}] wuu diiday.`);
                console.error(`   👉 SABABTA:`, modelError.message || modelError);
            }
        }
 
        // =========================================================
        // 🟢 KORDHIN CUSUB: FALLBACK TO MASTER KEY 
        // =========================================================
        if (!aiResponseText && !isMasterKey) {
            console.log('⚠️ Dukaanka API-giisa wuu fashilmay. Waxaan si toos ah ugu wareegaynaa Master Key...');
            
            const fallbackGenAI = new GoogleGenerativeAI(process.env.MASTER_GEMINI_API_KEY);
            const fallbackModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]; 

            for (const modelName of fallbackModels) {
                try {
                    console.log(`🔄 Iskudayga Master Key-ga ee Model-ka: ${modelName}...`);
                    
                    const fallbackModel = fallbackGenAI.getGenerativeModel({ 
                        model: modelName,
                        systemInstruction: finalSystemPrompt
                    });

                    const fallbackChatSession = fallbackModel.startChat({
                        history: formattedHistory
                    });

                    // 🟢 KUDARISTA CUSUB (SAWIRADA): Sidoo kale Master Key fallback waa inuu raaciyaa sawirka iyo qoraalka
                    const result = await fallbackChatSession.sendMessage(promptParts);
                    aiResponseText = result.response.text();
                    
                    console.log(`✅ Guul! Master Key-ga ayaa ku shaqeeyay Model-ka [${modelName}].`);
                    break; 

                } catch (fallbackError) {
                    console.log(`⚠️ Master Key-ga Model-ka [${modelName}] wuu diiday.`);
                    console.error(`   👉 SABABTA:`, fallbackError.message || fallbackError);
                }
            }
        }

        // =========================================================
        // 🟠 KORDHIN CUSUB: PLAN C - FALLBACK TO DEEPSEEK API
        // =========================================================
        if (!aiResponseText) {
            console.log('⚠️ Dhammaan noocyadii Gemini way fashilmeen. Waxaan u gudbaynaa Plan C (Master DeepSeek Key)...');
            try {
                const deepseekClient = new OpenAI({
                    apiKey: process.env.MASTER_DEEPSEEK_API_KEY,
                    baseURL: 'https://api.deepseek.com'
                });

                const deepseekMessages = [{ role: "system", content: finalSystemPrompt }];

                // Diyaarinta taariikhda sheekada ee DeepSeek
                chatHistory.forEach(msg => {
                    deepseekMessages.push({
                        role: msg.role === 'ai' ? 'assistant' : 'user',
                        content: msg.text
                    });
                });

                // 🟢 KUDARISTA CUSUB (SAWIRADA): Haddii uusan jirin qoraal balse uu jiro sawir kaliya, DeepSeek waa loo sharaxayaa
                let deepseekUserContent = messageText;
                if (!messageText && imageData) {
                    deepseekUserContent = "[FARIIN SYSTEM]: Macaamiilka wuxuu soo diray sawir, balse adiga ma akhrin kartid sawirada. U sheeg macmiilka in aadan sawirka arki karin oo uu qoraal kuugu soo sheego waxa uu rabo.";
                }

                // Fariinta ugu dambaysa ee macmiilka
                deepseekMessages.push({ role: "user", content: deepseekUserContent });

                console.log(`🔄 Iskudayga Plan C ee DeepSeek...`);

                const completion = await deepseekClient.chat.completions.create({
                    model: "deepseek-chat",
                    messages: deepseekMessages,
                });

                aiResponseText = completion.choices[0].message.content;
                console.log(`✅ Guul! Plan C (Master DeepSeek Key) ayaa shaqeeyay.`);

            } catch (deepseekError) {
                console.log(`❌ Plan C (DeepSeek) sidoo kale wuu fashilmay.`);
                console.error(`   👉 SABABTA:`, deepseekError.message || deepseekError);
            }
        }

        if (!aiResponseText) {
            throw new Error("Dhammaan noocyadii Gemini Model-s way wada fashilmeen, xataa Master Key-ga.");
        }

        return aiResponseText;

    } catch (error) {
        console.error('❌ Cilad weyn ayaa ka dhacday nidaamka AI-ga:', error.message);
        return "Cilad farsamo ayaa jirta, fadlan dib u isku day inyar kadib.";
    }
}

module.exports = { generateAIResponse };