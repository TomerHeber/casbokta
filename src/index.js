const { ipcRenderer } = require('electron');

let busy = false;

ipcRenderer.on('refresh-reply', (event, arg) => {
    document.getElementById('busy-div').style.display = 'none';
    busy = false;

    if (typeof arg === 'string') {
        showError(arg);
    } else {
        showApplications();
    }
});

ipcRenderer.on('save-reply', (event, arg) => {
    document.getElementById('busy-div').style.display = 'none';
    busy = false;

    if (typeof arg === 'string') {
        showError(arg);
    } else {
        showApplications();
    }
});

function showError(errorMsg) {
    document.getElementById('error-div').style.display = 'block';     
    document.getElementById('error-message').textContent = errorMsg;  
}

function refresh() {
    if (busy) {
        return;
    }

    busy = true;

    document.getElementById('error-div').style.display = 'none';   
    document.getElementById('no-apps-div').style.display = 'none';   
    document.getElementById('apps-div').style.display = 'none'; 
    document.getElementById('busy-div').style.display = 'block';

    ipcRenderer.send('refresh');
}

function save(args) {
    if (busy) {
        return;
    }

    busy = true;

    document.getElementById('error-div').style.display = 'none';   
    document.getElementById('no-apps-div').style.display = 'none';   
    document.getElementById('apps-div').style.display = 'none'; 
    document.getElementById('busy-div').style.display = 'block';

    ipcRenderer.send('save', args);
}

