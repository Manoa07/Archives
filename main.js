const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
    // 1. Lancer le serveur backend (votre server.js)
    serverProcess = fork(path.join(__dirname, 'server.js'));

    // 2. Créer la fenêtre du logiciel
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: path.join(__dirname, 'icon.ico'), // Si vous avez une icône
        webPreferences: {
            nodeIntegration: false
        }
    });

    // 3. Charger votre interface
    // On attend un petit peu que le serveur démarre
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
    }, 1000);

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (serverProcess) serverProcess.kill(); // Arrête le serveur quand on ferme l'app
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
//Ajout icon du logiciel
mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'), // <--- Vérifiez cette ligne
    webPreferences: {
        nodeIntegration: false
    }
});