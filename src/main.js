const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');

if (require('electron-squirrel-startup')) return app.quit();

const keytar = require('keytar');
const Store = require('electron-store');
const axios = require('axios');

const SECRET = 'this is a secret';
const SERVICE = 'CASBOkta';
const ACCOUNT = 'API';

function createWindow () {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            nodeIntegration: true
        },
        icon: __dirname + 'src/favicon.ico'
    });

    win.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });

    win.loadFile('src/index.html');

    const menuTemplate = [];
    
    if (process.platform === 'darwin') {
        menuTemplate.push({
            label: 'Edit',
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                {role: 'pasteandmatchstyle'},
                {role: 'delete'},
                {role: 'selectall'}
            ]
        });
    }

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

//    win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

const storeSchema = {
	settings: {
        type: 'object',
        properties: {
            "domain": { "type": "string" },
            "secret": { "type": "string" }
        }
    }, applications: {
        type: 'array',
        items: {
            type: 'object'
        }
    }
};

const store = new Store({storeSchema});

ipcMain.on('get-settings', (event) => {
    event.returnValue = store.get('settings');
});

ipcMain.on('set-settings', async (event, settings) => {
    try { 
        if (settings.secret !== SECRET) {
            await keytar.setPassword(SERVICE, ACCOUNT, settings.secret);
        }

        settings.secret = SECRET;

        store.set('settings', settings);

        event.returnValue = true;    
    } catch(err) {
        console.error(err);
        event.returnValue = false;    
    }
});

ipcMain.on('get-applications', (event) => {
    event.returnValue = store.get('applications');
});

ipcMain.on('refresh', async (event) => {
    const settings = store.get('settings');

    if (typeof settings === 'undefined') {
        event.reply('refresh-reply', 'Settings not configured');
        return;    
    }
    
    const domain = settings.domain;
    let secret;
    try {
        secret = await keytar.getPassword(SERVICE, ACCOUNT);
        if (secret === null) {
            throw `API secret not found for service ${service} and account ${account}`;
        }
    } catch(err) {
        console.error(err);
        event.reply('refresh-reply', 'Failed to get API secret, re-configure settings');
        return;
    }

    try {
        const response = await axios.get(`https://${domain}/api/v1/apps?limit=200`, {
            headers: { 
                Authorization: `SSWS ${secret}`        
            },
            timeout: 15000
        }); 

        const data = response.data;
        if (!Array.isArray(data)) {
            throw "invalid response data (expected array)";
        }

        const samlApps= data.filter(app => app.signOnMode === 'SAML_2_0' || app.signOnMode === 'WS_FEDERATION' || app.signOnMode === 'SAML_1_1');

        store.set('applications', samlApps);

        event.reply('refresh-reply');
    } catch (err) {
        console.error(err);
        if (err.response) {
            event.reply('refresh-reply', `API call failed with status code ${err.response.status} ${err.response.statusText}`);      
        } else {
            event.reply('refresh-reply', `API call failed with error '${err.message}'`);
        }    
    }
});

ipcMain.on('save', async (event, args) => {
    const settings = store.get('settings');

    if (typeof settings === 'undefined') {
        event.reply('save-reply', 'Settings not configured');
        return;    
    }
    
    const domain = settings.domain;
    let secret;
    try {
        secret = await keytar.getPassword(SERVICE, ACCOUNT);
        if (secret === null) {
            throw `API secret not found for service ${service} and account ${account}`;
        }
    } catch(err) {
        console.error(err);
        event.reply('save-reply', 'Failed to get API secret, re-configure settings');
        return;
    }

    const id = args.id;
    const applications = store.get('applications');

    const applicationIndex = applications.findIndex(application => application.id === id);
    if (applicationIndex === -1) {
        event.reply('save-reply', `Failed to get Application with id ${id}`);
        return;
    }

    try {
        // Get the application details.
        const response = await axios.get(`https://${domain}/api/v1/apps/${id}`, {
            headers: { 
                Authorization: `SSWS ${secret}`        
            },
            timeout: 5000
        }); 

        const application = response.data;
        if (typeof application !== 'object' || application === null) {
            throw "invalid response data (expected application object)";
        }

        const settings = application.settings;
        const signOn = settings.signOn;

        // Override the application details.
        signOn['ssoAcsUrlOverride'] = args.ssoAcsUrlOverride;
        signOn['audienceOverride'] = args.audienceOverride;
        signOn['recipientOverride'] = args.recipientOverride;
        signOn['destinationOverride'] = args.destinationOverride;

        applications[applicationIndex] = application;

        // Write the overrided application details back to Okta.
        await axios.put(`https://${domain}/api/v1/apps/${id}`, application, {
            headers: { 
                Authorization: `SSWS ${secret}`        
            },
            timeout: 10000
        });

        store.set('applications', applications);
        
        event.reply('save-reply');
    } catch (err) {
        console.error(err);
        if (err.response) {
            event.reply('save-reply', `API call failed with status code ${err.response.status} ${err.response.statusText}`);      
        } else {
            event.reply('save-reply', `API call failed with error '${err.message}'`);
        }    
    }
});