'use strict';

const STORAGE_KEY = 'craveClubApp_v1';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const money = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const defaultState = {
  menu: [], tables: ['Table 1', 'Table 2', 'Table 3', 'Table 4'],
  orders: [], expenses: [], stock: [], contacts: []
};
let state = loadState();
let cart = {};
let selectedImageData = '';
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') return { ...structuredClone(defaultState), ...saved };
  } catch (error) { console.warn('Could not load saved app data.', error); }
  return structuredClone(defaultState);
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { alert('Your browser storage may be full. Try using smaller food images and remove unused images.'); }
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}
function safeText(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}
function openScreen(screenId) {
  $$('.screen').forEach(screen => screen.classList.toggle('active', screen.id === screenId));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (screenId === 'menuScreen') renderMenu();
  if (screenId === 'ordersScreen') renderOrders();
  if (screenId === 'moneyScreen') renderMoney();
  if (screenId === 'storageScreen') renderStock();
  if (screenId === 'emergencyScreen') renderContacts();
}
function openDialog(id) { const dialog = document.getElementById(id); if (dialog) dialog.showModal(); }
function closeDialog(id) { const dialog = document.getElementById(id); if (dialog) dialog.close(); }
function imageMarkup(item, className = 'food-image') {
  return item.image ? `<img class="${className}" src="${item.image}" alt="${safeText(item.name)}" loading="lazy">` : `<div class="food-image-placeholder" aria-label="No image added">🍽️</div>`;
}
function isToday(dateString) { return dateString === todayKey(); }

// Navigation
$$('[data-screen]').forEach(button => button.addEventListener('click', () => openScreen(button.dataset.screen)));
$('#brandHome').addEventListener('click', () => openScreen('homeScreen'));
$('#homeButton').addEventListener('click', () => openScreen('homeScreen'));
$$('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.close)));

// Menu list
$('#addMenuOpen').addEventListener('click', () => openItemDialog());
function openItemDialog(item = null) {
  $('#itemForm').reset(); $('#itemId').value = item?.id || '';
  $('#itemDialogTitle').textContent = item ? 'Edit menu item' : 'Add menu item';
  selectedImageData = item?.image || '';
  showImagePreview(selectedImageData);
  openDialog('itemDialog');
}
function showImagePreview(src) {
  $('#imagePreviewWrap').classList.toggle('hidden', !src);
  $('#imagePreview').src = src || '';
}
$('#itemImage').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Please choose an image file.'); return; }
  try {
    selectedImageData = await resizeImage(file, 720, 0.78);
    showImagePreview(selectedImageData);
  } catch (error) { toast('Could not read that image. Try another one.'); }
});
$('#removeImageButton').addEventListener('click', () => { selectedImageData = ''; $('#itemImage').value = ''; showImagePreview(''); });
function resizeImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image(); img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
$('#itemForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const id = $('#itemId').value;
  const name = $('#itemName').value.trim();
  const price = Number($('#itemPrice').value);
  if (!name || !Number.isFinite(price) || price < 0) return toast('Enter a food name and valid price.');
  const previous = state.menu.find(item => item.id === id);
  const item = { id: id || uid(), name, price, image: selectedImageData || '', createdAt: previous?.createdAt || new Date().toISOString() };
  if (id) state.menu = state.menu.map(old => old.id === id ? item : old); else state.menu.push(item);
  saveState(); closeDialog('itemDialog'); renderMenu(); renderOrderFood(); toast(id ? 'Menu item updated ♡' : 'Menu item added ♡');
});
function renderMenu() {
  const grid = $('#menuGrid'); grid.innerHTML = state.menu.map(item => `
    <article class="food-card">${imageMarkup(item)}<div class="food-info"><div class="food-name">${safeText(item.name)}</div><div class="food-bottom"><span class="food-price">${money(item.price)}</span><div class="item-actions"><button class="mini-button" data-edit-menu="${item.id}">Edit</button><button class="trash-button" data-delete-menu="${item.id}" aria-label="Delete ${safeText(item.name)}" title="Delete item">🗑️</button></div></div></div></article>`).join('');
  $('#menuEmpty').classList.toggle('show', state.menu.length === 0);
  $$('[data-edit-menu]').forEach(button => button.addEventListener('click', () => openItemDialog(state.menu.find(item => item.id === button.dataset.editMenu))));
  $$('[data-delete-menu]').forEach(button => button.addEventListener('click', () => {
    const item = state.menu.find(entry => entry.id === button.dataset.deleteMenu);
    if (!item || !confirm(`Delete “${item.name}” from the menu?`)) return;
    state.menu = state.menu.filter(entry => entry.id !== item.id); delete cart[item.id]; saveState(); renderMenu(); renderOrderFood(); renderCart(); toast('Menu item deleted.');
  }));
}

