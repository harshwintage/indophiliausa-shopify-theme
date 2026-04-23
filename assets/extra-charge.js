document.addEventListener("DOMContentLoaded", function () {
const customSizeRadios = document.querySelectorAll('.size-selection input[name="size_type"]');
  function checkFirstRadio() {
    if (customSizeRadios.length > 0) {
      customSizeRadios[0].click();
    }
  }
  setTimeout(() => {
  checkFirstRadio();
  }, 300);
  const customSizeBlock = document.querySelector(
    ".custome-size-block .custom_size_option_2"
  );
  const standardSizeBlock = document.querySelector(".custome-size-block .custom_size_option");
  const hiddenInputContainer = document.querySelector(".hidden-input-container");
  const addToCartButton = document.querySelector(".btn.add-to-cart");
  let errorMessageElement = document.createElement("div");
  var measurementGroup = document.querySelector(".measurement-group");
  var customSizeType = document.querySelector(".size-selection.radios");
  if (measurementGroup && customSizeType) {
    if (!measurementGroup.innerHTML.trim()) {
      customSizeType.style.display = "none";
    }
  }
  errorMessageElement.classList.add("custom_error");
  errorMessageElement.style.display = "none";
  errorMessageElement.textContent = "Please select all required size options.";
  addToCartButton.insertAdjacentElement("afterend", errorMessageElement);

  function saveMeasurements(selectElements) {
    selectElements.forEach((select) => {
      const inputName = select.classList[1];
      const selectedValue = select.value;
      if (
        selectedValue &&
        selectedValue !== "Select" &&
        selectedValue !== "Select size"
      ) {
        localStorage.setItem(inputName, selectedValue);
      }
    });
  }
  function applySavedMeasurements(selectElements) {
    selectElements.forEach((select) => {
      const inputName = select.classList[1];
      const savedValue = localStorage.getItem(inputName);
      if (savedValue) {
        const optionExists = Array.from(select.options).some(
          (option) => option.value === savedValue
        );
        if (optionExists) {
          select.value = savedValue;
        } else {
          select.selectedIndex = 0;
          let nextAvailableOption = Array.from(select.options).find(
            (option) =>
              option.value !== "Select" && option.value !== "Select size"
          );
          if (nextAvailableOption) {
            select.value = nextAvailableOption.value;
          } else {
            select.selectedIndex = 0;
          }
        }
      }
    });
  }
 applySavedMeasurements(standardSizeBlock.querySelectorAll("select.size_option"));
  customSizeRadios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (this.value === "standard") {
        standardSizeBlock.style.display = "block";
        customSizeBlock.style.display = "none";
        resetSelections(customSizeBlock.querySelectorAll("select.size_option"));
         applySavedMeasurements(
          standardSizeBlock.querySelectorAll("select.size_option")
        );
      } else if (this.value === "custom") {
        standardSizeBlock.style.display = "none";
        customSizeBlock.style.display = "block";
        applySavedMeasurements(
          customSizeBlock.querySelectorAll("select.size_option")
        );
      }

      handleSizeChange();
    });
  });

  function resetSelections(selectElements) {
    selectElements.forEach(function (select) {
      select.selectedIndex = 0;
    });
  }

  function createHiddenInputs(selectElements) {
    hiddenInputContainer.innerHTML = "";
    setTimeout(() => {
    if (
      document.querySelector('input[name="size_type"]:checked').value ===
        "custom" &&
      document.querySelector('input[name="size_type"]:checked').parentElement
        .classList[1] == "dresses"
    ) {
      const customHiddenInput = document.createElement("input");
      customHiddenInput.classList.add("size_input", "hidden_input");
      customHiddenInput.type = "hidden";
      customHiddenInput.name = "properties[_custom dresses]";
      customHiddenInput.value = "customize item";
      hiddenInputContainer.appendChild(customHiddenInput);
    }
    if (
      document.querySelector('input[name="size_type"]:checked').value ===
        "custom" &&
      document.querySelector('input[name="size_type"]:checked').parentElement
        .classList[1] == "blazer"
    ) {
      const customHiddenInput = document.createElement("input");
      customHiddenInput.classList.add("size_input", "hidden_input");
      customHiddenInput.type = "hidden";
      customHiddenInput.name = "properties[_custom blazer]";
      customHiddenInput.value = "customize item";
      hiddenInputContainer.appendChild(customHiddenInput);
    }
    selectElements.forEach((select) => {
      const selectedOption = select.querySelector("option:checked");
      const inputName = select.classList[1];
      const inputValue = selectedOption ? selectedOption.value : "";
      if (inputValue !== "Select" && inputValue !== "Select size") {
        const hiddenInput = document.createElement("input");
        hiddenInput.classList.add("size_input", "hidden_input");
        hiddenInput.type = "hidden";
        hiddenInput.name = `properties[${inputName.replace(/_/g, " ")}]`;
        hiddenInput.value = inputValue;
        hiddenInputContainer.appendChild(hiddenInput);
      }
    });
    }, 100);
  }

  function validateAllSelections(selectElements) {
    return Array.from(selectElements).every((select) => {
      const selectedValue = select.value;
      const isOptional = select.getAttribute("data-optional") === "true";
      console.log(isOptional);
      return (
        isOptional ||
        (selectedValue &&
          selectedValue !== "Select" &&
          selectedValue !== "Select size")
      );
    });
  }

  function handleSizeChange() {
    let selects;
    if (document.querySelector('input[value="standard"]').checked) {
      selects = standardSizeBlock.querySelectorAll("select.size_option");
    } else if (document.querySelector('input[value="custom"]').checked) {
      selects = customSizeBlock.querySelectorAll("select.size_option");
    }
    createHiddenInputs(selects);
    saveMeasurements(selects);
    updateButtonState(selects);
  }

  // function updateButtonState(selects) {
  //   const allSelected = validateAllSelections(selects);
  //   addToCartButton.disabled = !allSelected;
  //   if (allSelected) {
  //     errorMessageElement.style.display = "none";
  //   } else {
  //     errorMessageElement.style.display = "block";
  //   }
  // }
  function updateButtonState(selects) {
    const allSelected = validateAllSelections(selects);
    if (allSelected) {
      errorMessageElement.style.display = "none";
    }
  }
  addToCartButton.addEventListener("click", function (event) {
    let selects;
    if (document.querySelector('input[value="standard"]').checked) {
      selects = standardSizeBlock.querySelectorAll("select.size_option");
    } else if (document.querySelector('input[value="custom"]').checked) {
      selects = customSizeBlock.querySelectorAll("select.size_option");
    }
    const allSelected = validateAllSelections(selects);
    if (!allSelected) {
      event.preventDefault();
      errorMessageElement.style.display = "block";
    } else {
      errorMessageElement.style.display = "none";
    }
  });
  document.addEventListener("change", function (event) {
    if (event.target.matches("select.size_option")) {
      handleSizeChange();
    }
  });

  handleSizeChange();
});
const toggleSwitch = document.getElementById("toggle_switch");
const hiddenInputContainer = document.querySelector(".hidden-input-lining");
const upsellProduct = document.querySelector(".upsell-product");
const variantId = upsellProduct?.getAttribute("data-variant-id");
function handleToggle() {
  if (toggleSwitch.checked) {
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "properties[_custom lining]";
    hiddenInput.classList.add("size_input", "hidden_input");
    hiddenInput.value = variantId;
    hiddenInputContainer.appendChild(hiddenInput);
  } else {
    hiddenInputContainer.innerHTML = "";
  }
}
toggleSwitch?.addEventListener("change", handleToggle);
function waitForElement(selector, callback) {
    const intervalId = setInterval(() => {
        if (document.querySelector(selector)) {
            clearInterval(intervalId);
            callback();
        }
    }, 100);
}

