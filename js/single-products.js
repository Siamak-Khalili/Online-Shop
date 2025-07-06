const API_URL = "http://localhost:3000/products";
const CURRENCY = "$";

function formatPrice(price) {
  return CURRENCY + price.toFixed(2);
}

function getDiscountPercentage(originalPrice, discountedPrice) {
  if (!originalPrice || !discountedPrice || discountedPrice >= originalPrice)
    return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}

function updateProductPrice(element, product) {
  if (!element || !product) return;
  const priceElement = element.querySelector(".product__new-price") || element;
  const oldPriceElement = element.querySelector(".product__old-price");
  const discountElement = element.querySelector(".discount-badge");

  if (product.discountedPrice && product.discountedPrice < product.price) {
    if (priceElement)
      priceElement.textContent = formatPrice(product.discountedPrice);
    if (oldPriceElement) {
      oldPriceElement.textContent = formatPrice(product.price);
      oldPriceElement.style.display = "inline-block";
    }
    if (discountElement) {
      const discount = getDiscountPercentage(
        product.price,
        product.discountedPrice
      );
      discountElement.textContent = `${discount}%`;
      discountElement.style.display = "inline-block";
    }
  } else {
    if (priceElement) priceElement.textContent = formatPrice(product.price);
    if (oldPriceElement) oldPriceElement.style.display = "none";
    if (discountElement) discountElement.style.display = "none";
  }
}

class Storage {
  static saveProducts(products) {
    localStorage.setItem("products", JSON.stringify(products));
  }

  static async getProduct(slug) {
    try {
      const cachedProducts = JSON.parse(localStorage.getItem("products"));
      if (cachedProducts) {
        const product = cachedProducts.find((p) => p.slug === slug);
        if (product) {
          return product;
        }
      }
      const response = await axios.get(`${API_URL}?slug=${slug}`);
      return response.data[0] || null;
    } catch (error) {
      return null;
    }
  }

  static saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
  }

  static getCart() {
    const cart = localStorage.getItem("cart");
    return cart ? JSON.parse(cart) : [];
  }
  static addToCart(
    product,
    selectedColor,
    selectedColorName,
    selectedSize,
    quantity
  ) {
    let cart = this.getCart();
    const existingItemIndex = cart.findIndex(
      (item) =>
        item.id === product.id &&
        item.selectedColor === selectedColor &&
        item.selectedSize === selectedSize
    );

    if (existingItemIndex !== -1) {
      cart[existingItemIndex].quantity += quantity;
    } else {
      const cartItem = {
        id: product.id,
        title: product.title,
        price: product.discountedPrice || product.price,
        originalPrice: product.price,
        images: product.images || [product.imageUrl],
        selectedColor: selectedColor,
        selectedColorName: selectedColorName,
        selectedSize: selectedSize,
        quantity: quantity,
      };
      cart.push(cartItem);
    }

    this.saveCart(cart);
    document.dispatchEvent(new CustomEvent("cartUpdate", {detail: cart}));
    return cart;
  }

  static saveRatings(productId, ratings) {
    localStorage.setItem(`ratings_${productId}`, JSON.stringify(ratings));
  }

  static getRatings(productId) {
    const ratings = localStorage.getItem(`ratings_${productId}`);
    return ratings
      ? JSON.parse(ratings)
      : {count: 0, average: 0, individual: []};
  }
}

let selectedColor = null;
let selectedColorName = null;
let selectedSize = null;

async function initializePage() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("product");

    if (!slug) {
      window.location.href = "Shop.html";
      return;
    }

    const product = await Storage.getProduct(slug);
    if (!product) {
      window.location.href = "Shop.html";
      return;
    }

    await displayProduct(product);
    setupGallery(product.images);
    setupQuantityControls();
    setupColorSelection();
    setupSizeSelection(product);
    setupAddToCart(product);
    setupCartListeners();
    setupRating(product);
    checkIfInCart(product.id);

    document.body.addEventListener("cartUpdate", (event) => {
      const cart = event.detail;
      if (cart) {
        checkIfInCart(product.id, selectedColor, selectedSize);
      }
    });

    if (product.colors?.length > 0) {
      selectedColor = product.colors[0];
      selectedColorName = product.colorNames?.[0] || selectedColor;
    }
  } catch (error) {
    console.error("Error initializing page:", error);
    window.location.href = "Shop.html";
  }
}

document.addEventListener("DOMContentLoaded", initializePage);

