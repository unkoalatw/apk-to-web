/**
 * Web2APK Studio - Dynamic Express Server & API Backend
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const ApkCompiler = require('./builder/apk-compiler');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage for icon uploads
const upload = multer({ storage: multer.memoryStorage() });

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Compiler Instance
let compiler = null;
try {
    compiler = new ApkCompiler();
    console.log(`[SDK] Android SDK Detected: ${compiler.sdkPaths.sdkRoot} (Build-tools ${compiler.sdkPaths.buildToolsVersion})`);
} catch (e) {
    console.warn(`[SDK Warning] ${e.message}`);
}

// Health Check API
app.get('/api/health', (req, res) => {
    if (!compiler) {
        try {
            compiler = new ApkCompiler();
        } catch (e) {}
    }

    if (compiler) {
        res.json({
            status: 'ok',
            sdkDetected: true,
            sdkRoot: compiler.sdkPaths.sdkRoot,
            buildToolsVersion: compiler.sdkPaths.buildToolsVersion
        });
    } else {
        res.json({
            status: 'warning',
            sdkDetected: false,
            message: '未於本機找到 Android SDK，將使用前端備用產生器。'
        });
    }
});

// Build APK API
app.post('/api/build-apk', upload.single('iconFile'), async (req, res) => {
    console.log(`\n[Build Task] 收到來自前端的 APK 動態構建請求...`);

    let iconBuf = null;
    if (req.file) {
        iconBuf = req.file.buffer;
    } else if (req.body.iconBase64) {
        const b64Data = req.body.iconBase64.replace(/^data:image\/\w+;base64,/, '');
        iconBuf = Buffer.from(b64Data, 'base64');
    }

    const config = {
        appName: req.body.appName || 'Web2APK App',
        targetUrl: req.body.targetUrl || 'https://example.com',
        packageName: req.body.packageName || 'com.web2apk.app',
        userAgent: req.body.userAgent || '',
        themeColor: req.body.themeColor || '#4F46E5',
        statusBarColor: req.body.statusBarColor || '#3730A3',
        splashBgColor: req.body.splashBgColor || '#0F172A',
        splashDuration: req.body.splashDuration || '2000',
        pullToRefresh: req.body.pullToRefresh === 'true' || req.body.pullToRefresh === true,
        swipeBack: req.body.swipeBack === 'true' || req.body.swipeBack === true,
        showAppbar: req.body.showAppbar === 'true' || req.body.showAppbar === true,
        allowFileUpload: req.body.allowFileUpload === 'true' || req.body.allowFileUpload === true,
        allowZoom: req.body.allowZoom === 'true' || req.body.allowZoom === true,
        orientation: req.body.orientation || 'portrait'
    };

    try {
        if (!compiler) {
            compiler = new ApkCompiler();
        }

        const result = await compiler.compileApkAsync(config, iconBuf, (logMsg) => {
            console.log(logMsg);
        });

        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
        res.send(result.apkBytes);

    } catch (err) {
        console.error(`[Build Error] ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(` Web2APK Studio Dynamic Server is running!`);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});
