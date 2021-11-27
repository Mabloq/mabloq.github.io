let FAClient = null;
let recordId = null;
let linesGlobal = null;
let productList = null;
let deleteLinesGlobal = [];
let recordGlobal = null;

let repId = null;

let keyGlobal = "";
let baseUrlGlobal = "";

let executingRequest = false;

let notyf = null;

let timer = 0;
let countDownId = null;


let cleanQuoteGlobals = () => {
    recordId = null;
    linesGlobal = null;
    productList = null;
    repId = null;
}
// aHR0cDovL2xvY2FsaG9zdDo1MDAw localhost:5000
//aHR0cHM6Ly9mYS1zb2x1dGlvbnMuZ2l0bGFiLmlvL3NvcmVsZXNlcy1wcm9kdWN0cy1tYXhsaXRl // production https://fa-solutions.gitlab.io/soreleses-products-maxlite
//a la hora de agregar ocurre lo siguiente, se valida que el item no exista y si existe se updatea, no se crea uno nuevo, ademas de que una vez generado
//el nuevo item se  bloquean los botones de agregar

const SERVICE = {
    name: 'FreeAgentService',
    appletId: `aHR0cHM6Ly9tYWJsb3EuZ2l0aHViLmlvL2ZyZWVhZ2VudC1hcHBsZXQv`,
};

let config = {
    poLines: {
        name: "po_release",
        fields: {
            soRecordRef: 'po_release_field1'
        }
    },
    lines: {
        name: 'quote_item',
        fields: {
            itemNumber: 'quote_item_field0',
            itemDescription: 'quote_item_field2',
            descriptionSpecial: 'description',
            itemType: 'quote_item_field7',
            competitorName: 'quote_item_field8',
            price: 'quote_item_field11',
            lineAmount: 'quote_item_field12',
            commissionAmount: 'quote_item_field13',
            quantity: 'quote_item_field14',
            commissionPercent: 'quote_item_field17',
            commissionPercentOverwrite: 'quote_item_field18',
            itemCategory: 'quote_item_field19',
            available: 'quote_item_field20',
            wareHouse: 'quote_item_field21',
            productName: 'quote_item_field22',
            alternativeTo: 'quote_item_field23',
            typeText: 'quote_item_field24',
            releaseAmount: 'quote_item_field25',
            order: 'quote_item_field29',
            aPrice : "quote_item_field30",
            hotPrice : "quote_item_field31",
            lifeCycle : "quote_item_field32"
        }
    },
    products: {
        name: 'product',
        fields: {
            descriptionName: 'product_field1',
            description: 'description',
            itemNumber: 'product_field0',
            aPrice: 'product_field2',
            hotPrice: 'product_field3',
            orderCode: 'product_field4',
            commissionPercent: 'product_field5',
            active: 'product_field6',
            mainCategory: 'product_field7',
            subCategory: 'product_field8',
            lifeCycle: 'product_field9',
            onHand: 'product_field11',
            available: 'product_field12',
            allocated: 'product_field13'
        }
    },
    parent: {
        name: 'quote',
        fields: {
            quoteStage: "quote_field37"
        }
    }
}


function startupService() {
    notyf = new Notyf({
        duration: 20000,
        dismissible: true,
        position: {
            x: 'center',
            y: 'bottom',
        },
        types: [
            {
                type: 'info',
                className: 'info-notyf',
                icon: false,
            },
        ],
    });

    FAClient = new FAAppletClient({
        appletId: SERVICE.appletId,
    });

    const countDown = () => {
        timer -= 1;
        document.getElementById("timerValue").innerHTML = `${timer} s`;

        if (timer == 0 || timer < 0) {
            clearInterval(countDownId);
            countDownId = null;
            let activeQuoteTextEl = document.getElementById('record-info-text');
            let cleanActiveRecordButton = document.getElementById('remove-active-quote');

            activeQuoteTextEl.textContent = `Quote is not selected`;
            cleanQuoteGlobals();
            cleanList();
            cleanActiveRecordButton.style.display = `none`;
            searchEl.value = '';
            activeQuoteTextEl.classList.remove('is-link');
            FAClient.close();
        }
    };

    let searchEl = document.getElementById('search-input');
    let searchSelectEl = document.getElementById('search-select');
    let submitSo = document.getElementById('submit-so-button');
    let reorderButton = document.getElementById('reorder-lines-button');
    let bulkDeleteButton = document.getElementById('delete-lines-button');
    let cancelButton = document.getElementById('cancel-delete-lines-button');

    cancelButton.addEventListener('click', async (e) => {
        cleanList();
        await generateList({ products: null, isChange: true })
    })


    reorderButton.addEventListener('click', (e) => {
        let reorderText = document.getElementById('reorder-button-text');
        if (reorderButton?.innerText == 'Reorder') {
            renderedReorderLines(linesGlobal);
            //reorderText.innerText = 'Save';
            reorderButton.innerText = 'Save';
            cancelButton.style.display = 'flex';
            bulkDeleteButton.style.display = 'none';
        } else {
            reorderButton.innerText = 'Reorder';
            cancelButton.style.display = 'none';
            saveReorderedLine().then(res => null).catch(e => console.log(e));
        }
    });

    bulkDeleteButton.addEventListener('click', async (e) => {
        if (bulkDeleteButton?.innerText === 'Bulk Delete') {
            reorderButton.style.display = 'none';
            bulkDeleteButton.innerText = "Delete";
            renderedDeleteLines(linesGlobal);
            cancelButton.style.display = 'flex';
        } else {
            await bulkDeleteLines().catch(e => console.log(e));
            bulkDeleteButton.innerText = "Bulk Delete";
            reorderButton.style.display = 'flex';
        }
    });

    keyGlobal = FAClient.params.key;
    baseUrlGlobal = FAClient.params.baseUrl;

    FAClient.on("openStagingProducts", async ({ record, redirect = false }) => {
        if (countDownId) {
            clearInterval(countDownId);
            countDownId = null;
        }
        timer = 300;
        console.log(record)
        countDownId = setInterval(countDown, 1000);
        if (searchEl) {
            searchEl.value = '';
        }
        if (searchSelectEl) {
            searchSelectEl.value = 'Search All';
        }

        if (record && record.seq_id) {
            recordGlobal = record;
            recordId = record.id;
            repId = record?.field_values?.quote_field54?.value;
            let activeQuoteTextEl = document.getElementById('record-info-text');
            activeQuoteTextEl.innerText = `Quote# ${record.seq_id}`;
            activeQuoteTextEl.addEventListener('click', () => {
                if (recordId) {
                    FAClient.navigateTo(`/quote/view/${recordId}`)
                }
            });

            activeQuoteTextEl.classList.add('is-link');
            let cleanActiveRecordButton = document.getElementById('remove-active-quote');
            cleanActiveRecordButton.style.display = `block`;
            cleanActiveRecordButton.addEventListener('click', (e) => {
                activeQuoteTextEl.textContent = `Quote is not selected`;
                cleanQuoteGlobals();
                cleanList();
                cleanActiveRecordButton.style.display = `none`;
                searchEl.value = '';
                activeQuoteTextEl.classList.remove('is-link');
            });

            if (redirect && recordId) {
                FAClient.navigateTo(`/quote/view/${recordId}`);
            }

            FAClient.open();
            await openProducts().catch(e => console.log(e));
        }
    });



    // FAClient.on("openStagingProducts", async ({ record }) => {
    //     searchEl.value = '';
    //     await openProducts(record, searchSelectEl).catch(e => console.log(e));
    // });

    searchEl.addEventListener("keyup", async (event) => {
        if (event?.target?.value?.length > 2) {
            if (recordId) {
                await generateList({ isChange: true })
            } else {
                notyf.alert(`Please use "Add Products" button in Quotes App to open the applet`);
            }
        } else {
            cleanList();
        }
    });

    searchSelectEl.addEventListener("change", async (event) => {
        if (recordId) {
            if (event.target.value === 'Included') {
                await generateList({ products: null, isChange: true })
            } else if (event.target.value === 'Upload') {
                await generateUploadUI();
            } else if (event.target.value === 'Alternative') {
                await generateList({ products: null, isChange: true });
            } else {
                cleanList();
            }
        } else {
            notyf.alert(`Please use "Add Products" button in Quotes App to open the applet`);
            event.target.value = 'Search All';
        }
    });

}