function setupQuantityControls() {
  const quantityDisplay = document.querySelector(".cart-item-conteoller p");
  const upButton = document.querySelector(".chevron-up");
  const downButton = document.querySelector(".chevron-down");

  if (upButton && downButton && quantityDisplay) {
    upButton.addEventListener("click", () => {
      let quantity = parseInt(quantityDisplay.textContent);
      quantity++;
      quantityDisplay.textContent = quantity;
    });

    downButton.addEventListener("click", () => {
      let quantity = parseInt(quantityDisplay.textContent);
      if (quantity > 1) {
        quantity--;
        quantityDisplay.textContent = quantity;
      }
    });
  }
}

function setupColorSelection() {
  const colorValues = document.querySelector(".color-values");
  const colorLabel = document.querySelector(".product__option-label");
  if (!colorValues || !colorLabel) return;

  colorValues.addEventListener("click", (e) => {
    const colorBtn = e.target.closest(".product__color");
    if (!colorBtn) return;

    colorValues
      .querySelectorAll(".product__color")
      .forEach((btn) => btn.classList.remove("active"));

    colorBtn.classList.add("active");

    selectedColor = colorBtn.dataset.color;
    selectedColorName = colorBtn.dataset.colorName;

    colorLabel.textContent = `Color: ${selectedColorName}`;

    const addToCartBtn = document.querySelector(".add-to-cart");
    if (addToCartBtn) {
      const productId = parseInt(addToCartBtn.dataset.id);
      checkIfInCart(productId, selectedColor);
    }
  });
}

function setupSizeSelection(product) {
  const sizeValues = document.querySelector(".size-values");
  if (!sizeValues) return;

  if (product.sizes?.length > 0) {
    selectedSize = product.sizes[0];
    const firstSizeBtn = sizeValues.querySelector(".product__size");
    if (firstSizeBtn) {
      firstSizeBtn.classList.add("active");
    }
  }

  sizeValues.addEventListener("click", (e) => {
    const sizeBtn = e.target.closest(".product__size");
    if (!sizeBtn) return;

    sizeValues
      .querySelectorAll(".product__size")
      .forEach((btn) => btn.classList.remove("active"));

    sizeBtn.classList.add("active");

    selectedSize = sizeBtn.dataset.size;

    const sizeLabel = document.querySelector(".product__option-size");
    if (sizeLabel && selectedSize) {
      sizeLabel.textContent = `Size: ${selectedSize}`;
    }

    const addToCartBtn = document.querySelector(".add-to-cart");
    if (addToCartBtn) {
      const productId = parseInt(addToCartBtn.dataset.id);
      checkIfInCart(productId, selectedColor, selectedSize);
    }
  });
}

function setupAddToCart(product) {
  const addToCartBtn = document.querySelector(".add-to-cart");
  if (!addToCartBtn) return;

  addToCartBtn.dataset.id = product.id;

  addToCartBtn.addEventListener("click", () => {
    const quantityDisplay = document.querySelector(".cart-item-conteoller p");
    const quantity = parseInt(quantityDisplay.textContent);

    Storage.addToCart(
      product,
      selectedColor,
      selectedColorName,
      selectedSize,
      quantity
    );

    addToCartBtn.innerText = "in cart";
    addToCartBtn.disabled = true;

    document.dispatchEvent(cartUpdateEvent);
    showToast("Product added to cart!");
  });
}

function setupCartListeners() {
  document.addEventListener("cartClear", () => {
    const addToCartBtn = document.querySelector(".add-to-cart");
    if (addToCartBtn) {
      addToCartBtn.innerText = "Add to cart";
      addToCartBtn.disabled = false;
    }
  });

  document.addEventListener("itemRemoved", (e) => {
    const removedItemId = e.detail.itemId;
    const removedItemColor = e.detail.itemColor;
    const removedItemSize = e.detail.itemSize;
    const addToCartBtn = document.querySelector(".add-to-cart");
    if (
      addToCartBtn &&
      parseInt(addToCartBtn.dataset.id) === removedItemId &&
      selectedColor === removedItemColor &&
      selectedSize === removedItemSize
    ) {
      addToCartBtn.innerText = "Add to cart";
      addToCartBtn.disabled = false;
    }
  });
}