// Orders and tables
$('#addTableButton').addEventListener('click', () => { $('#tableForm').reset(); openDialog('tableDialog'); });
$('#tableForm').addEventListener('submit', (event) => {
  event.preventDefault(); const name = $('#tableName').value.trim();
  if (!name) return;
  if (state.tables.some(table => table.toLowerCase() === name.toLowerCase())) return toast('That table already exists.');
  state.tables.push(name); saveState(); renderTableSelect(name); closeDialog('tableDialog'); toast('Table added.');
});
function renderTableSelect(selected = '') {
  const select = $('#tableSelect'); const previous = selected || select.value;
  select.innerHTML = state.tables.map(table => `<option value="${safeText(table)}">${safeText(table)}</option>`).join('');
  if (previous && state.tables.includes(previous)) select.value = previous;
}
function renderOrderFood() {
  const grid = $('#orderFoodGrid'); grid.innerHTML = state.menu.map(item => `<button type="button" class="order-food-button" data-add-cart="${item.id}">${imageMarkup(item, 'order-food-image')}<div class="order-food-info"><strong>${safeText(item.name)}</strong><span>${money(item.price)}</span></div></button>`).join('');
  $('#orderMenuCount').textContent = `${state.menu.length} item${state.menu.length === 1 ? '' : 's'}`;
  $('#orderMenuEmpty').style.display = state.menu.length ? 'none' : 'block';
  $$('[data-add-cart]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.addCart; cart[id] = (cart[id] || 0) + 1; renderCart();
  }));
}
function renderCart() {
  const entries = Object.entries(cart).filter(([id, qty]) => qty > 0 && state.menu.some(item => item.id === id));
  const container = $('#cartItems');
  if (!entries.length) container.innerHTML = '<p class="muted">Choose food to start an order.</p>';
  else container.innerHTML = entries.map(([id, qty]) => {
    const item = state.menu.find(food => food.id === id);
    return `<div class="cart-row"><div><div class="cart-row-name">${safeText(item.name)}</div><div class="cart-row-price">${money(item.price)} each · ${money(item.price * qty)}</div></div><div class="quantity-controls"><button type="button" data-cart-minus="${id}" aria-label="Decrease">−</button><span>${qty}</span><button type="button" data-cart-plus="${id}" aria-label="Increase">＋</button></div></div>`;
  }).join('');
  const total = entries.reduce((sum, [id, qty]) => sum + state.menu.find(item => item.id === id).price * qty, 0);
  $('#cartTotal').textContent = money(total);
  $$('[data-cart-minus]').forEach(button => button.addEventListener('click', () => { const id = button.dataset.cartMinus; cart[id]--; if (cart[id] <= 0) delete cart[id]; renderCart(); }));
  $$('[data-cart-plus]').forEach(button => button.addEventListener('click', () => { const id = button.dataset.cartPlus; cart[id]++; renderCart(); }));
}
$('#saveOrderButton').addEventListener('click', () => {
  const entries = Object.entries(cart).filter(([id, qty]) => qty > 0 && state.menu.some(item => item.id === id));
  if (!entries.length) return toast('Choose at least one food item.');
  if (!state.tables.length) return toast('Add a table first.');
  const items = entries.map(([id, qty]) => { const item = state.menu.find(food => food.id === id); return { id, name: item.name, price: item.price, qty, lineTotal: item.price * qty }; });
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  state.orders.push({ id: uid(), number: state.orders.length + 1, table: $('#tableSelect').value || state.tables[0], items, total, date: todayKey(), createdAt: new Date().toISOString() });
  cart = {}; saveState(); renderCart(); renderOrders(); toast('Order saved ♡');
});
function orderMarkup(order) {
  const itemSummary = order.items.map(item => `${item.qty} × ${safeText(item.name)}`).join(', ');
  return `<div class="order-summary"><div class="order-summary-details"><strong>${safeText(order.table)} · ${new Date(order.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong><small>${itemSummary}</small></div><div class="order-history-actions"><span class="summary-price">${money(order.total)}</span><button type="button" class="trash-button" data-delete-order="${order.id}" aria-label="Delete order" title="Delete order">🗑️</button></div></div>`;
}
function renderOrders() {
  renderTableSelect(); renderOrderFood(); renderCart();
  const orders = state.orders.filter(order => isToday(order.date)).slice().reverse();
  $('#ordersTodayCount').textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
  $('#todayOrdersList').innerHTML = orders.length ? orders.map(orderMarkup).join('') : '<p class="empty-inline">No orders saved today.</p>';
  bindOrderDeleteButtons();
}
function deleteOrder(orderId) {
  const order = state.orders.find(entry => entry.id === orderId);
  if (!order || !confirm(`Delete the order for ${order.table}? This will also update Money Tracker totals.`)) return;
  state.orders = state.orders.filter(entry => entry.id !== orderId);
  saveState(); renderOrders(); renderMoney(); toast('Order deleted.');
}
function bindOrderDeleteButtons() {
  $$('[data-delete-order]').forEach(button => button.addEventListener('click', () => deleteOrder(button.dataset.deleteOrder)));
}

