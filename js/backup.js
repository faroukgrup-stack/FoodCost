// ============================================================
// backup.js - النسخ الاحتياطي والاستعادة (محسّن v2.0)
// ============================================================

let backupFileHandle = null;

async function openHandleDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('FoodCostBackupDB', 1);
        req.onupgradeneeded = (e) => e.target.result.createObjectStore('handles');
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

async function getStoredBackupHandle() {
    if (backupFileHandle) return backupFileHandle;
    try {
        const db = await openHandleDB();
        return await new Promise((resolve) => {
            const tx = db.transaction('handles', 'readonly');
            const get = tx.objectStore('handles').get('backupFile');
            get.onsuccess = () => { backupFileHandle = get.result; resolve(get.result); };
            get.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function storeBackupHandle(handle) {
    backupFileHandle = handle;
    try {
        const db = await openHandleDB();
        await new Promise((resolve) => {
            const tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(handle, 'backupFile');
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    } catch {}
}

/**
 * جمع بيانات النسخة الاحتياطية بشكل كامل قدر الإمكان.
 */
async function collectBackupData() {
    const warnings = [];
    let complete = true;

    const backup = {
        app: 'FoodCost',
        version: '2.0',
        timestamp: new Date().toISOString(),
        restaurantName: document.getElementById('restaurantNameText')?.textContent || 'المطعم',
        restaurantEmail: currentUserEmail,
        materials: [],
        recipes: [],
        menuData: {},
        settings: {
            wastePercent: globalWaste,
            foodCostPercent: foodCostPercent,
            currency: appCurrency || 'ر.س',
            minMarginPercent: minMarginPercent || 30
        }
    };

    backup.materials = allMaterials.map(m => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        price: m.price || 0,
        purchasePrice: m.purchasePrice || m.price || 0,
        purchaseQty: m.purchaseQty || 1,
        wastePercent: m.wastePercent || 0,
        portionWeight: m.portionWeight || 0
    }));

    for (const r of allRecipes) {
        let ingredients = [];
        let ingredientsOk = true;

        try {
            const res = await callServer('getRecipeIngredients', { recipeName: r.name }, false);
            if (res && res.success) {
                ingredients = res.ingredients || [];
            } else {
                ingredientsOk = false;
                complete = false;
                warnings.push('فشل جلب مكونات الطبق: ' + r.name);
            }
        } catch (e) {
            ingredientsOk = false;
            complete = false;
            warnings.push('خطأ أثناء جلب مكونات الطبق: ' + r.name);
        }

        const sellingPrice = (typeof getRealPrice === 'function')
            ? getRealPrice(r)
            : (r.sellingPrice || menuData[r.name]?.price || r.suggestedPrice || 0);

        backup.recipes.push({
            name: r.name,
            costPrice: r.costPrice || 0,
            suggestedPrice: r.suggestedPrice || 0,
            sellingPrice: sellingPrice,
            laborPercent: r.laborPercent || 0,
            ingredients: ingredients,
            ingredientsComplete: ingredientsOk
        });
    }

    try {
        backup.menuData = JSON.parse(JSON.stringify(menuData || {}));
    } catch {
        backup.menuData = {};
        complete = false;
        warnings.push('تعذر نسخ بيانات هندسة المنيو');
    }

    backup.complete = complete;
    backup.warnings = warnings;
    return backup;
}

async function backupData(silent = false) {
    if (!currentUserEmail) {
        if (!silent) showToast('يجب تسجيل الدخول', true);
        return false;
    }
    if (!silent) showLoading();

    try {
        const data = await collectBackupData();

        if (!data.complete && data.warnings && data.warnings.length) {
            const msg = '⚠️ النسخة الاحتياطية غير مكتملة:\n\n' +
                data.warnings.slice(0, 5).join('\n') +
                (data.warnings.length > 5 ? '\n...' : '') +
                '\n\nهل تريد حفظها على أي حال؟';
            if (!confirm(msg)) {
                if (!silent) hideLoading();
                return false;
            }
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const now = new Date();
        const fileName = 'FoodCost_Backup_' + now.toISOString().slice(0, 10) + '_' +
            now.toTimeString().slice(0, 8).replace(/:/g, '-') + '.json';

        let saved = false;
        if ('showSaveFilePicker' in window) {
            try {
                let handle = await getStoredBackupHandle();
                if (!handle) {
                    handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{ description: 'نسخة احتياطية - FoodCost', accept: { 'application/json': ['.json'] } }]
                    });
                    await storeBackupHandle(handle);
                }
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                saved = true;
            } catch (e) {
                if (e.name === 'AbortError') {
                    if (!silent) {
                        hideLoading();
                        showToast('تم إلغاء النسخ');
                    }
                    return false;
                }
            }
        }

        if (!saved) {
            if (typeof saveAs === 'function') {
                saveAs(blob, fileName);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
            }
        }

        localStorage.setItem('foodLastBackupTime', Date.now().toString());
        if (!silent) {
            hideLoading();
            const msg = data.complete
                ? '✅ تم إنشاء النسخة الاحتياطية'
                : '⚠️ تم الحفظ مع تحذيرات (بعض المكونات ناقصة)';
            showToast(msg, !data.complete);
        }
        return true;
    } catch (e) {
        if (!silent) {
            hideLoading();
            showToast('❌ فشل النسخ: ' + e.message, true);
        }
        return false;
    }
}

function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm(
            '⚠️ تحذير مهم!\n\n' +
            'سيتم استبدال جميع البيانات الحالية (المواد + الأطباق + الإعدادات) بمحتوى النسخة الاحتياطية.\n\n' +
            'يُنصح بعمل نسخة احتياطية من الوضع الحالي قبل المتابعة.\n\n' +
            'هل تريد المتابعة؟'
        )) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data || typeof data !== 'object') {
                throw new Error('الملف ليس بصيغة JSON صالحة');
            }
            if (!Array.isArray(data.materials) || !Array.isArray(data.recipes)) {
                throw new Error('الملف ليس نسخة احتياطية صالحة (ينقصه materials أو recipes)');
            }
            if (data.app && data.app !== 'FoodCost') {
                throw new Error('هذا الملف ليس من نظام FoodCost');
            }

            if (data.complete === false || (data.warnings && data.warnings.length)) {
                const warnMsg = '⚠️ هذه النسخة الاحتياطية غير مكتملة أو تحتوي تحذيرات.\n\n' +
                    (data.warnings || []).slice(0, 4).join('\n') +
                    '\n\nقد تكون بعض المكونات ناقصة. هل تريد المتابعة؟';
                if (!confirm(warnMsg)) return;
            }

            await performRestore(data);
        } catch (err) {
            hideExportLoading();
            showToast('❌ فشل الاستعادة: ' + (err.message || err), true);
        }
    };
    input.click();
}