function checkIfInCart(productId, currentColor, currentSize) {
  const cart = Storage.getCart();
  const addToCartBtn = document.querySelector(".add-to-cart");

  if (!addToCartBtn) return;

  const colorToCheck = currentColor || selectedColor;
  const sizeToCheck = currentSize || selectedSize;

  const isInCart = cart.some(
    (item) =>
      item.id === productId &&
      item.selectedColor === colorToCheck &&
      item.selectedSize === sizeToCheck
  );

  if (isInCart) {
    addToCartBtn.innerText = "in cart";
    addToCartBtn.disabled = true;
  } else {
    addToCartBtn.innerText = "Add to cart";
    addToCartBtn.disabled = false;
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

async function displayProduct(product) {
  document.title = `${product.title} - FASCO`;

  const elements = {
    brand: document.querySelector(".product__brand"),
    title: document.querySelector(".product__title"),
    price: document.querySelector(".product__price"),
    sizeValues: document.querySelector(".size-values"),
    colorValues: document.querySelector(".color-values"),
    addToCartBtn: document.querySelector(".add-to-cart"),
  };
  if (elements.brand) elements.brand.textContent = product.brand;
  if (elements.title) elements.title.textContent = product.title;
  const priceContainer = document.querySelector(".price");
  const discountedPrice = document.querySelector(".discounted-price");
  const originalPrice = document.querySelector(".original-price");
  const discountBadgeElement = document.querySelector(".discount-badge");

  if (priceContainer) {
    priceContainer.setAttribute("data-product-id", product.id);
  }

  if (product.discountedPrice && product.discountedPrice < product.price) {
    if (discountedPrice) {
      discountedPrice.textContent = formatPrice(product.discountedPrice);
    }
    if (originalPrice) {
      originalPrice.textContent = formatPrice(product.price);
      originalPrice.style.display = "inline-block";
      originalPrice.style.textDecoration = "line-through";
      originalPrice.style.marginLeft = "8px";
      originalPrice.style.color = "#888";
    }
    if (discountBadgeElement) {
      const discount = getDiscountPercentage(
        product.price,
        product.discountedPrice
      );
      discountBadgeElement.textContent = `${discount}%`;
      discountBadgeElement.style.display = "inline-block";
    }
  } else {
    if (discountedPrice) {
      discountedPrice.textContent = formatPrice(product.price);
    }
    if (originalPrice) {
      originalPrice.style.display = "none";
    }
    if (discountBadgeElement) {
      discountBadgeElement.style.display = "none";
    }
  }

  const ratingCount = document.createElement("p");
  ratingCount.className = "product-card__reviews";
  const ratings = Storage.getRatings(product.id);
  ratingCount.textContent = `(${ratings.count || 0}) Customer Reviews`;
  const ratingContainer = document.querySelector(".product-card__rating");
  if (ratingContainer && ratingContainer.parentNode) {
    ratingContainer.parentNode.insertBefore(
      ratingCount,
      ratingContainer.nextSibling
    );
  }

  if (elements.sizeValues && Array.isArray(product.sizes)) {
    elements.sizeValues.innerHTML = product.sizes
      .map(
        (size) =>
          `<button class="product__size" data-size="${size}">${size}</button>`
      )
      .join("");
    if (product.sizes.length > 0) {
      selectedSize = product.sizes[0];
      const firstSizeBtn = elements.sizeValues.querySelector(".product__size");
      if (firstSizeBtn) {
        firstSizeBtn.classList.add("active");
      }
      const sizeLabel = document.querySelector(".product__option-size");
      if (sizeLabel && selectedSize) {
        sizeLabel.textContent = `Size: ${selectedSize}`;
      }
    }
  }

  if (elements.colorValues && Array.isArray(product.colors)) {
    elements.colorValues.innerHTML = product.colors
      .map((color, index) => {
        const colorName = product.colorNames?.[index] || color;
        return `<button class="product__color"
                  data-color="${color}"
                  data-color-name="${colorName}"
                  style="background-color: ${color}"
                  title="${colorName}"></button>`;
      })
      .join("");

    const firstColorBtn = elements.colorValues.querySelector(".product__color");
    if (firstColorBtn) {
      firstColorBtn.classList.add("active");
      selectedColor = firstColorBtn.dataset.color;
      selectedColorName = firstColorBtn.dataset.colorName;
    }
  }

  const colorLabel = document.querySelector(".product__option-label");
  if (colorLabel && selectedColorName) {
    colorLabel.textContent = `Color: ${selectedColorName}`;
  }

  const sizeLabel = document.querySelector(".product__option-size");
  if (sizeLabel && selectedSize) {
    sizeLabel.textContent = `Size: ${selectedSize}`;
  }

  if (elements.addToCartBtn) {
    elements.addToCartBtn.dataset.id = product.id;
    elements.addToCartBtn.disabled = false;
  }

  const countdownSection = document.querySelector(".product__countdown");
  const discountBadge = document.querySelector(".discount-badge");
  const badgeVisible =
    discountBadge &&
    discountBadge.offsetParent !== null &&
    /\S/.test(discountBadge.textContent) &&
    !/^0+%?$/.test(discountBadge.textContent.trim());
  if (countdownSection) {
    if (!badgeVisible) {
      countdownSection.remove();
    } else {
      countdownSection.style.display = "";
      const TIMER_KEY = `fasco-timer-${product.id}`;
      let endTime = localStorage.getItem(TIMER_KEY);
      if (!endTime) {
        endTime = Date.now() + 2 * 24 * 60 * 60 * 1000;
        localStorage.setItem(TIMER_KEY, endTime);
      } else {
        endTime = parseInt(endTime);
      }
      const timerEl = countdownSection.querySelector(".product__timer");
      function updateTimer() {
        const now = Date.now();
        let diff = endTime - now;
        if (diff < 0) diff = 0;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        if (timerEl) {
          timerEl.textContent = `${String(days).padStart(2, "0")} : ${String(
            hours
          ).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(
            seconds
          ).padStart(2, "0")}`;
        }
        if (diff === 0) {
          clearInterval(timerInterval);
        }
      }
      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
    }
  }
}

function setupGallery(images) {
  if (!Array.isArray(images) || images.length === 0) return;

  const thumbnailsContainer = document.querySelector(".product__thumbnails");
  const mainImage = document.querySelector(".product__main-image");

  if (!thumbnailsContainer || !mainImage) return;

  mainImage.src = images[0];
  mainImage.alt = "Product main image";

  thumbnailsContainer.innerHTML = images
    .map(
      (image, index) => `
            <div class="product__thumbnail${
              index === 0 ? " active" : ""
            }" data-index="${index}">
                <img src="${image}" alt="Product thumbnail ${index + 1}" />
            </div>
        `
    )
    .join("");

  thumbnailsContainer.addEventListener("click", (e) => {
    const thumbnail = e.target.closest(".product__thumbnail");
    if (!thumbnail) return;

    const imageUrl = thumbnail.querySelector("img").src;

    thumbnailsContainer
      .querySelectorAll(".product__thumbnail")
      .forEach((t) => t.classList.remove("active"));
    thumbnail.classList.add("active");

    mainImage.style.opacity = "0";
    setTimeout(() => {
      mainImage.src = imageUrl;
      mainImage.style.opacity = "1";
    }, 200);
  });
}

function setupRating(product) {
  const ratingContainer = document.querySelector(".product-card__rating");
  const reviewsContainer = document.querySelector(".product-card__reviews");
  if (!ratingContainer || !reviewsContainer) return;

  const ratings = Storage.getRatings(product.id);

  function createStarHTML(filled = false, rating = 0) {
    return `
      <span class="product-card__star" data-rating="${rating}">
        ${
          filled
            ? '<img src="assets/icon/star2.svg" alt="Filled Star" />'
            : '<svg class="icon"><use href="assets/icon/sprite.svg#Star"></use></svg>'
        }
      </span>
    `;
  }

  function updateRatingDisplay(rating, isHover = false) {
    if (rating < 1 || rating > 5) {
      rating = Math.max(1, Math.min(5, rating));
    }

    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(createStarHTML(i <= rating, i));
    }
    ratingContainer.innerHTML = stars.join("");

    const latestRatings = Storage.getRatings(product.id);
    if (!isHover) {
      reviewsContainer.textContent = `(${latestRatings.count}) Customer Reviews`;
    }
  }

  updateRatingDisplay(Math.round(ratings.average));

  ratingContainer.addEventListener("mouseover", (e) => {
    const star = e.target.closest(".product-card__star");
    if (star) {
      const rating = parseInt(star.dataset.rating);
      updateRatingDisplay(rating, true);
    }
  });

  ratingContainer.addEventListener("mouseout", () => {
    const latestRatings = Storage.getRatings(product.id);
    updateRatingDisplay(Math.round(latestRatings.average));
  });

  ratingContainer.addEventListener("click", (e) => {
    const star = e.target.closest(".product-card__star");
    if (!star) return;

    const newRating = parseInt(star.dataset.rating);
    const ratings = Storage.getRatings(product.id);
    ratings.individual.push(newRating);
    ratings.count = ratings.individual.length;
    ratings.average =
      ratings.individual.reduce((sum, r) => sum + r, 0) / ratings.count;
    Storage.saveRatings(product.id, ratings);

    updateRatingDisplay(Math.round(ratings.average));
    showToast("Thank you for your rating!");
  });
}