// Money tracker
$('#addExpenseOpen').addEventListener('click', () => { $('#expenseForm').reset(); openDialog('expenseDialog'); });
$('#expenseForm').addEventListener('submit', (event) => {
  event.preventDefault(); const name = $('#expenseName').value.trim(); const amount = Number($('#expenseAmount').value);
  if (!name || !Number.isFinite(amount) || amount <= 0) return toast('Enter an expense name and amount.');
  state.expenses.push({ id: uid(), name, amount, date: todayKey(), createdAt: new Date().toISOString() });
  saveState(); closeDialog('expenseDialog'); renderMoney(); toast('Expense saved.');
});
function renderMoney() {
  const orders = state.orders.filter(order => isToday(order.date));
  const expenses = state.expenses.filter(expense => isToday(expense.date));
  const sales = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  $('#todaySales').textContent = money(sales); $('#todayExpenses').textContent = money(totalExpenses); $('#todayBalance').textContent = money(sales - totalExpenses); $('#todayOrderNumber').textContent = String(orders.length);
  $('#expenseCount').textContent = `${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'}`;
  $('#expenseList').innerHTML = expenses.slice().reverse().map(expense => `<div class="simple-list-row"><div><strong>${safeText(expense.name)}</strong><small>${new Date(expense.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div><div class="row-actions"><span class="row-amount">− ${money(expense.amount)}</span><button class="trash-button" data-delete-expense="${expense.id}" aria-label="Delete expense" title="Delete expense">🗑️</button></div></div>`).join('');
  $('#expenseEmpty').style.display = expenses.length ? 'none' : 'block';
  $('#moneyOrdersList').innerHTML = orders.slice().reverse().map(order => `<div class="simple-list-row"><div class="simple-list-details"><strong>${safeText(order.table)}</strong><small>${order.items.map(item => `${item.qty} × ${safeText(item.name)}`).join(', ')}</small></div><div class="row-actions"><span class="row-amount">${money(order.total)}</span><button type="button" class="trash-button" data-delete-order="${order.id}" aria-label="Delete order" title="Delete order">🗑️</button></div></div>`).join('');
  $('#moneyOrdersEmpty').style.display = orders.length ? 'none' : 'block';
  $$('[data-delete-expense]').forEach(button => button.addEventListener('click', () => { if (!confirm('Delete this expense?')) return; state.expenses = state.expenses.filter(expense => expense.id !== button.dataset.deleteExpense); saveState(); renderMoney(); toast('Expense deleted.'); }));
  bindOrderDeleteButtons();
}

