const { asyncHandler, checkAuth } = require('../middleware');

// Déclare les routes CRUD minimales pour les sacrements.
function registerSacrementsRoutes(app, db) {
    app.post('/api/sacrements', checkAuth, asyncHandler(async (req, res) => {
        const doc = await db.sacrements.insert(req.body);
        res.json({ success: true, id: doc._id });
    }));

    app.get('/api/sacrements', checkAuth, asyncHandler(async (req, res) => {
        const docs = await db.sacrements.find({});
        res.json(docs);
    }));

    app.delete('/api/sacrements/:id', checkAuth, asyncHandler(async (req, res) => {
        await db.sacrements.remove({ _id: req.params.id });
        res.json({ message: "Supprimé avec succès" });
    }));
}

module.exports = {
    registerSacrementsRoutes
};
