
// R4 applies after the existing app; unrelated tools are left unchanged.
const r4States=new Map();
const r4Fields={settingsModal:['settingsRestaurantName','globalWastePercent','foodCostPercent','settingsCurrency','minMarginPercent'],dmSettings:['dmDisplayName','dmSubtitle','dmWhatsapp','dmCurrency']};
function r4Signature(id){const els=id==='dmItemModal'?[...document.querySelectorAll('#dmItemModal input:not([type=file]),#dmItemModal select,#dmItemModal textarea')]:r4Fields[id].map(k=>document.getElementById(k));return JSON.stringify(els.map(e=>e?[e.id||e.className,e.type==='checkbox'?e.checked:e.value]:null));}
function r4Clean(id){r4States.set(id,{base:r4Signature(id),dirty:false,busy:false});r4Indicators();}
function r4Dirty(id){const st=r4States.get(id)||{base:r4Signature(id)};st.dirty=true;r4States.set(id,st);r4Indicators();}
function r4IsDirty(id){const s=r4States.get(id);return !!s&&(s.dirty||s.base!==r4Signature(id));}
function r4Busy(id,value){const s=r4States.get(id)||{base:r4Signature(id)};s.busy=value;r4States.set(id,s);r4Indicators();}
function r4Indicators(){[['settingsModal','saveSettingsBtn','حفظ الإعدادات'],['dmSettings','dmSettingsSaveBtn','حفظ إعدادات المينيو'],['dmItemModal','dmItemSaveBtn','حفظ الصنف']].forEach(([id,key,text])=>{const el=document.getElementById(key);if(el){const busy=r4States.get(id)?.busy,dirty=r4IsDirty(id);el.disabled=!!busy;el.classList.toggle('has-unsaved',dirty);el.textContent=busy?'جارٍ الحفظ…':text+(dirty?' — تغييرات غير محفوظة':'');}});}
const r4Close=closeModals;
closeModals=function(force=false){if(document.querySelector('.dm-crop-dialog[open]'))return;for(const id of ['settingsModal','dmItemModal'])if(document.getElementById(id)?.classList.contains('active')){if(r4States.get(id)?.busy&&!force)return;if(!force&&r4IsDirty(id)&&!confirm('توجد تغييرات غير محفوظة. إغلاق والتخلي عنها؟'))return;}r4Close();['settingsModal','dmItemModal'].forEach(r4Clean);};
const r4OpenSettings=showSettingsModal;showSettingsModal=function(){r4OpenSettings();r4Clean('settingsModal');};
const r4OpenItem=openAddMenuItemModal;openAddMenuItemModal=function(flag){r4OpenItem(flag);r4Clean('dmItemModal');};
const r4EditItem=editMenuItem;editMenuItem=function(id){r4EditItem(id);r4Clean('dmItemModal');};
const r4Render=renderDigitalMenuUI;renderDigitalMenuUI=function(){const preserve=r4IsDirty('dmSettings');const values=r4Fields.dmSettings.map(id=>document.getElementById(id)?.value);r4Render();if(preserve)r4Fields.dmSettings.forEach((id,n)=>{const el=document.getElementById(id);if(el)el.value=values[n];});else r4Clean('dmSettings');r4Indicators();};
const r4Load=loadDigitalMenu;loadDigitalMenu=async function(){if(r4IsDirty('dmSettings')&&!confirm('إعادة التحميل تلغي تعديلات إعدادات المينيو غير المحفوظة. متابعة؟'))return;r4States.delete('dmSettings');await r4Load();};
const r4Select=selectCurrency;selectCurrency=function(...args){r4Select(...args);r4Indicators();};
document.addEventListener('input',r4Indicators);document.addEventListener('change',r4Indicators);document.addEventListener('click',()=>setTimeout(r4Indicators,0));
window.addEventListener('beforeunload',e=>{if([...r4States.keys()].some(r4IsDirty)){e.preventDefault();e.returnValue='';}});
saveSettings=async function(){
 if(r4States.get('settingsModal')?.busy)return;
 const val=id=>document.getElementById(id).value;
 const waste=Number(val('globalWastePercent')),fcp=Number(val('foodCostPercent')),margin=Number(val('minMarginPercent')),name=val('settingsRestaurantName').trim(),currency=val('settingsCurrency').trim();
 if(!name||!currency||![waste,fcp,margin].every(Number.isFinite)||waste<0||waste>=100||fcp<=0||fcp>=100||margin<0||margin>100)return showToast('تحقق من الاسم والعملة والنسب المدخلة',true);
 r4Busy('settingsModal',true);
 try{const res=await callServer('updateSettings',{wastePercent:waste,foodCostPercent:fcp,currency,minMarginPercent:margin},false);if(!res?.success)throw new Error(res?.error||'فشل الحفظ');globalWaste=waste;foodCostPercent=fcp;appCurrency=currency;minMarginPercent=margin;
  const el=document.getElementById('restaurantNameText');if(name!==el?.textContent){const r=await callServer('updateRestaurantName',{name},false);if(!r?.success)throw new Error('حُفظت النسب لكن تعذر حفظ اسم المطعم: '+(r?.error||''));if(el)el.textContent=name;}
  try{localStorage.setItem('foodCurrency_'+currentUserEmail,currency);localStorage.setItem('foodMinMargin_'+currentUserEmail,String(margin));}catch(e){}
  r4Clean('settingsModal');closeModals(true);showToast('تم حفظ الإعدادات');if(typeof generateQRCode==='function')generateQRCode();if(typeof refreshCostsAndPrices==='function')Promise.resolve(refreshCostsAndPrices(true)).catch(()=>{});
 }catch(e){showToast(e.message,true);}finally{r4Busy('settingsModal',false);}
};
saveDigitalMenuSettings=async function(){
 if(r4States.get('dmSettings')?.busy)return;const next={...digitalMenuSettings};['displayName','subtitle','whatsapp','currency'].forEach((key,n)=>next[key]=document.getElementById(r4Fields.dmSettings[n]).value.trim());
 r4Busy('dmSettings',true);try{const res=await menuWrite('saveDigitalMenu',{menuSettings:next});if(!res?.success)throw new Error(res?.error||'تعذر الحفظ');digitalMenuSettings=next;r4Clean('dmSettings');generateMenuQR();showToast('تم حفظ إعدادات المينيو');}catch(e){showToast(e.message,true);}finally{r4Busy('dmSettings',false);}
};
saveMenuItemFromModal=async function(){
 if(r4States.get('dmItemModal')?.busy)return;
 const value=id=>document.getElementById(id).value;
 const name=value('dmItemName').trim();if(!name)return showToast('اسم الصنف مطلوب',true);
 let category=value('dmItemCategory');if(category==='أخرى'){category=prompt('اسم القسم الجديد:')?.trim();if(!category)return;}
 const sizes=[...document.querySelectorAll('#dmSizesContainer .dm-size-row')].map(row=>({name:row.querySelector('.dm-size-name').value.trim(),price:parseFloat(row.querySelector('.dm-size-price').value)}));
 if(!sizes.length||sizes.some(s=>!s.name||!Number.isFinite(s.price)||s.price<0))return showToast('أكمل اسم وسعر كل حجم',true);
 r4Busy('dmItemModal',true);
 try{let imageUrl=value('dmItemImageUrl').trim();const canvas=document.getElementById('dmCropCanvas');if(cropState.img&&canvas.style.display!=='none'){const up=await uploadMenuImagePost(canvas.toDataURL('image/jpeg',.87),name+'.jpg');if(!up?.success||!up.url)throw new Error(up?.error||'فشل رفع الصورة');imageUrl=up.url;document.getElementById('dmItemImageUrl').value=imageUrl;cropState.img=null;}
  const item={id:editingMenuItemId||'mi_'+Date.now()+'_'+Math.random().toString(36).slice(2,8),name,description:value('dmItemDesc').trim(),category,recipeName:value('dmItemRecipe')||null,imageUrl,sizes,extras:collectExtras(),visible:document.getElementById('dmItemVisible').checked,featured:document.getElementById('dmItemFeatured').checked};
  const next=JSON.parse(JSON.stringify(digitalMenuItems)),n=next.findIndex(it=>it.id===item.id);if(n<0)next.push(item);else next[n]=item;next.forEach((it,i)=>it.sortOrder=i);const categories=[...new Set([...digitalMenuCategories,category])];
  const saved=await menuWrite('saveDigitalMenu',{items:next,categories});if(!saved?.success)throw new Error(saved?.error||'فشل حفظ الصنف');digitalMenuItems=next;digitalMenuCategories=categories;r4Clean('dmItemModal');closeModals(true);renderDigitalMenuUI();showToast('تم حفظ الصنف');
 }catch(e){showToast(e.message,true);}finally{r4Busy('dmItemModal',false);}
};
dmSaveBanners=async function(next){
 let saved=await menuWrite('saveMenuBanners',{banners:next});
 if(!saved?.success&&/دالة غير معروفة|unknown function/i.test(saved?.error||''))saved=await menuWrite('saveDigitalMenu',{menuSettings:{banners:next},restoreBanners:true});
 if(!saved?.success)throw new Error('فشل حفظ الشريط: '+(saved?.error||'استجابة غير صحيحة'));
 const check=await callServer('getDigitalMenu',{},false);
 if(!check?.success||JSON.stringify(check.menuSettings?.banners)!==JSON.stringify(next))throw new Error('لم يؤكد السيرفر حفظ البنرات. افحص عنوان النشر في js/config.js واستجابة getDigitalMenu.');
 digitalMenuSettings.banners=check.menuSettings.banners;renderBannerAdmin();
};


