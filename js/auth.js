// ============================================================
// auth.js - تسجيل الدخول والجلسة
// ============================================================

function isSessionExpired() {
        const ts = localStorage.getItem('foodLoginTimestamp');
        if (!ts) return true;
        return (Date.now() - parseInt(ts)) > SESSION_DURATION_MS;
    }

function getRemainingSessionTime() {
        const ts = localStorage.getItem('foodLoginTimestamp');
        if (!ts) return 0;
        return Math.max(0, SESSION_DURATION_MS - (Date.now() - parseInt(ts)));
    }

function logout() {
        localStorage.removeItem('foodUserToken');
        localStorage.removeItem('foodUserName');
        localStorage.removeItem('foodUserEmail');
        localStorage.removeItem('foodDaysLeft');
        localStorage.removeItem('foodLoginTimestamp');
        const loginScreen = document.getElementById('loginScreen');
        const appMain = document.getElementById('appMain');
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appMain) appMain.style.display = 'none';
        document.getElementById('usernameInput').value = '';
        document.getElementById('passwordInput').value = '';
        document.getElementById('errorMsg').textContent = '';
        dataLoaded = false;
    }

function startSessionTimer() {
        const remaining = getRemainingSessionTime();
        if (remaining > 0) setTimeout(() => { logout(); }, remaining);
        else logout();
    }

async function attemptLogin() {
        const user = document.getElementById('usernameInput').value.trim();
        const pass = document.getElementById('passwordInput').value.trim();
        const errDiv = document.getElementById('errorMsg');
        if (!user || !pass) { errDiv.textContent = '❌ الرجاء إدخال البيانات'; return; }
        if (!user.includes('@')) { errDiv.textContent = '❌ بريد إلكتروني غير صالح'; return; }
        const btn = document.getElementById('loginBtn');
        btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> جاري التحقق...';
        btn.disabled = true;
        errDiv.textContent = '';
        try {
            const url = COST_API_URL + '?fn=login&username=' + encodeURIComponent(user) + '&password=' + encodeURIComponent(pass);
            const resp = await fetch(url);
            const result = await resp.json();
            if (result.status === 'success') {
                let token = result.token;
                if (!token) { errDiv.textContent = '❌ لم يتم استلام توكن من السيرفر'; return; }
                localStorage.setItem('foodUserToken', token);
                localStorage.setItem('foodUserName', result.name || user);
                localStorage.setItem('foodUserEmail', result.email || user);
                localStorage.setItem('foodDaysLeft', result.daysLeft || '365');
                localStorage.setItem('foodLoginTimestamp', Date.now().toString());
                currentUserEmail = result.email || user;
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('appMain').style.display = 'block';
                dataLoaded = false;
                loadAllData(true);
                startSessionTimer();
                setTimeout(() => generateQRCode(), 1500);
                setTimeout(() => checkPendingBackup(), 2500);
                switchTab('dashboard');
            } else if (result.status === 'expired') {
                errDiv.innerHTML = '❌ انتهى اشتراكك. <a href="Food-Cost.html" target="_blank" style="color:#cfa776; text-decoration:underline;">جدد من هنا</a>';
            } else if (result.status === 'frozen') {
                errDiv.textContent = '❌ ' + (result.message || 'تم تجميد الحساب');
            } else {
                errDiv.textContent = '❌ ' + (result.message || 'بيانات خاطئة');
            }
        } catch (e) {
            errDiv.textContent = '❌ فشل الاتصال بالسيرفر';
        } finally {
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
            btn.disabled = false;
        }
    }

async function logoutWithBackupCheck() {
        closeRestaurantDropdown();
        const lastChange = parseInt(localStorage.getItem('foodLastDataChange') || '0');
        const lastBackup = parseInt(localStorage.getItem('foodLastBackupTime') || '0');

        if (lastChange > lastBackup && lastChange > 0) {
            const wantBackup = confirm(
                '⚠️ لديك تغييرات غير محفوظة في نسخة احتياطية!\n\n' +
                'هل تريد عمل نسخة احتياطية قبل الخروج؟\n\n' +
                '(اضغط "موافق" لإنشاء النسخة، أو "إلغاء" للمتابعة بدون نسخة)'
            );
            if (wantBackup) {
                const success = await backupData();
                if (!success) {
                    if (!confirm('❌ فشل النسخ الاحتياطي. هل تريد الخروج على أي حال؟')) return;
                }
            } else {
                if (!confirm('هل تريد الخروج بدون حفظ نسخة احتياطية؟')) return;
            }
        }
        logout();
    }

function openChangePasswordModal() { document.getElementById('changePasswordModal').classList.add('active'); }

async function changePassword() {
        const oldPass = document.getElementById('oldPassword').value.trim();
        const newPass = document.getElementById('newPassword').value.trim();
        const confirmPass = document.getElementById('confirmPassword').value.trim();
        if (!oldPass || !newPass || !confirmPass) { showToast('يرجى ملء جميع الحقول', true); return; }
        if (newPass.length < 6) { showToast('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', true); return; }
        if (newPass !== confirmPass) { showToast('كلمة المرور الجديدة وتأكيدها غير متطابقين', true); return; }
        const params = { username: currentUserEmail, oldPassword: oldPass, password: newPass };
        showLoading();
        try {
            const result = await callServer('updateUser', params, false);
            if (result.success) {
                showToast('✅ تم تحديث كلمة المرور بنجاح');
                document.getElementById('oldPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
                document.getElementById('changePasswordModal').classList.remove('active');
            } else showToast('❌ ' + (result.error || 'فشل'), true);
        } catch (e) { showToast('❌ خطأ في الاتصال', true); } finally { hideLoading(); }
    }


// أيقونة العين
(function() {
    const pwdField = document.getElementById('passwordInput');
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const eyeIcon = document.getElementById('eyeIcon');
    if (toggleBtn && pwdField) {
        toggleBtn.addEventListener('click', function() {
            const isPassword = pwdField.type === 'password';
            pwdField.type = isPassword ? 'text' : 'password';
            if (eyeIcon) eyeIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }
})();

// ربط أزرار الدخول
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    const passwordInput = document.getElementById('passwordInput');
    const usernameInput = document.getElementById('usernameInput');
    if (loginBtn) loginBtn.addEventListener('click', attemptLogin);
    if (passwordInput) passwordInput.addEventListener('keypress', e => { if (e.key === 'Enter') attemptLogin(); });
    if (usernameInput) usernameInput.addEventListener('keypress', e => { if (e.key === 'Enter') passwordInput && passwordInput.focus(); });
});