function cleanList() {
    let reorderButton = document.getElementById('reorder-lines-button');
    reorderButton.style.display = "none";
    reorderButton.innerText = "Reorder";
    document.getElementById('cancel-delete-lines-button').style.display = "none";
    let deleteLinesButton = document.getElementById('delete-lines-button');
    deleteLinesButton.style.display = "none";
    deleteLinesButton.innerText = "Bulk Delete";
    let list = document.getElementById('order-list');
    if (list) {
        list.innerHTML = '';
    }
}

async function openProducts() {
    cleanList();
    linesGlobal = await listLineItems();
    FAClient.open();
    return null;
}


async function getIncludedProducts() {
    let lines = [];
    let linesObj = {}
    if (linesGlobal) {
        lines = linesGlobal;
        //lines = await listLineItems();
    } else {
        lines = await listLineItems();
    }

    let includedProducts = [];
    let includedProductsIds = [];
    let seqIds = []
    lines.map(line => {
        includedProductsIds.push(line?.field_values?.quote_item_field0?.value)
        includedProducts.push(line?.field_values?.quote_item_field0?.display_value)
        seqIds.push(line?.seq_id?.value)
    });

    let productsInLines = await FAClient.listEntityValues({
        entity: config.products.name,
        filters: [
            {
                field_name: config.products.fields.itemNumber,
                operator: "equals",
                values: includedProducts,
            },
        ],
    });
    let sortedProducts = [];

    includedProductsIds.map(prodId => {
        let prodFound = productsInLines.find(prod => prodId === prod.id);
        if (prodFound) {
            sortedProducts.push(prodFound);
        }
    })

    // productsInLines.filter(prod => includedProductsIds.includes(prod.id));
    return sortedProducts;
}

async function getFilteredProducts(searchText) {
    return await FAClient.listEntityValues({
        entity: config.products.name,
        filters: [],
        order: [[config.products.fields.itemNumber, "ASC"]],
        pattern: !!searchText ? searchText.trim() : ""
    });
}

