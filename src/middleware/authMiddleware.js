// src/middleware/authMiddleware.js

function isLoggedIn(req, res, next) {
    if (req.session.isLoggedIn && req.session.storeData) {
        return next();
    }

    // Haddii ay tahay codsi API ah, soo celi JSON, haddii kale u dir bogga login
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, message: 'Fadlan soo gal nidaamka si aad u sii waddo.' });
    }
    
    res.redirect('/login');
}

module.exports = { isLoggedIn };