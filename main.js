const { app, BrowserWindow, dialog } = require('electron');
const http = require('http');
const path = require('path');
const { PORT } = require('./backend/config');
const { startServer } = require('./server');

let mainWindow;
let backendServer;

// Attend que le backend réponde avant d'ouvrir l'interface Electron.
async function waitForServer(url, timeoutMs = 5000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) { 
        const isReady = await pingServer(url);

        if (isReady) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
    }

    throw new Error(`Serveur indisponible après ${timeoutMs} ms`);
}

// Vérifie rapidement si une URL HTTP locale répond.
function pingServer(url) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            res.resume();
            resolve(res.statusCode >= 200 && res.statusCode < 500);
        });

        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Démarre le backend si nécessaire puis ouvre la fenêtre desktop Electron.
async function createWindow() {
    const appUrl = `http://localhost:${PORT}`;

    // Si un backend existe déjà sur ce port, Electron le réutilise.
    // Sinon il démarre sa propre instance.
    try {
        backendServer = await startServer();
    } catch (error) {
        if (error.code !== 'EADDRINUSE') {
            throw error;
        }
    }

    await waitForServer(appUrl);

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: false
        }
    });

    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        item.setSaveDialogOptions({
            title: 'Enregistrer le PDF',
            filters: [
                { name: 'Fichiers PDF', extensions: ['pdf'] }
            ]
        });
    });

    await mainWindow.loadURL(appUrl);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow).catch((error) => {
    console.error("Impossible de lancer l'application Electron :", error.message);
    dialog.showErrorBox(
        "Démarrage impossible",
        `L'application n'a pas pu démarrer correctement.\n\nCause : ${error.message}`
    );
    app.quit();
});

app.on('window-all-closed', () => {
    if (backendServer) {
        backendServer.close();
        backendServer = null;
    }

    if (process.platform !== 'darwin') app.quit();
});
