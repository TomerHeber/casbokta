const { ipcRenderer } = require('electron');

function save() {
    const saveErrorMessage = document.getElementById('save-error-message');
    saveErrorMessage.textContent = '';

    const domain = document.getElementById('okta-domain').value;
    const secret = document.getElementById('api-secret').value;

    if (domain === '') {
        saveErrorMessage.textContent = 'Okta Domain is empty';
        document.getElementById('save-error-message-div').style.visibility = 'visible';
        return;    
    }
    
    if (secret === '') {
        saveErrorMessage.textContent = 'API Secret is empty';
        document.getElementById('save-error-message-div').style.visibility = 'visible';
        return;    
    }

    const success = ipcRenderer.sendSync('set-settings', {
        domain: domain,
        secret: secret
    });

    if (typeof success !== 'boolean' || !success) {
        saveErrorMessage.textContent = 'Save Failed!';
        document.getElementById('save-error-message-div').style.visibility = 'visible';
        return;         
    }

    window.location.href = 'index.html';
}

window.addEventListener('DOMContentLoaded', () => {
    M.AutoInit();

    document.getElementById('save-button').addEventListener('click', save);

    const settings = ipcRenderer.sendSync('get-settings');

    if (typeof settings === 'object' && typeof settings.domain === 'string') {
        document.getElementById('okta-domain').value = settings.domain;
    }

    if (typeof settings === 'object' && typeof settings.secret === 'string') {
        document.getElementById('api-secret').value = settings.secret;    
    }
});