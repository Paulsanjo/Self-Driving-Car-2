function getDatasetMachineLearningRowString() {
    return new Promise(function(resolve, reject) {
        $.get( "/machine-learning-dataset.html", function(datasetString) {
            resolve(datasetString);
        });
    });
}

function listModels() {
    return new Promise(function(resolve, reject) {
        $.post( "/list-models", function(result) {
            resolve(result.models);
        });
    });
}

function deleteModel(modelId){
    return new Promise(function(resolve, reject) {
        const data = JSON.stringify({
            'model_id': modelId
        });
        $.post( "/delete-model", data, function(result) {
            resolve(result);
        });
    });
}

async function loadMachineLearningModels() {
    const table = document.querySelector("tbody#modelsTbody");
    const models = await listModels();
    const deploymentForm = document.querySelector('form#deployments-form');
    const deployButton = document.querySelector('button#deploy-button');
    if (models.length > 0){
        deploymentForm.style.display = 'block';
        deployButton.style.display = 'block';
    } else {
        deploymentForm.style.display = 'none';
        deployButton.style.display = 'none';
    }

    /*
    I call this function recursively, which means that
    I need to empty the table before I add rows to it
    so that I don't wind up with duplicates
    */
    while (table.firstChild) {
        table.removeChild(table.firstChild);
    }
    // Add a new row for each model
    for (const model of models){
        const row = await getHtml('/model.html');
        row.querySelector('td.model-id').textContent = model['model_id'];
        row.querySelector('td.model-created-ts').textContent = model['created_timestamp'];
        row.querySelector('td.model-top-crop-percent').textContent = model['crop'];
        row.querySelector('td.model-image-scale').textContent = model['scale'];
        const deleteButton = row.querySelector('button.delete-model-action');
        deleteButton.onclick = async function(){
            await deleteModel(model['model_id']);
            // Update the models UI table once the delete has gone through
            loadMachineLearningModels()
        }
        // Make sure model select buttons are functional
        const modelSelectInput = row.querySelector('input[name="modelSelect"]');
        modelSelectInput.setAttribute('id','model-id-'+model['model_id']);
        modelSelectInput.setAttribute('model-id',model['model_id']);
        const modelSelectLabel = row.querySelector('label[name="modelSelect"]');
        modelSelectLabel.setAttribute('for','model-id-'+model['model_id']);
        table.appendChild(row);
    }
}

function addDatasetMachineLearningRows() {
    const promises = [
        getDatasetMachineLearningRowString(),
        loadDatasetMetadata()
    ];
    Promise.all(promises).then(function(promiseResults){
        const datasetRowString = promiseResults[0];
        const datasetPromises = promiseResults[1];
        const tbody = document.querySelector("tbody#datasetsTbody");
        for (const datsetPromise of datasetPromises) {
            const tr = htmlToElement(datasetRowString);
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                tr.querySelector('td.dataset-id').textContent = dataset.id;
                tr.querySelector('td.images').textContent = dataset.images;

                // Make sure train select buttons are functional
                const trainSelectInput = tr.querySelector('input[name="trainSelect"]');
                trainSelectInput.setAttribute('id','train-dataset-id-'+dataset.id);
                trainSelectInput.setAttribute('dataset',datasetText);
                const trainSelectLabel = tr.querySelector('label[name="trainSelect"]');
                trainSelectLabel.setAttribute('for','train-dataset-id-'+dataset.id);
                trainSelectInput.onclick = function(){
                    console.log('train '+datasetText+' '+this.checked);
                    const input = JSON.stringify({
                        'web_page': 'machine learning',
                        'name': 'training dataset',
                        'detail': datasetText,
                        'is_on': this.checked
                    });
                    writeToggle(input);
                }
                const trainingToggleReadInput = JSON.stringify({
                    'web_page': 'machine learning',
                    'name': 'training dataset',
                    'detail': datasetText
                });
                readToggle(trainingToggleReadInput).then(function(is_on) {
                    trainSelectInput.checked = is_on;
                });


                // Make sure validation select buttons are functional
                const validationSelectInput = tr.querySelector('input[name="validationSelect"]');
                validationSelectInput.setAttribute('id','validation-dataset-id-'+dataset.id);
                validationSelectInput.setAttribute('dataset',datasetText);
                const validationSelectLabel = tr.querySelector('label[name="validationSelect"]');
                validationSelectLabel.setAttribute('for','validation-dataset-id-'+dataset.id);
                validationSelectInput.onclick = function(){
                    console.log('validation '+datasetText+' '+this.checked);
                    const input = JSON.stringify({
                        'web_page': 'machine learning',
                        'name': 'validation dataset',
                        'detail': datasetText,
                        'is_on': this.checked
                    });
                    writeToggle(input);
                }
                const validationToggleReadInput = JSON.stringify({
                    'web_page': 'machine learning',
                    'name': 'validation dataset',
                    'detail': datasetText
                });
                readToggle(validationToggleReadInput).then(function(is_on) {
                    validationSelectInput.checked = is_on;
                });

                tbody.appendChild(tr);
            });
        }
    });
}

