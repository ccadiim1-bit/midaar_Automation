// src/services/aiService.js
const supabase = require('../config/supabaseClient'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai'); // Import OpenAI for DeepSeek fallback
require('dotenv').config(); // Ensure dotenv is loaded

// Preferred Gemini models to try in order of preference/cost
const preferredGeminiModels = [
    "gemini-flash-latest", // Fast and cheap
    "Gemini 3.7 Flash",   // More powerful, if flash fails
    "gemini-3.5-pro",  
    "gemini-2.5-flash-lite"        // Older but stable fallback
];

async function generateAIResponse(storeId, userPrompt, productsContext, chatHistory = [], imageData = null) {
    try {
        const { data: storeInfo, error: storeError } = await supabase
            .from('stores') 
            .select('system_prompt, location, work_hours, gemini_key') // 🟢 WAA LAGU DARAY: gemini_key
            .eq('id', storeId)
            .single();

        if (storeError) {
            console.error('❌ Cilad akhrinta Dukaanka:', storeError.message);
            return "Waan ka xunnahay, cilad ayaa ka dhacday dhanka kaydka.";
        }

        const finalSystemPrompt = `
        ${storeInfo?.system_prompt || 'Waxaad tahay iibiye asluub leh oo matalaya dukaankan.'}
        
        XOGTA DUKAANKA:
        📍 Goobta: ${storeInfo?.location || 'Lama garanayo'}
        ⏰ Saacadaha: ${storeInfo?.work_hours || 'Lama garanayo'}
        ${productsContext}

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

        const formattedHistory = chatHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        // Gemini requires history to start with a user message
        // Ensure the history starts with a 'user' role, if not, remove leading 'model' messages
        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift(); 
        }

        let aiResponseText = null;
        
        // --- 🟢 TALLAABADA 1-AAD: Isku day furaha gaarka ah ee dukaanka (Store's API Key) ---
        if (storeInfo && storeInfo.gemini_key) {
            // console.log(`[AI] Waxaa la isku dayayaa furaha gaarka ah ee dukaanka...`);
            for (const modelName of preferredGeminiModels) {
                try {
                    // console.log(`🔄 [AI] Iskudayga Model-ka: ${modelName} (Furaha Dukaanka)`);
                    const genAI = new GoogleGenerativeAI(storeInfo.gemini_key);
                    const model = genAI.getGenerativeModel({ 
                        model: modelName,
                        systemInstruction: finalSystemPrompt
                    });
    
                    // 🟢 CUSBOONAYSIIN: Ku dar sawirka haddii uu jiro
                    const promptParts = [];
                    if (imageData) {
                        promptParts.push({
                            inlineData: {
                                mimeType: 'image/jpeg', // Waxaan u qaadanaynaa inuu yahay JPEG
                                data: imageData,
                            },
                        });
                    }
                    // Ku dar qoraalka weydiinta
                    promptParts.push({ text: userPrompt });

                    const chatSession = model.startChat({ history: formattedHistory });
                    const result = await chatSession.sendMessage(promptParts);
                    aiResponseText = result.response.text();
                    
                    // console.log(`✅ [AI] Guul! Furaha gaarka ah ee dukaanka ayaa shaqeeyay model-ka ${modelName}.`);
                    return aiResponseText; // Return immediately on success with store key

                } catch (storeKeyError) {
                    const errorMessage = storeKeyError.message || 'Cilad aan la aqoon';
                    console.warn(`⚠️ [AI] Furaha gaarka ah ee dukaanka wuu fashilmay (${modelName}):`, errorMessage);
                    // Do not return, let it fall through to master keys
                }
            }
        }

        // --- TALLAABADA 2-AAD: U gudub OpenRouter haddii kii dukaanku fashilmo ama uusan jirin ---
        if (!aiResponseText) {
            const openRouterApiKey = process.env.OPENROUTER_KEY_1;
            if (!openRouterApiKey) {
                console.warn('⚠️ [AI] OPENROUTER_KEY_1 not found in .env. Skipping OpenRouter fallback.');
            } else {
                const openRouterModelsToTry = [
                   'google/gemini-3.7-flash', // Corrected model name
                ];

                const openRouterClient = new OpenAI({
                    apiKey: openRouterApiKey,
                    baseURL: 'https://openrouter.ai/api/v1'
                });

                const openRouterMessages = [{ role: "system", content: finalSystemPrompt }];

                // Prepare chat history
                chatHistory.forEach(msg => {
                    openRouterMessages.push({
                        role: msg.role === 'ai' ? 'assistant' : 'user',
                        content: msg.text
                    });
                });

                // Prepare user message with image
                const userMessageContent = [];
                if (userPrompt) {
                    userMessageContent.push({ type: "text", text: userPrompt });
                }
                if (imageData) {
                    userMessageContent.push({
                        type: "image_url",
                        image_url: { url: `data:image/jpeg;base64,${imageData}` }
                    });
                }
                if (userMessageContent.length > 0) {
                    openRouterMessages.push({ role: "user", content: userMessageContent });
                }

                for (const model of openRouterModelsToTry) {
                    try {
                        console.log(`[AI] Waxaan isku dayeynaa OpenRouter (${model})...`);
                        const completion = await openRouterClient.chat.completions.create({
                            model: model,
                            messages: openRouterMessages,
                        });

                        aiResponseText = completion.choices[0].message.content;
                        if (aiResponseText) {
                            return aiResponseText; // Guul!
                        }
                    } catch (openRouterError) {
                        const errorMessage = openRouterError.message || 'Cilad aan la aqoon';
                        console.error(`❌ [AI] OpenRouter (${model}) wuu fashilmay:`, errorMessage);
                        // U gudub model-ka xiga
                    }
                }
            }
        }

        // --- TALLAABADA 3-AAD: Fallback to DeepSeek if all Gemini attempts fail ---
        if (!aiResponseText) {
            const deepseekApiKey = process.env.MASTER_DEEPSEEK_API_KEY;
            if (!deepseekApiKey) {
                console.error('❌ CRITICAL: MASTER_DEEPSEEK_API_KEY not found in .env file. DeepSeek fallback not possible. Please add it to your .env file.');
                throw new Error("No DeepSeek API key available for fallback.");
            }

            try {
                console.log('⚠️ [AI] Dhammaan noocyadii Gemini way fashilmeen. Waxaan u gudbaynaa DeepSeek...');
                const deepseekClient = new OpenAI({
                    apiKey: deepseekApiKey,
                    baseURL: 'https://api.deepseek.com'
                });
                
                const deepseekMessages = [{ role: "system", content: finalSystemPrompt }];

                // Prepare chat history for DeepSeek
                chatHistory.forEach(msg => {
                    deepseekMessages.push({
                        role: msg.role === 'ai' ? 'assistant' : 'user',
                        content: msg.text
                    });
                });

                // 🟢 CUSBOONAYSIIN: Ku dar sawirka iyo qoraalka DeepSeek
                const userMessageContent = [];
                if (userPrompt) {
                    userMessageContent.push({ type: "text", text: userPrompt });
                }
                if (imageData) {
                    userMessageContent.push({
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageData}`
                        }
                    });
                }
                if (userMessageContent.length > 0) {
                    deepseekMessages.push({ role: "user", content: userMessageContent });
                }

                // console.log(`🔄 [AI] Iskudayga DeepSeek...`);

                const completion = await deepseekClient.chat.completions.create({
                    model: "deepseek-chat", // Or "deepseek-coder" if preferred
                    messages: deepseekMessages,
                });

                aiResponseText = completion.choices[0].message.content;
                // console.log(`✅ [AI] Guul! DeepSeek ayaa shaqeeyay.`);
                return aiResponseText;

            } catch (deepseekError) {
                const errorMessage = deepseekError.message || 'Cilad aan la aqoon';
                console.error(`❌ [AI] DeepSeek sidoo kale wuu fashilmay:`, errorMessage);
                throw new Error("Dhammaan nidaamyadii AI-ga way fashilmeen.");
            }
        }

    } catch (error) {
        console.error('❌ Cilad weyn ayaa ka dhacday nidaamka AI-ga:', error.message);
        return "Cilad farsamo ayaa jirta, fadlan dib u isku day inyar kadib.";
    }
}

module.exports = { generateAIResponse };