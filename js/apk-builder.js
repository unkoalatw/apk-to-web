/**
 * Web2APK Studio - Main APK Builder Engine
 * Assembles assets, icons, configuration JSON, and invokes ApkSigner with 4-byte Zip Alignment.
 */

class ApkBuilder {
    constructor(config, iconEditor) {
        this.config = config;
        this.iconEditor = iconEditor;
    }

    async buildApkAsync(progressCallback, logCallback) {
        logCallback = logCallback || console.log;
        progressCallback = progressCallback || (() => {});

        try {
            // Step 1: Initialize Base Zip Template with customized AXML & ARSC
            progressCallback(10, '編譯 Android 二進位 AXML、ARSC 資源表與 Classes.dex...');
            logCallback('[1/5] 初始化 Base APK Zip 結構 (AXML, ARSC, DEX)...');
            
            const zip = await BaseApkTemplate.createBaseZipAsync(
                this.config.packageName,
                this.config.appName
            );

            // Step 2: Write Config JSON
            progressCallback(30, '寫入 WebView 配置參數...');
            logCallback('[2/5] 生成 assets/app_config.json 配置檔...');
            const configJson = {
                app_name: this.config.appName,
                url: this.config.targetUrl,
                package_name: BaseApkTemplate.sanitizePackageName(this.config.packageName),
                user_agent: this.config.userAgent,
                theme_color: this.config.themeColor,
                status_bar_color: this.config.statusBarColor,
                splash_bg_color: this.config.splashBgColor,
                splash_duration: parseInt(this.config.splashDuration, 10),
                enable_javascript: true,
                pull_to_refresh: this.config.pullToRefresh,
                swipe_back: this.config.swipeBack,
                show_appbar: this.config.showAppbar,
                allow_file_upload: this.config.allowFileUpload,
                allow_zoom: this.config.allowZoom,
                orientation: this.config.orientation,
                built_by: 'Web2APK Studio Static Generator',
                build_time: new Date().toISOString()
            };

            zip.file('assets/app_config.json', JSON.stringify(configJson, null, 2));
            logCallback(`網址: ${configJson.url}`);
            logCallback(`App 名稱: ${configJson.app_name}`);
            logCallback(`Package Name: ${configJson.package_name}`);

            // Step 3: Generate Scaled Icons
            progressCallback(50, '裁切與縮放 Android 各解析度 Icon (Mipmap)...');
            logCallback('[3/5] 產生多解析度 App 桌面圖標...');

            const mipmaps = [
                { size: 48, path: 'res/mipmap-mdpi/ic_launcher.png' },
                { size: 72, path: 'res/mipmap-hdpi/ic_launcher.png' },
                { size: 96, path: 'res/mipmap-xhdpi/ic_launcher.png' },
                { size: 144, path: 'res/mipmap-xxhdpi/ic_launcher.png' },
                { size: 192, path: 'res/mipmap-xxxhdpi/ic_launcher.png' }
            ];

            for (const item of mipmaps) {
                const bytes = await this.iconEditor.getScaledPngBytes(item.size);
                zip.file(item.path, bytes);
                logCallback(`生成圖標: ${item.path} (${item.size}x${item.size} px)`);
            }

            // Step 4: APK Signing & Zip Alignment
            progressCallback(75, '進行 4-Byte Zip 4位元組對齊與 APK v1 數位簽署...');
            logCallback('[4/5] 開始計算 SHA-256 簽署檔 (META-INF) 與 RSA 憑證...');
            await ApkSigner.signZipAsync(zip, logCallback);

            // Step 5: Compress & Generate Download Blob
            progressCallback(90, '壓縮並產生可安裝的 .apk 檔案...');
            logCallback('[5/5] 打包生成二進位 APK 檔案...');

            const apkBlob = await zip.generateAsync({
                type: 'blob',
                mimeType: 'application/vnd.android.package-archive',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            }, (metadata) => {
                if (metadata.percent) {
                    progressCallback(90 + Math.floor(metadata.percent * 0.1), `打包中: ${Math.floor(metadata.percent)}%`);
                }
            });

            progressCallback(100, 'APK 打包完成！準備發起下載...');
            logCallback('🎉 成功！100% 規章相容 APK 檔案已成功生成！');

            // Trigger Download
            const safeName = (this.config.appName || 'web_app').replace(/[^\w\u4e00-\u9fa5]/g, '_');
            const fileName = `${safeName}.apk`;
            
            this.downloadBlob(apkBlob, fileName);
            return true;

        } catch (error) {
            logCallback(`❌ 打包失敗: ${error.message}`);
            throw error;
        }
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1000);
    }
}

window.ApkBuilder = ApkBuilder;
