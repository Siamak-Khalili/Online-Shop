const API_URL = "http://localhost:3000/products";

class Storage {
  static saveProducts(products) {
    localStorage.setItem("products", JSON.stringify(products));
  }

  static async getProduct(id) {
    try {
      const cachedProducts = JSON.parse(localStorage.getItem("products"));
      if (cachedProducts) {
        const product = cachedProducts.find((p) => p.id === parseInt(id));
        if (product) {
          return product;
        }
      }
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
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

  static addToCart(product, selectedColor, selectedColorName, selectedSize) {
    let cart = this.getCart();
    // Check if item with same id, color, size exists
    const existingItem = cart.find(
      (item) =>
        item.id === product.id &&
        item.selectedColor === selectedColor &&
        item.selectedSize === selectedSize
    );
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      const cartItem = {
        id: product.id,
        title: product.title,
        price: product.price,
        images: product.images || [product.imageUrl],
        selectedColor: selectedColor,
        selectedColorName: selectedColorName,
        selectedSize: selectedSize,
        quantity: 1,
      };
      cart.push(cartItem);
    }
    this.saveCart(cart);
    return cart;
  }
}

let cartBtns;
let cartModal;
let backDrop;
let closeModal;
let productsDOM;
let cartTotal;
let cartItemsElements;
let cartContent;
let clearCart;

let cart = Storage.getCart();
let buttonsDOM = [];

class Products {
  async getProducts() {
    try {
      const response = await axios.get(API_URL);
      let products = response.data;
      // Add fake data for sorting
      products = products.map((product) => ({
        ...product,
        createdAt: new Date(
          Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000
        ), // Random date within last 90 days
        salesCount: Math.floor(Math.random() * 1000), // Random number of sales between 0-1000
      }));
      Storage.saveProducts(products);
      return products;
    } catch (error) {
      const cachedProducts = JSON.parse(localStorage.getItem("products")) || [];
      return cachedProducts;
    }
  }

