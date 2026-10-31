// ============================================================
// recipes.js - الأطباق والمكونات
// ============================================================

function getRecipeRealPrice(r) {
    if (typeof getRealPrice === 'function') return getRealPrice(r);
    const fromMenu = menuData[r.name]?.price;
    if (fromMenu && fromMenu > 0) return fromMenu;
    if (r.sellingPrice && r.sellingPrice > 0) return r.sellingPrice;
    return r.suggestedPrice || 0;
}

function renderRecipesTable() {
    const tbody = document.getElementById('recipesBody');
    if (!allRecipes.length) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">لا توجد أطباق.</div></td></tr>';
        return;
    }
    tbody.innerHTML = allRecipes.map((r, i) => {
        const cost = r.costPrice || 0;
        const suggested = r.suggestedPrice || 0;
        const realPrice = getRecipeRealPrice(r);
        const marginPercent = realPrice > 0 ? ((realPrice - cost) / realPrice * 100) : 0;
        const marginColor = realPrice <= 0 ? 'badge-info' : marginPercent < 0 ? 'badge-dog' : marginPercent < 30 ? 'badge-warning' : 'badge-success';
        const safeName = escapeHtml(r.name).replace(/'/g, "\\'");
        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td><span class="badge badge-success">${cost.toFixed(2)}</span></td>
            <td><span class="badge badge-warning" title="السعر المقترح حسب نسبة Food Cost">${suggested.toFixed(2)}</span></td>
            <td>
                <input type="number" class="selling-price-input" value="${realPrice > 0 ? realPrice : ''}"
                    placeholder="—" step="0.01" min="0"
                    data-recipe="${safeName}"
                    onchange="saveSellingPrice('${safeName}', this.value)"
                    style="width:90px; padding:6px 10px; background:rgba(10,14,23,0.8); border:1px solid var(--border); border-radius:10px; color:var(--accent-soft); text-align:center; font-weight:700;">
            </td>
            <td><span class="badge ${marginColor}">${realPrice > 0 ? marginPercent.toFixed(1) + '%' : '—'}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="openIngredientsModal('${safeName}')" title="المكونات"><i class="fas fa-list-ul"></i></button>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteRecipe('${safeName}')" title="حذف"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>`;
    }).join('');
}

async function saveSellingPrice(recipeName, value) {
    const price = parseFloat(value) || 0;

    // تحديث محلياً
    const recipe = allRecipes.find(r => r.name === recipeName);
    if (recipe) recipe.sellingPrice = price;

    // حفظ في menuData (هندسة المنيو)
    if (!menuData[recipeName]) menuData[recipeName] = { price: 0, units: 0, selected: true };
    menuData[recipeName].price = price;
    if (typeof saveMenuDataToStorage === 'function') saveMenuDataToStorage();

    // حفظ في السيرفر
    try {
        const res = await callServer('updateRecipeSellingPrice', { recipeName, sellingPrice: price }, false);
        if (res && res.success) {
            if (typeof markDataChanged === 'function') markDataChanged();
        } else if (res && !res.authError) {
            showToast(res.error || 'تحذير: لم يُحفظ في السيرفر، محفوظ محلياً فقط', true);
        }
    } catch (e) {
        /* تجاهل — محفوظ محلياً */
    }

    renderRecipesTable();
    showToast(price > 0 ? '✅ تم حفظ سعر البيع الحقيقي' : 'تم مسح السعر');
}

function showAddRecipeModal() {
    document.getElementById('recipeNameInput').value = '';
    document.getElementById('recipeModal').classList.add('active');
}

async function addRecipe() {
    const name = document.getElementById('recipeNameInput').value.trim();
    if (!name) return showToast('أدخل اسماً', true);
    if (/[\[\]\*\/\\\?\:]/.test(name)) {
        return showToast('الاسم يحتوي رموزاً غير مسموحة: [ ] * / \\ ? :', true);
    }
    closeModals();
    const res = await callServer('addRecipe', { recipeName: name }, true);
    if (res.success) {
        allRecipes.push({ name: name, costPrice: 0, laborPercent: 0, suggestedPrice: 0, sellingPrice: 0 });
        renderRecipesTable();
        showToast('تمت الإضافة');
    } else {
        showToast(res.error, true);
    }
}

function confirmDeleteRecipe(name) {
    pendingDelete = { type: 'recipe', name };
    document.getElementById('confirmTitle').innerHTML = '<i class="fas fa-exclamation-triangle"></i> حذف طبق';
    document.getElementById('confirmMessage').textContent = `هل أنت متأكد من حذف "${name}"؟`;
    document.getElementById('confirmModal').classList.add('active');
}

