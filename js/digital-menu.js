
function menuImageUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    if (!['https:','http:'].includes(u.protocol)) return '';
    if (['drive.google.com','lh3.googleusercontent.com'].includes(u.hostname)) {
      const id = u.searchParams.get('id') || (u.pathname.match(/\/d\/([\w-]+)/)||[])[1] || (u.pathname.match(/\/file\/d\/([\w-]+)/)||[])[1];
      if (id) {
        // Prefer direct view URL (more reliable for public embeds) then thumbnail
        return 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(id);
      }
    }
    return u.href;
  } catch(e) { return ''; }
}
function menuImageFallback(img) {
  if (!img.dataset.retry) {
    img.dataset.retry = '1';
    try {
      const u = new URL(img.src);
      let id = u.searchParams.get('id');
      if (!id && u.hostname === 'drive.google.com') {
        id = (u.pathname.match(/\/d\/([\w-]+)/)||[])[1] || (u.pathname.match(/\/file\/d\/([\w-]+)/)||[])[1];
      }
      if (id) {
        // Fallback 1: lh3 direct
        img.src = 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w1600';
        return;
      }
    } catch (e) {}
  } else if (img.dataset.retry === '1') {
    img.dataset.retry = '2';
    try {
      const u = new URL(img.src);
      let id = u.searchParams.get('id') || (u.pathname.match(/\/d\/([\w-]+)/)||[])[1];
      if (id) {
        // Fallback 2: thumbnail
        img.src = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1600';
        return;
      }
    } catch (e) {}
  }
  img.onerror = null;
  img.style.visibility = 'hidden';
  if (img.parentElement) img.parentElement.dataset.imageError = 'الصورة غير متاحة';
}

// ============================================================
// digital-menu.js - المينيو الإلكتروني (إدارة + صور + طلبات)
// ============================================================

let digitalMenuItems = [];
let digitalMenuCategories = ['الكل'];
let digitalMenuSettings = { displayName: '', subtitle: 'قائمة الطعام', whatsapp: '', currency: 'ر.س', banners: [] };
let digitalMenuOrders = [];
let editingMenuItemId = null;
let cropState = { img: null, scale: 1, offsetX: 0, offsetY: 0, dragging: false, lastX: 0, lastY: 0 };

async function loadDigitalMenu() {
  showLoading();
  try {
    const res = await callServer('getDigitalMenu', {}, false);
    if (res && res.success) {
      digitalMenuItems = (res.items || []).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
      window.dmMenuSchema = res.menuSchema || 0;

      digitalMenuCategories = res.categories || ['الكل'];
      digitalMenuSettings = Object.assign({
        displayName: res.restaurantName || '',
        subtitle: 'قائمة الطعام',
        whatsapp: '',
        currency: appCurrency || 'ر.س',
        banners: []
      }, res.menuSettings || {});
      renderDigitalMenuUI();
      generateMenuQR();
    } else {
      showToast((res && res.error) || 'فشل تحميل المينيو', true);
    }
  } catch (e) {
    showToast('خطأ: ' + e.message, true);
  } finally {
    hideLoading();
  }
}

function renderDigitalMenuUI() {
  // إعدادات العرض
  const dn = document.getElementById('dmDisplayName');
  const sub = document.getElementById('dmSubtitle');
  const wa = document.getElementById('dmWhatsapp');
  const cur = document.getElementById('dmCurrency');
  if (dn) dn.value = digitalMenuSettings.displayName || '';
  if (sub) sub.value = digitalMenuSettings.subtitle || '';
  if (wa) wa.value = digitalMenuSettings.whatsapp || '';
  if (cur) cur.value = digitalMenuSettings.currency || appCurrency || 'ر.س';

  if (!Array.isArray(digitalMenuSettings.banners)) digitalMenuSettings.banners = [];
  renderCategoryChips();
  renderBannerAdmin();

  // قائمة الأصناف
  const list = document.getElementById('dmItemsList');
  if (!list) return;
  if (!digitalMenuItems.length) {
    list.innerHTML = '<div class="empty-state">لا توجد أصناف في المينيو بعد. أضف طبقاً من الأطباق الحالية أو صنف جديد.</div>';
    return;
  }
  const sorted = digitalMenuItems.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  list.innerHTML = sorted.map((it, idx) => {
    const sizesTxt = (it.sizes || []).map(s => `${s.name}: ${s.price}`).join(' · ') || '—';
    const img = it.imageUrl
      ? `<img src="${escapeHtml(menuImageUrl(it.imageUrl))}" alt="" class="dm-thumb" onerror="menuImageFallback(this)">`
      : `<div class="dm-thumb placeholder"><i class="fas fa-image"></i></div>`;
    return `
      <div class="dm-item-card" data-id="${escapeHtml(it.id)}">
        <div class="dm-item-order">
          <button type="button" class="btn btn-sm btn-outline" onclick="moveMenuItem('${escapeHtml(it.id)}', -1)" title="أعلى"><i class="fas fa-chevron-up"></i></button>
          <span>${idx + 1}</span>
          <button type="button" class="btn btn-sm btn-outline" onclick="moveMenuItem('${escapeHtml(it.id)}', 1)" title="أسفل"><i class="fas fa-chevron-down"></i></button>
        </div>
        ${img}
        <div class="dm-item-info">
          <strong>${escapeHtml(it.name)}</strong>
          <div class="dm-meta">
            <span class="badge badge-info">${escapeHtml(it.category || '—')}</span>
            ${it.visible === false ? '<span class="badge badge-dog">مخفي</span>' : '<span class="badge badge-success">ظاهر</span>'}
            ${it.recipeName ? `<span class="badge badge-warning" title="مرتبط بوصفة">🔗 ${escapeHtml(it.recipeName)}</span>` : ''}
          </div>
          <div class="dm-sizes">${escapeHtml(sizesTxt)}</div>
        </div>
        <div class="dm-item-actions">
          <button type="button" class="btn btn-sm btn-outline" onclick="editMenuItem('${escapeHtml(it.id)}')"><i class="fas fa-edit"></i></button>
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteMenuItem('${escapeHtml(it.id)}')"><i class="fas fa-trash-alt"></i></button>
        </div>
      </div>`;
  }).join('');
}

