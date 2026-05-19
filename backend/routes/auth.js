const bcrypt = require('bcryptjs');

// Routes liées à la session d'administration.
function registerAuthRoutes(app, adminPassword) {
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    app.post('/api/login', (req, res) => {
        const { password } = req.body;

        if (bcrypt.compareSync(password, passwordHash)) {
            req.session.authenticated = true;
            res.json({ success: true });
            return;
        }

        res.status(401).json({ success: false, message: "Mot de passe incorrect" });
    });

    app.get('/api/session', (req, res) => {
        res.json({ authenticated: Boolean(req.session.authenticated) });
    });
}

module.exports = {
    registerAuthRoutes
};
