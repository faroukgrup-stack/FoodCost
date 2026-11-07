
/* FoodCost R5 additive client. Load AFTER all existing scripts, including repairs-r4.js. */
(function(){
 'use strict';
 if(window.FOODCOST_R5)return;
 const app=window.FOODCOST_R5={build:'r5',revision:null,ready:false};
 const key=()=> 'foodcost-r5-pending-banner:'+currentUserEmail;
 function token(){return localStorage.getItem('foodUserToken')||'';}
 async function rpc(fn,params={}){
  const response=await fetch(COST_API_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({...params,fn,restaurantEmail:currentUserEmail,token:token()})});
  if(!response.ok)throw new Error('HTTP '+response.status);
  let out;try{out=await response.json();}catch(e){throw new Error('العنوان المستخدم لم يُرجع JSON صالحاً. افحص نشر الدالة api على Supabase: '+COST_API_URL);}
  if(!out?.success){
   if(out?.authError)throw new Error('انتهت الجلسة أو لا تخص المطعم. سجّل الدخول مجدداً.');
   const error=new Error(out?.error||'استجابة غير صحيحة');error.code=out?.code;
   if(/دالة غير معروفة|unknown function/i.test(error.message))error.message='هذا النشر لا يدعم R5. الواجهة تستخدم: '+COST_API_URL+' — تأكد من نشر آخر نسخة من الدالة api على Supabase.';
   throw error;
  }
  return out;
 }
 app.rpc=rpc;
 function bannerId(value){try{const u=new URL(String(value));if(!['drive.google.com','lh3.googleusercontent.com'].includes(u.hostname))return u.href;return u.searchParams.get('id')||(u.pathname.match(/\/d\/([\w-]+)/)||[])[1]||u.href;}catch(e){return String(value);}}
 function same(a,b){return a.length===b.length&&a.every((url,i)=>bannerId(url)===bannerId(b[i]));}
 function pending(){try{return JSON.parse(sessionStorage.getItem(key())||'null');}catch(e){return null;}}
 function setPending(value){try{if(value)sessionStorage.setItem(key(),JSON.stringify(value));else sessionStorage.removeItem(key());}catch(e){}updateTools();}
 async function read(){
  const out=await rpc('r5BannerRead');if(out.protocol!==5||!Array.isArray(out.banners))throw new Error('استجابة R5 غير متوافقة');
  app.revision=out.revision;app.ready=true;digitalMenuSettings.banners=out.banners;
  renderBannerAdmin();updateTools();return out;
 }
 app.readBanners=read;
 async function save(next,expected){
  if(expected===undefined){if(app.revision===null)await read();expected=app.revision;}
  const saved=await rpc('r5BannerWrite',{banners:next,expectedRevision:expected});
  const check=await rpc('r5BannerRead');
  if(check.revision!==saved.revision||!same(check.banners,next))throw new Error('وصل الحفظ، لكن بيانات الشريط تغيّرت أو تعذر تأكيدها. أعد القراءة قبل إعادة المحاولة.');
  app.revision=check.revision;digitalMenuSettings.banners=check.banners;renderBannerAdmin();updateTools();
  if(typeof markDataChanged==='function')markDataChanged();
  return check;
 }
 async function savePending(){
  if(dmBannerBusy)throw new Error('انتظر انتهاء العملية الحالية');
  const p=pending();if(!p?.url)return showToast('لا توجد صورة معلقة للحفظ',true);
  const current=await read();
  if(current.banners.some(u=>bannerId(u)===bannerId(p.url))){setPending(null);return showToast('الصورة محفوظة بالفعل');}
  if(current.banners.length>=3)throw new Error('الشريط ممتلئ؛ احذف صورة قبل إضافة الصورة المعلقة');
  await save([...current.banners,p.url],current.revision);setPending(null);showToast('تم حفظ البنر والتحقق منه');
 }
 function button(label,action){const b=document.createElement('button');b.type='button';b.className='btn btn-outline btn-sm';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){showToast(e.message,true);}finally{b.disabled=false;}};return b;}
 function updateTools(){
  const list=document.getElementById('dmBannerList');if(!list)return;
  let box=document.getElementById('r5BannerTools');if(!box){box=document.createElement('div');box.id='r5BannerTools';list.after(box);}box.replaceChildren();
  const text=document.createElement('p');text.className='r5-banner-status';text.textContent=app.ready?'حفظ مستقل للبنرات · R5 · إصدار الحفظ '+app.revision:'R5 · لم يتم فحص الاتصال بعد';box.append(text);
  box.append(button('فحص حفظ الشريط',async()=>{const info=await rpc('r5Info');await read();alert('واجهة R5\nالسيرفر: '+info.build+'\nمصدر البيانات: '+info.spreadsheetId+'\nإصدار البنرات: '+info.banners.revision+'\nعنوان API المستخدم:\n'+COST_API_URL);}));
  box.append(button('إضافة رابط صورة مرفوعة سابقاً',async()=>{if(dmBannerBusy)throw new Error('انتظر انتهاء العملية الحالية');const url=prompt('ألصق رابط صورة مرفوعة سابقاً (Supabase Storage أو Drive). لا حاجة لإعادة رفع الصورة.');if(!url)return;const u=new URL(url.trim());if(u.protocol!=='https:')throw new Error('رابط HTTPS مطلوب');setPending({url:u.href});await savePending();}));
  if(pending())box.append(button('إعادة حفظ الصورة المرفوعة دون رفعها مجدداً',savePending));
 }
 function unsaved(){
  if(typeof r4States!=='undefined'&&typeof r4IsDirty==='function'&&[...r4States.keys()].some(r4IsDirty))return true;
  if(typeof editorStates!=='undefined'&&typeof isEditorDirty==='function'&&[...editorStates.keys()].some(isEditorDirty))return true;
  return false;
 }
 async function hash(base64){const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function checkBackup(data){
  if(!data||data.app!=='FoodCost'||data.format!=='full-r5'||String(data.restaurantEmail||'').toLowerCase()!==currentUserEmail.toLowerCase()||!Array.isArray(data.sheets)||!data.sheets.length)throw new Error('نسخة غير صالحة أو لحساب آخر');
  const names=new Set();let cells=0;
  for(const s of data.sheets){if(typeof s.name!=='string'||!s.name||names.has(s.name)||!Array.isArray(s.values)||!s.values.length||!Array.isArray(s.values[0])||!s.values[0].length)throw new Error('ورقة غير صالحة');names.add(s.name);const cols=s.values[0].length;if(s.values.some(row=>!Array.isArray(row)||row.length!==cols))throw new Error('صفوف غير متناسقة');cells+=cols*s.values.length;}
  if(cells>1000000)throw new Error('النسخة أكبر من حد الاستعادة');
  if(!data.bannerState||!Array.isArray(data.bannerState.banners)||data.bannerState.banners.length>3)throw new Error('بيانات بنرات غير صالحة');
  const ids=new Set();if(!Array.isArray(data.assets||[]))throw new Error('بيانات صور غير صالحة');
  for(const a of data.assets||[]){if(!a.id||ids.has(a.id)||!/^image\/(jpeg|png|gif|webp)$/.test(a.mime)||typeof a.base64!=='string'||a.base64.length>17*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64)||!(/^[a-f0-9]{64}$/i).test(a.sha256||'')||!(data.imageRefs?.drive||[]).some(r=>r.id===a.id))throw new Error('ملف صورة غير صالح');ids.add(a.id);}
  return true;
 }
 app.validateBackup=checkBackup;
 function install(){
  if(typeof loadDigitalMenu!=='function'||typeof collectBackupData!=='function'){console.error('R5 must be loaded after the administration scripts.');return;}
  const previousLoad=loadDigitalMenu,previousRestore=performRestore;
  loadDigitalMenu=async function(...args){await previousLoad(...args);try{await read();}catch(e){app.ready=false;updateTools();showToast('تعذر قراءة سجل البنرات R5: '+e.message,true);}};
  dmSaveBanners=async function(next){return save(next);};
  dmUploadBanner=async function(file){
   if(dmBannerBusy)return;dmBannerBusy=true;
   try{
    const current=await read();if(current.banners.length>=3)throw new Error('الحد ثلاث صور للشريط');
    const data=await dmCrop(file,16/9);if(!data)return;
    showLoading();const uploaded=await uploadMenuImagePost(data,'banner-r5.jpg');
    if(!uploaded?.success||!uploaded.url)throw new Error(uploaded?.error||'فشل رفع الصورة');
    setPending({url:uploaded.url,fileId:uploaded.fileId||''});
    await save([...current.banners,uploaded.url],current.revision);setPending(null);showToast('تم حفظ صورة الشريط والتحقق منها');
   }catch(e){showToast(e.message+(pending()?' · الصورة المرفوعة محفوظة كمحاولة معلقة؛ استخدم زر إعادة الحفظ دون إعادة الرفع.':''),true);}
   finally{hideLoading();dmBannerBusy=false;}
  };
  removeBanner=async function(index){
   if(dmBannerBusy||!confirm('حذف الصورة من الشريط فقط؟ لن يُحذف ملفها من التخزين.'))return;
   const selected=(digitalMenuSettings.banners||[])[index];if(!selected)return;dmBannerBusy=true;showLoading();
   try{const current=await read();const next=current.banners.filter(u=>bannerId(u)!==bannerId(selected));if(next.length===current.banners.length)return;await save(next,current.revision);showToast('تم حذف الصورة من الشريط');}
   catch(e){showToast(e.message,true);}finally{hideLoading();dmBannerBusy=false;}
  };
  collectBackupData=async function(){
   if(unsaved())throw new Error('احفظ تعديلات النماذج قبل إنشاء النسخة');
   const result=await rpc('r5Export'),data=result.backup;
   if(data?.format!=='full-r5')throw new Error('استجابة النسخ غير متوافقة');
   data.assets=[];data.warnings=[];data.complete=true;
   for(const ref of data.imageRefs.drive){
    try{const result=await rpc('r5BackupImage',{fileId:ref.id}),asset=result.asset;if(await hash(asset.base64)!==asset.sha256)throw new Error('فشل تحقق SHA-256');data.assets.push(asset);}
    catch(e){data.complete=false;data.warnings.push('ملف صورة غير مضمن '+ref.id+': '+e.message);}
   }
   if(data.imageRefs.external.length){data.complete=false;data.warnings.push('صور خارجية: الروابط فقط، وعددها '+data.imageRefs.external.length);}
   data.coverage.driveImageFiles=data.assets.length===data.imageRefs.drive.length?'included':'partial';
   data.manifest={sheetCount:data.sheets.length,imageRefs:data.imageRefs.drive.length,includedFiles:data.assets.length,externalUrls:data.imageRefs.external.length,integrity:'SHA-256 per embedded image'};
   return data;
  };
  performRestore=async function(data){
   if(data.format!=='full-r5'){if(data.format==='full-r4'&&typeof r4ValidateBackup!=='function'&&!previousRestore.toString().includes('full-r4'))throw new Error('هذه الواجهة القديمة لا تدعم استعادة R4 بأمان؛ لم تُعدّل البيانات');return previousRestore(data);}
   checkBackup(data);showExportLoading('استعادة نسخة R5','التحقق من سلامة الصور قبل تعديل البيانات…');
   try{
    for(const asset of data.assets||[])if(await hash(asset.base64)!==asset.sha256)throw new Error('فشل تحقق ملف الصورة '+asset.id+'؛ لم يتم تحويل ربط المطعم');
    const changes=[];
    for(let n=0;n<(data.assets||[]).length;n++){
     const asset=data.assets[n];document.getElementById('exportLoadingMsg').textContent='رفع الصورة '+(n+1)+' من '+data.assets.length;
     const uploaded=await rpc('uploadMenuImage',{base64:'data:'+asset.mime+';base64,'+asset.base64,fileName:asset.name||'restored-r5.jpg'});
     if(!uploaded.url)throw new Error('السيرفر لم يرجع رابط الصورة');
     const ref=data.imageRefs.drive.find(r=>r.id===asset.id);(ref.urls||[]).forEach(url=>changes.push([url,uploaded.url]));
    }
    const payload=JSON.parse(JSON.stringify(data));delete payload.assets;let encoded=JSON.stringify(payload);
    changes.forEach(([old,url])=>{encoded=encoded.split(JSON.stringify(old).slice(1,-1)).join(JSON.stringify(url).slice(1,-1));});
    document.getElementById('exportLoadingMsg').textContent='إنشاء ملف استعادة مستقل والتحقق قبل تبديل الربط…';
    const result=await rpc('r5Restore',{backup:JSON.parse(encoded)});
    try{localStorage.setItem('foodRestoreRecovery_'+currentUserEmail,JSON.stringify(result));}catch(e){}
    if(typeof r4States!=='undefined')r4States.clear();if(typeof editorStates!=='undefined')editorStates.clear();
    dataLoaded=false;app.revision=null;await loadAllData(true);await loadDigitalMenu();
    alert('تمت استعادة البيانات. حُفظت لقطة من بياناتك السابقة قبل الاستعادة.\nمعرّف اللقطة للاسترجاع عند الحاجة:\n'+result.previousSpreadsheetId);
   }finally{hideExportLoading();}
  };
  restoreData=function(){
   const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
   input.onchange=async()=>{const file=input.files?.[0];if(!file)return;
    try{
     if(file.size>100*1024*1024)throw new Error('الملف أكبر من حد 100 ميغابايت');const data=JSON.parse(await file.text()),modern=data.format==='full-r5';
     if(modern)checkBackup(data);else if(data.app&&data.app!=='FoodCost'||!['full-r4'].includes(data.format)&&(!Array.isArray(data.materials)||!Array.isArray(data.recipes)))throw new Error('نسخة غير مدعومة');
     if(data.complete===false&&!confirm('نسخة غير مكتملة:\n'+(data.warnings||[]).join('\n')+'\nالاستمرار رغم النقص؟'))return;
     if(!confirm((modern?'استعادة '+data.sheets.length+' ورقة و'+(data.assets||[]).length+' ملف صورة. سيُحتفظ بملف المطعم السابق.':'نسخة قديمة: ستُستخدم آلية الاستعادة السابقة ونطاقها المحدود.')+'\nاستخدم نسخة موثوقة فقط، فقد تحتوي صيغ جداول بيانات.\nتأكيد الاستعادة؟'))return;
     await performRestore(data);
    }catch(e){hideExportLoading();showToast('فشل الاستعادة: '+e.message,true);}
   };input.click();
  };
  // Never record an incomplete or silently-downloaded backup as a complete backup.
  backupData=async function(silent=false){
   if(!currentUserEmail){if(!silent)showToast('يجب تسجيل الدخول',true);return false;}
   if(!silent)showLoading();
   try{
    const started=Date.now(),data=await collectBackupData();
    if(!data.complete&&!confirm('النسخة غير مكتملة:\n'+data.warnings.join('\n')+'\nحفظ نسخة مع هذه التحذيرات؟'))return false;
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    if(blob.size>100*1024*1024)throw new Error('النسخة أكبر من حد أداة الاستعادة؛ لم تُعرض كنسخة مكتملة قابلة للاستعادة');
    const filename='FoodCost_R5_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
    let saved=false;
    if(window.showSaveFilePicker)try{const handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'FoodCost full R5 backup',accept:{'application/json':['.json']}}]});const writer=await handle.createWritable();await writer.write(blob);await writer.close();saved=true;}catch(e){if(e.name==='AbortError')return false;}
    if(!saved){if(typeof saveAs==='function')saveAs(blob,filename);else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}}
    if(data.complete&&saved)localStorage.setItem('foodLastBackupTime',String(started));
    if(!silent)showToast(data.complete?(saved?'تم حفظ النسخة الشاملة والتحقق من ملفات الصور':'تم طلب تنزيل النسخة؛ تحقق من اكتمال تنزيلها على جهازك'):'تم حفظ نسخة مع تحذيرات؛ ليست مكتملة',!data.complete);
    return true;
   }catch(e){if(!silent)showToast('فشل النسخ: '+e.message,true);return false;}
   finally{if(!silent)hideLoading();}
  };
  const style=document.createElement('style');style.textContent='#r5BannerTools{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#r5BannerTools .r5-banner-status{flex:0 0 100%;font-size:12px;color:#cfa776}#r5BannerTools button{width:auto;flex:0 1 auto;min-height:42px}';document.head.append(style);
  updateTools();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
