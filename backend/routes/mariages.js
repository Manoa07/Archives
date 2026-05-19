const { asyncHandler, checkAuth } = require('../middleware');

function registerMariagesRoutes(app, db) {
    const createMariage = asyncHandler(async (req, res) => {
        const doc = await db.mariages.insert(req.body);
        res.json({ success: true, id: doc._id });
    });

    const listMariages = asyncHandler(async (req, res) => {
        const docs = await db.mariages.find({}).sort({ nom: 1 });
        res.json(docs);
    });

    const deleteMariage = asyncHandler(async (req, res) => {
        await db.mariages.remove({ _id: req.params.id });
        res.json({ message: "Supprimé avec succès" });
    });

    app.post('/api/mariages', checkAuth, createMariage);
    app.get('/api/mariages', checkAuth, listMariages);
    app.delete('/api/mariages/:id', checkAuth, deleteMariage);
}

module.exports = {
    registerMariagesRoutes
};
