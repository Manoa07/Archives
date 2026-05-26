const express = require('express');
const { ADMIN_PASSWORD, PORT, ROOT_DIR, SESSION_SECRET, validateConfig } = require('./backend/config');
const { createDatabases, seedSacrementsIfEmpty, backfillCreatedAtIfMissing } = require('./backend/db');
const { applyBaseMiddleware } = require('./backend/middleware');
const { registerAuthRoutes } = require('./backend/routes/auth');
const { registerMariagesRoutes } = require('./backend/routes/mariages');
const { registerSacrementsRoutes } = require('./backend/routes/sacrements');
const { registerPageRoutes } = require('./backend/routes/pages');

validateConfig();

const app = express();
const db = createDatabases(ROOT_DIR);

// Le point d'entrée assemble les briques, sans contenir leur logique interne.
applyBaseMiddleware(app, ROOT_DIR, SESSION_SECRET);
registerAuthRoutes(app, ADMIN_PASSWORD);
registerMariagesRoutes(app, db);
registerSacrementsRoutes(app, db);
registerPageRoutes(app, ROOT_DIR);

// Démarre le backend HTTP après avoir préparé les données initiales.
async function startServer() {
    await seedSacrementsIfEmpty(db);
    await backfillCreatedAtIfMissing(db);

    return new Promise((resolve, reject) => {
        const server = app.listen(PORT, () => {
            console.log(`Logiciel prêt : http://localhost:${PORT}`);
            resolve(server);
        });

        server.on('error', reject);
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Impossible de démarrer le serveur :", error.message);
        process.exit(1);
    });
}

module.exports = {
    app,
    startServer
};
