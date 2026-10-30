// ============================================================
// materials.js - المواد الأولية
// ============================================================

function renderMaterialsTable() {
        const tbody = document.getElementById('materialsBody');
        if (!allMaterials.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">لا توجد مواد.</div></td></tr>'; return; }
        tbody.innerHTML = allMaterials.map((m, i) => `<tr><td>${i+1}</td><td><strong>${escapeHtml(m.name)}</strong></td><td>${escapeHtml(m.unit)}</td><td><span class="badge badge-success">${(m.price||0).toFixed(2)}</span></td><td>${m.wastePercent||0}%</td><td>${m.portionWeight ? m.portionWeight+' '+m.unit : '—'}</td><td><button class="btn btn-sm btn-outline" onclick="editMaterial('${m.id}')"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="confirmDeleteMaterial('${m.id}', '${escapeHtml(m.name)}')"><i class="fas fa-trash-alt"></i></button></td></tr>`).join('');
    }

function updateMatCostPreview() {
        const pp = parseFloat(document.getElementById('matPurchasePrice').value) || 0;
        const pq = parseFloat(document.getElementById('matPurchaseQty').value) || 0;
        const waste = parseFloat(document.getElementById('matWastePercent').value) || 0;
        const unit = (document.getElementById('matUnit').value || 'وحدة').trim() || 'وحدة';
        const netQty = pq * (1 - waste / 100);
        let unitCost = 0;
        if (netQty > 0) unitCost = pp / netQty;
        document.getElementById('matUnitCostValue').textContent = unitCost.toFixed(2);
        document.getElementById('matUnitCostLabel').textContent = 'لكل ' + unit + ' صافي:';
    }

function showAddMaterialModal() {
        document.getElementById('matName').value = '';
        document.getElementById('matUnit').value = '';
        document.getElementById('matPurchasePrice').value = '';
        document.getElementById('matPurchaseQty').value = '1';
        document.getElementById('matWastePercent').value = '0';
        document.getElementById('matPortionWeight').value = '0';
        document.getElementById('materialModalTitle').textContent = 'إضافة مادة أولية';
        document.getElementById('materialModalSub').textContent = 'إدخال بيانات وتكاليف المواد بدقة';
        document.getElementById('materialModalIcon').className = 'fas fa-box';
        const saveBtn = document.getElementById('materialSaveBtn');
        saveBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة';
        saveBtn.className = 'btn btn-success';
        saveBtn.onclick = addMaterial;
        updateMatCostPreview();
        document.getElementById('materialModal').classList.add('active');
    }

function editMaterial(id) {
        const m = allMaterials.find(x => x.id === id);
        if (!m) return;
        document.getElementById('matName').value = m.name;
        document.getElementById('matUnit').value = m.unit;
        document.getElementById('matPurchasePrice').value = m.purchasePrice || m.price;
        document.getElementById('matPurchaseQty').value = m.purchaseQty || 1;
        document.getElementById('matWastePercent').value = m.wastePercent || 0;
        document.getElementById('matPortionWeight').value = m.portionWeight || 0;
        document.getElementById('materialModalTitle').textContent = 'تعديل مادة أولية';
        document.getElementById('materialModalSub').textContent = 'إعادة ضبط قيم وتكاليف المادة بدقة';
        document.getElementById('materialModalIcon').className = 'fas fa-pen-to-square';
        const saveBtn = document.getElementById('materialSaveBtn');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        saveBtn.className = 'btn btn-success';
        saveBtn.onclick = () => updateMaterial(id);
        updateMatCostPreview();
        document.getElementById('materialModal').classList.add('active');
    }

function getMaterialFormData() {
        const name = document.getElementById('matName').value.trim(),
            unit = document.getElementById('matUnit').value.trim(),
            pp = parseFloat(document.getElementById('matPurchasePrice').value),
            pq = parseFloat(document.getElementById('matPurchaseQty').value),
            waste = parseFloat(document.getElementById('matWastePercent').value),
            pw = parseFloat(document.getElementById('matPortionWeight').value);
        if (!name || !unit || isNaN(pp) || isNaN(pq)) { showToast('تأكد من الحقول', true); return null; }
        return { name, unit, purchasePrice: pp, purchaseQty: pq, wastePercent: waste, portionWeight: pw || 0 };
    }

async function addMaterial() {
        const data = getMaterialFormData();
        if (!data) return;
        closeModals();
        const res = await callServer('addMaterial', data, true);
        if (res.success) {
            allMaterials.push({ id: res.id, name: data.name, unit: data.unit, price: 0, purchasePrice: data.purchasePrice, purchaseQty: data.purchaseQty, wastePercent: data.wastePercent, portionWeight: data.portionWeight });
            renderMaterialsTable(); refreshCostsAndPrices(true); showToast('تمت الإضافة');
        } else showToast(res.error, true);
    }

async function updateMaterial(id) {
        const data = getMaterialFormData();
        if (!data) return;
        data.id = id;
        closeModals();
        const res = await callServer('updateMaterial', data, true);
        if (res.success) {
            const idx = allMaterials.findIndex(m => m.id === id);
            if (idx !== -1) {
                allMaterials[idx].name = data.name;
                allMaterials[idx].unit = data.unit;
                allMaterials[idx].purchasePrice = data.purchasePrice;
                allMaterials[idx].purchaseQty = data.purchaseQty;
                allMaterials[idx].wastePercent = data.wastePercent;
                allMaterials[idx].portionWeight = data.portionWeight;
            }
            renderMaterialsTable(); refreshCostsAndPrices(true); showToast('تم التحديث');
            const sb = document.getElementById('materialSaveBtn');
            sb.innerHTML = '<i class="fas fa-plus"></i> إضافة';
            sb.className = 'btn btn-success';
            sb.onclick = addMaterial;
            document.getElementById('materialModalTitle').textContent = 'إضافة مادة أولية';
        } else showToast(res.error, true);
    }

function confirmDeleteMaterial(id, name) {
        pendingDelete = { type: 'material', id, name };
        document.getElementById('confirmTitle').innerHTML = '<i class="fas fa-exclamation-triangle"></i> حذف مادة';
        document.getElementById('confirmMessage').textContent = `هل أنت متأكد من حذف "${name}"؟`;
        document.getElementById('confirmModal').classList.add('active');
    }

