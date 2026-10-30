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

    // محاولة الحفظ في السيرفر (إن وُجدت الدالة)
    try {
        await callServer('updateRecipeSellingPrice', { recipeName, sellingPrice: price }, false);
    } catch (e) { /* تجاهل إن لم تكن موجودة بعد */ }

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
        closeModals();
        const res = await callServer('addRecipe', { recipeName: name }, true);
        if (res.success) {
            allRecipes.push({ name: name, costPrice: 0, laborPercent: 0, suggestedPrice: 0 });
            renderRecipesTable(); showToast('تمت الإضافة');
        } else showToast(res.error, true);
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
            if (res.success) { allRecipes = allRecipes.filter(r => r.name !== d.name); renderRecipesTable(); showToast('تم الحذف'); }
        } else {
            res = await callServer('deleteMaterial', { materialId: d.id }, true);
            if (res.success) { allMaterials = allMaterials.filter(m => m.id !== d.id); renderMaterialsTable(); refreshCostsAndPrices(true); showToast('تم الحذف'); }
        }
        pendingDelete = null;
    }

async function openIngredientsModal(recipeName) {
        currentEditingRecipe = recipeName;
        document.getElementById('currentRecipeName').textContent = recipeName;
        document.getElementById('editRecipeNameBtn').style.display = 'inline-block';
        const res = await callServer('getRecipeIngredients', { recipeName });
        currentRecipeIngredients = res.success ? (res.ingredients || []) : [];
        renderIngredientsList();
        document.getElementById('ingredientQty').value = '';
        document.getElementById('ingredientSearch').value = '';
        document.getElementById('ingredientUnitLabel').textContent = '';
        selectedMaterialId = null; selectedMaterialUnit = '';
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
        selectedMaterialId = null; selectedMaterialUnit = '';
        filterIngredients();
        showToast(`تمت إضافة ${qty} ${mat.unit} من ${mat.name}`);
    }

function removeIngredient(i) { currentRecipeIngredients.splice(i, 1); renderIngredientsList(); }

async function saveRecipeIngredients() {
        if (!currentEditingRecipe) return;
        const res = await callServer('saveRecipeIngredients', { recipeName: currentEditingRecipe, ingredients: currentRecipeIngredients }, true);
        if (res.success) { showToast('تم حفظ المكونات'); closeModals(); refreshCostsAndPrices(true); }
        else showToast(res.error, true);
    }

async function refreshCostsAndPrices(forceServer = false) {
        if (forceServer || !dataLoaded || (Date.now() - dataCacheTimestamp) > CACHE_DURATION_MS) {
            const recRes = await callServer('getAllRecipes', {}, false);
            if (recRes.success) { allRecipes = recRes.recipes; dataLoaded = true; dataCacheTimestamp = Date.now(); }
            const matRes = await callServer('getAllMaterials', {}, false);
            if (matRes.success) allMaterials = matRes.materials;
        }
        renderRecipesTable(); renderMaterialsTable();
    }

