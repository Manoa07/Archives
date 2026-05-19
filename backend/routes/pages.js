const path = require('path');

// Routes de fallback pour servir l'application web.
function registerPageRoutes(app, rootDir) {
    // Sert la page principale.
    app.get('/', (req, res) => {
        res.sendFile(path.join(rootDir, 'index.html'));
    });

    // Redirige toute autre URL frontend vers la même page.
    app.get('*', (req, res) => {
        res.sendFile(path.join(rootDir, 'index.html'));
    });
}

module.exports = {
    registerPageRoutes
};