function renderCategoryChips() {
  const box = document.getElementById('dmCatChips');
  if (!box) return;
  const cats = digitalMenuCategories.filter(c => c && c !== 'الكل');
  box.innerHTML = cats.length
    ? cats.map(c => `<span class="dm-chip">${escapeHtml(c)}<button type="button" onclick="removeDigitalCategory('${escapeHtml(c).replace(/'/g, "\\'")}')" aria-label="حذف">&times;</button></span>`).join('')
    : '<span style="color:var(--text-muted);font-size:0.85rem;">لا توجد أقسام بعد</span>';
}

function addDigitalCategory() {
  const input = document.getElementById('dmNewCategory');
  const name = (input?.value || '').trim();
  if (!name) return showToast('اكتب اسم القسم', true);
  if (digitalMenuCategories.includes(name)) return showToast('القسم موجود', true);
  digitalMenuCategories.push(name);
  if (input) input.value = '';
  renderCategoryChips();
}

function removeDigitalCategory(name) {
  digitalMenuCategories = digitalMenuCategories.filter(c => c !== name);
  renderCategoryChips();
}

function renderBannerAdmin() {
  const box = document.getElementById('dmBannerList');
  if (!box) return;
  const banners = digitalMenuSettings.banners || [];
  if (!banners.length) {
    box.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;">لم تُرفع صور للشريط</span>';
    return;
  }
  box.innerHTML = banners.map((url, i) => `
    <div class="dm-banner-thumb">
      <img src="${escapeHtml(menuImageUrl(url))}" alt="">
      <button type="button" onclick="removeBanner(${i})">&times;</button>
    </div>`).join('');
}

function removeBanner(i) {
  digitalMenuSettings.banners.splice(i, 1);
  renderBannerAdmin();
}

async function uploadBannerImage(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if ((digitalMenuSettings.banners || []).length >= 3) return showToast('الحد 3 صور للشريط', true);
  showLoading();
  try {
    const dataUrl = await fileToJpegDataUrl(file, 1200, 0.72);
    const up = await uploadMenuImagePost(dataUrl, 'banner');
    if (!up || !up.success || !up.url) {
      showToast((up && up.error) || 'فشل رفع صورة الشريط', true);
      return;
    }
    digitalMenuSettings.banners.push(up.url);
    renderBannerAdmin();
    showToast('تمت إضافة الصورة — احفظ الإعدادات');
  } catch (e) {
    showToast('فشل الرفع: ' + e.message, true);
  } finally {
    hideLoading();
  }
}

