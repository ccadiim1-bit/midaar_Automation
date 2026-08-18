// index.js
require('dotenv').config(); // 🟢 WAA INUU NOQDAA SAFKA UGU HORREEYA
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session'); 

// 🟢 KALA QAYBINTA ROUTES-KA
const pageRoutes = require('./src/routes/pageRoutes.js');
const authRoutes = require('./src/routes/authRoutes.js');
const productRoutes = require('./src/routes/productRoutes.js');
const whatsappRoutes = require('./src/routes/whatsappRoutes.js');
const settingsRoutes = require('./src/routes/settingsRoutes.js');
const paymentRoutes = require('./src/routes/paymentRoutes.js');

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

// ----- ISTICMAALKA ROUTES-KA CUSUB -----
app.use('/', pageRoutes);
app.use('/', authRoutes); // Auth routes-ka qaar waxay isticmaalaan '/'
app.use('/api/products', productRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentRoutes);

// Server-ka halkan ayuu ka kacayaa waana inuu ugu dambeeyaa
app.listen(PORT, () => {
    console.log(`Bismillah! Nidaamku wuxuu ka shaqaynayaa: http://localhost:${PORT}`);
});