  async getDiscountedProducts() {
    try {
      const response = await axios.get(API_URL);
      const products = response.data;
      const discounted = products.filter(
        (product) =>
          product.discountedPrice && product.discountedPrice < product.price
      );
      return discounted;
    } catch (error) {
      const cachedProducts = JSON.parse(localStorage.getItem("products")) || [];
      const discounted = cachedProducts.filter(
        (product) =>
          product.discountedPrice && product.discountedPrice < product.price
      );
      return discounted;
    }
  }
}

class UI {
  async displayProducts(currentPage = 1, itemsPerPage = 9) {
    const productsDOM = document.querySelector("#shop-grid");
    if (!productsDOM) {
      return;
    }

    const products = await new Products().getProducts();
    if (!products.length) {
      productsDOM.innerHTML = "<p>No products available</p>";
      return;
    }

    const paginated = this.paginateProducts(
      products,
      currentPage,
      itemsPerPage
    );

    let result = "";
    paginated.forEach((item) => {
      let colorsHTML = "";
      if (Array.isArray(item.colors)) {
        colorsHTML = item.colors
          .map(
            (color, index) =>
              `<button class="shop-card__color" data-color="${color}" data-color-name="${
                item.colorNames?.[index] || color
              }" style="background: ${color}" title="${
                item.colorNames?.[index] || color
              }"></button>`
          )
          .join("");
      }

      result += `
      <div class="shop-card" data-index="${item.id}" data-slug="${item.slug}">
        <a href="single-product.html?product=${item.slug}">
          <img
            src="${
              item.images?.[0] ||
              item.imageUrl ||
              "https://via.placeholder.com/150"
            }"
            class="shop-card__image"
            alt="${item.title}" />
        </a>
        <h3 class="shop-card__title">${item.title}</h3>
        <div class="price" data-product-id="${item.id}"></div>
        <div class="shop-card__colors">${colorsHTML}</div>
      </div>`;
    });

    productsDOM.innerHTML = result;

    this.renderPaginationControls(products, currentPage, itemsPerPage);

    if (typeof updateAllPriceElements === "function") {
      updateAllPriceElements();
    }

    const colorButtons = document.querySelectorAll(".shop-card__color");
    colorButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".shop-card");
        const allColors = card.querySelectorAll(".shop-card__color");
        allColors.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
      });
    });
  }

  paginateProducts(products, currentPage = 1, itemsPerPage = 9) {
    const start = (currentPage - 1) * itemsPerPage;
    return products.slice(start, start + itemsPerPage);
  }

  renderPaginationControls(products, currentPage = 1, itemsPerPage = 9) {
    const paginationContainer = document.querySelector(".pagination");
    if (!paginationContainer) {
      return;
    }

    const totalPages = Math.ceil(products.length / itemsPerPage);
    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    let buttonsHTML = "";

    if (currentPage > 1) {
      buttonsHTML += `<button class="pagination-btn prev" data-page="${
        currentPage - 1
      }">«</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
      buttonsHTML += `<button class="pagination-btn ${
        i === currentPage ? "active" : ""
      }" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
      buttonsHTML += `<button class="pagination-btn next" data-page="${
        currentPage + 1
      }">»</button>`;
    }

    paginationContainer.innerHTML = buttonsHTML;

    const buttons = paginationContainer.querySelectorAll(".pagination-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const selectedPage = parseInt(e.target.dataset.page);
        this.displayProducts(selectedPage, itemsPerPage);
      });
    });
  }

  getAddToCart() {
    const addTocartBtns = [...document.querySelectorAll(".add-to-cart")];
    buttonsDOM = addTocartBtns;

    addTocartBtns.forEach((btn) => {
      const id = parseInt(btn.dataset.id);
      const card = btn.closest(".shop-card");
      const isProductPage = !card && btn.closest(".product");

      const updateButtonState = async () => {
        let activeColorBtn = null;
        let currentColor = null;

        if (card) {
          activeColorBtn = card.querySelector(".shop-card__color.active");
          currentColor = activeColorBtn ? activeColorBtn.dataset.color : null;
        } else if (isProductPage) {
          activeColorBtn = document.querySelector(".product__color.active");
          currentColor = activeColorBtn ? activeColorBtn.dataset.color : null;
        }

        cart = Storage.getCart();

        const isColorInCart = cart.some(
          (item) => item.id === id && item.selectedColor === currentColor
        );

        if (isColorInCart) {
          btn.innerText = "in cart";
          btn.disabled = true;
        } else {
          btn.innerText = "Add to cart";
          btn.disabled = false;
        }
      };

      updateButtonState();

      let colorBtns = [];
      if (card) {
        colorBtns = card.querySelectorAll(".shop-card__color");
      } else if (isProductPage) {
        colorBtns = document.querySelectorAll(".product__color");
      }

      colorBtns.forEach((colorBtn) => {
        colorBtn.addEventListener("click", updateButtonState);
      });

      btn.addEventListener("click", async (event) => {
        const product = await Storage.getProduct(id);
        if (!product) {
          return;
        }

        let selectedColorBtn = null;
        let selectedColor = null;
        let selectedColorName = null;

        if (card) {
          selectedColorBtn = card.querySelector(".shop-card__color.active");
          selectedColor = selectedColorBtn
            ? selectedColorBtn.dataset.color
            : product.colors?.[0];
          selectedColorName = selectedColorBtn
            ? selectedColorBtn.dataset.colorName
            : product.colorNames?.[0];
        } else if (isProductPage) {
          selectedColorBtn = document.querySelector(".product__color.active");
          selectedColor = selectedColorBtn
            ? selectedColorBtn.dataset.color
            : product.colors?.[0];
          selectedColorName = selectedColorBtn
            ? selectedColorBtn.dataset.colorName
            : product.colorNames?.[0];
        }

        const selectedSize = product.sizes ? product.sizes[0] : null;

        cart = Storage.addToCart(
          product,
          selectedColor,
          selectedColorName,
          selectedSize
        );

        this.setCartValue(cart);
        this.addCartItem({
          ...product,
          selectedColor,
          selectedColorName,
          selectedSize,
          quantity: 1,
        });

        event.target.innerText = "in cart";
        event.target.disabled = true;
      });
    });
  }

  setCartValue(cart) {
    if (!cartTotal || !cartItemsElements || cartItemsElements.length === 0) {
      cartTotal = document.querySelector(".cart-total");
      cartItemsElements = document.querySelectorAll(".cart-items");
      if (!cartTotal || !cartItemsElements || cartItemsElements.length === 0) {
        return;
      }
    }

    const cartArray = Array.isArray(cart) ? cart : [];
    let tempCartItems = 0;

    const totalPrice = cartArray.reduce((acc, curr) => {
      const quantity = parseInt(curr.quantity) || 0;
      tempCartItems += quantity;
      return acc + quantity * curr.price;
    }, 0);

    cartTotal.innerText = `Subtotal : $ ${totalPrice.toFixed(2)}`;

    cartItemsElements.forEach((item) => {
      item.innerText = tempCartItems;
    });
  }

  addCartItem(cartItem) {
    if (!cartContent) {
      return;
    }

    const imageUrl =
      cartItem.images?.[0] ||
      cartItem.imageUrl ||
      "https://via.placeholder.com/100";

    if (!imageUrl) {
      return;
    }

    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.dataset.cartItemId = `${cartItem.id}-${
      cartItem.selectedColor || "no-color"
    }-${cartItem.selectedSize || "no-size"}`;

    div.innerHTML = `
        <img class="cart-item-img" src="${imageUrl}" alt="${cartItem.title}" />
        <div class="cart-item-details">
          <div class="cart-item-desc">
            <h4>${cartItem.title}</h4>
            <p class="cart-item-color">Color: ${
              cartItem.selectedColorName || "پیش‌فرض"
            }</p>
            <p class="cart-item-size">Size: ${
              cartItem.selectedSize || "پیش‌فرض"
            }</p>
            <h5>$ ${parseFloat(cartItem.price).toFixed(2)}</h5>
          </div>
          <div class="cart-item-conteoller">
            <span class="chevron-up" data-id=${cartItem.id} data-color="${
      cartItem.selectedColor
    }" data-size="${cartItem.selectedSize}">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
              </svg>
            </span>
            <p>${cartItem.quantity}</p>
            <span class="chevron-down" data-id=${cartItem.id} data-color="${
      cartItem.selectedColor
    }" data-size="${cartItem.selectedSize}">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
              </svg>
            </span>
          </div>
        </div>
    `;
    cartContent.appendChild(div);
  }

  setupApp() {
    cart = Storage.getCart();
    this.setCartValue(cart);
    this.populateCart(cart);

    document.addEventListener("cartUpdate", () => {
      cart = Storage.getCart();
      this.setCartValue(cart);
      this.populateCart(cart);
      this.getAddToCart();
    });

    document.addEventListener("itemRemoved", (event) => {
      const removedItemId = event.detail.itemId;
      const removedItemColor = event.detail.itemColor;
      const removedItemSize = event.detail.itemSize;
      buttonsDOM.forEach((button) => {
        const buttonId = parseInt(button.dataset.id);
        const card = button.closest(".shop-card");
        const activeColorBtn = card.querySelector(".shop-card__color.active");
        const currentColor = activeColorBtn
          ? activeColorBtn.dataset.color
          : null;

        if (buttonId === removedItemId && currentColor === removedItemColor) {
          button.innerText = "Add to cart";
          button.disabled = false;
        }
      });
    });

    document.addEventListener("cartClear", () => {
      buttonsDOM.forEach((button) => {
        button.innerText = "Add to cart";
        button.disabled = false;
      });
    });
  }

  cartLogic() {
    if (clearCart) {
      clearCart.addEventListener("click", () => this.clearCart());
    }

    if (cartContent) {
      cartContent.addEventListener("click", (event) => {
        const upButton = event.target.closest(".chevron-up");
        const downButton = event.target.closest(".chevron-down");
        const removeItemBtn = event.target.closest(".remove-item");

        if (upButton) {
          const id = parseInt(upButton.dataset.id);
          const color = upButton.dataset.color;
          const size = upButton.dataset.size;
          const item = cart.find(
            (item) =>
              item.id === id &&
              item.selectedColor === color &&
              item.selectedSize === size
          );
          if (item) {
            item.quantity++;
            Storage.saveCart(cart);
            this.setCartValue(cart);
            this.populateCart(cart); // update DOM
          }
        } else if (downButton) {
          const id = parseInt(downButton.dataset.id);
          const color = downButton.dataset.color;
          const size = downButton.dataset.size;
          const item = cart.find(
            (item) =>
              item.id === id &&
              item.selectedColor === color &&
              item.selectedSize === size
          );
          if (item) {
            if (item.quantity > 1) {
              item.quantity--;
              Storage.saveCart(cart);
              this.setCartValue(cart);
              this.populateCart(cart); // update DOM
            } else {
              const cartItemElement = downButton.closest(".cart-item");
              if (cartItemElement) {
                cartContent.removeChild(cartItemElement);
                this.removeItem(id, color, size);
              }
            }
          }
        } else if (removeItemBtn) {
          const id = parseInt(removeItemBtn.dataset.id);
          const color = removeItemBtn.dataset.color;
          const size = removeItemBtn.dataset.size;
          const cartItemElement = removeItemBtn.closest(".cart-item");
          if (cartItemElement) {
            cartContent.removeChild(cartItemElement);
            this.removeItem(id, color, size);
          }
        }
      });
    }
  }

  clearCart() {
    cart = [];
    Storage.saveCart(cart);
    this.setCartValue(cart);

    if (cartContent) {
      while (cartContent.children.length) {
        cartContent.removeChild(cartContent.children[0]);
      }
    }

    buttonsDOM.forEach((button) => {
      button.innerText = "Add to cart";
      button.disabled = false;
    });

    document.dispatchEvent(new CustomEvent("cartClear"));

    closeModalFunction();
  }

  removeItem(id, color, size) {
    cart = cart.filter(
      (cItem) =>
        !(
          cItem.id === id &&
          cItem.selectedColor === color &&
          cItem.selectedSize === size
        )
    );
    Storage.saveCart(cart);
    this.setCartValue(cart);

    document.dispatchEvent(
      new CustomEvent("itemRemoved", {
        detail: {itemId: id, itemColor: color, itemSize: size},
      })
    );

    document.dispatchEvent(new CustomEvent("cartUpdate"));
  }

  populateCart(cart) {
    if (!cartContent) {
      return;
    }

    cartContent.innerHTML = "";

    cart.forEach((item) => this.addCartItem(item));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  loadComponents();

  cartBtns = document.querySelectorAll(".cart-btn");
  cartModal = document.querySelector(".cart");
  backDrop = document.querySelector(".backdrop");
  closeModal = document.querySelector(".cart-item-confirm");
  productsDOM = document.querySelector(".shop-grid");
  cartTotal = document.querySelector(".cart-total");
  cartItemsElements = document.querySelectorAll(".cart-items");
  cartContent = document.querySelector(".cart-content");
  clearCart = document.querySelector(".clear-cart");

  const productsInstance = new Products();
  const ui = new UI();
  ui.setupApp();
  Storage.saveCart(cart);

  if (productsDOM) {
    await ui.displayProducts();
    ui.getAddToCart();

    document.querySelectorAll(".shop-card").forEach((card) => {
      const firstColor = card.querySelector(".shop-card__color");
      const addToCartBtn = card.querySelector(".add-to-cart");

      if (firstColor) {
        firstColor.classList.add("active");
      }

      if (addToCartBtn) {
        const id = parseInt(addToCartBtn.dataset.id);
        const selectedColor = firstColor ? firstColor.dataset.color : null;
        const isInCart = cart.some(
          (item) => item.id === id && item.selectedColor === selectedColor
        );

        if (isInCart) {
          addToCartBtn.innerText = "in cart";
          addToCartBtn.disabled = true;
        }
      }
    });
  }

  ui.cartLogic();
  if (cartBtns.length) {
    cartBtns.forEach((cartBtn) => {
      cartBtn.addEventListener("click", showModalFunction);
    });
  }

  if (closeModal) {
    closeModal.addEventListener("click", closeModalFunction);
  }

  if (backDrop) {
    backDrop.addEventListener("click", closeModalFunction);
  }

  const discountedProducts = await productsInstance.getDiscountedProducts();
  const swiperWrapper = document.querySelector(".discount-swiper-wrapper");

  if (swiperWrapper) {
    swiperWrapper.innerHTML = "";
    if (discountedProducts.length === 0) {
      swiperWrapper.innerHTML = "<p>No discounted products available</p>";
    } else {
      discountedProducts.forEach((product) => {
        const discountPercentage = Math.round(
          ((product.price - product.discountedPrice) / product.price) * 100
        );

        const slide = document.createElement("div");
        slide.className = "swiper-slide";
        slide.innerHTML = `
          <a href="single-product.html?product=${
            product.slug
          }" class="view-product">
            <img src="${
              product.images[0] || "https://via.placeholder.com/150"
            }" alt="${product.title}" />
            <div class="slide-caption">
              <span class="brand">${product.brand}</span>
              <span>${discountPercentage}% OFF</span>
            </div>
          </a>
        `;

        swiperWrapper.appendChild(slide);
      });

      new Swiper(".discount-swiper", {
        slidesPerView: 3,
        spaceBetween: 30,
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
          disabledClass: "swiper-button-disabled",
        },
        loop: false,
        watchOverflow: true,
        allowTouchMove: true,
        speed: 400,
        breakpoints: {
          320: {
            slidesPerView: 1,
            spaceBetween: 10,
          },
          768: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 30,
          },
        },
      });
    }
  } else {
  }

  const products = await productsInstance.getProducts();
  if (products && Array.isArray(products)) {
    window.allProducts = products;
    await renderAllTabs();
  } else {
  }
});