function selectAllMachineLearningDatasetsTrigger(){
    const datasetTypes = [
        'train',
        'validation'
    ]
    for (let datasetType of datasetTypes){
        const selectAllDatasetsButton = document.querySelector(`input#${datasetType}SelectAll`);
        selectAllDatasetsButton.onchange = function() {
            var buttons = document.querySelectorAll(`input[name='${datasetType}Select']`);
            for (let button of buttons){
                button.checked = selectAllDatasetsButton.checked;
            }
        };
    }
};

function stopTraining() {
    return new Promise(function(resolve, reject){
        $.post('/stop-training', function(result){
            resolve(result.is_running);
        });
    });
}

function trainNewModel(config){
    return new Promise(async function(resolve, reject){
        data = JSON.stringify(config)
        $.post('/train-new-model', data, function(result){
           resolve(result)
        });
    });
}

function trainExistingModel(config){
    return new Promise(async function(resolve, reject){
        data = JSON.stringify(config)
        $.post('/resume-training', data, function(result){
            resolve(result);
        });
    });
}

/*
Used to check if model API train a model from
scratch or apply transfer learning to an existing
model
*/
function doesModelExist() {
    return new Promise(function(resolve, reject){
        $.post('/does-model-already-exist', function(result){
            resolve(result.exists);
        });
    });
}

function laptoModelApiHealth() {
    return new Promise(function(resolve, reject){
        $.post('/laptop-model-api-health', function(result){
            resolve(result['process_id']);
        });
    });
}

function deployModelLaptop(data) {
    return new Promise(function(resolve, reject){
        const jsonData = JSON.stringify(data);
        $.post('/deploy-laptop-model', jsonData, function(result){
            resolve(result);
        });
    });
}

function updateDeploymentsTable(data) {
    return new Promise(function(resolve, reject){
        const jsonData = JSON.stringify(data);
        $.post('/update-deployments-table', jsonData, function(result){
           resolve(result)
        });

    });
}

function getModelDeployments(){
    return new Promise(function(resolve, reject){
        $.post('/list-model-deployments', function(result){
           resolve(result)
        });
    });
}

async function loadDeploymentsTable(){
    const deployments = await getModelDeployments();
    const pi = document.querySelector('tr#deployments-pi-row');
    pi.querySelector('td.deployments-model-id').textContent = deployments['pi']['model_id'];
    pi.querySelector('td.deployments-epoch-id').textContent = deployments['pi']['epoch_id'];
    const laptop = document.querySelector('tr#deployments-laptop-row');
    laptop.querySelector('td.deployments-model-id').textContent = deployments['laptop']['model_id'];
    laptop.querySelector('td.deployments-epoch-id').textContent = deployments['laptop']['epoch_id'];
}

/*
The list of processes should be the source of
truth regarding the current state of training.
It's better to look up proceesses than to save
the state in a variable somewhere, especially
if users are going to switch screens frequently
*/
function isTraining() {
    return new Promise(function(resolve, reject){
        $.post('/is-training', function(result){
            resolve(result);
        });
    });
}

