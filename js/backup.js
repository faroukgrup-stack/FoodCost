// ============================================================
// backup.js - النسخ الاحتياطي والاستعادة
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
        } catch { return null; }
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

async function collectBackupData() {
        const backup = {
            app: 'FoodCost', version: '1.7',
            timestamp: new Date().toISOString(),
            restaurantName: document.getElementById('restaurantNameText')?.textContent || 'المطعم',
            restaurantEmail: currentUserEmail,
            materials: allMaterials.map(m => ({ ...m })),
            recipes: [],
            menuData: JSON.parse(JSON.stringify(menuData || {})),
            settings: { wastePercent: globalWaste, foodCostPercent: foodCostPercent }
        };
        for (const r of allRecipes) {
            try {
                const res = await callServer('getRecipeIngredients', { recipeName: r.name }, false);
                backup.recipes.push({
                    name: r.name, costPrice: r.costPrice || 0,
                    suggestedPrice: r.suggestedPrice || 0,
                    laborPercent: r.laborPercent || 0,
                    ingredients: res.success ? (res.ingredients || []) : []
                });
            } catch {
                backup.recipes.push({ name: r.name, costPrice: r.costPrice || 0, suggestedPrice: r.suggestedPrice || 0, laborPercent: r.laborPercent || 0, ingredients: [] });
            }
        }
        return backup;
    }

async function backupData(silent = false) {
        if (!currentUserEmail) { if (!silent) showToast('يجب تسجيل الدخول', true); return false; }
        if (!silent) showLoading();
        try {
            const data = await collectBackupData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const now = new Date();
            const fileName = `FoodCost_Backup_${now.toISOString().slice(0,10)}_${now.toTimeString().slice(0,8).replace(/:/g,'-')}.json`;
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
                        if (!silent) { hideLoading(); showToast('تم إلغاء النسخ'); }
                        return false;
                    }
                }
            }
            if (!saved) {
                if (typeof saveAs === 'function') saveAs(blob, fileName);
                else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = fileName; a.click();
                    URL.revokeObjectURL(url);
                }
            }
            localStorage.setItem('foodLastBackupTime', Date.now().toString());
            if (!silent) { hideLoading(); showToast('✅ تم إنشاء النسخة الاحتياطية'); }
            return true;
        } catch (e) {
            if (!silent) { hideLoading(); showToast('❌ فشل النسخ: ' + e.message, true); }
            return false;
        }
    }

function restoreData() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json,application/json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!confirm('⚠️ تحذير!\n\nسيتم حذف جميع البيانات الحالية واستبدالها بالبيانات الموجودة في النسخة الاحتياطية.\n\nهل تريد المتابعة؟')) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data.materials || !data.recipes) throw new Error('الملف ليس نسخة احتياطية صالحة');
                await performRestore(data);
            } catch (err) {
                hideExportLoading();
                showToast('❌ فشل الاستعادة: ' + err.message, true);
            }
        };
        input.click();
    }

async function performRestore(data) {
        showExportLoading('جاري الاستعادة...', 'حذف البيانات الحالية');
        try {
            for (const r of [...allRecipes]) await callServer('deleteRecipe', { recipeName: r.name }, false);
            for (const m of [...allMaterials]) await callServer('deleteMaterial', { materialId: m.id }, false);
            document.getElementById('exportLoadingMsg').textContent = 'استعادة المواد...';
            const idMap = {};
            for (const m of data.materials) {
                const res = await callServer('addMaterial', {
                    name: m.name, unit: m.unit,
                    purchasePrice: m.purchasePrice || m.price || 0,
                    purchaseQty: m.purchaseQty || 1,
                    wastePercent: m.wastePercent || 0,
                    portionWeight: m.portionWeight || 0
                }, false);
                if (res.success) idMap[m.id] = res.id;
            }
            document.getElementById('exportLoadingMsg').textContent = 'استعادة الأطباق...';
            for (const r of data.recipes) {
                await callServer('addRecipe', { recipeName: r.name }, false);
                if (r.ingredients && r.ingredients.length) {
                    const ing = r.ingredients.map(i => ({
                        materialId: idMap[i.materialId] || i.materialId,
                        materialName: i.materialName,
                        quantity: i.quantity, unit: i.unit
                    }));
                    await callServer('saveRecipeIngredients', { recipeName: r.name, ingredients: ing }, false);
                }
            }
            if (data.settings) {
                await callServer('updateSettings', { wastePercent: data.settings.wastePercent ?? 5, foodCostPercent: data.settings.foodCostPercent ?? 30 }, false);
            }
            if (data.restaurantName) await callServer('updateRestaurantName', { name: data.restaurantName }, false);
            if (data.menuData && typeof data.menuData === 'object') {
                menuData = data.menuData;
                saveMenuDataToStorage();
            }
            localStorage.setItem('foodLastBackupTime', Date.now().toString());
            hideExportLoading();
            showToast('✅ تم استعادة البيانات');
            dataLoaded = false;
            loadAllData(true);
        } catch (err) {
            hideExportLoading();
            throw err;
        }
    }

function checkPendingBackup() {
        const lastChange = parseInt(localStorage.getItem('foodLastDataChange') || '0');
        const lastBackup = parseInt(localStorage.getItem('foodLastBackupTime') || '0');
        if (lastChange > lastBackup && lastChange > 0) {
            const dt = new Date(lastChange).toLocaleString('ar-EG');
            setTimeout(() => {
                if (confirm(`⚠️ لديك تغييرات غير محفوظة من تاريخ ${dt}.\n\nهل تريد عمل نسخة احتياطية الآن؟`)) backupData();
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
