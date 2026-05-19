const { asyncHandler, checkAuth } = require('../middleware');

// Déclare les routes CRUD minimales pour la ressource mariage.
function registerMariagesRoutes(app, db) {
    // Enregistre un mariage envoyé depuis le formulaire frontend.
    const createMariage = asyncHandler(async (req, res) => {
        const doc = await db.mariages.insert(req.body);
        res.json({ success: true, id: doc._id });
    });

    // Retourne la liste des mariages pour affichage et recherche.
    const listMariages = asyncHandler(async (req, res) => {
        const docs = await db.mariages.find({}).sort({ nom: 1 });
        res.json(docs);
    });

    // Supprime un mariage à partir de son identifiant.
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
