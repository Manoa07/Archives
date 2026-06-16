const fs = require('fs');
const path = require('path');

// Charge un fichier .env simple pour alimenter process.env en local.
function loadEnvFile() {
    const envPath = path.join(__dirname, '..', '.env');

    if (!fs.existsSync(envPath)) {
        return;
    }

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile();

const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_PASSWORD_FILE = path.join(__dirname, '..', 'admin-password.json');
const ROOT_DIR = path.join(__dirname, '..');

// Vérifie que les variables critiques existent avant de démarrer le serveur.
function validateConfig() {
    if (!SESSION_SECRET || !ADMIN_PASSWORD) {
        console.error(
            "Configuration manquante: définissez SESSION_SECRET et ADMIN_PASSWORD dans les variables d'environnement ou dans un fichier .env."
        );
        process.exit(1);
    }
}

module.exports = {
    ADMIN_PASSWORD,
    ADMIN_PASSWORD_FILE,
    PORT,
    ROOT_DIR,
    SESSION_SECRET,
    validateConfig
};
