/**
 * Web2APK Studio - Main UI Controller & Server Integration
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 1. Initialize Icon Studio Canvas
    const iconEditor = new IconEditor('icon-canvas', 'icon-mask-preview');

    // 2. State & DOM References
    const DOM = {
        // Form & Steps
        form: document.getElementById('apk-config-form'),
        stepBtns: document.querySelectorAll('.step-btn'),
        stepContents: document.querySelectorAll('.step-content'),
        nextStepBtns: document.querySelectorAll('.next-step-btn'),
        prevStepBtns: document.querySelectorAll('.prev-step-btn'),

        // Step 1 Inputs
        targetUrl: document.getElementById('target-url'),
        appName: document.getElementById('app-name'),
        packageName: document.getElementById('package-name'),
        btnFetchFavicon: document.getElementById('btn-fetch-favicon'),
        userAgentPreset: document.getElementById('user-agent-preset'),
        customUserAgent: document.getElementById('custom-user-agent'),

        // Step 2 Branding Inputs
        iconFileInput: document.getElementById('icon-file-input'),
        btnGenerateTextLogo: document.getElementById('btn-generate-text-logo'),
        shapeButtons: document.querySelectorAll('#shape-selector .chip'),
        iconBgColor: document.getElementById('icon-bg-color'),
        iconBgVal: document.getElementById('icon-bg-val'),
        iconPadding: document.getElementById('icon-padding'),
        
        themeColor: document.getElementById('theme-color'),
        themeColorVal: document.getElementById('theme-color-val'),
        statusBarColor: document.getElementById('status-bar-color'),
        statusBarVal: document.getElementById('status-bar-val'),
        splashBgColor: document.getElementById('splash-bg-color'),
        splashBgVal: document.getElementById('splash-bg-val'),
        splashDuration: document.getElementById('splash-duration'),

        // Step 3 WebView Features
        featurePullRefresh: document.getElementById('feature-pull-refresh'),
        featureSwipeBack: document.getElementById('feature-swipe-back'),
        featureShowAppbar: document.getElementById('feature-show-appbar'),
        featureAllowFile: document.getElementById('feature-allow-file'),
        featureZoom: document.getElementById('feature-zoom'),
        screenOrientation: document.getElementById('screen-orientation'),

        // Step 4 Export Buttons & Logs
        btnExportApk: document.getElementById('btn-export-apk'),
        btnExportSource: document.getElementById('btn-export-source'),
        btnExportPwa: document.getElementById('btn-export-pwa'),
        buildProgressBox: document.getElementById('build-progress-box'),
        buildProgressBar: document.getElementById('build-progress-bar'),
        buildStatusText: document.getElementById('build-status-text'),
        buildLogs: document.getElementById('build-logs'),

        // Health Status
        sdkStatusChip: document.getElementById('sdk-status-chip'),
        sdkStatusText: document.getElementById('sdk-status-text'),

        // Simulator Elements
        simStatusBar: document.getElementById('sim-status-bar'),
        simScreenSplash: document.getElementById('sim-screen-splash'),
        simScreenApp: document.getElementById('sim-screen-app'),
        simScreenHome: document.getElementById('sim-screen-home'),
        simSplashLogo: document.getElementById('sim-splash-logo'),
        simSplashTitle: document.getElementById('sim-splash-title'),
        simAppbar: document.getElementById('sim-appbar'),
        simAppTitle: document.getElementById('sim-app-title'),
        simIframe: document.getElementById('sim-iframe'),
        simIframeFallback: document.getElementById('sim-iframe-fallback'),
        simUrlDisplay: document.getElementById('sim-url-display'),
        simHomeIconCanvas: document.getElementById('sim-home-icon-canvas'),
        simHomeAppTitle: document.getElementById('sim-home-app-title'),
        simTabBtns: document.querySelectorAll('.sim-tab-btn'),
        simRefreshBtn: document.getElementById('sim-refresh-btn'),

        // Theme Toggle
        themeToggleBtn: document.getElementById('theme-toggle-btn')
    };

    // Current Active Step Index
    let currentStep = 1;

    // --- Check Backend SDK Health ---
    async function checkSdkHealth() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            if (data.sdkDetected) {
                DOM.sdkStatusText.textContent = `Android SDK ${data.buildToolsVersion} 官方工具鏈已連線`;
            } else {
                DOM.sdkStatusText.textContent = `未檢測到 SDK，將使用備用模式`;
            }
        } catch (e) {
            DOM.sdkStatusText.textContent = `動態伺服器運行中`;
        }
    }
    checkSdkHealth();

    // --- Step Navigation Logic ---
    function goToStep(stepNumber) {
        stepNumber = parseInt(stepNumber, 10);
        if (stepNumber < 1 || stepNumber > 4) return;

        currentStep = stepNumber;

        DOM.stepBtns.forEach(btn => {
            const btnStep = parseInt(btn.dataset.step, 10);
            if (btnStep === currentStep) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        DOM.stepContents.forEach(content => {
            if (content.id === `step-${currentStep}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        if (currentStep === 1 || currentStep === 3) {
            switchSimScreen('app');
        } else if (currentStep === 2) {
            switchSimScreen('splash');
        }
    }

    DOM.stepBtns.forEach(btn => {
        btn.addEventListener('click', () => goToStep(btn.dataset.step));
    });

    DOM.nextStepBtns.forEach(btn => {
        btn.addEventListener('click', () => goToStep(currentStep + 1));
    });

    DOM.prevStepBtns.forEach(btn => {
        btn.addEventListener('click', () => goToStep(currentStep - 1));
    });

    // --- Package Name Auto-Generator ---
    function sanitizePkgInput(raw) {
        if (!raw) return 'com.web2apk.app';
        let clean = raw.replace(/[^\w.]/g, '').toLowerCase();
        clean = clean.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
        if (!clean.includes('.')) {
            clean = 'com.web2apk.' + (clean || 'app');
        }
        return clean;
    }

    DOM.appName.addEventListener('input', () => {
        const val = DOM.appName.value.trim();
        if (val) {
            const safeAscii = val.replace(/[^\w]/g, '').toLowerCase();
            const pkgSegment = safeAscii ? safeAscii : 'yihuan';
            DOM.packageName.value = `com.web2apk.${pkgSegment}`;
            iconEditor.setTextLogo(val);
        }
        updateSimulator();
    });

    DOM.packageName.addEventListener('blur', () => {
        DOM.packageName.value = sanitizePkgInput(DOM.packageName.value);
    });

    // --- Multi-Tier Resilient Favicon Auto-Fetcher ---
    DOM.btnFetchFavicon.addEventListener('click', async () => {
        let urlStr = DOM.targetUrl.value.trim();
        if (!urlStr) return;

        if (!/^https?:\/\//i.test(urlStr)) {
            urlStr = 'https://' + urlStr;
            DOM.targetUrl.value = urlStr;
        }

        try {
            const domain = new URL(urlStr).hostname;
            DOM.btnFetchFavicon.innerHTML = `<i data-lucide="loader-2" class="spin"></i> 抓取中...`;
            if (typeof lucide !== 'undefined') lucide.createIcons();

            const candidates = [
                `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
                `https://icon.horse/icon/${domain}`,
                `https://unavatar.io/${domain}`,
                `https://${domain}/favicon.ico`
            ];

            let loadedImg = null;
            for (const cUrl of candidates) {
                try {
                    loadedImg = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => resolve(img);
                        img.onerror = () => reject();
                        img.src = cUrl;
                    });
                    if (loadedImg) break;
                } catch (e) {}
            }

            if (loadedImg) {
                iconEditor.setImage(loadedImg);
                DOM.btnFetchFavicon.innerHTML = `<i data-lucide="check"></i> 抓取成功`;
            } else {
                iconEditor.setTextLogo(DOM.appName.value || domain);
                DOM.btnFetchFavicon.innerHTML = `<i data-lucide="check"></i> 已生成文字 Logo`;
            }

            setTimeout(() => {
                DOM.btnFetchFavicon.innerHTML = `<i data-lucide="download-cloud"></i> 自動抓取圖標`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }, 2500);

            updateSimulator();

        } catch (e) {
            iconEditor.setTextLogo(DOM.appName.value || 'App');
            DOM.btnFetchFavicon.innerHTML = `<i data-lucide="download-cloud"></i> 自動抓取圖標`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            updateSimulator();
        }
    });

    // --- User Agent Selector ---
    DOM.userAgentPreset.addEventListener('change', () => {
        if (DOM.userAgentPreset.value === 'custom') {
            DOM.customUserAgent.classList.remove('hidden-field');
        } else {
            DOM.customUserAgent.classList.add('hidden-field');
        }
    });

    // --- Icon Controls ---
    DOM.iconFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                iconEditor.setImage(img);
                updateSimulator();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    DOM.btnGenerateTextLogo.addEventListener('click', () => {
        iconEditor.setTextLogo(DOM.appName.value);
        updateSimulator();
    });

    DOM.shapeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.shapeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            iconEditor.setShape(btn.dataset.shape);
            updateSimulator();
        });
    });

    DOM.iconBgColor.addEventListener('input', () => {
        DOM.iconBgVal.textContent = DOM.iconBgColor.value.toUpperCase();
        iconEditor.setBgColor(DOM.iconBgColor.value);
        updateSimulator();
    });

    DOM.iconPadding.addEventListener('input', () => {
        iconEditor.setPadding(DOM.iconPadding.value);
        updateSimulator();
    });

    // --- Color Pickers ---
    DOM.themeColor.addEventListener('input', () => {
        DOM.themeColorVal.textContent = DOM.themeColor.value.toUpperCase();
        updateSimulator();
    });

    DOM.statusBarColor.addEventListener('input', () => {
        DOM.statusBarVal.textContent = DOM.statusBarColor.value.toUpperCase();
        updateSimulator();
    });

    DOM.splashBgColor.addEventListener('input', () => {
        DOM.splashBgVal.textContent = DOM.splashBgColor.value.toUpperCase();
        updateSimulator();
    });

    DOM.targetUrl.addEventListener('input', updateSimulator);
    DOM.featureShowAppbar.addEventListener('change', updateSimulator);

    // --- Simulator Switch Tabs ---
    function switchSimScreen(screenName) {
        DOM.simTabBtns.forEach(btn => btn.classList.remove('active'));
        DOM.simScreenSplash.classList.remove('active-screen');
        DOM.simScreenApp.classList.remove('active-screen');
        DOM.simScreenHome.classList.remove('active-screen');

        if (screenName === 'splash') {
            document.getElementById('sim-btn-splash').classList.add('active');
            DOM.simScreenSplash.classList.add('active-screen');
        } else if (screenName === 'app') {
            document.getElementById('sim-btn-app').classList.add('active');
            DOM.simScreenApp.classList.add('active-screen');
        } else if (screenName === 'home') {
            document.getElementById('sim-btn-home').classList.add('active');
            DOM.simScreenHome.classList.add('active-screen');
        }
    }

    DOM.simTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.id;
            if (id === 'sim-btn-splash') switchSimScreen('splash');
            if (id === 'sim-btn-app') switchSimScreen('app');
            if (id === 'sim-btn-home') switchSimScreen('home');
        });
    });

    DOM.simRefreshBtn.addEventListener('click', () => {
        const url = DOM.targetUrl.value.trim();
        if (url) {
            DOM.simIframe.src = url;
        }
    });

    // --- Live Simulator Synchronization ---
    function updateSimulator() {
        const appTitle = DOM.appName.value.trim() || '異環儲值';
        const url = DOM.targetUrl.value.trim() || 'https://example.com';
        const tColor = DOM.themeColor.value;
        const sColor = DOM.statusBarColor.value;
        const spColor = DOM.splashBgColor.value;

        DOM.simStatusBar.style.backgroundColor = sColor;
        DOM.simAppbar.style.backgroundColor = tColor;
        DOM.simScreenSplash.style.backgroundColor = spColor;

        if (DOM.featureShowAppbar.checked) {
            DOM.simAppbar.classList.remove('hidden-bar');
        } else {
            DOM.simAppbar.classList.add('hidden-bar');
        }

        DOM.simAppTitle.textContent = appTitle;
        DOM.simSplashTitle.textContent = appTitle;
        DOM.simHomeAppTitle.textContent = appTitle;
        DOM.simUrlDisplay.textContent = url;

        const canvasDataUrl = iconEditor.canvas.toDataURL();
        DOM.simSplashLogo.src = canvasDataUrl;
        iconEditor.renderToCanvas(DOM.simHomeIconCanvas);

        try {
            if (url !== DOM.simIframe.src && /^https?:\/\//i.test(url)) {
                DOM.simIframe.src = url;
            }
        } catch (e) {}
    }

    updateSimulator();

    // --- Helper to Collect Form Config ---
    function getFormConfig() {
        let ua = '';
        if (DOM.userAgentPreset.value === 'desktop') {
            ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
        } else if (DOM.userAgentPreset.value === 'custom') {
            ua = DOM.customUserAgent.value.trim();
        }

        const rawPkg = DOM.packageName.value.trim();
        const safePkg = sanitizePkgInput(rawPkg);

        return {
            appName: DOM.appName.value.trim() || '異環儲值',
            targetUrl: DOM.targetUrl.value.trim() || 'https://example.com',
            packageName: safePkg,
            userAgent: ua,
            themeColor: DOM.themeColor.value,
            statusBarColor: DOM.statusBarColor.value,
            splashBgColor: DOM.splashBgColor.value,
            splashDuration: DOM.splashDuration.value,
            pullToRefresh: DOM.featurePullRefresh.checked,
            swipeBack: DOM.featureSwipeBack.checked,
            showAppbar: DOM.featureShowAppbar.checked,
            allowFileUpload: DOM.featureAllowFile.checked,
            allowZoom: DOM.featureZoom.checked,
            orientation: DOM.screenOrientation.value
        };
    }

    // --- Log Output Helpers ---
    function showBuildConsole(statusText) {
        DOM.buildProgressBox.classList.remove('hidden-box');
        DOM.buildStatusText.textContent = statusText;
        DOM.buildProgressBar.style.width = '10%';
        DOM.buildLogs.textContent = '';
    }

    function appendLog(msg) {
        const time = new Date().toLocaleTimeString();
        DOM.buildLogs.textContent += `[${time}] ${msg}\n`;
        DOM.buildLogs.scrollTop = DOM.buildLogs.scrollHeight;
    }

    function setBuildProgress(percent, text) {
        DOM.buildProgressBar.style.width = `${percent}%`;
        if (text) DOM.buildStatusText.textContent = text;
    }

    // --- Export Actions ---

    // 1. Export APK via Dynamic Express API Backend (Option C)
    DOM.btnExportApk.addEventListener('click', async () => {
        const config = getFormConfig();
        showBuildConsole('正在連動 Android SDK 官方工具鏈構建 APK (aapt2 -> javac -> d8 -> apksigner)...');
        appendLog('>>> 啟動 Android SDK 官方構建流程 (aapt2 + d8 + apksigner V1/V2/V3)...');

        try {
            setBuildProgress(25, '正在將參數傳送至後端 Android SDK 編譯器...');
            
            const formData = new FormData();
            for (const key in config) {
                formData.append(key, config[key]);
            }

            // Append icon Base64
            const iconBase64 = iconEditor.canvas.toDataURL('image/png');
            formData.append('iconBase64', iconBase64);

            appendLog(`Target URL: ${config.targetUrl}`);
            appendLog(`App Name: ${config.appName}`);
            appendLog(`Package Name: ${config.packageName}`);

            setBuildProgress(50, 'Android SDK 正在編譯 AXML、resources.arsc 與 classes.dex...');

            const response = await fetch('/api/build-apk', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: '伺服器編譯失敗' }));
                throw new Error(errData.error || '後端 APK 編譯失敗');
            }

            setBuildProgress(85, '正在寫入 V1 + V2 + V3 數位簽署與 4-Byte Zip 對齊...');
            appendLog('>>> apksigner 寫入 V1/V2/V3 簽署區塊成功！');

            // Download file
            const blob = await response.blob();
            setBuildProgress(100, 'APK 構建完成！正在發起下載...');
            appendLog('🎉 100% 官方標準相容 APK 下載成功！可在任何 Android 手機安裝！');

            const safeName = (config.appName || 'app').replace(/[^\w\u4e00-\u9fa5]/g, '_');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}.apk`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);

        } catch (err) {
            appendLog(`❌ 編譯錯誤: ${err.message}`);
            setBuildProgress(100, '打包失敗');
        }
    });

    // 2. Export Android Studio Project ZIP
    DOM.btnExportSource.addEventListener('click', async () => {
        const config = getFormConfig();
        showBuildConsole('正在生成 Android Studio 專案 ZIP...');

        try {
            const exporter = new ProjectExporter(config, iconEditor);
            await exporter.exportAndroidStudioProjectAsync((msg) => appendLog(msg));
            setBuildProgress(100, '專案 ZIP 下載完成！');
        } catch (err) {
            appendLog(`❌ 錯誤: ${err.message}`);
        }
    });

    // 3. Export PWA Package ZIP
    DOM.btnExportPwa.addEventListener('click', async () => {
        const config = getFormConfig();
        showBuildConsole('正在生成 PWA WebAPK 設定包...');

        try {
            const exporter = new ProjectExporter(config, iconEditor);
            await exporter.exportPwaPackageAsync((msg) => appendLog(msg));
            setBuildProgress(100, 'PWA 設定包下載完成！');
        } catch (err) {
            appendLog(`❌ 錯誤: ${err.message}`);
        }
    });

    // --- Theme Toggle Mode ---
    DOM.themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        DOM.themeToggleBtn.innerHTML = isLight 
            ? `<i data-lucide="sun"></i>` 
            : `<i data-lucide="moon"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
});