async function confirmDelete() {
    if (!pendingDelete) return;
    const d = pendingDelete;
    closeModals();
    let res;
    if (d.type === 'recipe') {
        res = await callServer('deleteRecipe', { recipeName: d.name }, true);
        if (res.success) {
            allRecipes = allRecipes.filter(r => r.name !== d.name);
            // احذف بيانات هندسة المنيو المرتبطة
            if (menuData[d.name]) {
                delete menuData[d.name];
                if (typeof saveMenuDataToStorage === 'function') saveMenuDataToStorage();
            }
            renderRecipesTable();
            showToast('تم الحذف');
        } else {
            showToast(res.error, true);
        }
    } else {
        res = await callServer('deleteMaterial', { materialId: d.id }, true);
        if (res.success) {
            allMaterials = allMaterials.filter(m => m.id !== d.id);
            renderMaterialsTable();
            refreshCostsAndPrices(true);
            showToast('تم الحذف');
        } else {
            showToast(res.error, true);
        }
    }
    pendingDelete = null;
}

async function openIngredientsModal(recipeName) {
    currentEditingRecipe = recipeName;
    document.getElementById('currentRecipeName').textContent = recipeName;
    const editBtn = document.getElementById('editRecipeNameBtn');
    if (editBtn) editBtn.style.display = 'inline-flex';

    const res = await callServer('getRecipeIngredients', { recipeName });
    currentRecipeIngredients = res.success ? (res.ingredients || []) : [];
    renderIngredientsList();
    document.getElementById('ingredientQty').value = '';
    document.getElementById('ingredientSearch').value = '';
    document.getElementById('ingredientUnitLabel').textContent = '';
    selectedMaterialId = null;
    selectedMaterialUnit = '';
    filterIngredients();
    document.getElementById('ingredientsModal').classList.add('active');
}

