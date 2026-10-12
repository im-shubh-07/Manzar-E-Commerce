/* ═══════════════════════════════════════════════
   MANZAR STEEL INDUSTRIES — Cart Manager
   Vanilla JS · localStorage-backed cart
═══════════════════════════════════════════════ */

let cart = JSON.parse(localStorage.getItem('manzar_cart') || '{}');
// cart = { productId: { id, name, price, image, quantity } }

// ─── Save to localStorage ──────────────────────
function saveCart() {
  localStorage.setItem('manzar_cart', JSON.stringify(cart));
  updateBadge();
  renderCartItems();
}

// ─── Badge Count ───────────────────────────────
function updateBadge() {
  const total = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  badge.textContent = total;
  badge.classList.toggle('d-none', total === 0);
}

// ─── Add to Cart ───────────────────────────────
function addToCart(id, name, price, image) {
  if (cart[id]) {
    cart[id].quantity += 1;
  } else {
    cart[id] = { id, name, price: Number(price), image, quantity: 1 };
  }
  saveCart();

  // Open cart offcanvas
  const offcanvasEl = document.getElementById('cartOffcanvas');
  if (offcanvasEl) {
    const oc = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
    oc.show();
  }
}

// ─── Change Quantity ───────────────────────────
function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].quantity += delta;
  if (cart[id].quantity <= 0) delete cart[id];
  saveCart();
}

// ─── Remove Item ───────────────────────────────
function removeItem(id) {
  delete cart[id];
  saveCart();
}

// ─── Render Cart Items ─────────────────────────
function renderCartItems() {
  const container = document.getElementById('cartItems');
  const footer    = document.getElementById('cartFooter');
  const empty     = document.getElementById('cartEmpty');
  const totalEl   = document.getElementById('cartTotal');
  if (!container) return;

  const items = Object.values(cart);

  if (items.length === 0) {
    container.innerHTML = '';
    footer?.classList.add('d-none');
    empty?.classList.remove('d-none');
    return;
  }

  empty?.classList.add('d-none');
  footer?.classList.remove('d-none');

  let total = 0;
  container.innerHTML = items.map(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
        <div class="flex-grow-1 min-w-0">
          <p class="fw-semibold font-serif manzar-green mb-0" style="font-size:.95rem">${item.name}</p>
          <p class="text-muted small mb-2">₹${item.price.toLocaleString('en-IN')}</p>
          <div class="d-flex align-items-center justify-content-between">
            <div class="qty-control">
              <button class="qty-btn" onclick="changeQty('${item.id}', -1)" aria-label="Decrease quantity">
                <i class="bi bi-dash" style="font-size:.75rem"></i>
              </button>
              <span style="font-size:.85rem;font-weight:600;min-width:1rem;text-align:center">${item.quantity}</span>
              <button class="qty-btn" onclick="changeQty('${item.id}', 1)" aria-label="Increase quantity">
                <i class="bi bi-plus" style="font-size:.75rem"></i>
              </button>
            </div>
            <span class="fw-semibold small">₹${subtotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <button class="btn btn-link p-0 text-muted" onclick="removeItem('${item.id}')" aria-label="Remove ${item.name}">
          <i class="bi bi-x-lg" style="font-size:.85rem"></i>
        </button>
      </div>`;
  }).join('');

  if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
}

// ─── Prepare cart for form submission ──────────
function prepareCart() {
  const items = Object.values(cart).map(item => ({
    productId: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
  const input = document.getElementById('cartProductsInput');
  if (input) input.value = JSON.stringify(items);
  return true;
}

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Bind all "Add to Bag" buttons
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(
        btn.dataset.id,
        btn.dataset.name,
        btn.dataset.price,
        btn.dataset.image,
      );
    });
  });

  updateBadge();
  renderCartItems();

  // Clear cart after enquiry form submits
  const form = document.getElementById('enquiryForm');
  if (form) {
    form.addEventListener('submit', () => {
      setTimeout(() => {
        localStorage.removeItem('manzar_cart');
      }, 500);
    });
  }
});