async function setTrainButtonState() {
    if (isAttemptingTrainingStop == false){
        const trainModelButton = document.querySelector("button#train-model-button");
        const metadata = isTraining();
        isTrainingLastState = metadata['is_alive'];
        if(isTrainingLastState == true){
            trainModelButton.textContent = 'Stop Training'
            if(trainModelButton.classList.contains("btn-primary")){
                 trainModelButton.classList.remove("btn-primary");
            }
            if(!trainModelButton.classList.contains("btn-danger")){
                trainModelButton.classList.add("btn-danger");
            }
        } else {
            trainModelButton.textContent = 'Start Training'
            if(trainModelButton.classList.contains("btn-danger")){
                trainModelButton.classList.remove("btn-danger");
            }
            if(!trainModelButton.classList.contains("btn-primary")){
                trainModelButton.classList.add("btn-primary");
            }
        };
    };
}


async function populateModelIdOptions(modelId) {
    const selection = document.querySelector('select#resumeTrainingExistingModelId');
    while (selection.firstChild) {
        selection.removeChild(selection.firstChild);
    }
    const models = await listModels();
    for (const model of models){
        const option = document.createElement('option');
        option.setAttribute("id",model['model_id']);
        option.textContent = model['model_id'];
        selection.appendChild(option);
    }
}

async function populateModelIdDeploymentOptions(modelId) {
    const selection = document.querySelector('select#select-deployments-model-id');
    while (selection.firstChild) {
        selection.removeChild(selection.firstChild);
    }
    const models = await listModels();
    for (const model of models){
        const option = document.createElement('option');
        option.setAttribute("id",model['model_id']);
        option.textContent = model['model_id'];
        selection.appendChild(option);
    }
}


function getNewEpochs(modelId) {
    return new Promise(function(resolve, reject) {
        data = JSON.stringify({'model_id': modelId})
        $.post('/get-new-epochs', data, function(result){
           resolve(result['epochs'])
        });
    });
}

function checkIfEpochAlreadyInTable(epoch){
    var exists = false;
    const epochsTable = document.querySelector("tbody#epochs-tbody");
    const rows = epochsTable.querySelectorAll("tr");
    for (const row of rows){
        const epochTd = row.querySelector('td.epoch-id');
        const existingEpochId = epochTd.textContent;
        if (epoch == existingEpochId){
            exists = true;
            break;
        }
    }
    return exists;
}

async function fillEpochsTable(modelId){
    const epochs = await getNewEpochs(modelId);
    const epochsTable = document.querySelector("tbody#epochs-tbody");
    for (epoch of epochs){
        const row = await getHtml("machine-learning-epoch.html");
        const rowExists = checkIfEpochAlreadyInTable(epoch['epoch']);
        if (rowExists != true){
            const epochIdTd = row.querySelector("td.epoch-id");
            epochIdTd.textContent = epoch['epoch'];
            const trainingTd = row.querySelector("td.epoch-train");
            trainingTd.textContent = (epoch['train']).toFixed(2);
            const validationTd = row.querySelector("td.epoch-validation");
            validationTd.textContent = (epoch['validation']).toFixed(2);
            epochsTable.appendChild(row);
        }
    }
}

function getMLCheckedDatasets(datasetType){
    const rows = document.querySelectorAll("tbody#datasetsTbody > tr");
    const checkedDatasets = [];
    const inputName = datasetType.toLowerCase() + 'Select';
    for (const row of rows){
        const checkBox = row.querySelector('input[name="'+inputName+'"]');
        const dataset = checkBox.getAttribute('dataset');
        if (checkBox.checked == true){
            checkedDatasets.push(dataset)
        }
    }
    return checkedDatasets;
}