// Storage management
$('#addStockOpen').addEventListener('click', () => openStockDialog());
function openStockDialog(item = null) {
  $('#stockForm').reset(); $('#stockId').value = item?.id || ''; $('#stockDialogTitle').textContent = item ? 'Edit stock' : 'Add stock';
  if (item) { $('#stockName').value = item.name; $('#stockQty').value = item.qty; $('#stockUnit').value = item.unit; }
  openDialog('stockDialog');
}
$('#stockForm').addEventListener('submit', (event) => {
  event.preventDefault(); const id = $('#stockId').value; const name = $('#stockName').value.trim(); const qty = Number($('#stockQty').value); const unit = $('#stockUnit').value.trim();
  if (!name || !Number.isFinite(qty) || qty < 0 || !unit) return toast('Enter the item, quantity and unit.');
  const item = { id: id || uid(), name, qty, unit };
  if (id) state.stock = state.stock.map(old => old.id === id ? item : old); else state.stock.push(item);
  saveState(); closeDialog('stockDialog'); renderStock(); toast(id ? 'Stock updated.' : 'Stock added.');
});
function renderStock() {
  $('#stockList').innerHTML = state.stock.map(item => `<article class="stock-card"><div class="stock-card-top"><h3>📦 ${safeText(item.name)}</h3><div class="item-actions"><button class="mini-button" data-edit-stock="${item.id}">Edit</button><button class="trash-button" data-delete-stock="${item.id}" aria-label="Delete ${safeText(item.name)}" title="Delete stock item">🗑️</button></div></div><div class="stock-quantity">${safeText(item.qty)}</div><div class="stock-unit">${safeText(item.unit)}</div></article>`).join('');
  $('#stockEmpty').classList.toggle('show', state.stock.length === 0);
  $$('[data-edit-stock]').forEach(button => button.addEventListener('click', () => openStockDialog(state.stock.find(item => item.id === button.dataset.editStock))));
  $$('[data-delete-stock]').forEach(button => button.addEventListener('click', () => { if (!confirm('Delete this stock item?')) return; state.stock = state.stock.filter(item => item.id !== button.dataset.deleteStock); saveState(); renderStock(); toast('Stock item deleted.'); }));
}

// Emergency contacts
$('#addContactOpen').addEventListener('click', () => openContactDialog());
function openContactDialog(contact = null) {
  $('#contactForm').reset(); $('#contactId').value = contact?.id || ''; $('#contactDialogTitle').textContent = contact ? 'Edit contact' : 'Add contact';
  if (contact) { $('#contactName').value = contact.name; $('#contactPhone').value = contact.phone; $('#contactNote').value = contact.note || ''; }
  openDialog('contactDialog');
}
$('#contactForm').addEventListener('submit', (event) => {
  event.preventDefault(); const id = $('#contactId').value; const name = $('#contactName').value.trim(); const phone = $('#contactPhone').value.trim(); const note = $('#contactNote').value.trim();
  if (!name || !phone) return toast('Enter a name and phone number.');
  const contact = { id: id || uid(), name, phone, note };
  if (id) state.contacts = state.contacts.map(old => old.id === id ? contact : old); else state.contacts.push(contact);
  saveState(); closeDialog('contactDialog'); renderContacts(); toast(id ? 'Contact updated.' : 'Contact saved.');
});
function renderContacts() {
  $('#contactList').innerHTML = state.contacts.map(contact => `<article class="contact-card"><div class="contact-card-top"><h3>☎️ ${safeText(contact.name)}</h3><div class="item-actions"><button class="mini-button" data-edit-contact="${contact.id}">Edit</button><button class="trash-button" data-delete-contact="${contact.id}" aria-label="Delete ${safeText(contact.name)}" title="Delete contact">🗑️</button></div></div><a class="contact-phone" href="tel:${safeText(contact.phone.replace(/[^+\d]/g, ''))}">${safeText(contact.phone)}</a>${contact.note ? `<div class="contact-note">${safeText(contact.note)}</div>` : ''}<div class="contact-buttons"><a class="call-button" href="tel:${safeText(contact.phone.replace(/[^+\d]/g, ''))}">☎ Call</a></div></article>`).join('');
  $('#contactEmpty').classList.toggle('show', state.contacts.length === 0);
  $$('[data-edit-contact]').forEach(button => button.addEventListener('click', () => openContactDialog(state.contacts.find(contact => contact.id === button.dataset.editContact))));
  $$('[data-delete-contact]').forEach(button => button.addEventListener('click', () => { if (!confirm('Delete this contact?')) return; state.contacts = state.contacts.filter(contact => contact.id !== button.dataset.deleteContact); saveState(); renderContacts(); toast('Contact deleted.'); }));
}

// First render and optional offline support
renderMenu(); renderOrders(); renderMoney(); renderStock(); renderContacts();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(error => console.warn('Offline support could not start:', error)));
}
