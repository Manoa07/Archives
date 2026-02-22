const express = require('express');
const Datastore = require('nedb-promises'); // Plus besoin de sqlite3 !
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Création des bases de données (Fichiers .db simples)
const dbSacrements = Datastore.create({ filename: path.join(__dirname, 'sacrements.db'), autoload: true });
const dbPersonnes = Datastore.create({ filename: path.join(__dirname, 'personnes.db'), autoload: true });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

app.use(session({
    secret: 'votre_cle_secrete_eglise',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const motDePasseHash = bcrypt.hashSync("admin123", 10);

// --- AUTHENTIFICATION ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (bcrypt.compareSync(password, motDePasseHash)) {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Mot de passe incorrect" });
    }
});

const checkAuth = (req, res, next) => {
    if (req.session.authenticated) next();
    else res.status(403).json({ error: "Accès non autorisé" });
};

// --- ROUTES PERSONNES ---
app.post('/api/personnes', checkAuth, async (req, res) => {
    try {
        const doc = await dbPersonnes.insert(req.body);
        res.json({ success: true, id: doc._id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/personnes', async (req, res) => {
    const docs = await dbPersonnes.find({}).sort({ nom: 1 });
    res.json(docs);
});

// --- ROUTES SACREMENTS ---
app.post('/api/sacrements', checkAuth, async (req, res) => {
    try {
        const doc = await dbSacrements.insert(req.body);
        res.json({ success: true, id: doc._id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sacrements', async (req, res) => {
    const docs = await dbSacrements.find({});
    res.json(docs);
});

app.delete('/api/sacrements/:id', checkAuth, async (req, res) => {
    try {
        await dbSacrements.remove({ _id: req.params.id });
        res.json({ message: "Supprimé avec succès" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`Logiciel prêt : http://localhost:${PORT}`));