// Full R4 snapshots supersede the old incomplete exporter; legacy imports are kept.
const r4LegacyRestore=performRestore;
collectBackupData=async function(){
 if([...r4States.keys()].some(r4IsDirty))throw new Error('احفظ تعديلات النماذج قبل النسخ الاحتياطي');
 const result=await callServer('exportFullBackup',{},false);if(!result?.success||!result.backup)throw new Error('تعذر النسخ الشامل: '+(result?.error||'انشر سكربت R4 على عنوان API المستخدم'));
 const data=result.backup;data.assets=[];
 for(const ref of data.imageRefs?.drive||[]){const res=await callServer('getFullBackupImage',{fileId:ref.id},false);if(res?.success&&res.asset)data.assets.push(res.asset);else{data.complete=false;data.warnings.push('صورة غير مضمنة '+ref.id+': '+(res?.error||'فشل الاتصال'));}}
 if(data.imageRefs?.external?.length){data.complete=false;data.warnings.push('حُفظت روابط الصور الخارجية فقط، وعددها '+data.imageRefs.external.length);}
 return data;
};
function r4ValidateBackup(data){
 if(!data||data.app!=='FoodCost'||data.format!=='full-r4'||!Array.isArray(data.sheets)||!data.sheets.length)throw new Error('نسخة غير صالحة');
 if(String(data.restaurantEmail||'').toLowerCase()!==currentUserEmail.toLowerCase())throw new Error('نسخة لحساب آخر');
 const seen=new Set();let total=0;for(const sheet of data.sheets){if(typeof sheet.name!=='string'||seen.has(sheet.name)||!Array.isArray(sheet.values)||!sheet.values.length||!Array.isArray(sheet.values[0])||!sheet.values[0].length)throw new Error('ورقة غير صالحة');seen.add(sheet.name);const cols=sheet.values[0].length;if(sheet.values.some(r=>!Array.isArray(r)||r.length!==cols))throw new Error('صفوف غير متناسقة');total+=cols*sheet.values.length;}if(total>1000000)throw new Error('النسخة أكبر من حد الاستعادة');
 const ids=new Set();for(const asset of data.assets||[]){if(!asset.id||ids.has(asset.id)||!/^image\/(jpeg|png|webp|gif)$/.test(asset.mime)||typeof asset.base64!=='string'||asset.base64.length>17*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(asset.base64)||!(data.imageRefs?.drive||[]).some(ref=>ref.id===asset.id))throw new Error('صورة مضمنة غير صالحة');ids.add(asset.id);}return true;
}
performRestore=async function(data){
 if(data.format!=='full-r4')return r4LegacyRestore(data);
 r4ValidateBackup(data);showExportLoading('استعادة نسخة شاملة','استعادة ملفات الصور…');
 try{
  const urls=[];for(const asset of data.assets||[]){const up=await menuWrite('uploadMenuImage',{base64:'data:'+asset.mime+';base64,'+asset.base64,fileName:asset.name||'restored.jpg'});if(!up?.success||!up.url)throw new Error('تعذر رفع صورة: '+(up?.error||asset.id));const ref=data.imageRefs.drive.find(r=>r.id===asset.id);for(const old of ref.urls||[])urls.push([old,up.url]);}
  const payload=JSON.parse(JSON.stringify(data));delete payload.assets;let serialized=JSON.stringify(payload);for(const [old,url] of urls)serialized=serialized.split(JSON.stringify(old).slice(1,-1)).join(JSON.stringify(url).slice(1,-1));
  document.getElementById('exportLoadingMsg').textContent='إنشاء ملف استعادة جديد؛ لن يُحذف ملف البيانات الحالي…';
  const result=await menuWrite('restoreFullBackup',{backup:JSON.parse(serialized)});if(!result?.success)throw new Error(result?.error||'تعذر الاستعادة');
  try{localStorage.setItem('foodRestoreRecovery_'+currentUserEmail,JSON.stringify(result));}catch(e){}
  r4States.clear();dataLoaded=false;await loadAllData(true);await loadDigitalMenu();
  alert('تمت الاستعادة. حُفظت لقطة من بياناتك السابقة قبل الاستعادة.\nمعرّف اللقطة للاسترجاع عند الحاجة:\n'+result.previousSpreadsheetId);showToast('تمت استعادة البيانات');
 }finally{hideExportLoading();}
};
const r4LegacyRestorePicker=restoreData;
restoreData=function(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{
 if(file.size>100*1024*1024)throw new Error('النسخة أكبر من حد 100 ميغابايت');const data=JSON.parse(await file.text());
 const full=data.format==='full-r4';if(full)r4ValidateBackup(data);else if(!Array.isArray(data.materials)||!Array.isArray(data.recipes))throw new Error('صيغة غير مدعومة');
 if(data.complete===false&&!confirm('نسخة غير مكتملة:\n'+(data.warnings||[]).join('\n')+'\nالاستمرار رغم النقص؟'))return;
 const message=full?'استعادة '+data.sheets.length+' ورقة بيانات والمينيو والتقييمات و'+(data.assets||[]).length+' صورة مضمنة. سيُحتفظ بملف المطعم الحالي.':'نسخة قديمة: تستعيد المواد والوصفات والإعدادات فقط باستبدال بياناتها الحالية. لا تتضمن المينيو والصور والسجلات الكاملة.';
 if(!confirm(message+'\nاستخدم نسخة موثوقة فقط؛ قد تحتوي صيغ جداول بيانات.\nهل تؤكد الاستعادة؟'))return;await performRestore(data);
 }catch(e){hideExportLoading();showToast('فشل الاستعادة: '+e.message,true);}};input.click();
};