function findProductBySlugOrId(slugOrId) {
  if (!slugOrId) return null;
  let product = window.allProducts?.find((p) => p.slug === slugOrId);
  if (!product) {
    product = window.allProducts?.find((p) => p.id == slugOrId);
  }
  return product;
}

function renderPriceHTML(product) {
  if (!product) return "";
  const hasDiscount =
    typeof product.discountedPrice === "number" &&
    product.discountedPrice < product.price;
  let html = "";
  if (hasDiscount) {
    html +=
      '<span class="discounted-price">$' +
      product.discountedPrice.toFixed(2) +
      "</span>";
    html +=
      '<span class="original-price" style="text-decoration:line-through;margin-left:8px;color:#888">$' +
      product.price.toFixed(2) +
      "</span>";
  } else {
    html +=
      '<span class="original-price">$' + product.price.toFixed(2) + "</span>";
  }
  return html;
}

function renderDiscountBadge(product) {
  if (!product) return "";
  const hasDiscount =
    typeof product.discountedPrice === "number" &&
    product.discountedPrice < product.price;
  if (hasDiscount) {
    const percent = Math.round(
      100 - (product.discountedPrice / product.price) * 100
    );
    return '<div class="discount-badge">' + percent + "% OFF</div>";
  }
  return "";
}

