/**
 * Web2APK Studio - Cross-Platform Android SDK Official Compiler Engine (Option C)
 * Compatible with Windows Local Machine & Linux Free Cloud Deployments (Render / Railway / Docker).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ApkCompiler {
    constructor() {
        this.sdkPaths = this.detectAndroidSdk();
    }

    /**
     * Detect Android SDK build-tools and platform jar on Windows or Linux Cloud Container
     */
    detectAndroidSdk() {
        const homeDir = process.env.USERPROFILE || process.env.HOME || '/root';
        const possibleSdkDirs = [
            process.env.ANDROID_HOME,
            process.env.ANDROID_SDK_ROOT,
            '/opt/android-sdk',
            path.join(homeDir, 'AppData', 'Local', 'Android', 'Sdk'),
            path.join(homeDir, 'Android', 'Sdk')
        ].filter(Boolean);

        let sdkRoot = null;
        for (const dir of possibleSdkDirs) {
            if (fs.existsSync(dir)) {
                sdkRoot = dir;
                break;
            }
        }

        if (!sdkRoot) {
            throw new Error('未在系統或雲端環境中找到 Android SDK 目錄。');
        }

        const buildToolsDir = path.join(sdkRoot, 'build-tools');
        if (!fs.existsSync(buildToolsDir)) {
            throw new Error(`Android SDK 缺少 build-tools 目錄: ${buildToolsDir}`);
        }

        const versions = fs.readdirSync(buildToolsDir).filter(v => fs.statSync(path.join(buildToolsDir, v)).isDirectory()).sort().reverse();
        if (versions.length === 0) {
            throw new Error('未找到任何 Android build-tools 版本。');
        }

        const latestBuildTools = path.join(buildToolsDir, versions[0]);

        const platformsDir = path.join(sdkRoot, 'platforms');
        let androidJar = null;

        if (fs.existsSync(platformsDir)) {
            const pVersions = fs.readdirSync(platformsDir).filter(v => fs.statSync(path.join(platformsDir, v)).isDirectory()).sort().reverse();
            for (const pVer of pVersions) {
                const candidate = path.join(platformsDir, pVer, 'android.jar');
                if (fs.existsSync(candidate)) {
                    androidJar = candidate;
                    break;
                }
            }
        }

        if (!androidJar) {
            throw new Error('未在 Android SDK platforms 中找到 android.jar。');
        }

        const isWin = process.platform === 'win32';

        return {
            sdkRoot,
            buildToolsVersion: versions[0],
            buildToolsPath: latestBuildTools,
            aapt2: path.join(latestBuildTools, isWin ? 'aapt2.exe' : 'aapt2'),
            d8: path.join(latestBuildTools, isWin ? 'd8.bat' : 'd8'),
            zipalign: path.join(latestBuildTools, isWin ? 'zipalign.exe' : 'zipalign'),
            apksigner: path.join(latestBuildTools, isWin ? 'apksigner.bat' : 'apksigner'),
            androidJar
        };
    }

    /**
     * Sanitize package name for Android
     */
    sanitizePackageName(pkg) {
        if (!pkg || typeof pkg !== 'string') return 'com.web2apk.app';
        let clean = pkg.replace(/[^\w.]/g, '').toLowerCase();
        clean = clean.replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
        if (!clean.includes('.')) {
            clean = 'com.web2apk.' + (clean || 'app');
        }
        const parts = clean.split('.').map(p => {
            if (!p || /^[0-9]/.test(p)) return 'app_' + p;
            return p;
        });
        return parts.join('.');
    }

    /**
     * Execute shell command with logging
     */
    execCmd(cmd, opts, logFn) {
        logFn = logFn || console.log;
        logFn(`$ ${cmd}`);
        try {
            const output = execSync(cmd, { cwd: opts.cwd, encoding: 'utf8' });
            if (output && output.trim()) logFn(output.trim());
            return output;
        } catch (err) {
            if (err.stdout) logFn(err.stdout);
            if (err.stderr) logFn(err.stderr);
            throw new Error(`Command failed: ${cmd}\n${err.message}`);
        }
    }

    /**
     * Main APK Compile & Sign Pipeline
     */
    async compileApkAsync(config, iconBuffer, logFn) {
        logFn = logFn || console.log;
        const tools = this.sdkPaths;

        const safePkg = this.sanitizePackageName(config.packageName);
        const safeAppName = config.appName || 'Web2APK App';
        const timestamp = Date.now();
        const scratchDir = path.join(__dirname, '..', 'scratch');
        if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

        const tmpDir = path.join(scratchDir, `build_${timestamp}`);

        logFn(`>>> 啟動 Android 官方 SDK 工具鏈 (build-tools ${tools.buildToolsVersion})...`);
        logFn(`Package Name: ${safePkg}`);
        logFn(`App 名稱: ${safeAppName}`);

        try {
            // Step 1: Create Workspace Folders
            fs.mkdirSync(path.join(tmpDir, 'res', 'values'), { recursive: true });
            fs.mkdirSync(path.join(tmpDir, 'res', 'mipmap-mdpi'), { recursive: true });
            fs.mkdirSync(path.join(tmpDir, 'res', 'mipmap-hdpi'), { recursive: true });
            fs.mkdirSync(path.join(tmpDir, 'res', 'mipmap-xhdpi'), { recursive: true });
            fs.mkdirSync(path.join(tmpDir, 'assets'), { recursive: true });
            
            const pkgPath = safePkg.replace(/\./g, '/');
            fs.mkdirSync(path.join(tmpDir, 'src', pkgPath), { recursive: true });
            fs.mkdirSync(path.join(tmpDir, 'bin'), { recursive: true });

            // Step 2: Write AndroidManifest.xml
            const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${safePkg}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:hardwareAccelerated="true">

        <activity
            android:name="${safePkg}.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
`;
            fs.writeFileSync(path.join(tmpDir, 'AndroidManifest.xml'), manifestContent);

            // Step 3: Write res/values/strings.xml
            const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${safeAppName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>
</resources>
`;
            fs.writeFileSync(path.join(tmpDir, 'res', 'values', 'strings.xml'), stringsXml);

            // Step 4: Write Icons
            const iconPng = iconBuffer || Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
            fs.writeFileSync(path.join(tmpDir, 'res', 'mipmap-mdpi', 'ic_launcher.png'), iconPng);
            fs.writeFileSync(path.join(tmpDir, 'res', 'mipmap-hdpi', 'ic_launcher.png'), iconPng);
            fs.writeFileSync(path.join(tmpDir, 'res', 'mipmap-xhdpi', 'ic_launcher.png'), iconPng);

            // Step 5: Write assets/app_config.json
            const configJson = {
                app_name: safeAppName,
                url: config.targetUrl || "https://example.com",
                package_name: safePkg,
                user_agent: config.userAgent || "",
                theme_color: config.themeColor || "#4F46E5",
                status_bar_color: config.statusBarColor || "#3730A3",
                splash_bg_color: config.splashBgColor || "#0F172A",
                splash_duration: parseInt(config.splashDuration || 2000, 10),
                enable_javascript: true,
                pull_to_refresh: !!config.pullToRefresh,
                swipe_back: !!config.swipeBack,
                show_appbar: !!config.showAppbar,
                allow_file_upload: !!config.allowFileUpload,
                allow_zoom: !!config.allowZoom,
                orientation: config.orientation || "portrait"
            };
            fs.writeFileSync(path.join(tmpDir, 'assets', 'app_config.json'), JSON.stringify(configJson, null, 2));

            // Step 6: Write Java MainActivity.java
            const mainActivityJava = `package ${safePkg};

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        webView.loadUrl("${config.targetUrl || 'https://example.com'}");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;
            fs.writeFileSync(path.join(tmpDir, 'src', pkgPath, 'MainActivity.java'), mainActivityJava);

            // --- Step 7: AAPT2 Resource Compilation & Linking ---
            logFn('[1/5] 執行 aapt2 compile 與 link 建立二進位 AXML 及 resources.arsc...');
            this.execCmd(`"${tools.aapt2}" compile --dir res -o compiled_res.zip`, { cwd: tmpDir }, logFn);
            this.execCmd(`"${tools.aapt2}" link -o unaligned.apk -I "${tools.androidJar}" --manifest AndroidManifest.xml compiled_res.zip -A assets`, { cwd: tmpDir }, logFn);

            // --- Step 8: Java Compilation & D8 Bytecode Dexing ---
            logFn('[2/5] 執行 javac 與 d8 編譯器生成 Dalvik Classes.dex...');
            const javaFile = path.join(tmpDir, 'src', pkgPath, 'MainActivity.java');
            this.execCmd(`javac -cp "${tools.androidJar}" -d bin "${javaFile}"`, { cwd: tmpDir }, logFn);

            const classFiles = [];
            function findClasses(dir) {
                const list = fs.readdirSync(dir);
                for (const file of list) {
                    const full = path.join(dir, file);
                    if (fs.statSync(full).isDirectory()) findClasses(full);
                    else if (file.endsWith('.class')) classFiles.push(`"${full}"`);
                }
            }
            findClasses(path.join(tmpDir, 'bin'));

            this.execCmd(`"${tools.d8}" --lib "${tools.androidJar}" --output bin ${classFiles.join(' ')}`, { cwd: tmpDir }, logFn);

            // Add classes.dex into unaligned.apk
            logFn('將 classes.dex 打包入 unaligned.apk...');
            this.execCmd(`jar uf unaligned.apk -C bin classes.dex`, { cwd: tmpDir }, logFn);

            // --- Step 9: Zipalign 4-Byte Alignment ---
            logFn('[3/5] 執行 zipalign 4-Byte 記憶體對齊...');
            const alignedApk = path.join(tmpDir, 'aligned.apk');
            this.execCmd(`"${tools.zipalign}" -v -f 4 unaligned.apk "${alignedApk}"`, { cwd: tmpDir }, logFn);

            // --- Step 10: Generate Keystore & APK Signature Scheme V2/V3 ---
            logFn('[4/5] 生成 Debug Keystore 並執行 apksigner 寫入 V1 + V2 + V3 數位簽署區塊...');
            const ksPath = path.join(scratchDir, 'debug.keystore');
            if (!fs.existsSync(ksPath)) {
                this.execCmd(`keytool -genkeypair -alias androiddebugkey -keypass android -keystore "${ksPath}" -storepass android -dname "CN=Android Debug,O=Android,C=US" -validity 10000 -keyalg RSA -keysize 2048`, { cwd: tmpDir }, logFn);
            }

            const signedApk = path.join(tmpDir, `${safeAppName.replace(/[^\w]/g, '_')}.apk`);
            this.execCmd(`"${tools.apksigner}" sign --ks "${ksPath}" --ks-pass pass:android --key-pass pass:android --out "${signedApk}" "${alignedApk}"`, { cwd: tmpDir }, logFn);

            // --- Step 11: Verify Signature ---
            logFn('[5/5] 執行 apksigner verify 驗證 V1 / V2 / V3 簽署狀態...');
            const verifyRes = this.execCmd(`"${tools.apksigner}" verify --verbose "${signedApk}"`, { cwd: tmpDir }, logFn);

            logFn('🎉 APK 構建成功！100% 符合 Android 系統 V1/V2/V3 簽署規範！');

            const apkBytes = fs.readFileSync(signedApk);

            // Cleanup temp dir
            setTimeout(() => {
                try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
            }, 5000);

            return {
                apkBytes,
                fileName: `${safeAppName.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.apk`,
                verifyLogs: verifyRes
            };

        } catch (err) {
            logFn(`❌ 編譯過程發生錯誤: ${err.message}`);
            throw err;
        }
    }
}

module.exports = ApkCompiler;
