// src/config/mongoClient.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
if (!uri) {
    throw new Error('MONGO_URI aan laga helin faylka .env. Fadlan ku dar.');
}

const client = new MongoClient(uri);
let db;

async function connectToMongo() {
    if (db) return db;
    try {
        await client.connect();
        console.log('✅ Si guul leh ayaa loogu xirmay MongoDB.');
        db = client.db(); // Isticmaal database-ka ku jira connection string-ga
        return db;
    } catch (e) {
        console.error('❌ Lama isku xiri karin MongoDB', e);
        process.exit(1);
    }
}

module.exports = { connectToMongo };