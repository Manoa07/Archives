const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;

function createWindow() {
    // 1. Lancer le serveur backend (votre server.js)
    require('./server.js');

    // 2. Créer la fenêtre du logiciel
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: path.join(__dirname, 'icon.ico'), // Si vous avez une icône
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

    // 3. Charger votre interface
    // On attend un petit peu que le serveur démarre
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
    }, 1000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});