const path = require('path');

// Routes de fallback pour servir l'application web.
function registerPageRoutes(app, rootDir) {
    app.get('/', (req, res) => {
        res.sendFile(path.join(rootDir, 'index.html'));
    });

    app.get('*', (req, res) => {
        res.sendFile(path.join(rootDir, 'index.html'));
    });
}

module.exports = {
    registerPageRoutes
};