function updateAllPriceElements() {
  document.querySelectorAll(".price").forEach(function (el) {
    let product = null;
    const slug = el.getAttribute("data-product-slug");
    const id = el.getAttribute("data-product-id");
    if (slug || id) {
      product = findProductBySlugOrId(slug || id);
    }
    if (!product && window.currentProduct) {
      product = window.currentProduct;
    }
    if (!product) {
      let card = el.closest(".shop-card, .product");
      if (card) {
        let slug =
          card.getAttribute("data-slug") || card.getAttribute("data-index");
        product = findProductBySlugOrId(slug);
      }
    }
    if (!product) return;
    el.querySelectorAll(".original-price, .discounted-price").forEach((n) =>
      n.remove()
    );
    const hasDiscount =
      typeof product.discountedPrice === "number" &&
      product.discountedPrice < product.price;
    let badge = el.querySelector(".discount-badge");
    if (!hasDiscount && badge) {
      badge.remove();
    }

    const priceHTML = document.createElement("span");
    priceHTML.innerHTML = renderPriceHTML(product);
    badge = el.querySelector(".discount-badge");
    if (badge) {
      Array.from(priceHTML.childNodes).forEach((node) =>
        el.insertBefore(node, badge)
      );
    } else {
      Array.from(priceHTML.childNodes).forEach((node) => el.appendChild(node));
    }
  });
  document.querySelectorAll(".discount-badge").forEach(function (el) {
    let product = null;
    const slug = el.getAttribute("data-product-slug");
    const id = el.getAttribute("data-product-id");
    if (slug || id) {
      product = findProductBySlugOrId(slug || id);
    }
    if (!product && window.currentProduct) {
      product = window.currentProduct;
    }
    if (!product) {
      let card = el.closest(".shop-card, .product");
      if (card) {
        let slug =
          card.getAttribute("data-slug") || card.getAttribute("data-index");
        product = findProductBySlugOrId(slug);
      }
    }
    if (!product) return;
    const hasDiscount =
      typeof product.discountedPrice === "number" &&
      product.discountedPrice < product.price;
    if (hasDiscount) {
      const percent = Math.round(
        100 - (product.discountedPrice / product.price) * 100
      );
      el.textContent = percent + "% OFF";
    } else {
      el.remove();
    }
  });
}

window.updateAllPriceElements = updateAllPriceElements;

if (!window.allProducts) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("product");
    const id = urlParams.get("id");
    if (slug && window.allProducts) {
      window.currentProduct = window.allProducts.find((p) => p.slug === slug);
    } else if (id && window.allProducts) {
      window.currentProduct = window.allProducts.find((p) => p.id == id);
    }
  } catch (e) {}
}

updateAllPriceElements();

// Tabs
const tabsMap = {
  "men-fashion": document.querySelector("#men-fashion .products__grid"),
  "women-fashion": document.querySelector("#women-fashion .products__grid"),
  "women-accessories": document.querySelector(
    "#women-accessories .products__grid"
  ),
  "men-accessories": document.querySelector("#men-accessories .products__grid"),
  "discount-deals": document.querySelector("#discount-deals .products__grid"),
};

function createProductCardHTML(product) {
  const imageUrl =
    product.images?.[0] ||
    product.imageUrl ||
    "https://via.placeholder.com/150";
  const ratingStars = `
    <div class="product-card__rating">
      ${[...Array(5)]
        .map(
          (_, i) => `
        <span class="product-card__star">
          ${
            i < Math.round(product.ratings?.average || 4)
              ? `<img src="/assets/icon/star2.svg" alt="" />`
              : `<svg class="icon"><use href="assets/icon/sprite.svg#Star"></use></svg>`
          }
        </span>`
        )
        .join("")}
    </div>`;

  return `
    <article class="product-card">
      <a href="single-product.html?product=${
        product.slug
      }" class="product-card__link">
        <img src="${imageUrl}" alt="${
    product.title
  }" class="product-card__image" />
        <div class="product-card__content">
          <div class="product-card__header">
            <h3 class="product-card__title">${product.title}</h3>
            <p class="product-card__brand">${product.brand || ""}</p>
          </div>
          ${ratingStars}
        </div>
        <p class="product-card__reviews">(${
          product.ratings?.count || "0"
        }) Customer Reviews</p>
        <footer class="product-card__footer">
          <div class="price" data-product-id="${product.id}"></div>
          <span class="product-card__status">${product.status || ""}</span>
        </footer>
      </a>
    </article>`;
}

async function renderAllTabs() {
  const productsInstance = new Products();
  const products = await productsInstance.getProducts();
  if (!products || !Array.isArray(products)) {
    return;
  }

  const isMobile = window.innerWidth < 768;
  const maxPerTab = isMobile ? 3 : 6;

  Object.entries(tabsMap).forEach(([key, container]) => {
    if (container) {
      container.innerHTML = "";
    } else {
    }
  });

  const counts = {
    "men-fashion": 0,
    "women-fashion": 0,
    "women-accessories": 0,
    "men-accessories": 0,
    "discount-deals": 0,
  };

  products.forEach((product) => {
    const category = product.category;

    if (tabsMap[category] && counts[category] < maxPerTab) {
      tabsMap[category].insertAdjacentHTML(
        "beforeend",
        createProductCardHTML(product)
      );
      counts[category]++;
    }

    if (
      product.discountedPrice &&
      product.discountedPrice < product.price &&
      tabsMap["discount-deals"] &&
      counts["discount-deals"] < maxPerTab
    ) {
      tabsMap["discount-deals"].insertAdjacentHTML(
        "beforeend",
        createProductCardHTML(product)
      );
      counts["discount-deals"]++;
    }
  });

  if (typeof updateAllPriceElements === "function") {
    updateAllPriceElements();
  }
}

let lastIsMobile = window.innerWidth < 768;

window.addEventListener("resize", async () => {
  const isMobile = window.innerWidth < 768;
  if (isMobile !== lastIsMobile && window.allProducts) {
    await renderAllTabs();
    lastIsMobile = isMobile;
  }
});

