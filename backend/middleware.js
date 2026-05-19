const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const express = require('express');

function applyBaseMiddleware(app, rootDir, sessionSecret) {
    app.use(helmet({ contentSecurityPolicy: false }));
    app.use(cors());
    // Express intègre déjà le parsing JSON, pas besoin d'une dépendance dédiée.
    app.use(express.json());
    app.use(express.static(rootDir));
    app.use(session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    }));
}

function checkAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
        return;
    }

    res.status(403).json({ error: "Accès non autorisé" });
}

function asyncHandler(handler) {
    return async (req, res) => {
        try {
            await handler(req, res);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = {
    applyBaseMiddleware,
    asyncHandler,
    checkAuth
};