function renderIngredientsList() {
    const c = document.getElementById('ingredientsList');
    if (!currentRecipeIngredients.length) {
        c.innerHTML = '<div class="ing-empty"><i class="fas fa-bowl-food" style="font-size:1.6rem; opacity:0.4; display:block; margin-bottom:8px;"></i>لا توجد مكونات بعد.<br><span style="font-size:0.8rem;">أضف مواداً من القائمة أدناه</span></div>';
        return;
    }
    c.innerHTML = currentRecipeIngredients.map((ing, idx) => {
        const mat = allMaterials.find(m => m.id === ing.materialId),
            name = mat ? mat.name : ing.materialName,
            unit = mat ? mat.unit : (ing.unit || '');
        return `<div class="ing-row-pro">
            <span class="ing-name">${escapeHtml(name)}</span>
            <span class="ing-qty">${ing.quantity} ${escapeHtml(unit)}</span>
            <button class="ing-del" onclick="removeIngredient(${idx})" title="حذف"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }).join('');
}

function filterIngredients() {
    const searchTerm = document.getElementById('ingredientSearch').value.toLowerCase();
    const optionsContainer = document.getElementById('ingredientOptions');
    optionsContainer.innerHTML = '';
    const filtered = allMaterials.filter(m => m.name.toLowerCase().includes(searchTerm) || m.unit.toLowerCase().includes(searchTerm));
    filtered.forEach(m => {
        const div = document.createElement('div');
        div.textContent = `${m.name} (${m.unit})`;
        div.onmousedown = function(e) { e.preventDefault(); };
        div.onclick = function() {
            document.getElementById('ingredientSearch').value = m.name;
            selectedMaterialId = m.id;
            selectedMaterialUnit = m.unit;
            document.getElementById('ingredientUnitLabel').textContent = m.unit;
            document.getElementById('ingredientQty').placeholder = `الكمية بـ ${m.unit}`;
            optionsContainer.style.display = 'none';
            document.getElementById('ingredientQty').focus();
        };
        optionsContainer.appendChild(div);
    });
    optionsContainer.style.display = filtered.length ? 'block' : 'none';
}

function addIngredientToRecipe() {
    const qty = parseFloat(document.getElementById('ingredientQty').value);
    if (!selectedMaterialId || isNaN(qty) || qty <= 0) return showToast('اختر مادة وأدخل كمية صحيحة', true);
    const mat = allMaterials.find(m => m.id === selectedMaterialId);
    if (!mat) return showToast('المادة غير موجودة', true);
    const existing = currentRecipeIngredients.find(i => i.materialId === mat.id);
    if (existing) existing.quantity += qty;
    else currentRecipeIngredients.push({ materialId: mat.id, materialName: mat.name, quantity: qty, unit: mat.unit });
    renderIngredientsList();
    document.getElementById('ingredientSearch').value = '';
    document.getElementById('ingredientQty').value = '';
    document.getElementById('ingredientUnitLabel').textContent = '';
    document.getElementById('ingredientQty').placeholder = 'الكمية';
    selectedMaterialId = null;
    selectedMaterialUnit = '';
    filterIngredients();
    showToast(`تمت إضافة ${qty} ${mat.unit} من ${mat.name}`);
}

function removeIngredient(i) {
    currentRecipeIngredients.splice(i, 1);
    renderIngredientsList();
}

async function saveRecipeIngredients() {
    if (!currentEditingRecipe) return;
    const res = await callServer('saveRecipeIngredients', { recipeName: currentEditingRecipe, ingredients: currentRecipeIngredients }, true);
    if (res.success) {
        showToast('تم حفظ المكونات');
        closeModals();
        refreshCostsAndPrices(true);
    } else {
        showToast(res.error, true);
    }
}

async function refreshCostsAndPrices(forceServer = false) {
    if (forceServer || !dataLoaded || (Date.now() - dataCacheTimestamp) > CACHE_DURATION_MS) {
        const recRes = await callServer('getAllRecipes', {}, false);
        if (recRes.success) {
            allRecipes = recRes.recipes;
            dataLoaded = true;
            dataCacheTimestamp = Date.now();
        }
        const matRes = await callServer('getAllMaterials', {}, false);
        if (matRes.success) allMaterials = matRes.materials;
    }
    renderRecipesTable();
    if (typeof renderMaterialsTable === 'function') renderMaterialsTable();
}

// ============================================================
// تعديل اسم الطبق (Rename Recipe)
// ============================================================
async function promptRenameRecipe() {
    if (!currentEditingRecipe) {
        showToast('لا يوجد طبق مفتوح', true);
        return;
    }
    const oldName = currentEditingRecipe;

    const input = prompt('أدخل الاسم الجديد للطبق:\n\n(ملاحظة: لا يمكن استخدام الرموز [ ] * / \\ ? :)', oldName);
    if (input === null) return; // المستخدم ألغى
    const cleanName = String(input).trim();

    if (!cleanName) {
        showToast('الاسم لا يمكن أن يكون فارغاً', true);
        return;
    }
    if (cleanName === oldName) return;

    // تحقق من الرموز غير المسموحة في أسماء أوراق Google Sheets
    if (/[\[\]\*\/\\\?\:]/.test(cleanName)) {
        showToast('الاسم يحتوي رموزاً غير مسموحة: [ ] * / \\ ? :', true);
        return;
    }
    if (cleanName.length > 100) {
        showToast('الاسم طويل جداً (الحد 100 حرف)', true);
        return;
    }

    // تحقق من عدم وجود طبق آخر بنفس الاسم
    if (allRecipes.some(r => r.name === cleanName)) {
        showToast('يوجد طبق آخر بنفس الاسم', true);
        return;
    }

    showLoading();
    try {
        const res = await callServer('renameRecipe', { oldName: oldName, newName: cleanName }, false);
        if (!res.success) {
            showToast('❌ ' + (res.error || 'فشل تعديل الاسم'), true);
            return;
        }

        // 1) تحديث allRecipes في الذاكرة
        const recipe = allRecipes.find(r => r.name === oldName);
        if (recipe) recipe.name = cleanName;

        // 2) ترحيل بيانات menuData (هندسة المنيو) من الاسم القديم إلى الجديد
        if (menuData[oldName]) {
            menuData[cleanName] = menuData[oldName];
            delete menuData[oldName];
            if (typeof saveMenuDataToStorage === 'function') saveMenuDataToStorage();
        }

        // 3) تحديث الطبق المفتوح حالياً في المودال
        currentEditingRecipe = cleanName;
        const nameEl = document.getElementById('currentRecipeName');
        if (nameEl) nameEl.textContent = cleanName;

        // 4) إعادة رسم جداول الأطباق
        renderRecipesTable();

        // 5) إعادة رسم نموذج هندسة المنيو إن كان موجوداً
        if (typeof renderMenuInputForm === 'function') {
            try { renderMenuInputForm(); } catch (e) {}
        }

        // 6) إذا كانت الصفحة على تبويب هندسة المنيو، أعد التحليل لعرض الاسم الجديد
        if (currentTab === 2 && typeof analyzeMenuEngineering === 'function') {
            try { analyzeMenuEngineering(); } catch (e) {}
        }

        // 7) تنبيه النسخ الاحتياطي
        if (typeof markDataChanged === 'function') markDataChanged();

        showToast('✅ تم تعديل الاسم إلى "' + cleanName + '"');
    } catch (e) {
        showToast('❌ خطأ: ' + (e.message || 'غير معروف'), true);
    } finally {
        hideLoading();
    }
}

// ============================================================
// ربط زر تعديل اسم الطبق (يُربط تلقائياً عند تحميل الصفحة)
// ============================================================
(function bindRenameRecipeButton() {
    function attach() {
        const btn = document.getElementById('editRecipeNameBtn');
        if (btn && !btn._renameBound) {
            btn._renameBound = true;
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                promptRenameRecipe();
            });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
})();