// HEADER AND FOOTER
const headerContent = `
<nav class="nav">
  <div class="nav__start">
    <div class="nav__brand">
      <div class="nav__toggler">
        <div class="bar bar-one"></div>
        <div class="bar bar-tow"></div>
        <div class="bar bar-three"></div>
      </div>
      <a href="index.html" class="nav__logo"><p>FASCO</p></a>
    </div>
    <div class="nav__icons2">
      <span>
        <svg class="icon">
          <use href="assets/icon/sprite.svg#Search"></use>
        </svg>
      </span>
      <div class="cart-btn">
        <span class="nav-icon">
          <span>
            <svg class="icon">
              <use href="assets/icon/sprite.svg#Bag 2"></use>
            </svg>
          </span>
        </span>
        <div class="cart-items">0</div>
      </div>
      <span>
        <a href="Signup.html">
          <svg class="icon">
            <use href="assets/icon/sprite.svg#Profile"></use>
          </svg>
        </a>
      </span>
    </div>
  </div>
  <ul class="list nav__list">
    <li class="nav__item"><a href="Shop.html">Shop</a></li>
    <li class="nav__item"><a href="">On Sale</a></li>
    <li class="nav__item"><a href="">New Arrivals</a></li>
    <li class="nav__item"><a href="">Brands</a></li>
  </ul>
  <div class="input-wrapper">
    <input type="search" id="search" placeholder=" " />
    <label for="search">
      <span>
        <svg class="icon">
          <use href="assets/icon/sprite.svg#Search"></use>
        </svg>
      </span>
      Search for products...
    </label>
    <div class="search-result">

    </div>
  </div>
  <div class="nav__icons">
    <div class="cart-btn">
      <span class="nav-icon">
        <span>
          <svg class="icon">
            <use href="/assets/icon/sprite.svg#Bag 2"></use>
          </svg>
        </span>
      </span>
      <div class="cart-items">0</div>
    </div>
    <span>
      <a href="Signup.html">
        <svg class="icon">
          <use href="assets/icon/sprite.svg#Profile"></use>
        </svg>
      </a>
    </span>
  </div>
</nav>
<div class="cart-center">
  <div class="backdrop"></div>
  <div class="cart">
    <h3 class="cart-title">Shopping Cart</h3>
    <div class="cart-content"></div>
    <div class="cart-footer">
      <span class="cart-total">total price : 90 $</span>
      <button class="btn clear-cart">clear cart</button>
      <button class="btn cart-item-confirm"><a href="/Checkout.html">Checkout</a></button>
    </div>
  </div>
</div>

`;

const footerContent = `
      <div class="footer__main">
        <a href="index.html" class="footer__logo nav__logo"><p>FASCO</p></a>
        <nav class="footer__nav">
          <ul class="footer__list">
            <li class="footer__item">Support Center</li>
            <li class="footer__item">Invoicing</li>
            <li class="footer__item">Contract</li>
            <li class="footer__item">Careers</li>
            <li class="footer__item">Blog</li>
            <li class="footer__item">FAQ,s</li>
          </ul>
        </nav>
      </div>
      <p class="footer__copyright">
        Copyright © 2022 Sia . All Rights Reserved.
      </p>
`;

function loadComponents() {
  const header = document.querySelector(".main-header");
  const footer = document.querySelector(".footer");
  if (header) {
    header.innerHTML = headerContent;
    initializeNavbar();
  } else {
  }
  if (footer) {
    footer.innerHTML = footerContent;
  } else {
  }
}

function initializeNavbar() {
  const toggler = document.querySelector(".nav__toggler");
  const navbar = document.querySelector(".nav");

  if (toggler && navbar) {
    toggler.addEventListener("click", () => {
      navbar.classList.toggle("nav__expanded");
    });
  } else {
  }
}

// Checkout
function populateCheckoutCart(cart) {
  const checkoutCart = document.querySelector(".checkout__cart");
  if (!checkoutCart) {
    return;
  }

  checkoutCart.innerHTML = "";

  if (!cart || cart.length === 0) {
    checkoutCart.innerHTML =
      '<p>Your cart is empty. <a href="/Shop.html">Visit our shop</a> to explore amazing products!</p>';
    return;
  }

  const cartItemsContainer = document.createElement("div");
  cartItemsContainer.classList.add("checkout__cart-items");

  cart.forEach((cartItem) => {
    addCheckoutCartItem(cartItem, cartItemsContainer);
  });

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = 10.0;
  const total = subtotal + shipping;

  const summaryContainer = document.createElement("div");
  summaryContainer.classList.add("checkout__summary");
  summaryContainer.innerHTML = `
    <div class="checkout__discount-container">
      <input type="text" class="checkout__summary-input" placeholder="Discount code" />
      <button class="checkout__summary-btn btn">Apply</button>
    </div>
    <div class="checkout__summary-item">
      <span>Subtotal:</span>
      <span>$ ${subtotal.toFixed(2)}</span>
    </div>
    <div class="checkout__summary-item">
      <span>Shipping:</span>
      <span>$ ${shipping.toFixed(2)}</span>
    </div>
    <div class="checkout__summary-item">
      <span>Total:</span>
      <span>$ ${total.toFixed(2)}</span>
    </div>
  `;

  checkoutCart.appendChild(cartItemsContainer);
  checkoutCart.appendChild(summaryContainer);
}

function addCheckoutCartItem(cartItem, container) {
  const imageUrl =
    cartItem.images?.[0] ||
    cartItem.imageUrl ||
    "https://via.placeholder.com/100";

  if (!imageUrl) {
    return;
  }

  const div = document.createElement("div");
  div.classList.add("checkout-cart-item");
  div.dataset.cartItemId = `${cartItem.id}-${
    cartItem.selectedColor || "no-color"
  }-${cartItem.selectedSize || "no-size"}`;

  div.innerHTML = `
    <div class="checkout-cart-item-img-container">
      <img class="checkout-cart-item-img" src="${imageUrl}" alt="${
    cartItem.title
  }" />
      <p class="cart-items">${cartItem.quantity}</p>
    </div>
    <div class="checkout-cart-item-details">
      <h4>${cartItem.title}</h4>
      <p class="checkout-cart-item-color">Color: ${
        cartItem.selectedColorName || "پیش‌فرض"
      }</p>
      <p class="checkout-cart-item-size">Size: ${
        cartItem.selectedSize || "پیش‌فرض"
      }</p>
      <h5>$ ${parseFloat(cartItem.price).toFixed(2)}</h5>
    </div>
  `;

  container.appendChild(div);
}

