/**
 * Web2APK Studio - Source Code & PWA Project Exporter
 * Generates buildable Android Studio Gradle Projects and PWA Packages.
 */

class ProjectExporter {
    constructor(config, iconEditor) {
        this.config = config;
        this.iconEditor = iconEditor;
    }

    /**
     * Export complete Android Studio Gradle Kotlin/Java project ZIP
     */
    async exportAndroidStudioProjectAsync(logCallback) {
        logCallback = logCallback || console.log;
        logCallback('>>> 開始生成 Android Studio 原始碼專案 (Gradle + Kotlin)...');

        const zip = new JSZip();
        const pkgPath = (this.config.packageName || 'com.web2apk.app').replace(/\./g, '/');
        const safeAppName = this.config.appName || 'My Web App';

        // 1. Root build.gradle
        const rootBuildGradle = `// Top-level build file
buildscript {
    ext.kotlin_version = '1.8.20'
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:7.4.2'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
`;
        zip.file('build.gradle', rootBuildGradle);

        // 2. settings.gradle
        zip.file('settings.gradle', `include ':app'\nrootProject.name = "${safeAppName}"\n`);

        // 3. app/build.gradle
        const appBuildGradle = `plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    compileSdk 33

    defaultConfig {
        applicationId "${this.config.packageName || 'com.web2apk.app'}"
        minSdk 21
        targetSdk 33
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.9.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.8.0'
    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'
}
`;
        zip.file('app/build.gradle', appBuildGradle);

        // 4. AndroidManifest.xml
        const orientationAttr = this.config.orientation !== 'unspecified' 
            ? `android:screenOrientation="${this.config.orientation}"` 
            : '';

        const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${this.config.packageName || 'com.web2apk.app'}">

    <uses-permission android.permission="INTERNET" />
    <uses-permission android.permission="ACCESS_NETWORK_STATE" />
    <uses-permission android.permission="READ_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.Web2APK">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            ${orientationAttr}
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
`;
        zip.file('app/src/main/AndroidManifest.xml', androidManifest);

        // 5. MainActivity.kt
        const mainActivityKt = `package ${this.config.packageName || 'com.web2apk.app'}

import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var swipeRefresh: SwipeRefreshLayout? = null

    override function onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        ${this.config.allowZoom ? 'settings.setSupportZoom(true)\nsettings.builtInZoomControls = true' : 'settings.setSupportZoom(false)'}

        ${this.config.userAgent ? `settings.userAgentString = "${this.config.userAgent}"` : ''}

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefresh?.isRefreshing = false
            }
        }

        webView.webChromeClient = WebChromeClient()

        swipeRefresh?.setOnRefreshListener {
            webView.reload()
        }

        webView.loadUrl("${this.config.targetUrl}")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
`;
        zip.file(`app/src/main/java/${pkgPath}/MainActivity.kt`, mainActivityKt);

        // 6. activity_main.xml layout
        const activityMainXml = `<?xml version="1.0" encoding="utf-8"?>
<androidx.swiperefreshlayout.widget.SwipeRefreshLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/swipeRefresh"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</androidx.swiperefreshlayout.widget.SwipeRefreshLayout>
`;
        zip.file('app/src/main/res/layout/activity_main.xml', activityMainXml);

        // 7. Config JSON in Assets
        const configJson = {
            app_name: this.config.appName,
            url: this.config.targetUrl,
            package_name: this.config.packageName,
            theme_color: this.config.themeColor,
            status_bar_color: this.config.statusBarColor,
            splash_bg_color: this.config.splashBgColor,
            splash_duration: parseInt(this.config.splashDuration, 10),
            orientation: this.config.orientation
        };
        zip.file('app/src/main/assets/app_config.json', JSON.stringify(configJson, null, 2));

        // 8. Res Icons
        const mipmaps = [
            { size: 48, path: 'app/src/main/res/mipmap-mdpi/ic_launcher.png' },
            { size: 72, path: 'app/src/main/res/mipmap-hdpi/ic_launcher.png' },
            { size: 96, path: 'app/src/main/res/mipmap-xhdpi/ic_launcher.png' },
            { size: 144, path: 'app/src/main/res/mipmap-xxhdpi/ic_launcher.png' },
            { size: 192, path: 'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' }
        ];

        for (const item of mipmaps) {
            const bytes = await this.iconEditor.getScaledPngBytes(item.size);
            zip.file(item.path, bytes);
        }

        // 9. README.md
        const readmeContent = `# ${safeAppName} - Android WebView Source Code

本專案由 Web2APK Studio 自動生成。

## 如何在 Android Studio 中開啟與編譯：

1. 下載並開啟 [Android Studio](https://developer.android.com/studio)
2. 點擊 **File -> Open** 並選擇此解壓縮後的專案資料夾。
3. 等待 Gradle 依賴下載與 Sync 完成。
4. 點擊頂部選單 **Build -> Build Bundle(s) / APK(s) -> Build APK(s)** 即可編譯測試用 APK。
5. 欲上架 Google Play，請點擊 **Build -> Generate Signed Bundle / APK** 並使用您的正式金鑰進行簽署。
`;
        zip.file('README.md', readmeContent);

        // Generate Zip Blob & Trigger Download
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const filename = `${safeAppName.replace(/[^\w]/g, '_')}_AndroidStudio_Project.zip`;
        this.downloadBlob(zipBlob, filename);

        logCallback('🎉 Android Studio 原始碼專案生成完成！');
    }

    /**
     * Export PWA WebAPK Manifest & Service Worker package ZIP
     */
    async exportPwaPackageAsync(logCallback) {
        logCallback = logCallback || console.log;
        logCallback('>>> 開始生成 PWA WebAPK 設定包...');

        const zip = new JSZip();
        const safeAppName = this.config.appName || 'My Web App';

        // 1. manifest.json
        const manifestJson = {
            name: safeAppName,
            short_name: safeAppName,
            start_url: this.config.targetUrl,
            display: "standalone",
            background_color: this.config.splashBgColor,
            theme_color: this.config.themeColor,
            orientation: this.config.orientation,
            icons: [
                {
                    src: "icon-192.png",
                    sizes: "192x192",
                    type: "image/png"
                },
                {
                    src: "icon-512.png",
                    sizes: "512x512",
                    type: "image/png"
                }
            ]
        };
        zip.file('manifest.json', JSON.stringify(manifestJson, null, 2));

        // 2. sw.js (Service Worker)
        const swJs = `// PWA Service Worker Generated by Web2APK Studio
const CACHE_NAME = 'web2apk-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
`;
        zip.file('sw.js', swJs);

        // 3. index.html wrapper
        const indexHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeAppName}</title>
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="${this.config.themeColor}">
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
        window.location.href = "${this.config.targetUrl}";
    </script>
</head>
<body>
    <p>正在前往 ${safeAppName}...</p>
</body>
</html>
`;
        zip.file('index.html', indexHtml);

        // 4. Icons
        const icon192 = await this.iconEditor.getScaledPngBytes(192);
        const icon512 = await this.iconEditor.getScaledPngBytes(512);

        zip.file('icon-192.png', icon192);
        zip.file('icon-512.png', icon512);

        // Generate & Download
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const filename = `${safeAppName.replace(/[^\w]/g, '_')}_PWA_Package.zip`;
        this.downloadBlob(zipBlob, filename);

        logCallback('🎉 PWA WebAPK 設定包生成完成！');
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

window.ProjectExporter = ProjectExporter;