waitForElement('body', async () => {
   const customDressHandle = document.body.getAttribute('data-dress-extra-charge');
const customBlazerHandle = document.body.getAttribute('data-blazer-extra-charge');
const customLiningHandle = document.body.getAttribute('data-lining-extra-charge');
let customDressProductId, customDressPrice;
let customBlazerProductId, customBlazerPrice;
let customLiningProductId, customLiningPrice;

async function fetchProductDetails(handle) {
    try {
        const response = await fetch(`/products/${handle}.json`);
        const data = await response.json();
        const variant = data.product.variants[0];
        return {
            productId: variant.id,
            price: variant.price
        };
    } catch (error) {
        console.error(`Error fetching product details for ${handle}:`, error);
    }
}

async function fetchProductDetailsInitially() {
    if ((!customDressProductId || !customDressPrice) && customDressHandle) {
        const dressDetails = await fetchProductDetails(customDressHandle);
        customDressProductId = dressDetails.productId;
        customDressPrice = dressDetails.price;
    }

    if ((!customBlazerProductId || !customBlazerPrice) && customBlazerHandle) {
        const blazerDetails = await fetchProductDetails(customBlazerHandle);
        customBlazerProductId = blazerDetails.productId;
        customBlazerPrice = blazerDetails.price;
    }

    if ((!customLiningProductId || !customLiningPrice) && customLiningHandle) {
        const liningDetails = await fetchProductDetails(customLiningHandle);
        customLiningProductId = liningDetails.productId;
        customLiningPrice = liningDetails.price;
    }

    console.log('Dress Variant ID:', customDressProductId);
    console.log('Dress Price:', customDressPrice);
    console.log('Blazer Variant ID:', customBlazerProductId);
    console.log('Blazer Price:', customBlazerPrice);
    console.log('Lining Variant ID:', customLiningProductId);
    console.log('Lining Price:', customLiningPrice);
}

await fetchProductDetailsInitially(); 
await checkCartProperties(); 

let loadingExtra = false;

function setLoadingState(isLoading) {
    // Add your loading state management code here if needed
}

async function checkCartProperties() {
    try {
        const response = await fetch("/cart.js");
        const cart = await response.json();
        let customDressQuantity = 0;
        let customBlazerQuantity = 0;
        let customLiningQuantity = 0;

        cart.items.forEach((item) => {
            if (item.properties && Object.keys(item.properties).length > 0) {
                if (
                    item.properties.Neckline ||
                    item.properties.Sleevetype ||
                    item.properties.Bottomlength ||
                    item.properties.Pantlength ||
                    item.properties["_custom dresses"]
                ) {
                    customDressQuantity += item.quantity;
                    document.querySelectorAll(".extra-charge-product").forEach((extra) => {
                        extra.style.display = "flex";
                    });
                }

                if (item.properties["_custom blazer"]) {
                    customBlazerQuantity += item.quantity;
                }

                if (item.properties["_custom lining"]) {
                    customLiningQuantity += item.quantity;
                }
            }
        });

        console.log(
            `Quantity of products with _custom dresses property: ${customDressQuantity}`
        );
        console.log(
            `Quantity of products with _custom blazer property: ${customBlazerQuantity}`
        );
        console.log(
            `Quantity of products with _custom lining property: ${customLiningQuantity}`
        );

        const totalExtraCharge =
            customDressQuantity * customDressPrice +
            customBlazerQuantity * customBlazerPrice;

        const currencyCode = Shopify.currency.active;
        const location = `${Shopify.locale}-${Shopify.country}`;
        const formattedPrice = new Intl.NumberFormat(location, {
                style: "currency",
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
            .format(totalExtraCharge.toFixed(2))
            .replace("₹", "Rs.");

        console.log(`Total extra charge: ${formattedPrice}`);
        const extraChargeElements = document.querySelectorAll(
            ".extra-charge-product"
        );
        if(customDressQuantity == 0 && customBlazerQuantity == 0 &&customLiningQuantity == 0 ){
           extraChargeElements.forEach((extra) => {
                extra.style.display = "none";
            });
        }
        const totalExtraElements = document.querySelectorAll(
            ".extra-charge-product .total-Extra"
        );

        if (totalExtraCharge > 0) {
            extraChargeElements.forEach((extra) => {
                extra.style.display = "flex";
            });
            totalExtraElements.forEach((charg) => {
                charg.textContent = formattedPrice;
            });
        } else {
            extraChargeElements.forEach((extra) => {
                extra.style.display = "none";
            });
        }
        updateExtraChargeProducts(customDressQuantity, customBlazerQuantity, customLiningQuantity);
    } catch (error) {
        console.error("Error fetching cart:", error);
    }
}

async function updateExtraChargeProducts(customDressQuantity, customBlazerQuantity, customLiningQuantity) {
    setLoadingState(true);
    try {
        const cartResponse = await fetch("/cart.js");
        const cart = await cartResponse.json();

        let customDressItem = cart.items.find(
            (item) => item.id === customDressProductId
        );
        if (customDressItem) {
            if (customDressQuantity > 0) {
                await fetch(`/cart/change.js`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: customDressItem.key,
                        quantity: customDressQuantity,
                        properties: {
                            "Customization charge": "Customization charge for your dress"
                        },
                    }),
                });
            } else {
                await fetch(`/cart/change.js`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: customDressItem.key,
                        quantity: 0
                    }),
                });
            }
        } else if (customDressQuantity > 0) {
            await fetch("/cart/add.js", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: customDressProductId,
                    quantity: customDressQuantity,
                    properties: {
                        "Customization charge": "Customization charge for your dress"
                    },
                }),
            });
        }

        let customBlazerItem = cart.items.find(
            (item) => item.id === customBlazerProductId
        );
        if (customBlazerItem) {
            if (customBlazerQuantity > 0) {
                await fetch(`/cart/change.js`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: customBlazerItem.key,
                        quantity: customBlazerQuantity,
                        properties: {
                            "Customization charge": "Customization charge for your blazer"
                        },
                    }),
                });
            } else {
                await fetch(`/cart/change.js`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: customBlazerItem.key,
                        quantity: 0
                    }),
                });
            }
        } else if (customBlazerQuantity > 0) {
            await fetch("/cart/add.js", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: customBlazerProductId,
                    quantity: customBlazerQuantity,
                    properties: {
                        "Customization charge": "Customization charge for your blazer"
                    },
                }),
            });
        }

        let customLiningItem = cart.items.find(
            (item) => item.id === customLiningProductId
        );
        if (customLiningItem) {
            if (customLiningQuantity > 0) {
                await fetch(`/cart/change.js`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: customLiningItem.key,
                        quantity: customLiningQuantity,
                        properties: {
                            "Customization charge": `Customization lining charge for your dress`
                        },
                    }),
                });
            } else {
                await fetch(`/cart/change.js`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        id: customLiningItem.key,
                        quantity: 0
                    }),
                });
            }
        } else if (customLiningQuantity > 0) {
            await fetch("/cart/add.js", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: customLiningProductId,
                    quantity: customLiningQuantity,
                    properties: {
                        "Customization charge": `Customization lining charge for your dress`
                    },
                }),
            });
        }
        document.dispatchEvent(new CustomEvent("cart:build"));
    } catch (error) {
        console.error("Error updating extra charge products:", error);
    }
    setLoadingState(false);
}

    document.addEventListener("cart:updated", function(evt) {
        checkCartProperties();
    });

    document.addEventListener("ajaxProduct:added", function(evt) {
        checkCartProperties();
    });

  async function removeSizeProperty(lineItemKey) {
      try {
          const response = await fetch('/cart.js');
          const cart = await response.json();
  
          const item = cart.items.find(item => item.key === lineItemKey);
  
          if (item) {
              const updatedProperties = { ...item.properties };
  
              delete updatedProperties["_custom lining"];
  
              const updateResponse = await fetch('/cart/change.js', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      'id': lineItemKey,
                      'properties': updatedProperties,
                  }),
              });
  
              const updatedCart = await updateResponse.json();
              console.log('Size property removed:', updatedCart);
              document.dispatchEvent(new CustomEvent("cart:build"));
              checkCartProperties();
          } else {
              console.error('Line item not found');
          }
      } catch (error) {
          console.error('Error removing size property:', error);
      }
  }

  document.addEventListener('click', function(event) {
      if (event.target && event.target.classList.contains('custom-charge-product')) {
          const lineItemKey = event.target.id;
          removeSizeProperty(lineItemKey);
      }
  });

});