function setupCheckout() {
  if (document.querySelector(".checkout__cart")) {
    const cart = Storage.getCart();
    populateCheckoutCart(cart);

    document.addEventListener("cartUpdate", () => {
      const updatedCart = Storage.getCart();
      populateCheckoutCart(updatedCart);
    });
  }
}

document.addEventListener("DOMContentLoaded", setupCheckout);

function showModalFunction() {
  if (!cartModal || !backDrop) {
    return;
  }
  backDrop.style.display = "block";
  cartModal.classList.add("open");
}

function closeModalFunction() {
  if (!cartModal || !backDrop) {
    return;
  }
  backDrop.style.display = "none";
  cartModal.classList.remove("open");
}

// FILTERS

// SIZE FILTER
async function renderSizeFilter() {
  const sizeFilter = document.querySelector(".sizes-filter");
  if (!sizeFilter) return;

  try {
    const products = await new Products().getProducts();

    const uniqueSizes = new Set();
    products.forEach((product) => {
      if (Array.isArray(product.sizes)) {
        product.sizes.forEach((size) => uniqueSizes.add(size));
      }
    });

    const sizeOrder = ["S", "M", "L", "XL", "XXL"];
    const sizeArray = Array.from(uniqueSizes).sort((a, b) => {
      return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
    });

    const sizeFilterHTML = `
      ${sizeArray
        .map(
          (size) => `
      <button class="product__size" data-size="${size}">${size}</button>
      `
        )
        .join("")}
    `;

    sizeFilter.insertAdjacentHTML("beforeend", sizeFilterHTML);
  } catch (error) {
    console.error("Error rendering size filter:", error);
  }
}

// COLOR FILTER

async function renderColorFilter() {
  const filterGroups = document.querySelector(".colors-filter");
  if (!filterGroups) return;

  try {
    const products = await new Products().getProducts();

    const uniqueColors = new Set();
    products.forEach((product) => {
      if (Array.isArray(product.colors)) {
        product.colors.forEach((color, index) => {
          const colorName = product.colorNames?.[index] || color;
          uniqueColors.add(JSON.stringify({color, colorName}));
        });
      }
    });

    const colorArray = Array.from(uniqueColors).map((str) => JSON.parse(str));

    const colorFilterHTML = `
      ${colorArray
        .map(
          ({color, colorName}) => `
      <button 
      class="shop-card__color" 
      data-color="${color}" 
      data-color-name="${colorName}" 
      style="background: ${color}" 
      title="${colorName}">
      </button>
      `
        )
        .join("")}
    `;

    filterGroups.insertAdjacentHTML("beforeend", colorFilterHTML);
  } catch (error) {
    console.error("Error rendering color filter:", error);
  }
}

// PRICE FILTER
async function renderPriceFilter() {
  const priceFilter = document.querySelector(".price-filter");
  if (!priceFilter) return;

  try {
    const ranges = [
      {min: 0, max: 50},
      {min: 50, max: 100},
      {min: 100, max: 150},
      {min: 150, max: 200},
      {min: 300, max: 400},
    ];

    const priceFilterHTML = ranges
      .map(
        (range) => `
        <span class="shop__filter-price" data-min="${range.min}" data-max="${range.max}">$${range.min}-$${range.max}</span>
      `
      )
      .join("");

    const title = priceFilter.querySelector(".shop__filter-title");

    const spans = priceFilter.querySelectorAll(".shop__filter-price");
    spans.forEach((span) => span.remove());

    if (title) {
      title.insertAdjacentHTML("afterend", priceFilterHTML);
    } else {
      priceFilter.innerHTML = priceFilterHTML;
    }
  } catch (error) {
    console.error("Error rendering price filter:", error);
  }
}

// BRAND FILTER

async function renderBrandFilter() {
  const brandFilter = document.querySelector(".brands-filter");
  if (!brandFilter) return;

  try {
    const products = await new Products().getProducts();

    const uniqueBrands = new Set();
    products.forEach((product) => {
      if (product.brand) {
        uniqueBrands.add(product.brand);
      }
    });

    const brandArray = Array.from(uniqueBrands).sort();

    const brandFilterHTML = `
      ${brandArray
        .map(
          (brand) => `
      <p class="product__brand" data-brand="${brand}">${brand}</p>
      `
        )
        .join("")}
    `;

    brandFilter.insertAdjacentHTML("beforeend", brandFilterHTML);
  } catch (error) {
    console.error("Error rendering brand filter:", error);
  }
}

// TAGS FILTER
async function renderTagsFilter() {
  const tagsFilter = document.querySelector(".tags-filter");
  if (!tagsFilter) return;

  try {
    const products = await new Products().getProducts();

    const uniqueTags = new Set();
    products.forEach((product) => {
      if (Array.isArray(product.tags)) {
        product.tags.forEach((tag) => uniqueTags.add(tag));
      }
    });

    const tagsArray = Array.from(uniqueTags).sort();

    const tagsFilterHTML = `
      ${tagsArray
        .map(
          (tag) => `
      <p class="shop__filter-tag" data-tag="${tag}">${tag}</p>
      `
        )
        .join("")}
    `;

    tagsFilter.insertAdjacentHTML("beforeend", tagsFilterHTML);
  } catch (error) {
    console.error("Error rendering tags filter:", error);
  }
}