function fileToJpegDataUrl(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذرت قراءة الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('صورة غير صالحة'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadMenuImagePost(dataUrl, fileName) {
  const resp = await fetch(COST_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'Accept': 'application/json' },
    body: JSON.stringify({
      fn: 'uploadMenuImage',
      restaurantEmail: currentUserEmail,
      token: localStorage.getItem('foodUserToken') || '',
      base64: dataUrl,
      fileName: fileName || 'menu'
    })
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.json();
}

async function saveDigitalMenuSettings() {
  digitalMenuSettings.displayName = document.getElementById('dmDisplayName')?.value.trim() || '';
  digitalMenuSettings.subtitle = document.getElementById('dmSubtitle')?.value.trim() || 'قائمة الطعام';
  digitalMenuSettings.whatsapp = document.getElementById('dmWhatsapp')?.value.trim() || '';
  digitalMenuSettings.currency = document.getElementById('dmCurrency')?.value.trim() || appCurrency || 'ر.س';
  if (!digitalMenuCategories.includes('الكل')) digitalMenuCategories.unshift('الكل');

  showLoading();
  const res = await menuWrite('saveDigitalMenu', {
    items: digitalMenuItems,
    categories: digitalMenuCategories,
    menuSettings: digitalMenuSettings
  }, false);
  hideLoading();
  if (res && res.success) {
    showToast('✅ تم حفظ إعدادات المينيو');
    generateMenuQR();
  } else {
    showToast((res && res.error) || 'فشل الحفظ', true);
  }
}

async function persistDigitalMenuItems() {
  // إعادة ترتيب sortOrder
  digitalMenuItems.forEach((it, i) => { it.sortOrder = i; });
  const res = await menuWrite('saveDigitalMenu', {
    items: digitalMenuItems,
    categories: digitalMenuCategories,
    menuSettings: digitalMenuSettings
  }, false);
  return res;
}

function openAddMenuItemModal(fromRecipe) {
  editingMenuItemId = null;
  document.getElementById('dmItemModalTitle').textContent = fromRecipe ? 'إضافة طبق من الوصفات' : 'إضافة صنف جديد';
  document.getElementById('dmItemId').value = '';
  document.getElementById('dmItemName').value = '';
  document.getElementById('dmItemDesc').value = '';
  document.getElementById('dmItemCategory').value = '';
  document.getElementById('dmItemRecipe').value = '';
  document.getElementById('dmItemImageUrl').value = '';
  document.getElementById('dmItemVisible').checked = true;
  document.getElementById('dmItemFeatured').checked = false;
  document.getElementById('dmSizesContainer').innerHTML = '';
  document.getElementById('dmCropPreview').innerHTML = '<div class="dm-crop-placeholder"><i class="fas fa-cloud-upload-alt"></i><p>اسحب صورة أو اختر ملفاً</p></div>';
  document.getElementById('dmCropCanvas').style.display = 'none';
  cropState.img = null;

  // تعبئة الأقسام
  const catSel = document.getElementById('dmItemCategory');
  catSel.innerHTML = digitalMenuCategories.filter(c => c !== 'الكل').map(c =>
    `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
  ).join('') + '<option value="أخرى">أخرى</option>';

  // تعبئة الوصفات
  const recSel = document.getElementById('dmItemRecipe');
  recSel.innerHTML = '<option value="">— بدون ربط —</option>' +
    (allRecipes || []).map(r => `<option value="${escapeHtml(r.name)}">${escapeHtml(r.name)}</option>`).join('');

  if (fromRecipe && allRecipes && allRecipes.length) {
    // لا شيء إضافي
  }

  addSizeRow('عادي', '');
  document.getElementById('dmExtrasContainer').innerHTML = '';
  document.getElementById('dmItemModal').classList.add('active');
}

function editMenuItem(id) {
  const it = digitalMenuItems.find(x => x.id === id);
  if (!it) return;
  editingMenuItemId = id;
  document.getElementById('dmItemModalTitle').textContent = 'تعديل صنف';
  document.getElementById('dmItemId').value = it.id;
  document.getElementById('dmItemName').value = it.name || '';
  document.getElementById('dmItemDesc').value = it.description || '';
  document.getElementById('dmItemImageUrl').value = it.imageUrl || '';
  document.getElementById('dmItemVisible').checked = it.visible !== false;
  document.getElementById('dmItemFeatured').checked = !!it.featured;

  const catSel = document.getElementById('dmItemCategory');
  const cats = digitalMenuCategories.filter(c => c !== 'الكل');
  catSel.innerHTML = cats.map(c =>
    `<option value="${escapeHtml(c)}" ${c === it.category ? 'selected' : ''}>${escapeHtml(c)}</option>`
  ).join('') + `<option value="أخرى" ${!cats.includes(it.category) ? 'selected' : ''}>أخرى</option>`;

  const recSel = document.getElementById('dmItemRecipe');
  recSel.innerHTML = '<option value="">— بدون ربط —</option>' +
    (allRecipes || []).map(r =>
      `<option value="${escapeHtml(r.name)}" ${r.name === it.recipeName ? 'selected' : ''}>${escapeHtml(r.name)}</option>`
    ).join('');

  document.getElementById('dmSizesContainer').innerHTML = '';
  (it.sizes || [{ name: 'عادي', price: 0 }]).forEach(s => addSizeRow(s.name, s.price));
  document.getElementById('dmExtrasContainer').innerHTML = '';
  (it.extras || []).forEach(s => addExtraRow(s.name, s.price));

  const preview = document.getElementById('dmCropPreview');
  if (it.imageUrl) {
    preview.innerHTML = `<img src="${escapeHtml(menuImageUrl(it.imageUrl))}" style="max-width:100%;max-height:180px;border-radius:12px;">`;
  } else {
    preview.innerHTML = '<div class="dm-crop-placeholder"><i class="fas fa-cloud-upload-alt"></i><p>اسحب صورة أو اختر ملفاً</p></div>';
  }
  document.getElementById('dmCropCanvas').style.display = 'none';
  cropState.img = null;

  document.getElementById('dmItemModal').classList.add('active');
}

function addSizeRow(name, price) {
  const container = document.getElementById('dmSizesContainer');
  const row = document.createElement('div');
  row.className = 'dm-size-row';
  row.innerHTML = `
    <input type="text" class="dm-size-name" placeholder="الاسم (صغير، وسط...)" value="${escapeHtml(name || '')}">
    <input type="number" class="dm-size-price ltr-num" placeholder="السعر" step="0.01" value="${price !== '' && price != null ? price : ''}">
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(row);
}

function addExtraRow(name, price) {
  const container = document.getElementById('dmExtrasContainer');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'dm-size-row';
  row.innerHTML = `
    <input type="text" class="dm-extra-name" placeholder="الإضافة (شريحة جبن)" value="${escapeHtml(name || '')}">
    <input type="number" class="dm-extra-price ltr-num" placeholder="السعر" step="0.01" value="${price !== '' && price != null ? price : ''}">
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(row);
}

function collectExtras() {
  const extras = [];
  document.querySelectorAll('#dmExtrasContainer .dm-size-row').forEach(row => {
    const n = row.querySelector('.dm-extra-name')?.value.trim();
    const p = parseFloat(row.querySelector('.dm-extra-price')?.value);
    if (n && !isNaN(p) && p >= 0) extras.push({ name: n, price: p });
  });
  return extras;
}

function onRecipeSelectChange() {
  const name = document.getElementById('dmItemRecipe').value;
  if (!name) return;
  const r = (allRecipes || []).find(x => x.name === name);
  if (!r) return;
  if (!document.getElementById('dmItemName').value) {
    document.getElementById('dmItemName').value = r.name;
  }
  // سعر مقترح
  const price = (typeof getRealPrice === 'function' ? getRealPrice(r) : null) || r.sellingPrice || r.suggestedPrice || 0;
  const rows = document.querySelectorAll('#dmSizesContainer .dm-size-row');
  if (rows.length === 1) {
    const priceInput = rows[0].querySelector('.dm-size-price');
    if (priceInput && !priceInput.value) priceInput.value = price;
  }
}

async function saveMenuItemFromModal() {
  const name = document.getElementById('dmItemName').value.trim();
  if (!name) return showToast('اسم الصنف مطلوب', true);

  let category = document.getElementById('dmItemCategory').value;
  if (category === 'أخرى') {
    const custom = prompt('أدخل اسم القسم الجديد:');
    if (!custom || !custom.trim()) return;
    category = custom.trim();
    if (!digitalMenuCategories.includes(category)) {
      digitalMenuCategories.push(category);
    }
  }

  const sizes = [];
  document.querySelectorAll('#dmSizesContainer .dm-size-row').forEach(row => {
    const n = row.querySelector('.dm-size-name')?.value.trim();
    const p = parseFloat(row.querySelector('.dm-size-price')?.value);
    if (n && !isNaN(p) && p >= 0) sizes.push({ name: n, price: p });
  });
  if (!sizes.length) return showToast('أضف حجماً واحداً على الأقل مع سعر', true);
  const extras = collectExtras();

  let imageUrl = document.getElementById('dmItemImageUrl').value.trim();

  const canvas = document.getElementById('dmCropCanvas');
  if (cropState.img && canvas.style.display !== 'none') {
    showLoading();
    try {
      const small = document.createElement('canvas');
      const max = 900;
      const scale = Math.min(1, max / Math.max(canvas.width, canvas.height));
      small.width = Math.round(canvas.width * scale);
      small.height = Math.round(canvas.height * scale);
      small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
      const dataUrl = small.toDataURL('image/jpeg', 0.72);
      const up = await uploadMenuImagePost(dataUrl, name);
      if (up && up.success && up.url) {
        imageUrl = up.url;
        document.getElementById('dmItemImageUrl').value = imageUrl;
      } else {
        hideLoading();
        showToast((up && up.error) || 'فشل رفع الصورة. تأكد من وجود حاوية التخزين menu-images في Supabase ومن ضبط الدالة api.', true);
        return;
      }
    } catch (e) {
      hideLoading();
      showToast('خطأ رفع الصورة: ' + e.message, true);
      return;
    }
    hideLoading();
  }

  const item = {
    id: editingMenuItemId || ('mi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
    name,
    description: document.getElementById('dmItemDesc').value.trim(),
    category,
    recipeName: document.getElementById('dmItemRecipe').value || null,
    imageUrl: imageUrl || '',
    sizes,
    extras,
    visible: document.getElementById('dmItemVisible').checked,
    featured: document.getElementById('dmItemFeatured').checked,
    sortOrder: editingMenuItemId
      ? (digitalMenuItems.find(x => x.id === editingMenuItemId)?.sortOrder ?? digitalMenuItems.length)
      : digitalMenuItems.length
  };

  if (editingMenuItemId) {
    const idx = digitalMenuItems.findIndex(x => x.id === editingMenuItemId);
    if (idx !== -1) digitalMenuItems[idx] = item;
  } else {
    digitalMenuItems.push(item);
  }

  showLoading();
  const res = await persistDigitalMenuItems();
  hideLoading();
  if (res && res.success) {
    closeModals();
    renderDigitalMenuUI();
    showToast('✅ تم حفظ الصنف');
  } else {
    showToast((res && res.error) || 'فشل الحفظ', true);
  }
}

async function deleteMenuItem(id) {
  if (!confirm('حذف هذا الصنف من المينيو؟')) return;
  digitalMenuItems = digitalMenuItems.filter(x => x.id !== id);
  showLoading();
  const res = await persistDigitalMenuItems();
  hideLoading();
  if (res && res.success) {
    renderDigitalMenuUI();
    showToast('تم الحذف');
  } else {
    showToast((res && res.error) || 'فشل', true);
  }
}

async function moveMenuItem(id, dir) {
  const idx = digitalMenuItems.findIndex(x => x.id === id);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= digitalMenuItems.length) return;
  const tmp = digitalMenuItems[idx];
  digitalMenuItems[idx] = digitalMenuItems[newIdx];
  digitalMenuItems[newIdx] = tmp;
  digitalMenuItems.forEach((it, i) => { it.sortOrder = i; });
  renderDigitalMenuUI();
  await persistDigitalMenuItems();
}

function importRecipesToMenu() {
  if (!allRecipes || !allRecipes.length) {
    showToast('لا توجد أطباق في النظام', true);
    return;
  }
  let added = 0;
  allRecipes.forEach(r => {
    if (digitalMenuItems.some(it => it.recipeName === r.name || it.name === r.name)) return;
    const price = (typeof getRealPrice === 'function' ? getRealPrice(r) : null) || r.sellingPrice || r.suggestedPrice || 0;
    digitalMenuItems.push({
      id: 'mi_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: r.name,
      description: '',
      category: 'أطباق رئيسية',
      recipeName: r.name,
      imageUrl: '',
      sizes: [{ name: 'عادي', price: price }],
      visible: true,
      featured: false,
      sortOrder: digitalMenuItems.length
    });
    added++;
  });
  if (!digitalMenuCategories.includes('أطباق رئيسية')) {
    digitalMenuCategories.push('أطباق رئيسية');
  }
  if (added === 0) {
    showToast('كل الأطباق موجودة مسبقاً في المينيو');
    return;
  }
  persistDigitalMenuItems().then(res => {
    if (res && res.success) {
      renderDigitalMenuUI();
      showToast(`✅ تمت إضافة ${added} طبق`);
    }
  });
}

// ===== رفع وقص الصور =====
function initImageCrop() {
  const zone = document.getElementById('dmDropZone');
  const fileInput = document.getElementById('dmImageFile');
  const canvas = document.getElementById('dmCropCanvas');
  if (!zone || !fileInput || !canvas || zone.dataset.cropBound) return;
  zone.dataset.cropBound = '1';
  canvas.addEventListener('click', e=>e.stopPropagation());

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadImageForCrop(f);
  });
  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadImageForCrop(fileInput.files[0]);
  });

  // تفاعل القص البسيط (تحريك)
  canvas.addEventListener('mousedown', startCropDrag);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); startCropDrag(e.touches[0]); }, { passive: false });
  window.addEventListener('mousemove', moveCropDrag);
  window.addEventListener('touchmove', e => { if (cropState.dragging) { e.preventDefault(); moveCropDrag(e.touches[0]); } }, { passive: false });
  window.addEventListener('mouseup', endCropDrag);
  window.addEventListener('touchend', endCropDrag);
}

function loadImageForCrop(file) {
  if (file.size > 8 * 1024 * 1024) {
    showToast('الصورة كبيرة جداً (الحد 8MB)', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      cropState.img = img;
      cropState.scale = 1;
      cropState.offsetX = 0;
      cropState.offsetY = 0;
      drawCropCanvas();
      document.getElementById('dmCropPreview').innerHTML = '';
      document.getElementById('dmCropCanvas').style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function drawCropCanvas() {
  const canvas = document.getElementById('dmCropCanvas');
  const ctx = canvas.getContext('2d');
  const size = 900;
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = '#0a0e16';
  ctx.fillRect(0, 0, size, size);
  if (!cropState.img) return;
  const img = cropState.img;
  const scale = Math.max(size / img.width, size / img.height) * cropState.scale;
  const w = img.width * scale;
  const h = img.height * scale;
  cropState.offsetX = Math.max(-(w-size)/2, Math.min((w-size)/2, cropState.offsetX));
  cropState.offsetY = Math.max(-(h-size)/2, Math.min((h-size)/2, cropState.offsetY));
  const x = (size - w) / 2 + cropState.offsetX;
  const y = (size - h) / 2 + cropState.offsetY;
  ctx.drawImage(img, x, y, w, h);

}

function startCropDrag(e) {
  if (!cropState.img) return;
  cropState.dragging = true;
  cropState.lastX = e.clientX;
  cropState.lastY = e.clientY;
}
function moveCropDrag(e) {
  if (!cropState.dragging) return;
  cropState.offsetX += e.clientX - cropState.lastX;
  cropState.offsetY += e.clientY - cropState.lastY;
  cropState.lastX = e.clientX;
  cropState.lastY = e.clientY;
  drawCropCanvas();
}
function endCropDrag() { cropState.dragging = false; }

function zoomCrop(delta) {
  cropState.scale = Math.max(1, Math.min(3, cropState.scale + delta));
  drawCropCanvas();
}

// ===== الطلبات =====
async function loadMenuOrders() {
  showLoading();
  try {
    const res = await callServer('getMenuOrders', {}, false);
    if (res && res.success) {
      digitalMenuOrders = res.orders || [];
      renderMenuOrders();
    } else {
      showToast((res && res.error) || 'فشل تحميل الطلبات', true);
    }
  } catch (e) {
    showToast(e.message, true);
  } finally {
    hideLoading();
  }
}

function renderMenuOrders() {
  const box = document.getElementById('dmOrdersList');
  if (!box) return;
  if (!digitalMenuOrders.length) {
    box.innerHTML = '<div class="empty-state">لا توجد طلبات بعد</div>';
    return;
  }
  box.innerHTML = digitalMenuOrders.map(o => {
    const itemsTxt = (o.items || []).map(i => `${i.name}${i.size ? ' (' + i.size + ')' : ''} ×${i.qty}`).join('، ');
    const statusCls = o.status === 'new' ? 'badge-warning' : o.status === 'done' ? 'badge-success' : 'badge-info';
    const statusLabel = o.status === 'new' ? 'جديد' : o.status === 'done' ? 'مكتمل' : o.status;
    return `
      <div class="dm-order-card">
        <div class="dm-order-head">
          <strong>#${escapeHtml(String(o.id).slice(0, 8))}</strong>
          <span class="badge ${statusCls}">${statusLabel}</span>
        </div>
        <div class="dm-order-body">
          <div>${escapeHtml(itemsTxt)}</div>
          <div class="dm-order-meta">
            ${o.tableNumber ? 'طاولة: ' + escapeHtml(o.tableNumber) + ' · ' : ''}
            المجموع: <strong>${(+o.total).toFixed(2)}</strong>
            ${o.customerName ? ' · ' + escapeHtml(o.customerName) : ''}
            ${o.customerPhone ? ' · ' + escapeHtml(o.customerPhone) : ''}
          </div>
          ${o.notes ? '<div class="dm-order-notes">' + escapeHtml(o.notes) + '</div>' : ''}
          <div class="dm-order-date">${o.date ? new Date(o.date).toLocaleString('ar-EG') : ''}</div>
        </div>
        <div class="dm-order-actions">
          ${o.status === 'new' ? `<button class="btn btn-sm btn-success" onclick="setOrderStatus('${escapeHtml(o.id)}','done')"><i class="fas fa-check"></i> تم</button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="removeMenuOrder('${escapeHtml(o.id)}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');
}

async function setOrderStatus(id, status) {
  const res = await callServer('updateMenuOrderStatus', { id, status }, true);
  if (res && res.success) {
    showToast('تم التحديث');
    loadMenuOrders();
  } else showToast((res && res.error) || 'فشل', true);
}

async function removeMenuOrder(id) {
  if (!confirm('حذف الطلب؟')) return;
  const res = await callServer('deleteMenuOrder', { id }, true);
  if (res && res.success) {
    showToast('تم الحذف');
    loadMenuOrders();
  } else showToast((res && res.error) || 'فشل', true);
}

// ===== QR للمينيو =====
function generateMenuQR() {
  const email = currentUserEmail;
  if (!email) return;
  let baseUrl = '';
  if (typeof PUBLIC_APP_URL === 'string' && PUBLIC_APP_URL.trim()) {
    baseUrl = PUBLIC_APP_URL.trim();
    if (!baseUrl.endsWith('/')) baseUrl += '/';
  } else if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  } else {
    baseUrl = '';
  }
  if (!baseUrl) {
    const img = document.getElementById('dmQrImg');
    if (img) { img.removeAttribute('src'); img.alt = 'ارفع على سيرفر'; }
    return;
  }
  const menuUrl = `${baseUrl}menu.html?restaurant=${encodeURIComponent(email)}`;
  window._menuLink = menuUrl;
  const qrImg = document.getElementById('dmQrImg');
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(menuUrl)}&format=png&bgcolor=ffffff&color=b48554`;
  }
  const linkEl = document.getElementById('dmMenuLink');
  if (linkEl) linkEl.textContent = menuUrl;
}

function copyMenuLink() {
  const link = window._menuLink || '';
  if (!link) return showToast('لا يوجد رابط', true);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => showToast('✅ تم النسخ')).catch(() => fallbackCopy(link));
  } else fallbackCopy(link);
}

function printMenuQR() {
  const qrImg = document.getElementById('dmQrImg');
  if (!qrImg || !qrImg.src) return showToast('لا توجد صورة', true);
  const name = digitalMenuSettings.displayName || document.getElementById('restaurantNameText')?.textContent || 'المطعم';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>QR المينيو</title>
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Tahoma,sans-serif}
    h3{color:#b48554}img{max-width:280px;border:1px solid #ddd;padding:10px;border-radius:8px}</style></head>
    <body><h3>${escapeHtml(name)}</h3><img src="${qrImg.src}"/><p>امسح الكود لفتح قائمة الطعام</p>
    <button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#b48554;color:#fff;border:none;border-radius:8px;cursor:pointer">طباعة</button>
    </body></html>`);
  win.document.close();
}

// تهيئة عند فتح التبويب
function initDigitalMenuTab() {
  if (!dataLoaded) {
    loadAllData(false).then(() => loadDigitalMenu());
  } else {
    loadDigitalMenu();
  }
  setTimeout(initImageCrop, 300);
}

document.addEventListener('DOMContentLoaded', function() {
  // ربط أحداث إضافية إن وُجدت عناصر
});


// Menu V3: independent banner saves, crop, clipboard and pointer sorting.
let dmWriteQueue = Promise.resolve();
function menuWrite(fn, params = {}) {
  const payload = JSON.parse(JSON.stringify(params));
  if (fn === 'saveDigitalMenu' && payload.menuSettings && !payload.restoreBanners) delete payload.menuSettings.banners;
  const run = async () => {
    try {
      const response = await fetch(COST_API_URL, {method:'POST',
        headers:{'Content-Type':'text/plain;charset=UTF-8'},
        body:JSON.stringify(Object.assign(payload,{fn,restaurantEmail:currentUserEmail,
          token:localStorage.getItem('foodUserToken')||''}))});
      if (!response.ok) throw new Error('HTTP '+response.status);
      const result = await response.json();
      if (result.success && typeof markDataChanged==='function') markDataChanged();
      return result;
    } catch(e) {return {success:false,error:e.message};}
  };
  const task = dmWriteQueue.then(run, run);
  dmWriteQueue = task.then(()=>{},()=>{});
  return task;
}
let dmLayoutBusy = false;
async function dmLayoutChange(change) {
  if (dmLayoutBusy) return showToast('انتظر انتهاء الحفظ',true);
  dmLayoutBusy=true;
  const before = JSON.stringify({items:digitalMenuItems,categories:digitalMenuCategories});
  try {
    change();
    digitalMenuItems.forEach((it,n)=>it.sortOrder=n);
    const result = await menuWrite('saveDigitalMenu',{items:digitalMenuItems,categories:digitalMenuCategories});
    if (!result.success) throw new Error(result.error||'فشل الحفظ');
    renderDigitalMenuUI(); showToast('تم الحفظ');
  } catch(e) {
    const old=JSON.parse(before); digitalMenuItems=old.items; digitalMenuCategories=old.categories;
    renderDigitalMenuUI();showToast(e.message,true);
  } finally {dmLayoutBusy=false;}
}
const dmOriginalRender = renderDigitalMenuUI;
renderDigitalMenuUI = function() {
  dmOriginalRender();
  const list=document.getElementById('dmItemsList');
  if (!list || !digitalMenuItems.length) return;
  const cards=[...list.querySelectorAll('.dm-item-card')];
  const cats=[...new Set([...digitalMenuCategories.filter(c=>c!=='الكل'),...digitalMenuItems.map(it=>it.category||'أخرى')])];
  list.replaceChildren();
  cats.forEach(cat=>{
    const section=document.createElement('section'); section.className='dm-sort-group';section.dataset.category=cat;
    const h=document.createElement('h4');h.textContent=cat;section.append(h);
    const body=document.createElement('div');body.className='dm-sort-items';section.append(body);
    digitalMenuItems.filter(it=>(it.category||'أخرى')===cat).forEach(it=>{
      const card=cards.find(c=>c.dataset.id===it.id);if (!card)return;
      const grip=document.createElement('button');grip.type='button';grip.className='dm-grip btn btn-outline';
      grip.textContent='⠿';grip.title='اسحب لترتيب الصنف أو نقله لقسم آخر';
      grip.onpointerdown=e=>dmStartDrag(e,'item',it.id,card);card.prepend(grip);body.append(card);
    });
    list.append(section);
  });
};
renderCategoryChips = function() {
  const box=document.getElementById('dmCatChips');if (!box)return;
  box.replaceChildren();
  digitalMenuCategories.filter(c=>c && c!=='الكل').forEach(name=>{
    const row=document.createElement('div');row.className='dm-cat-row';row.dataset.cat=name;
    const grip=document.createElement('button');grip.type='button';grip.className='dm-grip btn btn-outline';grip.textContent='⠿';grip.title='اسحب لترتيب القسم';
    grip.onpointerdown=e=>dmStartDrag(e,'category',name,row);
    const text=document.createElement('span');text.className='dm-cat-name';text.textContent=name;
    const rename=document.createElement('button');rename.type='button';rename.className='btn btn-sm btn-outline';rename.textContent='تعديل';rename.onclick=()=>dmRenameCategory(name);
    const del=document.createElement('button');del.type='button';del.className='btn btn-sm btn-outline';del.textContent='حذف';del.onclick=()=>removeDigitalCategory(name);
    row.append(grip,text,rename,del);box.append(row);
  });
  const hint=document.createElement('p');hint.textContent='اسحب من المقبض لترتيب الأقسام والأصناف؛ يُحفظ الترتيب تلقائياً. يمكن نقل الصنف إلى قسم آخر بالسحب.';hint.style.fontSize='12px';box.append(hint);
};
function dmRenameCategory(old) {
  const next=prompt('اسم القسم الجديد',old)?.trim();
  if (!next || next===old)return;
  if (next==='الكل'||digitalMenuCategories.includes(next))return showToast('اسم القسم موجود أو محجوز',true);
  dmLayoutChange(()=>{
    digitalMenuCategories=digitalMenuCategories.map(c=>c===old?next:c);
    digitalMenuItems.forEach(it=>{if(it.category===old)it.category=next;});
  });
}
addDigitalCategory=function(){
  const input=document.getElementById('dmNewCategory'),name=input.value.trim();
  if(!name||digitalMenuCategories.includes(name))return showToast('اكتب اسماً جديداً للقسم',true);
  dmLayoutChange(()=>digitalMenuCategories.push(name));input.value='';
};
removeDigitalCategory=function(name){
  if(digitalMenuItems.some(it=>it.category===name))return showToast('انقل أصناف القسم أولاً قبل حذفه',true);
  if(!confirm('حذف القسم «'+name+'»؟'))return;
  dmLayoutChange(()=>{digitalMenuCategories=digitalMenuCategories.filter(c=>c!==name);});
};
function dmStartDrag(e,type,key,source) {
  if(e.button!==0||dmLayoutBusy)return;
  e.preventDefault();e.stopPropagation();
  const ghost=document.createElement('div');ghost.className='dm-sort-ghost';ghost.textContent=type==='item'?digitalMenuItems.find(it=>it.id===key).name:key;
  document.body.append(ghost);source.classList.add('dm-sort-source');
  let target=null,after=false;
  function move(ev){
    ghost.style.left=(ev.clientX+15)+'px';ghost.style.top=(ev.clientY+15)+'px';
    document.querySelectorAll('.dm-drop-target').forEach(x=>x.classList.remove('dm-drop-target'));
    const at=document.elementFromPoint(ev.clientX,ev.clientY);
    target=at?.closest(type==='category'?'.dm-cat-row':'.dm-item-card, .dm-sort-group');
    if(target===source)target=null;
    if(target){target.classList.add('dm-drop-target');const r=target.getBoundingClientRect();after=ev.clientY>r.top+r.height/2;}
    const container=at?.closest('.modal-content, .main-content, .app-main-content');
    if(ev.clientY<70){if(container)container.scrollTop-=20;else window.scrollBy(0,-20);}
    if(ev.clientY>innerHeight-70){if(container)container.scrollTop+=20;else window.scrollBy(0,20);}
  }
  function finish(ev){
    document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',finish);document.removeEventListener('pointercancel',cancel);
    ghost.remove();source.classList.remove('dm-sort-source');document.querySelectorAll('.dm-drop-target').forEach(x=>x.classList.remove('dm-drop-target'));
    if(!target)return;
    const dest=target;
    if(type==='category'){
      const destName=dest.dataset.cat;
      dmLayoutChange(()=>{const arr=digitalMenuCategories.filter(c=>c!==key&&c!=='الكل');const n=arr.indexOf(destName);arr.splice(n+(after?1:0),0,key);digitalMenuCategories=['الكل',...arr];});
    } else {
      const category=dest.closest('.dm-sort-group')?.dataset.category;
      const destId=dest.classList.contains('dm-item-card')?dest.dataset.id:null;
      if(!category)return;
      dmLayoutChange(()=>{
        const item=digitalMenuItems.find(it=>it.id===key);item.category=category;
        const arr=digitalMenuItems.filter(it=>it.id!==key);
        let n=destId?arr.findIndex(it=>it.id===destId)+(after?1:0):arr.length;
        if(!destId){const last=arr.map(it=>it.category).lastIndexOf(category);if(last>=0)n=last+1;}
        arr.splice(n,0,item);digitalMenuItems=arr;
      });
    }
  }
  function cancel(){target=null;finish();}
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',cancel);move(e);
}
let dmBannerBusy=false;
renderBannerAdmin=function(){
  const box=document.getElementById('dmBannerList');if(!box)return;box.replaceChildren();
  const banners=digitalMenuSettings.banners||[];
  if(!banners.length){box.textContent='لا توجد صور محفوظة للشريط';return;}
  banners.forEach((url,n)=>{
    const frame=document.createElement('div');frame.className='dm-banner-thumb';
    const img=document.createElement('img');img.src=menuImageUrl(url);img.alt='صورة الشريط '+(n+1);img.onerror=()=>menuImageFallback(img);
    const del=document.createElement('button');del.type='button';del.textContent='×';del.title='حذف وحفظ';del.onclick=()=>removeBanner(n);
    frame.append(img,del);box.append(frame);
  });
};
async function dmSaveBanners(next) {
  const saved=await menuWrite('saveMenuBanners',{banners:next});
  if(!saved.success)throw new Error(saved.error||'فشل حفظ صور الشريط — تأكد من نشر السكربت الجديد');
  const check=await callServer('getDigitalMenu',{},false);
  if(!check.success||JSON.stringify(check.menuSettings?.banners)!==JSON.stringify(next))
    throw new Error('تعذر التحقق من حفظ الشريط. أعد التحميل وتأكد من إصدار النشر.');
  digitalMenuSettings.banners=check.menuSettings.banners;renderBannerAdmin();
}
removeBanner=async function(n){
  if(dmBannerBusy||!confirm('حذف صورة الشريط وحفظ التغيير؟'))return;
  dmBannerBusy=true;showLoading();
  try{const next=[...(digitalMenuSettings.banners||[])];next.splice(n,1);await dmSaveBanners(next);showToast('تم حذف الصورة وحفظ الشريط');}
  catch(e){showToast(e.message,true);}finally{hideLoading();dmBannerBusy=false;}
};
uploadBannerImage=async function(input){const f=input.files?.[0];input.value='';if(f)await dmUploadBanner(f);};
async function dmUploadBanner(file){
  if(dmBannerBusy)return;
  if((digitalMenuSettings.banners||[]).length>=3)return showToast('الحد ثلاث صور',true);

  dmBannerBusy=true;
  try{
    const data=await dmCrop(file,16/9);if(!data)return;
    showLoading();
    const result=await uploadMenuImagePost(data,'banner.jpg');
    if(!result.success||!result.url)throw new Error(result.error||'فشل الرفع');
    await dmSaveBanners([...(digitalMenuSettings.banners||[]),result.url]);
    showToast('تم حفظ صورة الشريط والتحقق منها');
  }catch(e){showToast(e.message,true);}finally{hideLoading();dmBannerBusy=false;}
}
loadImageForCrop=async function(file){
  try{
    const data=await dmCrop(file,1);if(!data)return;
    const img=await dmReadImage(data);cropState.img=img;cropState.scale=1;cropState.offsetX=0;cropState.offsetY=0;
    drawCropCanvas();if(window.r4Dirty)r4Dirty('dmItemModal');document.getElementById('dmCropPreview').innerHTML='';document.getElementById('dmCropCanvas').style.display='block';
  }catch(e){showToast(e.message,true);}
};
function dmReadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('تعذر قراءة الصورة'));img.src=url;});}
async function dmCrop(file,ratio){
  if(!file.type.startsWith('image/')||file.size>12*1024*1024)throw new Error('اختر صورة حتى 12 ميغابايت');
  const objectURL=URL.createObjectURL(file);let img;
  try{img=await dmReadImage(objectURL);}finally{URL.revokeObjectURL(objectURL);}
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='dm-crop-dialog';dialog.dir='rtl';
    dialog.innerHTML='<h3>'+(ratio===1?'قص صورة الوجبة · 1:1':'قص صورة الشريط · 16:9')+'</h3><p>اسحب الصورة لضبط موضعها، واستخدم شريط التكبير.</p><canvas class="dm-crop-stage"></canvas><div class="dm-crop-tools"><label>تكبير <input type="range" min="1" max="4" step="0.01" value="1"></label><button data-save>اعتماد القص</button><button data-cancel>إلغاء</button></div>';
    document.body.append(dialog);const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');
    canvas.width=ratio===1?1000:1600;canvas.height=Math.round(canvas.width/ratio);canvas.style.aspectRatio=String(ratio);
    let zoom=1,x=0,y=0,drag=null;const base=Math.max(canvas.width/img.width,canvas.height/img.height);
    function paint(){const w=img.width*base*zoom,h=img.height*base*zoom;x=Math.max(-(w-canvas.width)/2,Math.min((w-canvas.width)/2,x));y=Math.max(-(h-canvas.height)/2,Math.min((h-canvas.height)/2,y));ctx.drawImage(img,(canvas.width-w)/2+x,(canvas.height-h)/2+y,w,h);}
    canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};};
    canvas.onpointermove=e=>{if(!drag)return;const r=canvas.getBoundingClientRect();x+=(e.clientX-drag.x)*canvas.width/r.width;y+=(e.clientY-drag.y)*canvas.height/r.height;drag={x:e.clientX,y:e.clientY};paint();};
    canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
    dialog.querySelector('input').oninput=e=>{zoom=Number(e.target.value);paint();};
    function done(value){dialog.close();dialog.remove();resolve(value);}
    dialog.querySelectorAll('button').forEach(b=>b.type='button');
    dialog.querySelector('[data-save]').onclick=()=>done(canvas.toDataURL('image/jpeg',.87));
    dialog.querySelector('[data-cancel]').onclick=()=>done(null);dialog.oncancel=e=>{e.preventDefault();done(null);};
    dialog.showModal();paint();
  });
}
async function pasteMenuImage(kind){
  try{
    if(!navigator.clipboard?.read)throw new Error('استخدم Ctrl+V أثناء فتح محرر الصنف أو اختر صورة من الملفات');
    const items=await navigator.clipboard.read();
    for(const item of items){const type=item.types.find(t=>t.startsWith('image/'));if(type){const b=await item.getType(type);const f=new File([b],'clipboard.png',{type});if(kind==='banner')await dmUploadBanner(f);else await loadImageForCrop(f);return;}}
    showToast('الحافظة لا تحتوي صورة',true);
  }catch(e){showToast('تعذر اللصق: '+e.message,true);}
}
document.addEventListener('paste',e=>{
  if(document.querySelector('.dm-crop-dialog[open]'))return;
  const meal=document.getElementById('dmItemModal')?.classList.contains('active');
  const tab=document.getElementById('tab5');
  if(!meal&&(!tab||getComputedStyle(tab).display==='none'))return;
  const f=[...(e.clipboardData?.items||[])].find(it=>it.type.startsWith('image/'))?.getAsFile();
  if(f){e.preventDefault();if(meal)loadImageForCrop(f);else dmUploadBanner(f);}
});
async function syncDigitalMenuPrices(){
  showLoading();
  try{
    const data=await callServer('getAllRecipes',{},false);if(!data.success)throw new Error(data.error);
    const next=JSON.parse(JSON.stringify(digitalMenuItems)),changes=[];
    next.forEach(it=>{const r=(data.recipes||[]).find(r=>r.name===it.recipeName),p=Number(r?.sellingPrice);if(it.sizes?.length===1&&p>0&&Number.isFinite(p)&&Number(it.sizes[0].price)!==p){changes.push(it.name+': '+it.sizes[0].price+' ← '+p);it.sizes[0].price=p;}});
    hideLoading();if(!changes.length)return showToast('لا توجد أسعار جديدة للأصناف المرتبطة ذات الحجم الواحد');
    if(!confirm('تحديث أسعار البيع؟\n'+changes.join('\n')+'\nسيتم تجاوز الأصناف متعددة الأحجام والأسعار غير الصالحة.'))return;
    const result=await menuWrite('saveDigitalMenu',{items:next});if(!result.success)throw new Error(result.error);
    digitalMenuItems=next;allRecipes=data.recipes;renderDigitalMenuUI();showToast('تم تحديث الأسعار');
  }catch(e){showToast(e.message,true);}finally{hideLoading();}
}
