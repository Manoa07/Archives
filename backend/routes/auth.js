const bcrypt = require('bcryptjs');
const fs = require('fs');
const { ADMIN_PASSWORD_FILE } = require('../config');

// Routes liées à la session d'administration.
function registerAuthRoutes(app, adminPassword) {
    const passwordHash = loadPasswordHash(adminPassword);

    app.post('/api/login', (req, res) => {
        const { password } = req.body;

        if (bcrypt.compareSync(password || '', passwordHash.value)) {
            req.session.authenticated = true;
            res.json({ success: true });
            return;
        }

        res.status(401).json({ success: false, message: "Mot de passe incorrect" });
    });

    app.put('/api/admin-password', (req, res) => {
        if (!req.session.authenticated) {
            res.status(403).json({ error: "Accès non autorisé" });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        if (!bcrypt.compareSync(currentPassword || '', passwordHash.value)) {
            res.status(401).json({ success: false, message: "Mot de passe actuel incorrect" });
            return;
        }

        if (!newPassword || String(newPassword).length < 4) {
            res.status(400).json({ success: false, message: "Le nouveau mot de passe est trop court" });
            return;
        }

        const nextHash = bcrypt.hashSync(String(newPassword), 10);
        savePasswordHash(nextHash);
        passwordHash.value = nextHash;
        res.json({ success: true });
    });

    app.get('/api/session', (req, res) => {
        res.json({ authenticated: Boolean(req.session.authenticated) });
    });

    app.post('/api/logout', (req, res) => {
        req.session.destroy((error) => {
            if (error) {
                res.status(500).json({ success: false, message: "Impossible de fermer la session" });
                return;
            }

            res.clearCookie('connect.sid');
            res.json({ success: true });
        });
    });
}

function loadPasswordHash(adminPassword) {
    if (fs.existsSync(ADMIN_PASSWORD_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(ADMIN_PASSWORD_FILE, 'utf8'));
            if (data.passwordHash) {
                return { value: data.passwordHash };
            }
        } catch (error) {
            // Si le fichier est corrompu, on repart de la config de départ.
        }
    }

    const hash = bcrypt.hashSync(adminPassword, 10);
    savePasswordHash(hash);
    return { value: hash };
}

function savePasswordHash(passwordHash) {
    fs.writeFileSync(ADMIN_PASSWORD_FILE, JSON.stringify({ passwordHash }, null, 2));
}

module.exports = {
    registerAuthRoutes
};