// COLLECTIONS FILTER
async function renderCollectionsFilter() {
  const collectionsFilter = document.querySelector(".collections-filter");
  if (!collectionsFilter) return;

  try {
    const products = await new Products().getProducts();

    const uniqueCollections = new Set(["All products"]);
    products.forEach((product) => {
      if (product.collections) {
        uniqueCollections.add(product.collections);
      }
    });

    const collectionsHTML = Array.from(uniqueCollections)
      .map(
        (collection) => `
      <p class="shop__filter-collection" data-collection="${collection}">${collection}</p>
    `
      )
      .join("");

    collectionsFilter.innerHTML = collectionsHTML;

    collectionsFilter.addEventListener("click", (e) => {
      if (e.target.matches(".shop__filter-collection")) {
        const allCollections = document.querySelectorAll(
          ".shop__filter-collection"
        );
        allCollections.forEach((el) => el.classList.remove("active"));

        e.target.classList.add("active");
        const selectedCollection = e.target.dataset.collection;

        if (selectedCollection === "All products") {
          updateProductDisplay(products);
        } else {
          const filteredProducts = products.filter(
            (product) => product.collections === selectedCollection
          );
          updateProductDisplay(filteredProducts);
        }
      }
    });
  } catch (error) {
    console.error("Error rendering collections filter:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderSizeFilter();
  renderColorFilter();
  renderPriceFilter();
  renderBrandFilter();
  renderTagsFilter();
  renderCollectionsFilter();
  renderCollectionsFilter();
});

// SEARCH

let products = [];
let filters = {
  search: "",
};

async function initializeProducts() {
  const productsInstance = new Products();
  products = await productsInstance.getProducts();
}

function renderProducts(products, filters) {
  const searchResults = document.querySelector(".search-result");
  if (!searchResults) return;

  searchResults.innerHTML = "";

  if (!filters.search.trim()) {
    searchResults.style.display = "none";
    return;
  }

  const filteredProducts = products.filter((p) => {
    return p.title.toLowerCase().includes(filters.search.toLowerCase());
  });

  if (filteredProducts.length === 0) {
    searchResults.style.display = "flex";
    searchResults.innerHTML = `<p class="no-results">No products found</p>`;
    return;
  }

  searchResults.style.display = "flex";

  filteredProducts.forEach((item) => {
    const productsResult = document.createElement("a");
    productsResult.classList.add("search-result__product");
    productsResult.href = `single-product.html?product=${item.slug}`;
    productsResult.innerHTML = `
      <img src="${
        item.images?.[0] ||
        item.imageUrl ||
        "/assets/images/products/placeholder.jpg"
      }" alt="${item.title}" />
      <h3>${item.title}</h3>
    `;
    searchResults.appendChild(productsResult);
  });
}

function initializeSearch() {
  const searchInput = document.querySelector("#search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filters.search = e.target.value;
      renderProducts(products, filters);
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await initializeProducts();
  initializeSearch();
});

let activeFilters = {
  sizes: new Set(),
  colors: new Set(),
  priceRanges: new Set(),
  brands: new Set(),
  tags: new Set(),
  collections: new Set(),
};

function createSelectedFiltersHTML() {
  const container = document.querySelector(".selected-filters");
  if (!container) return;

  let html = "";

  const hasActiveFilters =
    activeFilters.sizes.size > 0 ||
    activeFilters.colors.size > 0 ||
    activeFilters.priceRanges.size > 0 ||
    activeFilters.brands.size > 0 ||
    activeFilters.tags.size > 0 ||
    activeFilters.collections.size > 0;

  if (!hasActiveFilters) {
    container.style.display = "none";
    return;
  }

  activeFilters.sizes.forEach((size) => {
    html += `
      <div class="selected-filter" data-type="size" data-value="${size}">
        <span>Size: ${size}</span>
        <button class="remove-filter">&times;</button>
      </div>
    `;
  });

  activeFilters.colors.forEach((color) => {
    const [colorValue, colorName] = color.split("|");
    html += `
      <div class="selected-filter" data-type="color" data-value="${color}">
        <span>Color: ${colorName || colorValue}</span>
        <button class="remove-filter">&times;</button>
      </div>
    `;
  });

  activeFilters.priceRanges.forEach((range) => {
    const [min, max] = range.split("-");
    html += `
      <div class="selected-filter" data-type="price" data-value="${range}">
        <span>Price: $${min}-$${max}</span>
        <button class="remove-filter">&times;</button>
      </div>
    `;
  });

  activeFilters.brands.forEach((brand) => {
    html += `
      <div class="selected-filter" data-type="brand" data-value="${brand}">
        <span>Brand: ${brand}</span>
        <button class="remove-filter">&times;</button>
      </div>
    `;
  });

  activeFilters.tags.forEach((tag) => {
    html += `
      <div class="selected-filter" data-type="tag" data-value="${tag}">
        <span>Tag: ${tag}</span>
        <button class="remove-filter">&times;</button>
      </div>
    `;
  });

  activeFilters.collections.forEach((collection) => {
    html += `
      <div class="selected-filter" data-type="collection" data-value="${collection}">
        <span>Collection: ${collection}</span>
        <button class="remove-filter">&times;</button>
      </div>
    `;
  });

  html += `
    <button class="selected-filter clear-all-filters">
      <span>Clear All</span>
      <button class="remove-filter">&times;</button>
    </button>
  `;

  container.innerHTML = html;
  container.style.display = "flex";
}

function updateProductDisplay(filteredProducts) {
  const productsGrid = document.querySelector(".shop-grid");
  if (!productsGrid) return;

  if (filteredProducts.length === 0) {
    productsGrid.innerHTML =
      '<p class="no-results">No products match your filters</p>';
    return;
  }

  // Apply sorting
  const sortSelect = document.querySelector(".sort-select");
  if (sortSelect) {
    const sortBy = sortSelect.value;
    filteredProducts = [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "price-low":
          return (
            (a.discountedPrice || a.price) - (b.discountedPrice || b.price)
          );
        case "price-high":
          return (
            (b.discountedPrice || b.price) - (a.discountedPrice || a.price)
          );
        case "best-selling":
          return b.salesCount - a.salesCount;
        default:
          return 0;
      }
    });
  }

  const ui = new UI();
  const currentPage = 1;
  const itemsPerPage = 9;
  const paginatedProducts = ui.paginateProducts(
    filteredProducts,
    currentPage,
    itemsPerPage
  );
  productsGrid.innerHTML = paginatedProducts
    .map((product) => {
      const imageUrl =
        product.images?.[0] ||
        product.imageUrl ||
        "https://via.placeholder.com/150";
      const colorsHTML = product.colors
        ? product.colors
            .map(
              (color, index) =>
                `<button 
        class="shop-card__color" 
        data-color="${color}"
        data-color-name="${product.colorNames?.[index] || color}"
        style="background: ${color}" 
        title="${product.colorNames?.[index] || color}">
      </button>`
            )
            .join("")
        : "";

      return `
      <div class="shop-card" data-index="${product.id}" data-slug="${
        product.slug
      }">
        <a href="single-product.html?product=${product.slug}">
          <img src="${imageUrl}" class="shop-card__image" alt="${
        product.title
      }">
        </a>
        <h3 class="shop-card__title">${product.title}</h3>
        <div class="price" data-product-id="${product.id}">
          ${renderPriceHTML(product)}
        </div>
        <div class="shop-card__colors">
          ${colorsHTML}
        </div>
      </div>
    `;
    })
    .join("");

  ui.renderPaginationControls(filteredProducts, currentPage, itemsPerPage);
  ui.getAddToCart();
  updateAllPriceElements();
}