async function getAlternativeProducts(itemNo) {
    let url = `${baseUrlGlobal}/alt-items?itemNo=${itemNo}`;
    headers['MX-Api-Key'] = keyGlobal;
    let response = await fetch(url, {
        method: 'GET',
        headers,
    });

    if (!(response && response.ok)) {
        notyf.alert(`Failed to get alternative items from SM100`);
        return null;
    }

    const alternativeItems = await response.json();

    try {
        const alternativeProducts = await FAClient.listEntityValues({
            entity: config.products.name,
            filters: [
                {
                    field_name: config.products.fields.itemNumber,
                    operator: "equals",
                    values: alternativeItems.map(alternativeItem => alternativeItem.itemNo),
                    // values: ["LS-4823U-50", "LS-4823U-50MS", "LS-4823U-40", "LS-4823U-40MS", "LS-4846U-40", "LS-4846U-40MS", "LS-4846U-50", "LS-4846U-50MS"]
                },
            ],
        });

        return alternativeProducts;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function generateList({ products = productList, lines = linesGlobal, isChange = false }) {
    cleanList();
    let bodyContainer = document.querySelector('body');
    let list = document.querySelector('#order-list');
    let searchEl = document.getElementById('search-input');
    let searchSelectEl = document.getElementById('search-select');
    let searchText = searchEl.value && searchEl.value.trim() !== '' ? searchEl.value : null;
    let selectText = searchSelectEl?.value;
    let productsToDisplay = null;
    //if select text is included this get all the line items that the record has
    if (selectText && selectText === 'Included') {
        document.getElementById('reorder-lines-button').style.display = "flex";
        document.getElementById('delete-lines-button').style.display = "flex";
        products = await getIncludedProducts().catch(e => console.log(e));
    } else {
        document.getElementById('reorder-lines-button').style.display = "none";
    }

    if (selectText && selectText === 'Alternative') {
        products = await getAlternativeProducts(searchText).catch(e => console.log(e));
    }

    if (selectText === 'Search All' && isChange) {
        products = await getFilteredProducts(searchText).catch(e => console.log(e));
    }


    let subCategories = {};

    products?.map((product, index) => {
        let lineMatch = null;

        if (lines[index] && lines[index].field_values[config.lines.fields.itemNumber].value == product.id) {
            lineMatch = lines[index];
        }

        let lineId = lineMatch?.id;
        let qty = lineMatch?.field_values[config.lines.fields.quantity]?.value || '';
        let price = lineMatch?.field_values[config.lines.fields.price]?.value || '';
        let co = lineMatch?.field_values[config.lines.fields.commissionPercentOverwrite]?.value || '';
        let whLine = lineMatch?.field_values[config.lines.fields.wareHouse]?.value || '';
        let itemAlternativeType = lineMatch?.field_values[config.lines.fields.itemType]?.value;
        let alternateToLine = lineMatch?.field_values[config.lines.fields.alternativeTo]?.value || null;
        let typeText = lineMatch?.field_values[config.lines.fields.typeText]?.value || '';
        let specialDescriptionLine = lineMatch?.field_values[config.lines.fields.descriptionSpecial]?.value || null;
        let competitorName = lineMatch?.field_values[config.lines.fields.competitorName]?.display_value || '';

        let fieldValues = product.field_values;

        let productName = fieldValues[config.products.fields.descriptionName].display_value;
        let itemNumber = fieldValues[config.products.fields.itemNumber].display_value;
        let productDescription = fieldValues[config.products.fields.description].display_value;
        let mainCategory = fieldValues[config.products.fields.mainCategory].display_value;
        let subCategory = fieldValues[config.products.fields.subCategory].display_value;
        let commissionPercent = fieldValues[config.products.fields.commissionPercent].formatted_value;

        subCategories[subCategory] = fieldValues[config.products.fields.mainCategory].display_value;

        let liEl = document.createElement('li');
        liEl.setAttribute('id', `liEl${index}`);
        liEl.setAttribute('data-id', `${product.id}`);
        liEl.setAttribute('data-index', `${index}`);
        if (lineId) {
            liEl.setAttribute('data-lineid', `${lineId}`);
        }
        if (qty > 0) {
            liEl.classList.add('included-in-lines')
        }

        let hasItems = qty && qty > 0 && price && price > 0;
        let productInfoContainer = document.createElement('div');

        let addButtonHtml = `<div id="addButton${index}" class="update-line-button">
                                        <button>Add</button>
                               </div>`

        /* if (!hasItems && itemNumber && itemNumber[0] && itemNumber[0] === '#') {
            addButtonHtml = `<div id="addButton${index}" class="update-line-button">
                                <button>Add</button>
                            </div>`
        } */

        let updateButtonHtml = `<div id="updateButton${index}" class="update-line-button">
                                    <button>Update</button>
                                </div>`

        let removeButtonHtml = `<div style="display: ${hasItems ? 'flex' : 'none'}" id="removeButton${index}" class="update-line-button">
                                         <button>Remove</button>
                                </div>`;
        let checkBox = `<div id="addButton${index}" class="update-line-button">
            <input id="checkbox${index}" type="checkbox" checked />
        </div>`


        function renderedButton() {
            let toRender = '';
            if (hasItems) {
                toRender = `<div id="updateButton${index}" class="update-line-button">
                                <button>Update</button>
                            </div>
                            <div style="display: ${hasItems ? 'flex' : 'none'}" id="removeButton${index}" class="update-line-button">
                                     <button>Remove</button>
                             </div>
                             <div style="display: flex" id="addButton${index}" class="update-line-button">
                                         <button>Add</button>
                              </div>`
            } else {
                if (itemNumber.startsWith('#', 0)) {
                    toRender = `<div id="addButton${index}" class="update-line-button">
                                         <button>Add</button>
                                </div>
                            <div style="display: none" id="updateButton${index}" class="update-line-button">
                                <button>Update</button>
                            </div>
                            <div style="display: none" id="removeButton${index}" class="update-line-button">
                                     <button>Remove</button>
                            </div>`
                } else {
                    toRender = `${addButtonHtml}
                            <div style="display: none" id="updateButton${index}" class="update-line-button">
                                <button>Update</button>
                            </div>
                            <div style="display: none" id="removeButton${index}" class="update-line-button">
                                     <button>Remove</button>
                            </div>`
                }
            }
            return toRender;
        }

        productInfoContainer.innerHTML = `<div>
        <div class="row header-paragraph">
            <div class="row">
                <button id="collapseButton${index}"
                        class="dropdown-toggle"
                        style="color: white; font-size: 13px; background: transparent; border: none" type="button" data-bs-toggle="collapse" data-bs-target="#multiCollapseExample${index}" aria-expanded="false" aria-controls="multiCollapseExample${index}">
                    <b style="white-space: pre-line">
                        <span><b>(${itemNumber})</b> $${price} - ${qty} </span>
                        <span  style="color: rgba(215, 217, 219, .80);">${productName}</span>
                    </b>
                </button>
            </div>
        </div>
        <div class="collapse multi-collapse info-container" id="multiCollapseExample${index}">
            <div class="info-container-description-row">
                <textarea placeholder="Special Description" rows="2" cols="20" wrap="soft" class="description-text" id="descroiptionText${index}" value="${specialDescriptionLine || productDescription || ''}" data-prev="${productDescription}" name="${fieldValues[config.products.fields.descriptionName].value}">${specialDescriptionLine || productDescription || ''}</textarea>
            </div>
            <div class="info-container-row">
                <div class="info-container_column">
                    <div class="info-card-container">
                        <div>
                            <span id="aPriceLabel${index}" class="input-label">Price</span>
                            <input class="input-select-fields" placeholder="Price" class="price" id="price${index}" type="number" min="0" value="${price}" data-prev="${price}" name="${fieldValues[config.products.fields.descriptionName].value}">
                        </div>
                        <div>
                            <span class="input-label">Quantity</span>
                            <input class="input-select-fields" placeholder="Quantity" class="quantity" id="qty${index}" type="number" min="0" value="${qty}" data-prev="${qty}" name="${fieldValues[config.products.fields.descriptionName].value}">
                        </div>
                        <div>
                            <span id="coLabel${index}" class="input-label">CO %</span>
                            <input class="input-select-fields" placeholder="Commision Overwrite" class="commision" id="co${index}" type="number" ${hasItems ? '' : 'disabled'} value="${co}" min="0"">
                        </div>
                        <div>
                            <span class="input-label">Type</span>
                            <input class="input-select-fields" placeholder="Enter Type" id="typeText${index}" type="text" value="${typeText}" data-prev="${typeText}" name="${fieldValues[config.products.fields.descriptionName].value}" />
                        </div>
                        <div>
                            <span class="input-label">Alternative Type</span>
                            <select class="input-select-fields select-field-custom" id="itemAlternativeType${index}" data-prev="Primary" style="width: 100%; height: 100%; border: none; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjUiIHdpZHRoPSI3IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yLjgyOCA0LjM2NEwwIDEuNTM2LjcwNy44MjhsMi44MjkgMi44MjlMNi4zNjQuODI4bC43MDcuNzA4TDMuNTM2IDUuMDd6IiBmaWxsPSIjQkJCRUJGIi8+PC9zdmc+&quot;); background-position: right 10px center; background-repeat: no-repeat; border-radius: 2px; background-color: white;"  name="${fieldValues[config.products.fields.descriptionName].value}_type">
                                <option value="Primary" ${itemAlternativeType || itemAlternativeType === null ? 'selected' : ''}>Primary</option>
                                <option value="Alternative" ${itemAlternativeType === false ? 'selected' : ''}>Alternative</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="info-container_column">
                    <div class="info-card-container">
                        <div>
                            <span class="input-label">A-Price</span>
                            <input class="input-select-fields" id="aPrice${index}" type="text" disabled  />
                        </div>
                        <div>
                            <span class="input-label">Hot-Price</span>
                            <input class="input-select-fields" id="hotPrice${index}" type="text" disabled  />
                        </div>
                        <div>
                            <span class="input-label">LifeCycle</span>
                            <input class="input-select-fields" id="lifeCycle${index}" type="text" disabled />
                        </div>
                        <div>
                            <span class="input-label">Item Type</span>
                            <input class="input-select-fields" id="itemType${index}" type="text" disabled />
                        </div>

                        <div>
                            <span class="input-label">Competitor</span>
                            <select class="input-select-fields select-field-custom" id="competitor${index}"  style="width: 100%; height: 100%; border: none; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjUiIHdpZHRoPSI3IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yLjgyOCA0LjM2NEwwIDEuNTM2LjcwNy44MjhsMi44MjkgMi44MjlMNi4zNjQuODI4bC43MDcuNzA4TDMuNTM2IDUuMDd6IiBmaWxsPSIjQkJCRUJGIi8+PC9zdmc+&quot;); background-position: right 10px center; background-repeat: no-repeat; border-radius: 2px; background-color: white;">
                                <option value="" ${competitorName === '' || !competitorName ? 'selected' : ''}>None</option>
                                <option value="TCP" ${competitorName === 'TCP' ? 'selected' : ''}>TCP</option>
                                <option value="Copper" ${competitorName === 'Copper' ? 'selected' : ''}>Copper</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="info-container_column">
                    <div class="info-card-container">
                        
                        <div>
                            <span class="input-label">Available</span>
                            <input class="input-select-fields" id="available${index}" type="text" disabled value="" />
                        </div>
                        <div>
                            <span class="input-label">Back Order</span>
                            <input class="input-select-fields" id="backOrder${index}" type="text" disabled value="" />
                        </div>
                        <div>
                            <span class="input-label">In Transit</span>
                            <input class="input-select-fields" id="inTransit${index}" type="text" disabled value="" />
                        </div>
                        <div>
                            <span class="input-label">Estimate Avail date</span>
                            <input class="input-select-fields" id="etaDate${index}" type="text" disabled />
                        </div>
                        <div>
                            <span class="input-label">WH</span>
                            <select class="input-select-fields select-field-custom" id="wh${index}" value="${whLine || ''}" data-prev="" style="width: 100%; height: 100%; border: none; background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjUiIHdpZHRoPSI3IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yLjgyOCA0LjM2NEwwIDEuNTM2LjcwNy44MjhsMi44MjkgMi44MjlMNi4zNjQuODI4bC43MDcuNzA4TDMuNTM2IDUuMDd6IiBmaWxsPSIjQkJCRUJGIi8+PC9zdmc+&quot;); background-position: right 10px center; background-repeat: no-repeat; border-radius: 2px; background-color: white;"  name="${fieldValues[config.products.fields.descriptionName].value}_type">
                            </select>
                        </div>
                    </div>
                </div>
                <div class="info-container_column">
                    <div class="info-card-container">
                        <div>
                            <span class="input-label">On Order</span>
                            <input class="input-select-fields" id="onOrder${index}" type="text" disabled value="" />
                        </div>
                        <div>
                            <span class="input-label">Reserved</span>
                            <input class="input-select-fields" id="reserved${index}" type="text" disabled value="" />
                        </div>
                        <div>
                            <span class="input-label">Allocated</span>
                            <input class="input-select-fields" id="allocated${index}" type="text" disabled value="" />
                        </div>
                        <div id="inventoryState${index}">
                            <button class="inventory-details-button" style="padding: 1px 2px" disabled>Inventory Details</button>
                        </div>
                    </div>
                </div>
                <div class="info-container_buttons_column">
                    ${renderedButton()}
                </div>
            </div>
            <div class="alternate-selection-container-row" style="display: ${itemAlternativeType === false ? 'flex' : 'none'}">
                <span>Alternative to: </span>
                <select class="alternate-select"></select>
            </div>
            <div class="active-po-table-container" style="display: none">
            </div>
        </div>`;

        let qtyInput = productInfoContainer.querySelector(`#qty${index}`);
        let priceInput = productInfoContainer.querySelector(`#price${index}`);
        let commissionInput = productInfoContainer.querySelector(`#co${index}`);
        let commissionLabel = productInfoContainer.querySelector(`#coLabel${index}`);
        let lifeCycleInput = productInfoContainer.querySelector(`#lifeCycle${index}`);
        let hotPriceInput = productInfoContainer.querySelector(`#hotPrice${index}`);
        let itemTypeInput = productInfoContainer.querySelector(`#itemType${index}`);
        let aPriceInput = productInfoContainer.querySelector(`#aPrice${index}`);
        let aPriceLabel = productInfoContainer.querySelector(`#aPriceLabel${index}`);
        let collapseButton = productInfoContainer.querySelector(`#collapseButton${index}`);
        let whField = productInfoContainer.querySelector(`#wh${index}`);
        let availableField = productInfoContainer.querySelector(`#available${index}`);
        let estimatedAvailableDateField = productInfoContainer.querySelector(`#etaDate${index}`);
        let backOrderField = productInfoContainer.querySelector(`#backOrder${index}`);
        let inTransitField = productInfoContainer.querySelector(`#inTransit${index}`);
        let onOrderField = productInfoContainer.querySelector(`#onOrder${index}`);
        let reservedField = productInfoContainer.querySelector(`#reserved${index}`);
        let allocatedField = productInfoContainer.querySelector(`#allocated${index}`);
        let alternativeTypeField = productInfoContainer.querySelector(`#itemAlternativeType${index}`);
        let alternateSelection = productInfoContainer.querySelector(`.alternate-select`);
        let alternateSelectionContainer = productInfoContainer.querySelector(`.alternate-selection-container-row`);
        let addButton = productInfoContainer.querySelector(`#addButton${index} > button`);
        let addButtonContainer = productInfoContainer.querySelector(`#addButton${index}`);
        let updateButton = productInfoContainer.querySelector(`#updateButton${index} > button`);
        let updateButtonContainer = productInfoContainer.querySelector(`#updateButton${index}`);
        let removeButton = productInfoContainer.querySelector(`#removeButton${index} > button`);
        let removeButtonContainer = productInfoContainer.querySelector(`#removeButton${index} `);
        let inventoryStateButton = productInfoContainer.querySelector(`#inventoryState${index} > button`);
        let inventoryStateButtonContainer = productInfoContainer.querySelector(`#inventoryState${index}`);
        let checkboxEl = productInfoContainer.querySelector(`#checkbox${index}`);



        alternativeTypeField.addEventListener('change', (event) => {
            alternateSelectionContainer.style.display = 'flex';
            alternateSelection.innerHTML = '';
            if (event.currentTarget.value === 'Alternative' && linesGlobal) {
                addAlternateToLines(alternateSelection, product, alternateToLine);
            } else {
                alternateSelectionContainer.style.display = 'none';
            }
        })

        qtyInput.addEventListener("keyup", async (event) => {
            let unitPrice = priceInput.valueAsNumber;
            let qty = qtyInput.valueAsNumber;
            let isAssembly = itemTypeInput?.value === 'FG-A' || itemTypeInput?.value === "FG_A";

            if (isAssembly) {
                let eta = await getAssemblyItem(itemNumber, qty).catch(e => console.error(e));
                if (eta && eta.eta) {
                    estimatedAvailableDateField.value = formatDateFromStr(eta.eta);
                }
            }

            if (!executingRequest) {
                executingRequest = true;
                try {
                    let { commissionRate } = await getCommission(itemNumber, unitPrice, qty, repId).catch(e => console.error(e));
                    executingRequest = false;
                    addButton.disabled = false;
                    if (commissionRate || commissionRate === 0) {
                        commissionInput.value = commissionRate.toFixed(2);
                        commissionInput.disabled = false;
                    } else {
                        if (itemNumber[0] === '#') {
                            if (addButton) {
                                addButton.disabled = false;
                            }
                        }
                    }
                } catch (e) {
                    console.error(e);
                    executingRequest = false;
                }
            }

        })


        addButton?.addEventListener("click", (event) => {
            processLines(productInfoContainer, productDescription, product, index, 'add', itemNumber);
            addButtonContainer.style.display = 'flex';
            updateButtonContainer.style.display = 'flex';
            removeButtonContainer.style.display = 'flex';
            loadingStart();
        })
        updateButton?.addEventListener("click", (event) => {
            processLines(productInfoContainer, productDescription, product, index, 'update', itemNumber, lineId);
            loadingStart();
        })
        removeButton?.addEventListener("click", (event) => {
            processLines(productInfoContainer, productDescription, product, index, 'remove', itemNumber, lineId);
            addButtonContainer.style.display = 'flex';
            updateButtonContainer.style.display = 'none';
            removeButtonContainer.style.display = 'none';
            loadingStart();
        })


        collapseButton.addEventListener('click', async (event) => {
            if (event.currentTarget && !event.currentTarget.classList.contains('collapsed')) {
                if (!itemAlternativeType) {
                    addAlternateToLines(alternateSelection, product, alternateToLine);
                }
                let itemResponse = await getItem(itemNumber);
                if (itemResponse) {
                    let { inventory, description, lifeCycle, prices, itemType } = await getItem(itemNumber);
                    let [A, HOT] = prices;
                    lifeCycleInput.value = lifeCycle;
                    hotPriceInput.value = HOT.price;
                    aPriceInput.value = A.price;
                    itemTypeInput.value = itemType;
                    if (inventory) {
                        let availableTotal = 0;
                        let backOrderTotal = 0;
                        let inTransitTotal = 0;
                        let onOrderTotal = 0;
                        let reservedTotal = 0;
                        let allocatedTotal = 0;

                        inventory.map(({ available, backOrder, inTransit, onOrder, warehouseCd, reserved, allocated }) => {
                            if (available) {
                                availableTotal += available;
                            }
                            if (backOrder) {
                                backOrderTotal += backOrder;
                            }
                            if (inTransit) {
                                inTransitTotal += inTransit;
                            }
                            if (onOrder) {
                                onOrderTotal += onOrder;
                            }
                            if (reserved) {
                                reservedTotal += reserved;
                            }
                            if (allocated) {
                                allocatedTotal += allocated;
                            }
                        });

                        whField.innerHTML = '';
                        let totalOption = document.createElement('option');
                        totalOption.innerText = `All`;
                        totalOption.setAttribute('data-available', availableTotal);
                        totalOption.setAttribute('data-backorder', backOrderTotal);
                        totalOption.setAttribute('data-intransit', inTransitTotal);
                        totalOption.setAttribute('data-onorder', onOrderTotal);
                        totalOption.setAttribute('data-reserved', reservedTotal);
                        totalOption.setAttribute('data-allocated', allocatedTotal);
                        availableField.value = availableTotal;
                        backOrderField.value = backOrderTotal;
                        inTransitField.value = inTransitTotal;
                        onOrderField.value = onOrderTotal;
                        reservedField.value = reservedTotal;
                        allocatedField.value = allocatedTotal;
                        whField.appendChild(totalOption);
                        inventory.map(({ available, backOrder, inTransit, warehouseCd, onOrder, reserved, allocated }) => {
                            let optionDom = document.createElement('option');
                            optionDom.innerText = `${warehouseCd}`;
                            optionDom.setAttribute('data-available', available);
                            optionDom.setAttribute('data-intransit', inTransit);
                            optionDom.setAttribute('data-backorder', backOrder);
                            optionDom.setAttribute('data-onorder', onOrder);
                            optionDom.setAttribute('data-reserved', reserved);
                            optionDom.setAttribute('data-allocated', allocated);
                            whField.appendChild(optionDom);
                        })
                        whField.addEventListener('change', (event) => {
                            let {
                                available,
                                intransit,
                                backorder,
                                onorder,
                                reserved,
                                allocated
                            } = event.target.options[event.target.selectedIndex].dataset;
                            availableField.value = available;
                            backOrderField.value = intransit;
                            inTransitField.value = backorder;
                            onOrderField.value = onorder;
                            reservedField.value = reserved;
                            allocatedField.value = allocated;
                        });

                        let activePO = await getPurchaseOrders(itemNumber)
                        if (activePO && activePO.length > 0) {
                            inventoryStateButton.disabled = false;
                            let activePORows = '';
                            activePO.map(({ mpoNo, mpoDate, warehouseCd, onOrder, inTransit, shippedDate, etaDate, memo }) => {

                                activePORows += `<li class="active-po-row">
                                                    <span class="active-po-cell po-col1">${mpoNo}</span>
                                                    <span class="active-po-cell po-col2">${formatDateFromStr(mpoDate)}</span>
                                                    <span class="active-po-cell po-col3">${warehouseCd}</span>
                                                    <span class="active-po-cell po-col4">${onOrder}</span>
                                                    <span class="active-po-cell po-col5">${inTransit}</span>
                                                    <span class="active-po-cell po-col6">${formatDateFromStr(shippedDate)}</span>
                                                    <span class="active-po-cell po-col7">${formatDateFromStr(etaDate)}</span>
                                                    <span class="active-po-cell po-col8">${memo}</span>
                                                  </li>`
                            })
                            inventoryStateButton.addEventListener('click', (e) => {
                                let activePoContainer = bodyContainer.querySelector(".active-po-container");
                                activePoContainer.style.display = 'flex';
                                activePoContainer.innerHTML = `   <div class="active-po-product-info-container">
                                                                              <div class="close-active-po-button">X</div>
                                                                              <div class="active-po-item-name"> <b style="white-space: pre-line"><span style="color: rgba(215, 217, 219, 1.00)"> (${itemNumber})</span> ${productName}</b></div>
                                                                              <div class="active-po-wh-info-container">
                                                                                <span class="input-label">LifeCycle: <b>${lifeCycle}</b></span>
                                                                                <span class="input-label">Available: <b>${availableTotal}</b></span>
                                                                                <span class="input-label">Back Order: <b>${backOrderTotal}</b></span>
                                                                                <span class="input-label">On Order: <b>${onOrderTotal}</b></span>
                                                                                <span class="input-label">In Transit: <b>${inTransitTotal}</b></span>
                                                                              </div>
                                                                        </div>
                                                                      <ul class="active-po-table-container">
                                                                          <li class="active-po-row header-row">
                                                                            <span class="active-po-cell po-col1">PoNo</span>
                                                                            <span class="active-po-cell po-col2">PoDate</span>
                                                                            <span class="active-po-cell po-col3">WH</span>
                                                                            <span class="active-po-cell po-col4">OnOrder</span>
                                                                            <span class="active-po-cell po-col5">InTransit</span>
                                                                            <span class="active-po-cell po-col6">ExFactoryDate</span>
                                                                            <span class="active-po-cell po-col7">ETA</span>
                                                                            <span class="active-po-cell po-col8">MEMO</span>
                                                                          </li>
                                                                          ${activePORows}
                                                                    </ul>
                                `;
                                activePoContainer.querySelector('.close-active-po-button').addEventListener('click', (e) => {
                                    activePoContainer.style.display = 'none';
                                    activePoContainer.innerHTML = '';
                                })
                            })
                        }
                    }
                }
            }
        })

        liEl.appendChild(productInfoContainer);
        list.appendChild(liEl);
    });

}


async function generateUploadUI() {
    cleanList();

    let bodyContainer = document.querySelector('body');
    linesGlobal = await listLineItems();
    console.log('Upload INIT Lines Global: ', linesGlobal)
    document.getElementById('reorder-lines-button').style.display = "none";

    let uploadContainer = bodyContainer.querySelector(".upload-container");
    let dropZoneContainer = uploadContainer.querySelector('.dropzone-container');
    uploadContainer.style.display = 'flex';
    dropZoneContainer.style.display = 'flex';

    uploadContainer.querySelector('.close-upload-button').addEventListener('click', (e) => {
        uploadContainer.style.display = 'none';
        uploadContainer.querySelector('#mxup-container').innerHTML = '';
        uploadContainer.querySelector('#mx-add-quote-container').style.display = 'none';
        bodyContainer.querySelector('#search-select').value = 'Search All';
        document.querySelector('.file-name-container').style.display = 'none';
        document.querySelector('#file-name').textContent = '';
        document.querySelector("#download-template-link").style.display = 'block';
    })

}


function uploadCsv(file, myDropZone) {
    try {
        let uploadedItems = {};
        console.log("uploaded?")
        let data = Papa.parse(file, {
            skipEmptyLines: true,
            header: true,
            complete: async function (results) {
                let uploadContainer = document.querySelector(".upload-container");
                document.querySelector(".upload-container");
                uploadContainer.style.display = 'flex';
                document.querySelector("#download-template-link").style.display = 'none';
                document.querySelector('.file-name-container').style.display = 'flex';
                document.querySelector('#file-name').textContent = file.name;
                document.querySelector('#remove-selected-file').addEventListener('click', (e) => {
                    myDropZone.removeFile(file);
                    uploadContainer.querySelector('#mxup-container').innerHTML = '';
                    uploadContainer.querySelector('#mx-add-quote-container').style.display = 'none';
                    document.querySelector('.file-name-container').style.display = 'none';
                    document.querySelector('#file-name').textContent = '';
                    uploadContainer.querySelector('.dropzone-container').style.display = 'flex';
                    document.querySelector("#download-template-link").style.display = 'block';
                });
                let itemsWCommissions = await getBulkCommissions(results.data);
                uploadedItems = new MaxLiteUpload({ items: itemsWCommissions });
                let dataQualityCheck = uploadedItems.dataQualityCheck()
                console.log('Data Quality Check', dataQualityCheck)
                if (dataQualityCheck[0]) {
                    uploadContainer.querySelector('#mx-add-quote-container').style.display = 'block';
                    let addToQuoteContainer = document.getElementById("mx-add-quote").style.display = 'block';
                    let mxupContainer = document.getElementById("mxup-container")
                    mxupContainer.innerHTML = uploadedItems.getItemsHtml();
                    let addToQuoteButton = document.getElementById("mx-add-quote");
                    let new_element = addToQuoteButton.cloneNode(true);
                    addToQuoteButton.parentNode.replaceChild(new_element, addToQuoteButton);
                    new_element.addEventListener('click', async (e) => {
                        loadingStart();
                        console.log('linesGlobal',linesGlobal)
                        let mxItems = uploadedItems.getItemsFromHtml(linesGlobal)

                        let faItems = await getUploadProducts(mxItems)
                        let itemNos = mxItems.map((item) => {
                            return item.itemNumber
                        })
                        let faItemNos = faItems.map(item => {
                            return item.field_values.product_field0.display_value;
                        })

                        let skusNotFound = itemNos.filter(itemNo => {
                            return !faItemNos.includes(itemNo)
                        })
                        if (skusNotFound.length > 0) {
                            notyf.alert(`Skus Not Found: ${skusNotFound.join(',')}`)
                        }
                     
                        let lineItems = uploadedItems.mergeWithFAData(mxItems, faItems)
                        let approvalsNeeded = uploadedItems.neededApprovals(lineItems)
                        await addUploadedItems(lineItems, approvalsNeeded);
                    })
                    uploadContainer.querySelector('.dropzone-container').style.display = 'none';
                    myDropZone.removeFile(file);
                } else {
                    console.log("error parsing upload file")
                    uploadContainer.querySelector('#mx-add-quote-container').style.display = 'none';
                    document.getElementById("mx-add-quote").style.display = 'none';
                    let mxupContainer = document.getElementById("mxup-container")
                    mxupContainer.innerHTML = `${uploadedItems.getItemsHtml()}<div style="padding: 15px;color:white;background:red">${dataQualityCheck[1]} </div><p style="color:white">* Click "x" next to filename to try again</p>`;
                    console.log("Should have displayed error information")
                    uploadContainer.querySelector('.dropzone-container').style.display = 'none';
                    myDropZone.removeFile(file);
                }
            }
        });
    } catch (err) {
        console.log(err)
    }
}

function getUploadProducts(maxliteProducts) {
    let itemNos = maxliteProducts.map((item) => {
        return item.itemNumber
    })
    return FAClient.listEntityValues({
        entity: config.products.name,
        filters: [{ field_name: 'product_field0', operator: 'equals', values: itemNos }],
        order: [[config.products.fields.itemNumber, "ASC"]],
    });
}

async function getBulkCommissions(items) {
    let itemsWCommissions = [];
    items = Array.isArray(items) ? items : [];

    for(let i = 0; i < items.length; i ++){
        let item = items[i];

        if (!!!item['Rep Commission']) {
            let itemNumber = item["Item #"];
            let unitPrice = !!item["Unit Price"] ? item["Unit Price"].replace(/\D/g,"") : 0;
            let quantity = !!item['Quantity'] ? item['Quantity'].replace(/\D/g,"") : 0; 
            let itemCommision = await getItemWCommission(itemNumber, parseFloat(unitPrice), parseInt(quantity), repId, item);
            itemsWCommissions.push(itemCommision)
        } else {
            itemsWCommissions.push(item);
        }
    }

    return itemsWCommissions;
}

async function getItemWCommission(itemNo, unitPrice, qty, repNo = repId, item) {
    let { commissionRate } = await getCommission(itemNo, unitPrice, qty, repNo);
    return {
        ...item,
        ['Rep Commission']: commissionRate?.toFixed(2)
    }
}

async function listItems(payload) {
    return await FAClient.listEntityValues(payload);
}

async function updateItem(payload) {
    return FAClient.updateEntity(payload);
}

async function upsertComposite(payload) {
    return FAClient.upsertCompositeEntity(payload);
}

async function updateLineItem(payload) {
    return FAClient.upsertCompositeEntity(payload);
}

async function showFaSuccessMessage(message = 'Success') {
    timer = 300;
    return FAClient.showSuccessMessage(message);
}

async function showFaErrorMessage(message) {
    return FAClient.showErrorMessage(message);
}

async function listLineItems() {
    return await FAClient.listEntityValues({
        entity: config.lines.name,
        filters: [
            {
                field_name: "parent_entity_reference_id",
                operator: "includes",
                values: [recordId],
            },
        ],
        limit : 1000
    });
}

async function deleteEntity(id) {
    let updatePayload = {
        entity: config.lines.name,
        id: id,
        field_values: { deleted: true }
    }
    updateItem(updatePayload).then(async data => {
        await showFaSuccessMessage('Removed successfully').catch(e => console.log(e));
        await updateRecord().catch(e => console.log(e));
        loadingEnd();
    }).catch(async e => await showFaErrorMessage())
    linesGlobal = await listLineItems();
}


async function updateQty({ id, qty = 1, price = '', co = '', wh = '', type = true, alternativeTo, typeText, competitorValue, specialDescription, hotPrice, aPrice, lifeCycle }) {
    let updatePayload = {
        entity: config.lines.name,
        id: id,
        field_values: {
            [config.lines.fields.quantity]: qty,
            [config.lines.fields.price]: price,
            [config.lines.fields.commissionPercentOverwrite]: co,
            [config.lines.fields.wareHouse]: wh,
            [config.lines.fields.itemType]: type,
            [config.lines.fields.descriptionSpecial]: specialDescription,
            [config.lines.fields.alternativeTo]: alternativeTo,
            [config.lines.fields.typeText]: typeText,
            [config.lines.fields.competitorName]: competitorValue,
            [config.lines.fields.aPrice] : aPrice || 0,
            [config.lines.fields.hotPrice] : hotPrice || 0,
            [config.lines.fields.lifeCycle] : !!lifeCycle ? lifeCycle : null
        },
    };
   
    updateItem(updatePayload).then(async data => {
        await showFaSuccessMessage('Updated successfully').catch(e => console.log(e));
        await updateRecord().catch(e => console.log(e));
        loadingEnd();
    }).catch(async e => await showFaErrorMessage());
}

async function addUploadedItems(itemLines, approvalsNeeded) {
    let promises = [];

    itemLines.forEach((item) => {
        promises.push(getItem(item.itemNo));
    });

    let maxliteProducts = await Promise.all(promises);

    let createLines = {
        entity : config.parent.name,
        id : recordId,
        field_values : {},
        children : []
    }

    itemLines.forEach((item) => {
        let maxliteProduct = maxliteProducts.find((m) => m.itemNo == item.itemNo);
        let aPrice = !!maxliteProduct.prices ? maxliteProduct.prices.find((p) => p.id == "A") : null;
        let hotPrice = !!maxliteProduct.prices ? maxliteProduct.prices.find((p) => p.id == "Hot") : null;
        let commissionPercentOverwrite = item.commissionPercentOverwrite && item.commissionPercentOverwrite !== '' ? parseInt(item.commissionPercentOverwrite, 10) : '';
        createLines.children.push({
            entity: config.lines.name,
            field_values: {
                [config.lines.fields.itemNumber]: item.itemNumber,
                [config.lines.fields.quantity]: parseInt(item.quantity || 0),
                [config.lines.fields.price]: parseFloat(item.price || 0),
                [config.lines.fields.commissionPercentOverwrite]: commissionPercentOverwrite,
                [config.lines.fields.itemType]: item.itemType,
                [config.lines.fields.alternativeTo]: item.alternativeTo,
                [config.lines.fields.order]: item.order || '',
                [config.lines.fields.typeText]: item.typeText,
                [config.lines.fields.lifeCycle] : maxliteProduct.lifeCycle,
                [config.lines.fields.aPrice] : aPrice ? aPrice.price : 0,
                [config.lines.fields.hotPrice] : hotPrice ? hotPrice.price : 0
            }
        })

    })

    let results = await upsertComposite(createLines);
    await updateItem({
        entity: config.parent.name,
        id: recordId,
        field_values: {}
    }).catch(e => console.log(e));
    await showFaSuccessMessage('Added successfully').catch(e => console.log(e));
    loadingEnd();
    linesGlobal = await listLineItems();
}

async function addItem({ productId, qty = 1, price = '', co = '', wh = '', type = true, alternativeTo, typeText, competitorValue, specialDescription = '', hotPrice, aPrice,lifeCycle }) {
    let payload = {
        entity: config.lines.name,
        field_values: {
            [config.lines.fields.itemNumber]: productId,
            [config.lines.fields.quantity]: qty,
            [config.lines.fields.price]: price,
            [config.lines.fields.commissionPercentOverwrite]: co,
            [config.lines.fields.wareHouse]: wh,
            [config.lines.fields.itemType]: type,
            [config.lines.fields.descriptionSpecial]: specialDescription,
            [config.lines.fields.alternativeTo]: alternativeTo,
            [config.lines.fields.typeText]: typeText,
            [config.lines.fields.competitorName]: competitorValue,
            parent_entity_reference_id: recordId,
            [config.lines.fields.aPrice] : aPrice || 0,
            [config.lines.fields.hotPrice] : hotPrice || 0,
            [config.lines.fields.lifeCycle] : !!lifeCycle ? lifeCycle : null
        },
        children: []
    };

    await upsertComposite(payload).then(async data => {
        await showFaSuccessMessage('Added successfully').catch(e => console.log(e));
        await updateRecord().catch(e => console.log(e));
        loadingEnd();
    }).catch(async e => await showFaErrorMessage());
    linesGlobal = await listLineItems();
    await generateList({ isChange: true }).catch(e => console.log(e));
}

async function updateRecord(id = recordId) {
    let updatePayload = {
        entity: config.parent.name,
        id: id,
        field_values: {},
        children: []
    }
    updatePayload.field_values[config.parent.fields.quoteStage] = "75a4351c-d78d-4a2f-a7dd-e22330f194de";
    await upsertComposite(updatePayload).catch(e => console.log(e));
}


function getFilteredProductList(productsToFilter, lines, value) {
    let linesObject = {};

    let includedProductsInOrder = [];

    if (value === 'Included') {
        lines.map(line => {
            let productFound = productsToFilter.find(prod => prod.id === line.field_values.quote_item_field0.value);
            if (productFound) {
                includedProductsInOrder.push(productFound);
            }
        })
        return includedProductsInOrder;
    } else {
        if (value && value !== 'All') {
            return searchList(productsToFilter, value)
        } else {
            return productList;
        }
    }

    return productsToFilter;
}

function searchList(listToSearch, value) {
    value = value?.toLowerCase();
    return listToSearch.filter(prod => {
        let nameMatch = prod?.field_values[config.products.fields.descriptionName]?.display_value?.toLowerCase().includes(value) || null;
        let itemNumber = prod?.field_values[config.products.fields.itemNumber]?.display_value?.toLowerCase().includes(value) || null;
        let subCategory = prod?.field_values[config.products.fields.subCategory]?.display_value?.toLowerCase().includes(value) || null;
        let mainCategory = prod?.field_values[config.products.fields.mainCategory]?.display_value?.toLowerCase().includes(value) || null;
        return nameMatch || itemNumber || subCategory || mainCategory;
    })
}

function addAlternateToLines(alternateSelection, product, alternateTo = null) {
    alternateSelection.innerHTML = '';
    linesGlobal.map(line => {
        let lineItemProdId = line?.field_values[config.lines.fields.itemNumber]?.value;
        let lineItemNum = line?.field_values[config.lines.fields.itemNumber]?.display_value;
        let lineItemDesc = line?.field_values[config.lines.fields.productName]?.display_value;
        if (lineItemProdId !== product.id) {
            let lineNameOption = document.createElement('option');
            lineNameOption.innerText = `(${lineItemNum}) ${lineItemDesc}`;
            lineNameOption.setAttribute('data-productid', lineItemProdId);
            lineNameOption.setAttribute('data-lineid', line.id);
            lineNameOption.setAttribute('data-itemnum', lineItemNum);
            lineNameOption.setAttribute('data-itemdesc', lineItemDesc);
            if (alternateTo === lineItemProdId) {
                lineNameOption.setAttribute('selected', true);
            }
            alternateSelection.appendChild(lineNameOption);
        }
    });
}


function processLines(productInfoContainer, productDescription, product, index, operation, itemNumber, lineId) {
    let qtyInput = productInfoContainer.querySelector(`#qty${index}`);
    let priceInput = productInfoContainer.querySelector(`#price${index}`);
    let commisionInput = productInfoContainer.querySelector(`#co${index}`);
    let whField = productInfoContainer.querySelector(`#wh${index}`);
    let typeField = productInfoContainer.querySelector(`#itemAlternativeType${index}`);
    let specialDescriptionField = productInfoContainer.querySelector(`#descroiptionText${index}`);
    let alternateSelection = productInfoContainer.querySelector(`.alternate-select`);
    let typeTextField = productInfoContainer.querySelector(`#typeText${index}`);
    let competitorField = productInfoContainer.querySelector(`#competitor${index}`);
    let lifeCycle = productInfoContainer.querySelector(`#lifeCycle${index}`);
    let aPrice = productInfoContainer.querySelector(`#aPrice${index}`);
    let hotPrice = productInfoContainer.querySelector(`#hotPrice${index}`);

    let qty = qtyInput.valueAsNumber;
    let price = priceInput.valueAsNumber;
    let isValid = false;
    let itemHasHash = itemNumber?.startsWith('#', 0);
    if (operation === 'add') {
        if ((price && price > 0 && qty && qty > 0) || itemHasHash) {
            isValid = true;
        } else {
            if (!price || price <= 0 || price === '') {
                priceInput.style.backgroundColor = 'rgba(242, 23, 22, 0.8)';
                setTimeout(() => { priceInput.style.backgroundColor = 'rgba(255,255,255,1)' }, 1000);
            }
            if (!qty || qty <= 0 || qty === '') {
                qtyInput.style.backgroundColor = 'rgba(242, 23, 22, 0.8)';
                setTimeout(() => { qtyInput.style.backgroundColor = 'rgba(255,255,255,1)' }, 1000);
            }
        }
        if (isValid) {
            let co = commisionInput.valueAsNumber;
            let wh = whField.value;
            let isPrimary = !!typeField && typeField.value === 'Primary';
            let alternativeTo = !isPrimary ? alternateSelection?.options[alternateSelection.selectedIndex]?.dataset?.productid : '';
            let typeText = typeTextField.value;
            let specialDescription = specialDescriptionField.value !== productDescription ? specialDescriptionField.value : '';
            let competitorValue = competitorField?.value ? competitorField?.value : '';

            let lineFound = linesGlobal?.find(line => line.field_values[config.lines.fields.itemNumber].value === product.id);
          
            if (qty > 0 || itemHasHash) {
                let specialDescription = specialDescriptionField.value !== productDescription ? specialDescriptionField.value : '';
                addItem({ 
                    productId: product.id, 
                    qty, 
                    price, 
                    co, 
                    wh, 
                    type: isPrimary, 
                    alternativeTo, 
                    typeText, 
                    competitorValue, 
                    specialDescription,
                    hotPrice : hotPrice.value,
                    aPrice: aPrice.value,
                    lifeCycle : lifeCycle.value
                }).then(res => null).catch(e => console.log(e));
                document.querySelector(`#liEl${index}`).classList.add('included-in-lines')
                qtyInput.dataset.prev = qty;
            }
            /* } */
        } else {
            if (qty > 0 || itemHasHash) {
                let specialDescription = specialDescriptionField.value !== productDescription ? specialDescriptionField.value : '';
                addItem({ 
                    productId: product.id, 
                    qty, 
                    price, 
                    co, 
                    wh, 
                    type: isPrimary, 
                    alternativeTo, 
                    typeText, 
                    competitorValue, 
                    specialDescription,
                    hotPrice : hotPrice.value,
                    aPrice: aPrice.value,
                    lifeCycle : lifeCycle.value
                }).then(res => null).catch(e => console.log(e));
                document.querySelector(`#liEl${index}`).classList.add('included-in-lines')
                qtyInput.dataset.prev = qty;
            }
        }
    }

    if (operation === 'update' || operation === 'remove') {
        let co = commisionInput.valueAsNumber;
        let wh = whField.value;
        let isPrimary = !!typeField && typeField.value === 'Primary';
        let alternativeTo = !isPrimary ? alternateSelection?.options[alternateSelection.selectedIndex]?.dataset?.productid : '';
        let typeText = typeTextField.value;
        let specialDescription = specialDescriptionField.value !== productDescription ? specialDescriptionField.value : '';
        let competitorValue = competitorField?.value ? competitorField?.value : '';

        let lineFound = linesGlobal.find(line => line.id === lineId);
        if (lineFound) {
            if (qty > 0 && operation !== 'remove') {
                if (price && price !== '' && price > 0) {
                    updateQty(
                        {
                            id: lineFound.id,
                            qty,
                            price,
                            co,
                            wh,
                            type: isPrimary,
                            alternativeTo,
                            typeText,
                            competitorValue,
                            specialDescription,
                            hotPrice : hotPrice.value,
                            aPrice: aPrice.value,
                            lifeCycle : lifeCycle.value
                        }).then(res => console.log(res)).catch(e => console.log(e));
                    qtyInput.dataset.prev = qty;
                    updateRecord().then(res => null).catch(e => console.log(e));
                }
            }
            if (qty === 0 || operation === 'remove') {
                deleteEntity(lineFound.id).then(res => null).catch(e => console.log(e))
                updateRecord().then(res => null).catch(e => console.log(e));
                linesGlobal = linesGlobal.find(line => line.id === lineId);
                lineFound = null;
                let liElement = document.querySelector(`#liEl${index}`);
                if (document.getElementById('search-select')?.value === 'Included') {
                    liElement.remove();
                } else {
                    liElement.classList.remove('included-in-lines');
                    qtyInput.dataset.prev = '0';
                    priceInput.value = 0;
                    qtyInput.value = 0;
                    typeTextField.value = '';
                    alternateSelection.value = 'Primary';
                }
            }
        }
    }

}


function renderedReorderLines(lines) {
    let orderList = document.querySelector('#order-list');
    let innerHTML = ``;
    lines.map(({ field_values, id }, index) => {
        let num = field_values?.quote_item_field0?.display_value;
        let quantity = field_values?.quote_item_field14.display_value;
        let price = field_values?.quote_item_field11.display_value;
        let description = field_values?.quote_item_field22?.display_value;
        innerHTML += `<li class="reorder-element" style="color: white" data-id="${id}"><b style="white-space: pre-line"><span style="color: rgba(215, 217, 219, 1.00);padding: 5px;background:green"> ${num}</span> <span>Price: ${price}, Qty: ${quantity}</span><br> <p>${description}</p><span><img src="height_white_18dp.svg" alt=""/></span></b></li>`;
    })
    orderList.innerHTML = innerHTML;
    $("#order-list").sortable({
        change: function (event, ui) {
            let children = document.querySelector('#order-list').childNodes;
            for (let i = 0; i < children.length; i++) {
                if (children[i].dataset.id) {
                    console.log(children[i]);
                }
            }
        }
    });
    $("#order-list").disableSelection();
    return null;
}

async function saveReorderedLine(button) {
    loadingStart();
    document.getElementById('reorder-lines-button').style.display = 'none';
    let children = document.querySelector('#order-list').childNodes;

    let childrenPayload = [];

    for (let i = 0; i < children.length; i++) {
        let lineId = children[i]?.dataset?.id;
        if (lineId) {

            let lineMatch = linesGlobal.find(line => line.id === lineId);
            if (lineMatch) {
                let upsertCompositeEntityPayload = {
                    entity: config.lines.name,
                    id: lineId,
                    field_values: { [config.lines.fields.order]: i + 1 },
                    children: []
                }
                childrenPayload.unshift(upsertComposite(upsertCompositeEntityPayload));
            }
        }
    }

    await Promise.all(childrenPayload)

    linesGlobal = await listLineItems();
    await generateList({ isChange: true }).catch(e => console.log(e));

    loadingEnd();
    document.getElementById('reorder-lines-button').style.display = 'flex';
    return null;
}

function renderedDeleteLines(lines) {
    deleteLinesGlobal = [];
    let orderList = document.querySelector('#order-list');
    orderList.innerHTML = '';
    let innerHTML = ``;
    lines.map(({ field_values, id }, index) => {
        let num = field_values?.quote_item_field0?.display_value;
        let description = field_values?.quote_item_field22?.display_value;
        let liDeleteEl = document.createElement('li');
        liDeleteEl.setAttribute('class', 'delete-element');
        liDeleteEl.setAttribute('data-id', id);
        liDeleteEl.style.color = "white";
        liDeleteEl.innerHTML = `<b style="white-space: pre-line"><span style="color: rgba(215, 217, 219, 1.00)"> (${num})</span> ${description} <span><img src="height_white_18dp.svg" alt=""/></span></b>`;
        liDeleteEl.addEventListener('click', (e) => {
            if (deleteLinesGlobal.includes(e.currentTarget.dataset.id)) {
                deleteLinesGlobal = deleteLinesGlobal.filter(item => item !== e.currentTarget.dataset.id);
                liDeleteEl.style.opacity = '1';
            } else {
                deleteLinesGlobal.push(e.currentTarget.dataset.id);
                liDeleteEl.style.opacity = '0.4';
            }

        })
        orderList.appendChild(liDeleteEl);
        //innerHTML += `<li class="reorder-element" id=delete_line${index} style="color: white" data-id="${id}"><b style="white-space: pre-line"><span style="color: rgba(215, 217, 219, 1.00)"> (${num})</span> ${description} <span><img src="height_white_18dp.svg" alt=""/></span></b></li>`;
    })
    //orderList.innerHTML = innerHTML;
    return null;
}

async function bulkDeleteLines(linesToDelete = deleteLinesGlobal) {
    loadingStart();
    let deletePromises = [];

    linesToDelete.map(lineId => {
        let payload = {
            entity: config.lines.name,
            id: lineId,
            field_values: { deleted: true }
        }
        deletePromises.push(FAClient.updateEntity(payload));
    })
    if (deletePromises.length > 0) {
        try {
            await Promise.all(deletePromises);
            await updateRecord();
            linesGlobal = await listLineItems();
            await generateList({ products: null, isChange: true })
        } catch (e) {
            notyf.alert(e.message);
        }
    }
    loadingEnd();
}


function getLineFields(line, id = null, recordId = null) {
    let productId = line?.field_values[config.lines.fields.itemNumber]?.value || '';
    let qty = line?.field_values[config.lines.fields.quantity]?.value || '';
    let price = line?.field_values[config.lines.fields.price]?.value || '';
    let co = line?.field_values[config.lines.fields.commissionPercentOverwrite]?.value || '';
    let whLine = line?.field_values[config.lines.fields.wareHouse]?.value || '';
    let itemType = line?.field_values[config.lines.fields.itemType]?.value || true;
    let alternateToLine = line?.field_values[config.lines.fields.alternativeTo]?.value || null;
    let typeText = line?.field_values[config.lines.fields.typeText]?.value || '';
    let specialDescriptionLine = line?.field_values[config.lines.fields.descriptionSpecial]?.value || null;
    let competitorName = line?.field_values[config.lines.fields.competitorName]?.display_value || '';
    let payload = {
        entity: config.lines.name,
        id,
        field_values: {
            [config.lines.fields.itemNumber]: productId,
            [config.lines.fields.quantity]: qty,
            [config.lines.fields.price]: price,
            [config.lines.fields.commissionPercentOverwrite]: co,
            [config.lines.fields.wareHouse]: whLine,
            [config.lines.fields.itemType]: itemType,
            [config.lines.fields.descriptionSpecial]: specialDescriptionLine,
            [config.lines.fields.alternativeTo]: alternateToLine,
            [config.lines.fields.typeText]: typeText,
            [config.lines.fields.competitorName]: competitorName,
        }
    }

    if (recordId) {
        payload.field_values.parent_entity_reference_id = recordId;
    }

    return payload;
}


async function postData(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return response.json();
}

let headers = {
    "MX-Api-Key": "",
    "accept": "text/plain"
}

async function getItem(itemNo) {
    headers['MX-Api-Key'] = keyGlobal;
    let url = `${baseUrlGlobal}/items?itemNo=${itemNo}`
    let response = await fetch(url, {
        method: 'GET',
        headers: headers,
    });
    if (response.ok) {
        return response.json();
    } else {
        notyf.alert(`${itemNo} haven't been found in SM100`);
    }
    return null;
}

async function getCommission(itemNo, unitPrice = 50.5, qty = 100, repNo = repId) {
    let url = `${baseUrlGlobal}/items/commission?itemNo=${itemNo}&unitPrice=${unitPrice}&qty=${qty}&repNo=${repNo}`;
    headers['MX-Api-Key'] = keyGlobal;
    let response = await fetch(url, {
        method: 'GET',
        headers,
    });
    if (response && response.ok) {
        return response.json();
    } else {
        notyf.alert(`Failed to get commission from SM100`);
    }
    return { commissionRate: null };
}

async function getPurchaseOrders(itemNo) {
    let url = `${baseUrlGlobal}/purchase-orders?itemNo=${itemNo}`;
    headers['MX-Api-Key'] = keyGlobal;
    let response = await fetch(url, {
        method: 'GET',
        headers,
    });
    if (response && response.ok) {
        return response.json();
    } else {
        notyf.alert(`Failed to get purchase orders from SM100`);
    }
    return null;
}

async function getAssemblyItem(itemNo, qty = 100) {
    let url = `${baseUrlGlobal}/items/assembly-eta?itemNo=${itemNo}&qty=${qty}`;
    headers['MX-Api-Key'] = keyGlobal;
    let response = await fetch(url, {
        method: 'GET',
        headers,
    });
    if (response && response.ok) {
        return response.json();
    } else {
        notyf.alert(`Failed to get assembly item info from SM100`);
    }
    return null;
}

function formatDateFromStr(str) {
    if (str?.match(/[0-9]{8}/g)) {
        let year = `${str[0]}${str[1]}${str[2]}${str[3]}`
        let month = `${str[4]}${str[5]}`;
        let date = `${str[6]}${str[7]}`;
        return `${year}/${month}/${date}`
    } else {
        return '';
    }
}

function loadingStart() {
    document.getElementById('global-loading').style.display = "block";
}

function loadingEnd() {
    document.getElementById('global-loading').style.display = "none";
}