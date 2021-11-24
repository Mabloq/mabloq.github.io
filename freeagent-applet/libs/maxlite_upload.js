var MaxLiteUpload = (function () {
    function MaxLiteUpload({ items } = {}) {
        this._private = {
            items: items
        }
        this.config = {
            lc2: 'b4ab8b83-c875-4b2b-99b9-c19e83489d4f',
            isLowThanHot: '2ba46249-63c0-4697-8be7-4d2a06e29408'
        }

        this.fieldMap = {
            itemNumber : 'quote_item_field0',
            itemDescription : 'quote_item_field2',
            descriptionSpecial : 'description',
            itemType : 'quote_item_field7',
            competitorName : 'quote_item_field8',
            aPrice : 'quote_item_field9',
            hotPrice : 'quote_item_field10',
            price : 'quote_item_field11',
            lineAmount : 'quote_item_field12',
            commissionAmount : 'quote_item_field13',
            quantity : 'quote_item_field14',
            commissionPercent : 'quote_item_field17',
            commissionPercentOverwrite : 'quote_item_field18',
            lifeCycle : 'quote_item_field16',
            itemCategory : 'quote_item_field19',
            available : 'quote_item_field20',
            wareHouse : 'quote_item_field21',
            productName : 'quote_item_field22',
            alternativeTo : 'quote_item_field23',
            typeText: 'quote_item_field24',
            releaseAmount: 'quote_item_field25'
        }

        this.uploadMap = {
            "Item #": "itemNumber",
            "Quantity":	"quantity",
            "Unit Price": "price",
            "Rep Commission": "commissionPercentOverwrite",
            "User Item Type": "typeText",
            "Alt. Item Flag (Y/N)": "itemType",
            "Alternate Item":"alternateItem",
            "Alternate Item Price":	"alternateItemPrice",
            "Alt Item Rep Commission": "altRepCommission"
        }

        this.widthMap = {
            "Item #": "70%",
            "Quantity":	"40%",
            "Unit Price": "40%",
            "Rep Commission": "50%",
            "User Item Type": "30%",
            "Alt. Item Flag (Y/N)": "30%",
            "Alternate Item":"70%",
            "Alternate Item Price":	"40%",
            "Alt Item Rep Commission": "30%"
        }

        this.mapFieldsCode = function(itemData) {
            let mappedObj = {}
            Object.keys(itemData).forEach( key => {
                mappedObj[this.uploadMap[key]] = itemData[key];
            })

            return mappedObj;
        }


    }
    MaxLiteUpload.prototype.itemErrors = function(item) {
        let errors =  {
            "Item #": item['Item #'] === "",
            "Quantity": isNaN(item['Quantity']) || item['Quantity'] === "",
            "Unit Price": isNaN(item["Unit Price"]) || item["Unit Price"] == "",
            "Rep Commission": isNaN(item["Rep Commission"]) || item["Rep Commission"] == "",
            "User Item Type": false,
            "Alt. Item Flag (Y/N)": !(['Y','N', '', null].includes(item["Alt. Item Flag (Y/N)"])),
        };
        if(item["Alt. Item Flag (Y/N)"] == "Y") {
            errors = {
                ...errors,
                ...{
                    "Alternate Item": item['Alternate Item'] === "",
                    "Alternate Item Price":	isNaN(item["Alternate Item Price"]) || item["Alternate Item Price"] == "",
                    "Alt Item Rep Commission": isNaN(item["Alt Item Rep Commission"]) || item["Alt Item Rep Commission"] == ""
                }
            }
        }

        return errors;

    }

    MaxLiteUpload.prototype.dataQualityCheck = function() {
        try {
            let item = this._private.items[0]
            uploadHeaders = Object.keys(item);
            const isValidHeaders = uploadHeaders.every(val => Object.keys(this.uploadMap).includes(val));
            const hasRequiredHeaders = ['Item #', "Quantity", "Unit Price", "Rep Commission"].every(val => uploadHeaders.includes(val));
            if(!(isValidHeaders && hasRequiredHeaders)) {
                const missingHeaders = ['Item #', "Quantity", "Unit Price", "Rep Commission"].filter(val => !uploadHeaders.includes(val)).join(',');
                return [false, `Missing Required Headers: [${missingHeaders}]`];
            }
            let errorMsgs = []

            let itemNumberNotMissing = this._private.items.every(item => !(item['Item #'] === ""));
            let qtyNotMissingOrNaN = this._private.items.every(item => !(isNaN(item['Quantity']) || item['Quantity'] === ""));
            let priceNotMissingOrNaN = this._private.items.every(item => {
                if(isNaN(item["Unit Price"])) {
                    return false
                }
                if(item["Unit Price"] == "") {
                    return false
                }
                return true
            });
            let commissionNotMissingOrNan =   this._private.items.every(item => !(isNaN(item['Rep Commission'] || item['Rep Commission'] === "")));
            let dataChecks = [
                [
                    itemNumberNotMissing,
                    "<div><strong>Item #:</strong>Missing Item Numner</div>"
                ],
                [
                    qtyNotMissingOrNaN,
                    "<div><strong>Quantity:</strong> Missing or not a number</div>"
                ],
                [
                    priceNotMissingOrNaN,
                    "<div><strong>Unit Price:</strong>  Missing or not a number</div>"
                ],
                [
                    commissionNotMissingOrNan,
                    "<div><strong>Rep Commission:</strong> Missing or not a number</div>"
                ]
            ]

            dataChecks.map(check => {
                console.log("check: ", check[0])
                if(check[0] == false) {
                    errorMsgs.push(check[1])
                }
                return check
            })



            if(errorMsgs.length != 0 ) {
                return [false, errorMsgs.join('')]
            }

            return [true, "Success"]
        } catch {
            return [false, "Undocumented Error: Contact Admin"];
        }

    }

    MaxLiteUpload.prototype.getItemsHtml = function(){
        let itemsHtml = this._private.items.map((item) => {
            let itemErrors = this.itemErrors(item);
            let itemCells = Object.keys(this.uploadMap).map((header)=>{
                return header in item ? `<td style="width:${this.widthMap[header]};${itemErrors[header] ? 'background: rgba(255, 69, 0, 0.72);color:white' : ''}" class="upload-po-cell" >${item[header]}</td>` : '';

            }).join('');
            return `<tr class="upload-po-row item-row" data-item="${btoa(JSON.stringify(item))}">${itemCells}</tr>`;
        }).join('')

        item = this._private.items[0]
        let headerCells = Object.keys(this.uploadMap).map((header)=>{
            let headerInItem = header in item
            let width = this.widthMap[header];
            header = header == "Alt. Item Flag (Y/N)" ? "Alt. Item?" : header;
            header = header == "Unit Price" ? "Price" : header;
            header = header == "Rep Commission" ? "Comm%" : header;
            header = header == "Alternate Item" ? "Alt. Item" : header;
            header = header == "Alternate Item Price" ? "Alt. Price" : header;
            header = header == "Alt Item Rep Commission" ? "Alt. Comm%" : header;

            return headerInItem ? `<th style="width:${width}" class="upload-po-cell" >${header}</th>` : '';

        }).join('');

        return `<table class="upload-po-table-container"><thead style="width:100%;"><tr class="upload-po-row header-row">${headerCells}</tr></thead><tbody style="width:100%;">${itemsHtml}</tbody></table>`;
    }

    MaxLiteUpload.prototype.getAddItems = function(){
        return this._private.items

    }

    MaxLiteUpload.prototype.getItemsFromHtml = function(){
        let items = document.querySelectorAll('.item-row');
        let itemList = []
        let order = 0;
        items.forEach((item, index)=> {
            order++;
            let itemData = JSON.parse(atob(item.dataset.item));

            itemData = this.mapFieldsCode(itemData)
            let itemObj = {
                itemNumber: itemData.itemNumber ? itemData.itemNumber : null,
                quantity: !!itemData.quantity ? itemData.quantity.replace(/\D/g,"") : 0,
                price: !!itemData.price ? itemData.price.replace(" ","").replace("$", "").replace(",", "") : 0,
                alternativeTo: itemData.altItemFlag && itemData.altItemFlag == "Y" ? itemData.alternateItem : '',
                commissionPercentOverwrite: !!itemData.commissionPercentOverwrite ? itemData.commissionPercentOverwrite.replace(" ","").replace("%", "") : null,
                itemType: true,
                typeText : !!itemData.typeText ? itemData.typeText : "",
                order
            }
            itemList.push(itemObj)
            console.log({itemData})
            if(itemData.itemType && itemData.itemType == "Y"){
                order++
                let altItemObj = {
                    itemNumber: itemData.alternateItem ? itemData.alternateItem : null,
                    quantity: !!itemData.quantity ? itemData.quantity.replace(/\D/g,"") : 0,
                    price: !!itemData.alternateItemPrice ? itemData.alternateItemPrice.replace(/\D/g,"") : null,
                    commissionPercentOverwrite: !!itemData.altRepCommission ? itemData.altRepCommission.replace(/\D/g,"") : null,
                    alternativeTo: itemData.itemNumber,
                    typeText : !!itemData.typeText ? itemData.typeText : "",
                    itemType: false,
                    order
                }
                itemList.push(altItemObj)
            }


        })
        return itemList;
    }

    MaxLiteUpload.prototype.mergeWithFAData = function(mxUploadItems, listEntityResults) {
        let uploadDictionary = mxUploadItems.reduce((a,x) => ({...a, [x.itemNumber]: x}), {})

        let itemsToUpload = mxUploadItems.reduce((a,x) => {
            let item = listEntityResults.find((faItem) => faItem.field_values.product_field0.display_value == x.itemNumber)
            let alternativeTo = '';
            if(x?.alternativeTo !== '') {
               
                if(item.field_values.product_field0.display_value === uploadItem?.alternativeTo) {
                    alternativeTo = item.id;
                }
        
            }

            let lineAmount = (parseFloat(parseInt(x.quantity)) * parseFloat(x.price)).toFixed(2);
            return [...a, {
                itemNumber: item.id?.replace(/\s/g, ''),
                itemDescription: item.field_values.description.display_value,
                itemType: x.itemType,
                alternativeTo,
                commissionPercentOverwrite: parseFloat(x.commissionPercentOverwrite).toFixed(2),
                commissionAmount: (parseFloat(x.commissionPercentOverwrite) * lineAmount).toFixed(2),
                aPrice: item.field_values.product_field2,
                hotPrice: item.field_values.product_field3,
                price: x.price,
                lineAmount: lineAmount,
                quantity: x.quantity,
                lifeCycle: item.field_values.product_field9.display_value,
                order: x.order,
                typeText : x.typeText,
                itemNo : x.itemNumber
            } ];
        },[])
      
        let mappedQuoteItems = listEntityResults.map((item) => {
            let uploadItem = uploadDictionary[item.field_values.product_field0.display_value]
            let alternativeTo = '';
            if(uploadItem?.alternativeTo !== '') {
                let matchFound = listEntityResults.map(item => {
                    if(item.field_values.product_field0.display_value === uploadItem?.alternativeTo) {
                        alternativeTo = item.id;
                    }
                });
            }
            
            let lineAmount = (parseFloat(parseInt(uploadItem.quantity)) * parseFloat(uploadItem.price)).toFixed(2);
            return {
                itemNumber: item.id?.replace(/\s/g, ''),
                itemDescription: item.field_values.description.display_value,
                itemType: uploadItem.itemType,
                alternativeTo,
                commissionPercentOverwrite: parseFloat(uploadItem.commissionPercentOverwrite).toFixed(2),
                commissionAmount: (parseFloat(uploadItem.commissionPercentOverwrite) * lineAmount).toFixed(2),
                aPrice: item.field_values.product_field2,
                hotPrice: item.field_values.product_field3,
                price: uploadItem.price,
                lineAmount: lineAmount,
                quantity: uploadItem.quantity,
                lifeCycle: item.field_values.product_field9.display_value,
                order: uploadItem.order,
                typeText : uploadItem.typeText,
                itemNo : uploadItem.itemNumber
            }
        })
        console.log(itemsToUpload)
        return itemsToUpload;
    }

    MaxLiteUpload.prototype.neededApprovals = function(mergedItems) {
        let needed = [];
        mergedItems.map(function(item) {
            let isLowThanHot = (1 - (parseFloat(item.price || 0) / (parseFloat(item.hotPrice || 0)))) > 0.05
            let isLC2 = item.lifeCycle == 'LC2';
            console.log("Approval: ", isLC2, isLowThanHot)
            if(isLowThanHot) {
                if(!needed.includes(this.config.isLowThanHot)) {
                    needed.push(this.config.isLowThanHot)
                }
            }
            if(isLC2) {
                if(!needed.includes(this.config.lc2)) {
                    needed.push(this.config.lc2)
                }
            }

        })

        return needed.length != 0 ? needed : ''
    }


    return MaxLiteUpload;
})();