function filterProducts() {
  let filteredProducts = products;

  // Filter by size
  if (activeFilters.sizes.size > 0) {
    filteredProducts = filteredProducts.filter((product) =>
      product.sizes?.some((size) => activeFilters.sizes.has(size))
    );
  }

  // Filter by color
  if (activeFilters.colors.size > 0) {
    filteredProducts = filteredProducts.filter((product) =>
      product.colors?.some((color) =>
        Array.from(activeFilters.colors).some(
          (activeColor) => activeColor.split("|")[0] === color
        )
      )
    );
  }

  // Filter by price range
  if (activeFilters.priceRanges.size > 0) {
    filteredProducts = filteredProducts.filter((product) => {
      const price = product.discountedPrice || product.price;
      return Array.from(activeFilters.priceRanges).some((range) => {
        const [min, max] = range.split("-").map(Number);
        return price >= min && price <= max;
      });
    });
  }

  // Filter by brand
  if (activeFilters.brands.size > 0) {
    filteredProducts = filteredProducts.filter((product) =>
      activeFilters.brands.has(product.brand)
    );
  }

  // Filter by tags
  if (activeFilters.tags.size > 0) {
    filteredProducts = filteredProducts.filter((product) =>
      product.tags?.some((tag) => activeFilters.tags.has(tag))
    );
  }

  // Filter by collections
  if (activeFilters.collections.size > 0) {
    filteredProducts = filteredProducts.filter((product) =>
      activeFilters.collections.has(product.collections)
    );
  }

  updateProductDisplay(filteredProducts);
  createSelectedFiltersHTML();
}

function initializeFilters() {
  // Sort filter change handler
  document.querySelector(".sort-select")?.addEventListener("change", () => {
    filterProducts();
  });

  // Size filter click handlers
  document.querySelector(".sizes-filter")?.addEventListener("click", (e) => {
    if (e.target.matches(".product__size")) {
      e.target.classList.toggle("active");
      const size = e.target.dataset.size;
      if (activeFilters.sizes.has(size)) {
        activeFilters.sizes.delete(size);
      } else {
        activeFilters.sizes.add(size);
      }
      filterProducts();
    }
  });

  // Color filter click handlers
  document.querySelector(".colors-filter")?.addEventListener("click", (e) => {
    if (e.target.matches(".shop-card__color")) {
      e.target.classList.toggle("active");
      const color = `${e.target.dataset.color}|${e.target.dataset.colorName}`;
      if (activeFilters.colors.has(color)) {
        activeFilters.colors.delete(color);
      } else {
        activeFilters.colors.add(color);
      }
      filterProducts();
    }
  });

  // Price filter click handlers
  document.querySelector(".price-filter")?.addEventListener("click", (e) => {
    if (e.target.matches(".shop__filter-price")) {
      e.target.classList.toggle("active");
      const range = `${e.target.dataset.min}-${e.target.dataset.max}`;
      if (activeFilters.priceRanges.has(range)) {
        activeFilters.priceRanges.delete(range);
      } else {
        activeFilters.priceRanges.add(range);
      }
      filterProducts();
    }
  });

  // Brand filter click handlers
  document.querySelector(".brands-filter")?.addEventListener("click", (e) => {
    if (e.target.matches(".product__brand")) {
      e.target.classList.toggle("active");
      const brand = e.target.dataset.brand;
      if (activeFilters.brands.has(brand)) {
        activeFilters.brands.delete(brand);
      } else {
        activeFilters.brands.add(brand);
      }
      filterProducts();
    }
  });

  // Tags filter click handlers
  document.querySelector(".tags-filter")?.addEventListener("click", (e) => {
    if (e.target.matches(".shop__filter-tag")) {
      e.target.classList.toggle("active");
      const tag = e.target.dataset.tag;
      if (activeFilters.tags.has(tag)) {
        activeFilters.tags.delete(tag);
      } else {
        activeFilters.tags.add(tag);
      }
      filterProducts();
    }
  });

  // Collections filter click handlers
  document
    .querySelector(".collections-filter")
    ?.addEventListener("click", (e) => {
      if (e.target.matches(".shop__filter-collection")) {
        e.target.classList.toggle("active");
        const collection = e.target.dataset.collection;
        if (activeFilters.collections.has(collection)) {
          activeFilters.collections.delete(collection);
        } else {
          activeFilters.collections.add(collection);
        }
        filterProducts();
      }
    });

  // Remove filter

  document
    .querySelector(".selected-filters")
    ?.addEventListener("click", (e) => {
      if (e.target.closest(".clear-all-filters")) {
        activeFilters.sizes.clear();
        activeFilters.colors.clear();
        activeFilters.priceRanges.clear();
        activeFilters.brands.clear();
        activeFilters.tags.clear();
        activeFilters.collections.clear();

        document
          .querySelectorAll(".active")
          .forEach((el) => el.classList.remove("active"));

        filterProducts();
        return;
      }
      if (e.target.matches(".remove-filter")) {
        const filter = e.target.closest(".selected-filter");
        const type = filter.dataset.type;
        const value = filter.dataset.value;

        switch (type) {
          case "size":
            activeFilters.sizes.delete(value);
            document
              .querySelector(`.product__size[data-size="${value}"]`)
              ?.classList.remove("active");
            break;
          case "color":
            activeFilters.colors.delete(value);
            const colorValue = value.split("|")[0];
            document
              .querySelector(`.shop-card__color[data-color="${colorValue}"]`)
              ?.classList.remove("active");
            break;
          case "price":
            activeFilters.priceRanges.delete(value);
            const [min, max] = value.split("-");
            document
              .querySelector(
                `.shop__filter-price[data-min="${min}"][data-max="${max}"]`
              )
              ?.classList.remove("active");
            break;
          case "brand":
            activeFilters.brands.delete(value);
            document
              .querySelector(`.product__brand[data-brand="${value}"]`)
              ?.classList.remove("active");
            break;
          case "tag":
            activeFilters.tags.delete(value);
            document
              .querySelector(`.shop__filter-tag[data-tag="${value}"]`)
              ?.classList.remove("active");
            break;
          case "collection":
            activeFilters.collections.delete(value);
            document
              .querySelector(
                `.shop__filter-collection[data-collection="${value}"]`
              )
              ?.classList.remove("active");
            break;
        }

        filterProducts();
      }
    });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeFilters();
});