function showApplications() {
    const applications = ipcRenderer.sendSync('get-applications');
    if (typeof applications === 'undefined' || applications.length === 0) {
        document.getElementById('no-apps-div').style.display = 'block';
        return;   
    }

    document.getElementById('apps-div').style.display = 'block';

    const appsList = document.getElementById('apps-list');
    
    const oldApps = appsList.getElementsByClassName('application-item');
    while (oldApps.length > 0) {
        oldApps[0].parentNode.removeChild(oldApps[0]);
    }

    applications.forEach(application => {
        const ssoAcsUrlOverride = (typeof application.settings.signOn.ssoAcsUrlOverride === 'string' ? application.settings.signOn.ssoAcsUrlOverride : '');
        const audienceOverride = (typeof application.settings.signOn.audienceOverride === 'string' ? application.settings.signOn.audienceOverride : '');
        const recipientOverride = (typeof application.settings.signOn.recipientOverride === 'string' ? application.settings.signOn.recipientOverride : '');
        const destinationOverride = (typeof application.settings.signOn.destinationOverride === 'string' ? application.settings.signOn.destinationOverride : '');

        const li = document.createElement('li');
        li.classList.add('li-hoverable');
        li.classList.add('application-item');
        appsList.appendChild(li);

        li.innerHTML = `
            <div class="collapsible-header">
                <i class="material-icons">cloud</i>
                ${application.label} (${application.name})
            </div>
            <div class="collapsible-body" style="background-color: white;">
                <div class="container">                    
                    <div class="row valign-wrapper">
                        <div class="col s9">
                            <h5>Application Settings</h5>
                        </div>
                        <div class="col s3" style="padding-right: 20px; padding-top: 5px;">
                            <img class="right" src="${application._links.logo[0].href}" alt="${application.name}">
                        </div>                      
                    </div>                                
                    <div class="row">                                  
                        <form class="col s11">                            
                            <div class="row s1">                                                               
                                <div class="input-field col s12">                                          
                                    <input id="ssoAcsUrlOverride_${application.id}" type="text" pattern="https:\/\/.+|^$" class="validate" placeholder="null" value="${ssoAcsUrlOverride}">
                                    <label for="ssoAcsUrlOverride_${application.id}" class="active">ssoAcsUrlOverride</label>                               
                                </div>
                            </div>
                            <div class="row">                                                               
                                <div class="input-field col s12">                                          
                                    <input id="audienceOverride_${application.id}" type="text" pattern="https:\/\/.+|^$" class="validate" placeholder="null" value="${audienceOverride}">
                                    <label for="audienceOverride_${application.id}" class="active">audienceOverride</label>
                                </div>
                            </div>
                            <div class="row">                                                               
                                <div class="input-field col s12">                                          
                                    <input id="recipientOverride_${application.id}" type="text" pattern="https:\/\/.+|^$" class="validate" placeholder="null" value="${recipientOverride}">
                                    <label for="recipientOverride_${application.id}" class="active">recipientOverride</label>
                                </div>
                            </div>
                            <div class="row">                                                               
                                <div class="input-field col s12">                                          
                                    <input id="destinationOverride_${application.id}" type="text" pattern="https:\/\/.+|^$" class="validate" placeholder="null" value="${destinationOverride}">
                                    <label for="destinationOverride_${application.id}" class="active">destinationOverride</label>
                                </div>
                            </div>             
                        </form>                  
                    </div>             
                    <div class="row valign-wrapper">
                        <div class="col">
                            <a class="waves-effect waves-light btn save-button disabled">Save</a>           
                        </div>
                        <div class="col s1" style="padding-top: 5px;">
                            <a href="https://help.okta.com/en/prod/Content/Topics/Apps/CASB-config-guide.htm" target="_blank"><i class="right material-icons small">help</i></a>                                  
                        </div>   
                    </div>                                     
                </div>              
            </div>
        `;

        const saveButton = li.getElementsByClassName('save-button')[0];
        saveButton.addEventListener('click', function() {
            let ssoAcsUrlOverrideNew = document.getElementById(`ssoAcsUrlOverride_${application.id}`).value;
            if (ssoAcsUrlOverrideNew === '') {
                ssoAcsUrlOverrideNew = null;    
            }
            let audienceOverrideNew = document.getElementById(`audienceOverride_${application.id}`).value;
            if (audienceOverrideNew === '') {
                audienceOverrideNew = null;    
            }
            let recipientOverrideNew = document.getElementById(`recipientOverride_${application.id}`).value;
            if (recipientOverrideNew === '') {
                recipientOverrideNew = null;    
            }
            let destinationOverrideNew = document.getElementById(`destinationOverride_${application.id}`).value;
            if (destinationOverrideNew === '') {
                destinationOverrideNew = null;    
            }

            const args = {
                id: application.id,   
                ssoAcsUrlOverride: ssoAcsUrlOverrideNew,
                audienceOverride: audienceOverrideNew,
                recipientOverride: recipientOverrideNew,
                destinationOverride: destinationOverrideNew
            };
            
            save(args);
        });

        const handleChange = function(event) {   
            const target = event.target;
            const valid = target.validity.valid;
            if (!valid) {
                saveButton.classList.add('disabled');
                return;
            }

            const ssoAcsUrlOverrideNew = document.getElementById(`ssoAcsUrlOverride_${application.id}`).value;
            const audienceOverrideNew = document.getElementById(`audienceOverride_${application.id}`).value;
            const recipientOverrideNew = document.getElementById(`recipientOverride_${application.id}`).value;
            const destinationOverrideNew = document.getElementById(`destinationOverride_${application.id}`).value;

            let changed = false;

            if (ssoAcsUrlOverrideNew !== ssoAcsUrlOverride) {
                changed = true;
            }

            if (audienceOverrideNew !== audienceOverride) {
                changed = true;
            }

            if (recipientOverrideNew !== recipientOverride) {
                changed = true;
            }

            if (destinationOverrideNew !== destinationOverride) {
                changed = true;
            }

            if (changed) {
                saveButton.classList.remove('disabled');    
            }
        };

        document.getElementById(`ssoAcsUrlOverride_${application.id}`).addEventListener('change', handleChange);
        document.getElementById(`audienceOverride_${application.id}`).addEventListener('change', handleChange);
        document.getElementById(`recipientOverride_${application.id}`).addEventListener('change', handleChange);
        document.getElementById(`destinationOverride_${application.id}`).addEventListener('change', handleChange);

    });

   
    const elems = document.querySelectorAll('.tooltipped');
    M.Tooltip.init(elems);
}

document.addEventListener('DOMContentLoaded', function() {
    M.AutoInit();

    showApplications();

    document.getElementById('refresh-btn').addEventListener('click', refresh);
    document.getElementById('refresh-link').addEventListener('click', refresh);
});