document.addEventListener('DOMContentLoaded', function() {
    selectAllMachineLearningDatasetsTrigger();
    addDatasetMachineLearningRows();
    /*
    The training could complete successfully or fail at any
    time, so make sure to check it every 5 seconds. The time
    loop can be quit with a call to clearInterval(<timevar>);
    */
    const trainingStateTimer = setInterval(async function(){
        setTrainButtonState();
        const epochsTable = document.querySelector('div#epochs-table-div');
        const metadata = await isTraining()
        if (metadata['is_alive']==true){
            fillEpochsTable(metadata['model_id']);
            epochsTable.style.display = 'block';
        } else {
            epochsTable.style.display = 'none';
        }
    }, 1000);

    // Update Raspberry Pi statues
    const piHealthCheckTime = setInterval(function(){
        updatePiConnectionStatuses()
    }, 1000);

    const trainModelButton = document.querySelector("button#train-model-button");
    trainModelButton.onclick = async function(){
        if(isTrainingLastState == true){
            const trainModelButton = document.querySelector("button#train-model-button");
            isAttemptingTrainingStop = true;
            trainModelButton.textContent = 'Stopping Training ...'
            await stopTraining();
            setTrainButtonState();
            isAttemptingTrainingStop = false;
        } else {
            const isExistingModel = document.querySelector('option#existing-model-option').selected;
            if(isExistingModel == true){
                const select = document.querySelector('select#resumeTrainingExistingModelId');
                const modelId = select.options[select.selectedIndex].text
                const config = {
                    'model_id':modelId
                };
                await trainExistingModel(config);
                setTrainButtonState();
            } else {
                const config = {
                    'scale':document.querySelector('input#image-scale-slider').value,
                    'crop_percent':document.querySelector('input#image-top-cut-slider').value
                };
                await trainNewModel(config);
                setTrainButtonState();
            }
        }
    };

    // TODO: Figure out how to differentiate from Pi model deployment
    const deployModelButton = document.querySelector("button#deploy-model-laptop-button");
    deployModelButton.onclick = function(){
        deployModelLaptop();
    }

    const trackedToggles = document.querySelectorAll('input.tracked-toggle');
    for (const toggle of trackedToggles){
        configureToggle(toggle);
    }

    const newOrExistingModelTrainSelect = document.querySelector('select#newOrExistingModel');
    const existingModelOption = document.querySelector('option#existing-model-option');
    const trainExistingModelIdSelectDiv = document.querySelector('div#train-existing-model-id-option-div');
    const trainSliders = document.querySelector('div#train-sliders');
    newOrExistingModelTrainSelect.onchange = function(){
        console.log(newOrExistingModelTrainSelect.options[newOrExistingModelTrainSelect.selectedIndex].text)
        if (existingModelOption.selected == true){
            populateModelIdOptions();
            trainExistingModelIdSelectDiv.style.display = 'block';
            trainSliders.style.display = 'none';
        } else{
            trainExistingModelIdSelectDiv.style.display = 'none';
            trainSliders.style.display = 'block';
        }
    }

    const deployButton = document.querySelector('button#deploy-button');
    const deployDeviceSelect = document.querySelector('select#select-deployments-target-device');
    const deployModelSelect = document.querySelector('select#select-deployments-model-id');
    deployButton.onclick = async function(){
        const device = deployDeviceSelect.options[deployDeviceSelect.selectedIndex].text;
        const modelId = deployModelSelect.options[deployModelSelect.selectedIndex].text;
        const inputs = {
            'device':device,
            'model_id':modelId
        };
        await updateDeploymentsTable(inputs);
        deployModelLaptop({
            'device':device
        });
    }

    populateModelIdDeploymentOptions();

    configureSlider({
        'sliderId':'image-top-cut-slider',
        'web_page':'machine learning',
        'name':'image top cut',
        'type':'percent',
        'min':0,
        'max':90,
        'step':10
    });

    configureSlider({
        'sliderId':'image-scale-slider',
        'web_page':'machine learning',
        'name':'image scale',
        'type':'reduceFactor',
        'min':1,
        'max':16,
        'step':1
    });

    loadMachineLearningModels();
    loadDeploymentsTable();

    const selectAllModelsButton = document.querySelector("input#modelSelectAll");
    selectAllModelsButton.onchange = function() {
        var buttons = document.querySelectorAll('input[name="modelSelect"]');
        for (const button of buttons){
            button.checked = selectAllModelsButton.checked;
        }
    };

    const deleteModelBulkAction = document.querySelector("button#delete-model-bulk-action");
    deleteModelBulkAction.onclick = async function(){
        const buttons = document.querySelectorAll('input[name="modelSelect"]');
        const promises = []
        for (const button of buttons){
            console.log(button.checked);
            if (button.checked == true){
                console.log(button.getAttribute("model-id"));
                promises.push(deleteModel(button.getAttribute("model-id")));
            }
        };
        await Promise.all(promises);
        loadMachineLearningModels();
    };

}, false);

var isTrainingLastState = false;

/*
Used to ensure that the train button doesn't go
from "stop training..." to "stop training" briefly
as this might cause users to double click and
accidentally start training again
*/
var isAttemptingTrainingStop = false;
