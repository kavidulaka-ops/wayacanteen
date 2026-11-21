// ==========================================================================
// WAYACANTEEN - PWA REGISTRATION & MOBILE INSTALL MANAGER
// ==========================================================================

let deferredPrompt = null;

// 1. REGISTER SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js', { scope: './' })
            .then(reg => {
                console.log('[WAYACANTEEN PWA] ServiceWorker registered with scope:', reg.scope);
            })
            .catch(err => {
                console.warn('[WAYACANTEEN PWA] ServiceWorker registration failed:', err);
            });
    });
}

// 2. LISTEN FOR MOBILE/DESKTOP INSTALL PROMPT
window.addEventListener('beforeinstallprompt', e => {
    // Prevent default mini-infobar from automatically appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    console.log('[WAYACANTEEN PWA] beforeinstallprompt event captured');

    // Show custom install prompt banner if not previously dismissed
    if (!sessionStorage.getItem('pwa_install_dismissed')) {
        showPwaInstallBanner();
    }
});

// 3. LISTEN FOR SUCCESSFUL APP INSTALLATION
window.addEventListener('appinstalled', () => {
    console.log('[WAYACANTEEN PWA] App installed successfully');
    deferredPrompt = null;
    hidePwaInstallBanner();
});

// 4. CUSTOM PWA INSTALL BANNER (THEMED)
function showPwaInstallBanner() {
    if (document.getElementById('pwaInstallBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwaInstallBanner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
        <div class="pwa-banner-content">
            <div class="pwa-banner-icon">
                <img src="images/icons/icon-96x96.png" alt="W" width="44" height="44">
            </div>
            <div class="pwa-banner-text">
                <div class="pwa-banner-title">Install WAYACANTEEN App</div>
                <div class="pwa-banner-desc">Get faster access, live rush updates and offline menus on your phone.</div>
            </div>
        </div>
        <div class="pwa-banner-actions">
            <button type="button" class="pwa-install-btn" id="pwaTriggerInstallBtn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Install</span>
            </button>
            <button type="button" class="pwa-close-btn" id="pwaDismissBtn" title="Dismiss" aria-label="Dismiss">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `;

    document.body.appendChild(banner);

    // Attach event listeners
    const triggerBtn = document.getElementById('pwaTriggerInstallBtn');
    const dismissBtn = document.getElementById('pwaDismissBtn');

    if (triggerBtn) {
        triggerBtn.addEventListener('click', triggerPwaInstall);
    }
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            sessionStorage.setItem('pwa_install_dismissed', 'true');
            hidePwaInstallBanner();
        });
    }
}

function hidePwaInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(100%)';
        setTimeout(() => banner.remove(), 300);
    }
}

async function triggerPwaInstall() {
    if (!deferredPrompt) {
        console.log('[WAYACANTEEN PWA] No deferred prompt available');
        return;
    }

    // Show the native browser install prompt
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[WAYACANTEEN PWA] User response to install prompt: ${outcome}`);

    deferredPrompt = null;
    hidePwaInstallBanner();
}