async function performRestore(data) {
    showExportLoading('جاري الاستعادة...', 'التحقق من البيانات...');

    const errors = [];
    let materialsRestored = 0;
    let recipesRestored = 0;

    try {
        document.getElementById('exportLoadingMsg').textContent = 'حذف البيانات الحالية...';

        for (const r of [...allRecipes]) {
            const res = await callServer('deleteRecipe', { recipeName: r.name }, false);
            if (!res || !res.success) {
                errors.push('تعذر حذف الطبق: ' + r.name);
            }
        }
        for (const m of [...allMaterials]) {
            const res = await callServer('deleteMaterial', { materialId: m.id }, false);
            if (!res || !res.success) {
                errors.push('تعذر حذف المادة: ' + (m.name || m.id));
            }
        }

        document.getElementById('exportLoadingMsg').textContent = 'استعادة المواد الأولية...';
        const idMap = {};

        for (const m of data.materials) {
            const res = await callServer('addMaterial', {
                name: m.name,
                unit: m.unit,
                purchasePrice: m.purchasePrice || m.price || 0,
                purchaseQty: m.purchaseQty || 1,
                wastePercent: m.wastePercent || 0,
                portionWeight: m.portionWeight || 0
            }, false);

            if (res && res.success && res.id) {
                idMap[m.id] = res.id;
                materialsRestored++;
            } else {
                errors.push('فشل إضافة المادة: ' + m.name);
            }
        }

        if (materialsRestored === 0 && data.materials.length > 0) {
            throw new Error('فشلت استعادة جميع المواد. تم إيقاف العملية لتجنب بيانات ناقصة.');
        }

        document.getElementById('exportLoadingMsg').textContent = 'استعادة الأطباق...';

        for (const r of data.recipes) {
            const addRes = await callServer('addRecipe', { recipeName: r.name }, false);
            if (!addRes || !addRes.success) {
                errors.push('فشل إضافة الطبق: ' + r.name);
                continue;
            }
            recipesRestored++;

            if (r.ingredients && r.ingredients.length) {
                const ing = r.ingredients.map(i => ({
                    materialId: idMap[i.materialId] || i.materialId,
                    materialName: i.materialName,
                    quantity: i.quantity,
                    unit: i.unit
                })).filter(i => i.materialId);

                if (ing.length) {
                    const saveRes = await callServer('saveRecipeIngredients', {
                        recipeName: r.name,
                        ingredients: ing
                    }, false);
                    if (!saveRes || !saveRes.success) {
                        errors.push('فشل حفظ مكونات الطبق: ' + r.name);
                    }
                }
            }

            if (r.sellingPrice && r.sellingPrice > 0) {
                try {
                    await callServer('updateRecipeSellingPrice', {
                        recipeName: r.name,
                        sellingPrice: r.sellingPrice
                    }, false);
                } catch (_) {}
            }
        }

        document.getElementById('exportLoadingMsg').textContent = 'استعادة الإعدادات...';
        if (data.settings) {
            const settingsRes = await callServer('updateSettings', {
                wastePercent: data.settings.wastePercent ?? 5,
                foodCostPercent: data.settings.foodCostPercent ?? 30,
                currency: data.settings.currency || 'ر.س',
                minMarginPercent: data.settings.minMarginPercent ?? 30
            }, false);

            if (settingsRes && settingsRes.success) {
                globalWaste = data.settings.wastePercent ?? 5;
                foodCostPercent = data.settings.foodCostPercent ?? 30;
                appCurrency = data.settings.currency || 'ر.س';
                minMarginPercent = data.settings.minMarginPercent ?? 30;
            } else {
                errors.push('فشل تحديث الإعدادات');
            }
        }

        if (data.restaurantName) {
            await callServer('updateRestaurantName', { name: data.restaurantName }, false);
            const nameEl = document.getElementById('restaurantNameText');
            if (nameEl) nameEl.textContent = data.restaurantName;
        }

        if (data.menuData && typeof data.menuData === 'object') {
            menuData = data.menuData;
            if (typeof saveMenuDataToStorage === 'function') {
                saveMenuDataToStorage();
            }
        }

        localStorage.setItem('foodLastBackupTime', Date.now().toString());
        hideExportLoading();

        let resultMsg = '✅ تمت الاستعادة: ' + materialsRestored + ' مادة، ' + recipesRestored + ' طبق';
        if (errors.length) {
            resultMsg += '\n⚠️ مع ' + errors.length + ' تحذير/خطأ';
            console.warn('أخطاء الاستعادة:', errors);
            const preview = errors.slice(0, 3).join('\n');
            setTimeout(() => {
                alert('تمت الاستعادة مع بعض المشاكل:\n\n' + preview +
                    (errors.length > 3 ? '\n...' : ''));
            }, 400);
        }
        showToast(resultMsg, errors.length > 0);

        dataLoaded = false;
        await loadAllData(true);
        if (typeof switchTab === 'function') {
            switchTab(currentTab === 'dashboard' ? 'dashboard' : currentTab);
        }
    } catch (err) {
        hideExportLoading();
        showToast('❌ فشلت الاستعادة: ' + (err.message || err), true);
        dataLoaded = false;
        try { await loadAllData(true); } catch (_) {}
        throw err;
    }
}

function checkPendingBackup() {
    const lastChange = parseInt(localStorage.getItem('foodLastDataChange') || '0');
    const lastBackup = parseInt(localStorage.getItem('foodLastBackupTime') || '0');
    if (lastChange > lastBackup && lastChange > 0) {
        const dt = new Date(lastChange).toLocaleString('ar-EG');
        setTimeout(() => {
            if (confirm('⚠️ لديك تغييرات غير محفوظة من تاريخ ' + dt + '.\n\nهل تريد عمل نسخة احتياطية الآن؟')) {
                backupData();
            }
        }, 1500);
    }
}

window.addEventListener('beforeunload', (e) => {
    if (!localStorage.getItem('foodUserToken')) return;
    const lastChange = parseInt(localStorage.getItem('foodLastDataChange') || '0');
    const lastBackup = parseInt(localStorage.getItem('foodLastBackupTime') || '0');
    if (lastChange > lastBackup) {
        const msg = '⚠️ لديك تغييرات غير محفوظة!\n\nهل أنت متأكد من المغادرة؟';
        e.preventDefault();
        e.returnValue = msg;
        return msg;
    }
});
