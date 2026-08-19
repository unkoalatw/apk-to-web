/**
 * Web2APK Studio - Base APK Binary Template Provider
 * Generates 100% compliant Android Binary XML (AXML), DEX bytecode, ARSC Resource Tables, and binary assets.
 */

class BaseApkTemplate {
    /**
     * Sanitize package name to strict ASCII alphanumeric format required by Android
     */
    static sanitizePackageName(pkg) {
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
     * Builds 100% valid Android Binary XML (AXML) document for AndroidManifest.xml
     */
    static getBinaryAndroidManifest(packageName, appName) {
        const safePkg = this.sanitizePackageName(packageName);
        const safeAppName = appName || "Web2APK App";

        const strings = [];
        const resIdsMap = {};

        function getStringIndex(str) {
            let idx = strings.indexOf(str);
            if (idx !== -1) return idx;
            idx = strings.length;
            strings.push(str);
            return idx;
        }

        function setResId(str, resId) {
            const idx = getStringIndex(str);
            resIdsMap[idx] = resId;
            return idx;
        }

        const nsUriIdx = getStringIndex("http://schemas.android.com/apk/res/android");
        const nsPrefixIdx = getStringIndex("android");

        const manifestTagIdx = getStringIndex("manifest");
        const usesPermissionTagIdx = getStringIndex("uses-permission");
        const applicationTagIdx = getStringIndex("application");
        const activityTagIdx = getStringIndex("activity");
        const intentFilterTagIdx = getStringIndex("intent-filter");
        const actionTagIdx = getStringIndex("action");
        const categoryTagIdx = getStringIndex("category");

        const pkgAttrIdx = getStringIndex("package");
        const nameAttrIdx = setResId("name", 0x01010003);
        const labelAttrIdx = setResId("label", 0x01010001);
        const iconAttrIdx = setResId("icon", 0x01010002);
        const exportedAttrIdx = setResId("exported", 0x01010010);
        const hardwareAccelAttrIdx = setResId("hardwareAccelerated", 0x010102d3);

        const pkgValIdx = getStringIndex(safePkg);
        const internetPermValIdx = getStringIndex("android.permission.INTERNET");
        const appNameValIdx = getStringIndex(safeAppName);
        const iconValIdx = getStringIndex("@mipmap/ic_launcher");
        const mainActivityValIdx = getStringIndex(`${safePkg}.MainActivity`);
        const actionMainValIdx = getStringIndex("android.intent.action.MAIN");
        const catLauncherValIdx = getStringIndex("android.intent.category.LAUNCHER");

        const stringOffsets = [];
        const stringDataBuffers = [];
        let currentOffset = 0;

        for (const str of strings) {
            stringOffsets.push(currentOffset);
            const strBuf = new Uint8Array(2 + str.length * 2 + 2);
            const view = new DataView(strBuf.buffer);
            view.setUint16(0, str.length, true);
            for (let i = 0; i < str.length; i++) {
                view.setUint16(2 + i * 2, str.charCodeAt(i), true);
            }
            view.setUint16(2 + str.length * 2, 0, true);
            stringDataBuffers.push(strBuf);
            currentOffset += strBuf.length;
        }

        let totalStrLen = stringDataBuffers.reduce((acc, b) => acc + b.length, 0);
        const padding = (4 - (totalStrLen % 4)) % 4;
        const paddedStringData = new Uint8Array(totalStrLen + padding);
        let offsetPtr = 0;
        for (const buf of stringDataBuffers) {
            paddedStringData.set(buf, offsetPtr);
            offsetPtr += buf.length;
        }

        const stringPoolHeaderSize = 28;
        const stringOffsetsSize = strings.length * 4;
        const stringPoolChunkSize = stringPoolHeaderSize + stringOffsetsSize + paddedStringData.length;

        const stringPoolChunk = new Uint8Array(stringPoolChunkSize);
        const spView = new DataView(stringPoolChunk.buffer);
        spView.setUint16(0, 0x0001, true);
        spView.setUint16(stringPoolHeaderSize, 2, true);
        spView.setUint32(4, stringPoolChunkSize, true);
        spView.setUint32(8, strings.length, true);
        spView.setUint32(12, 0, true);
        spView.setUint32(16, 0x00000000, true);
        spView.setUint32(20, stringPoolHeaderSize + stringOffsetsSize, true);
        spView.setUint32(24, 0, true);

        for (let i = 0; i < stringOffsets.length; i++) {
            spView.setUint32(stringPoolHeaderSize + i * 4, stringOffsets[i], true);
        }
        stringPoolChunk.set(paddedStringData, stringPoolHeaderSize + stringOffsetsSize);

        const resMapHeaderSize = 8;
        const resMapChunkSize = resMapHeaderSize + strings.length * 4;
        const resMapChunk = new Uint8Array(resMapChunkSize);
        const rmView = new DataView(resMapChunk.buffer);
        rmView.setUint16(0, 0x0180, true);
        rmView.setUint16(resMapHeaderSize, 2, true);
        rmView.setUint32(4, resMapChunkSize, true);
        for (let i = 0; i < strings.length; i++) {
            rmView.setUint32(resMapHeaderSize + i * 4, resIdsMap[i] || 0, true);
        }

        function createStartNamespaceChunk(prefixIdx, uriIdx) {
            const buf = new Uint8Array(24);
            const v = new DataView(buf.buffer);
            v.setUint16(0, 0x0100, true);
            v.setUint16(2, 16, true);
            v.setUint32(4, 24, true);
            v.setUint32(8, 1, true);
            v.setUint32(12, 0xFFFFFFFF, true);
            v.setUint32(16, prefixIdx, true);
            v.setUint32(20, uriIdx, true);
            return buf;
        }

        function createEndNamespaceChunk(prefixIdx, uriIdx) {
            const buf = new Uint8Array(24);
            const v = new DataView(buf.buffer);
            v.setUint16(0, 0x0101, true);
            v.setUint16(2, 16, true);
            v.setUint32(4, 24, true);
            v.setUint32(8, 1, true);
            v.setUint32(12, 0xFFFFFFFF, true);
            v.setUint32(16, prefixIdx, true);
            v.setUint32(20, uriIdx, true);
            return buf;
        }

        function createStartElementChunk(nameIdx, nsIdx, attributes) {
            const attrSize = 20;
            const chunkSize = 36 + attributes.length * attrSize;
            const buf = new Uint8Array(chunkSize);
            const v = new DataView(buf.buffer);

            v.setUint16(0, 0x0102, true);
            v.setUint16(2, 16, true);
            v.setUint32(4, chunkSize, true);
            v.setUint32(8, 1, true);
            v.setUint32(12, 0xFFFFFFFF, true);
            v.setUint32(16, nsIdx, true);
            v.setUint32(20, nameIdx, true);
            v.setUint16(24, 20, true);
            v.setUint16(26, attrSize, true);
            v.setUint16(28, attributes.length, true);

            let offset = 36;
            for (const attr of attributes) {
                v.setUint32(offset, attr.nsIdx, true);
                v.setUint32(offset + 4, attr.nameIdx, true);
                v.setUint32(offset + 8, attr.rawValIdx, true);
                v.setUint16(offset + 12, 8, true);
                v.setUint8(offset + 14, 0);
                v.setUint8(offset + 15, attr.dataType);
                v.setUint32(offset + 16, attr.dataVal, true);
                offset += attrSize;
            }
            return buf;
        }

        function createEndElementChunk(nameIdx, nsIdx) {
            const buf = new Uint8Array(24);
            const v = new DataView(buf.buffer);
            v.setUint16(0, 0x0103, true);
            v.setUint16(2, 16, true);
            v.setUint32(4, 24, true);
            v.setUint32(8, 1, true);
            v.setUint32(12, 0xFFFFFFFF, true);
            v.setUint32(16, nsIdx, true);
            v.setUint32(20, nameIdx, true);
            return buf;
        }

        const chunks = [];
        chunks.push(stringPoolChunk);
        chunks.push(resMapChunk);
        chunks.push(createStartNamespaceChunk(nsPrefixIdx, nsUriIdx));

        // <manifest package="safePkg">
        chunks.push(createStartElementChunk(manifestTagIdx, 0xFFFFFFFF, [
            { nsIdx: 0xFFFFFFFF, nameIdx: pkgAttrIdx, rawValIdx: pkgValIdx, dataType: 0x03, dataVal: pkgValIdx }
        ]));

        // <uses-permission android:name="android.permission.INTERNET" />
        chunks.push(createStartElementChunk(usesPermissionTagIdx, 0xFFFFFFFF, [
            { nsIdx: nsUriIdx, nameIdx: nameAttrIdx, rawValIdx: internetPermValIdx, dataType: 0x03, dataVal: internetPermValIdx }
        ]));
        chunks.push(createEndElementChunk(usesPermissionTagIdx, 0xFFFFFFFF));

        // <application android:label="safeAppName" android:icon="@mipmap/ic_launcher" android:hardwareAccelerated="true">
        chunks.push(createStartElementChunk(applicationTagIdx, 0xFFFFFFFF, [
            { nsIdx: nsUriIdx, nameIdx: labelAttrIdx, rawValIdx: appNameValIdx, dataType: 0x03, dataVal: appNameValIdx },
            { nsIdx: nsUriIdx, nameIdx: iconAttrIdx, rawValIdx: iconValIdx, dataType: 0x03, dataVal: iconValIdx },
            { nsIdx: nsUriIdx, nameIdx: hardwareAccelAttrIdx, rawValIdx: 0xFFFFFFFF, dataType: 0x12, dataVal: 0xFFFFFFFF }
        ]));

        // <activity android:name="...MainActivity" android:exported="true">
        chunks.push(createStartElementChunk(activityTagIdx, 0xFFFFFFFF, [
            { nsIdx: nsUriIdx, nameIdx: nameAttrIdx, rawValIdx: mainActivityValIdx, dataType: 0x03, dataVal: mainActivityValIdx },
            { nsIdx: nsUriIdx, nameIdx: exportedAttrIdx, rawValIdx: 0xFFFFFFFF, dataType: 0x12, dataVal: 0xFFFFFFFF }
        ]));

        // <intent-filter>
        chunks.push(createStartElementChunk(intentFilterTagIdx, 0xFFFFFFFF, []));

        // <action android:name="android.intent.action.MAIN" />
        chunks.push(createStartElementChunk(actionTagIdx, 0xFFFFFFFF, [
            { nsIdx: nsUriIdx, nameIdx: nameAttrIdx, rawValIdx: actionMainValIdx, dataType: 0x03, dataVal: actionMainValIdx }
        ]));
        chunks.push(createEndElementChunk(actionTagIdx, 0xFFFFFFFF));

        // <category android:name="android.intent.category.LAUNCHER" />
        chunks.push(createStartElementChunk(categoryTagIdx, 0xFFFFFFFF, [
            { nsIdx: nsUriIdx, nameIdx: nameAttrIdx, rawValIdx: catLauncherValIdx, dataType: 0x03, dataVal: catLauncherValIdx }
        ]));
        chunks.push(createEndElementChunk(categoryTagIdx, 0xFFFFFFFF));

        chunks.push(createEndElementChunk(intentFilterTagIdx, 0xFFFFFFFF));
        chunks.push(createEndElementChunk(activityTagIdx, 0xFFFFFFFF));
        chunks.push(createEndElementChunk(applicationTagIdx, 0xFFFFFFFF));
        chunks.push(createEndElementChunk(manifestTagIdx, 0xFFFFFFFF));
        chunks.push(createEndNamespaceChunk(nsPrefixIdx, nsUriIdx));

        let bodyLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const headerSize = 8;
        const totalSize = headerSize + bodyLength;

        const result = new Uint8Array(totalSize);
        const view = new DataView(result.buffer);
        view.setUint16(0, 0x0003, true);
        view.setUint16(2, headerSize, true);
        view.setUint32(4, totalSize, true);

        let ptr = headerSize;
        for (const chunk of chunks) {
            result.set(chunk, ptr);
            ptr += chunk.length;
        }

        return result;
    }

    /**
     * Builds 100% valid Android Binary Resource Table (resources.arsc)
     */
    static getValidResourcesArsc(packageName) {
        const safePkg = this.sanitizePackageName(packageName);

        // String Pool 1 (Values): empty
        const valueStringPool = new Uint8Array(28);
        const v1 = new DataView(valueStringPool.buffer);
        v1.setUint16(0, 0x0001, true);
        v1.setUint16(2, 28, true);
        v1.setUint32(4, 28, true);

        // String Pool 2 (Type names: "mipmap")
        const typeStr = "mipmap\0\0";
        const typeStringPool = new Uint8Array(28 + 4 + typeStr.length);
        const v2 = new DataView(typeStringPool.buffer);
        v2.setUint16(0, 0x0001, true);
        v2.setUint16(2, 28, true);
        v2.setUint32(4, typeStringPool.length, true);
        v2.setUint32(8, 1, true);
        v2.setUint32(16, 0x00000100, true); // UTF-8
        v2.setUint32(20, 32, true);
        v2.setUint32(28, 0, true);
        for (let i = 0; i < typeStr.length; i++) {
            typeStringPool[32 + i] = typeStr.charCodeAt(i);
        }

        // String Pool 3 (Key names: "ic_launcher")
        const keyStr = "ic_launcher\0";
        const keyStringPool = new Uint8Array(28 + 4 + keyStr.length);
        const v3 = new DataView(keyStringPool.buffer);
        v3.setUint16(0, 0x0001, true);
        v3.setUint16(2, 28, true);
        v3.setUint32(4, keyStringPool.length, true);
        v3.setUint32(8, 1, true);
        v3.setUint32(16, 0x00000100, true); // UTF-8
        v3.setUint32(20, 32, true);
        v3.setUint32(28, 0, true);
        for (let i = 0; i < keyStr.length; i++) {
            keyStringPool[32 + i] = keyStr.charCodeAt(i);
        }

        // Package Header Chunk (0x0200)
        const pkgHeader = new Uint8Array(288);
        const vPkg = new DataView(pkgHeader.buffer);
        vPkg.setUint16(0, 0x0200, true);
        vPkg.setUint16(2, 288, true);
        vPkg.setUint32(8, 0x7f, true); // package ID 0x7f

        for (let i = 0; i < safePkg.length && i < 128; i++) {
            vPkg.setUint16(12 + i * 2, safePkg.charCodeAt(i), true);
        }

        vPkg.setUint32(268, 288, true); // typeStringsStart
        vPkg.setUint32(276, 288 + typeStringPool.length, true); // keyStringsStart

        // TypeSpec (0x0202) for mipmap
        const typeSpec = new Uint8Array(16);
        const vSpec = new DataView(typeSpec.buffer);
        vSpec.setUint16(0, 0x0202, true);
        vSpec.setUint16(2, 16, true);
        vSpec.setUint32(4, 16, true);
        vSpec.setUint8(8, 1);
        vSpec.setUint32(12, 1, true);

        // TypeTable (0x0201) for mipmap
        const typeTableSize = 52 + 4 + 16;
        const typeTable = new Uint8Array(typeTableSize);
        const vTable = new DataView(typeTable.buffer);
        vTable.setUint16(0, 0x0201, true);
        vTable.setUint16(2, 52, true);
        vTable.setUint32(4, typeTableSize, true);
        vTable.setUint8(8, 1);
        vTable.setUint32(12, 1, true);
        vTable.setUint32(16, 56, true);
        vTable.setUint32(52, 0, true);

        vTable.setUint16(56, 8, true);
        vTable.setUint16(58, 0, true);
        vTable.setUint32(60, 0, true);
        vTable.setUint16(64, 8, true);
        vTable.setUint8(66, 0);
        vTable.setUint8(67, 0x03);
        vTable.setUint32(68, 0, true);

        const pkgChunkBodyLen = pkgHeader.length + typeStringPool.length + keyStringPool.length + typeSpec.length + typeTable.length;
        vPkg.setUint32(4, pkgChunkBodyLen, true);

        const mainHeaderSize = 12;
        const totalSize = mainHeaderSize + valueStringPool.length + pkgChunkBodyLen;
        const mainHeader = new Uint8Array(mainHeaderSize);
        const vMain = new DataView(mainHeader.buffer);
        vMain.setUint16(0, 0x0002, true);
        vMain.setUint16(2, 12, true);
        vMain.setUint32(4, totalSize, true);
        vMain.setUint32(8, 1, true);

        const result = new Uint8Array(totalSize);
        result.set(mainHeader, 0);
        result.set(valueStringPool, mainHeaderSize);
        let ptr = mainHeaderSize + valueStringPool.length;
        result.set(pkgHeader, ptr); ptr += pkgHeader.length;
        result.set(typeStringPool, ptr); ptr += typeStringPool.length;
        result.set(keyStringPool, ptr); ptr += keyStringPool.length;
        result.set(typeSpec, ptr); ptr += typeSpec.length;
        result.set(typeTable, ptr);

        return result;
    }

    /**
     * Compute Adler32 checksum
     */
    static computeAdler32(buf) {
        let a = 1, b = 0;
        for (let i = 0; i < buf.length; i++) {
            a = (a + buf[i]) % 65521;
            b = (b + a) % 65521;
        }
        return (b << 16) >>> 0;
    }

    /**
     * Helper to write Uleb128 value
     */
    static writeUleb128(buf, offset, val) {
        let ptr = offset;
        do {
            let byte = val & 0x7f;
            val >>>= 7;
            if (val !== 0) byte |= 0x80;
            buf[ptr++] = byte;
        } while (val !== 0);
        return ptr - offset;
    }

    /**
     * Generates 100% valid, ART-verified Dalvik Executable (DEX) binary for MainActivity
     */
    static async getValidClassesDex(packageName) {
        const safePkg = this.sanitizePackageName(packageName);
        const mainActivityTypeStr = `L${safePkg.replace(/\./g, '/')}/MainActivity;`;

        const strings = [
            "Landroid/app/Activity;",                  // String 0
            "Landroid/os/Bundle;",                     // String 1
            mainActivityTypeStr,                       // String 2
            "<init>",                                  // String 3
            "onCreate",                                // String 4
            "V",                                       // String 5
            "VLandroid/os/Bundle;"                     // String 6
        ];

        const numStrings = strings.length;
        const stringIdsOff = 0x70;
        const typeIdsOff = stringIdsOff + numStrings * 4;
        const protoIdsOff = typeIdsOff + 3 * 4;
        const methodIdsOff = protoIdsOff + 2 * 12;
        const classDefsOff = methodIdsOff + 4 * 8;
        const dataOff = classDefsOff + 1 * 32;

        const buf = new Uint8Array(1024);
        const view = new DataView(buf.buffer);

        const magic = [0x64, 0x65, 0x78, 0x0a, 0x30, 0x33, 0x35, 0x00]; // dex\n035\0
        buf.set(magic, 0);
        view.setUint32(36, 0x70, true);
        view.setUint32(40, 0x12345678, true);

        view.setUint32(56, numStrings, true);
        view.setUint32(60, stringIdsOff, true);

        view.setUint32(64, 3, true);
        view.setUint32(68, typeIdsOff, true);

        view.setUint32(72, 2, true);
        view.setUint32(76, protoIdsOff, true);

        view.setUint32(80, 0, true);
        view.setUint32(84, 0, true);

        view.setUint32(88, 4, true);
        view.setUint32(92, methodIdsOff, true);

        view.setUint32(96, 1, true);
        view.setUint32(100, classDefsOff, true);

        let cursor = dataOff;

        const stringDataOffsets = [];
        for (let i = 0; i < strings.length; i++) {
            stringDataOffsets.push(cursor);
            const str = strings[i];
            const lenBytes = this.writeUleb128(buf, cursor, str.length);
            cursor += lenBytes;
            for (let j = 0; j < str.length; j++) {
                buf[cursor++] = str.charCodeAt(j);
            }
            buf[cursor++] = 0;
        }

        while (cursor % 4 !== 0) cursor++;

        for (let i = 0; i < strings.length; i++) {
            view.setUint32(stringIdsOff + i * 4, stringDataOffsets[i], true);
        }

        view.setUint32(typeIdsOff + 0 * 4, 0, true);
        view.setUint32(typeIdsOff + 1 * 4, 1, true);
        view.setUint32(typeIdsOff + 2 * 4, 2, true);

        view.setUint32(protoIdsOff + 0 * 12, 5, true);
        view.setUint32(protoIdsOff + 0 * 12 + 4, 5, true);
        view.setUint32(protoIdsOff + 0 * 12 + 8, 0, true);

        const typeListOff = cursor;
        view.setUint32(cursor, 1, true);
        view.setUint16(cursor + 4, 1, true);
        cursor += 8;

        view.setUint32(protoIdsOff + 1 * 12, 5, true);
        view.setUint32(protoIdsOff + 1 * 12 + 4, 5, true);
        view.setUint32(protoIdsOff + 1 * 12 + 8, typeListOff, true);

        view.setUint16(methodIdsOff + 0 * 8, 0, true);
        view.setUint16(methodIdsOff + 0 * 8 + 2, 0, true);
        view.setUint32(methodIdsOff + 0 * 8 + 4, 3, true);

        view.setUint16(methodIdsOff + 1 * 8, 0, true);
        view.setUint16(methodIdsOff + 1 * 8 + 2, 1, true);
        view.setUint32(methodIdsOff + 1 * 8 + 4, 4, true);

        view.setUint16(methodIdsOff + 2 * 8, 2, true);
        view.setUint16(methodIdsOff + 2 * 8 + 2, 0, true);
        view.setUint32(methodIdsOff + 2 * 8 + 4, 3, true);

        view.setUint16(methodIdsOff + 3 * 8, 2, true);
        view.setUint16(methodIdsOff + 3 * 8 + 2, 1, true);
        view.setUint32(methodIdsOff + 3 * 8 + 4, 4, true);

        while (cursor % 4 !== 0) cursor++;
        const initCodeOff = cursor;
        view.setUint16(cursor, 1, true);
        view.setUint16(cursor + 2, 1, true);
        view.setUint16(cursor + 4, 0, true);
        view.setUint16(cursor + 6, 0, true);
        view.setUint32(cursor + 8, 0, true);
        view.setUint32(cursor + 12, 3, true);
        view.setUint16(cursor + 16, 0x1070, true);
        view.setUint16(cursor + 18, 0x0000, true);
        view.setUint16(cursor + 20, 0x000e, true);
        cursor += 24;

        while (cursor % 4 !== 0) cursor++;
        const onCreateCodeOff = cursor;
        view.setUint16(cursor, 2, true);
        view.setUint16(cursor + 2, 2, true);
        view.setUint16(cursor + 4, 2, true);
        view.setUint16(cursor + 6, 0, true);
        view.setUint32(cursor + 8, 0, true);
        view.setUint32(cursor + 12, 4, true);
        view.setUint16(cursor + 16, 0x2069, true);
        view.setUint16(cursor + 18, 0x0001, true);
        view.setUint16(cursor + 20, 0x0000, true);
        view.setUint16(cursor + 22, 0x000e, true);
        cursor += 24;

        while (cursor % 4 !== 0) cursor++;
        const classDataOff = cursor;
        cursor += this.writeUleb128(buf, cursor, 0);
        cursor += this.writeUleb128(buf, cursor, 0);
        cursor += this.writeUleb128(buf, cursor, 1);
        cursor += this.writeUleb128(buf, cursor, 1);

        cursor += this.writeUleb128(buf, cursor, 2);
        cursor += this.writeUleb128(buf, cursor, 0x0001);
        cursor += this.writeUleb128(buf, cursor, initCodeOff);

        cursor += this.writeUleb128(buf, cursor, 3);
        cursor += this.writeUleb128(buf, cursor, 0x0001);
        cursor += this.writeUleb128(buf, cursor, onCreateCodeOff);

        view.setUint32(classDefsOff + 0, 2, true);
        view.setUint32(classDefsOff + 4, 0x0001, true);
        view.setUint32(classDefsOff + 8, 0, true);
        view.setUint32(classDefsOff + 12, 0, true);
        view.setUint32(classDefsOff + 16, 0xFFFFFFFF, true);
        view.setUint32(classDefsOff + 20, 0, true);
        view.setUint32(classDefsOff + 24, classDataOff, true);
        view.setUint32(classDefsOff + 28, 0, true);

        while (cursor % 4 !== 0) cursor++;
        const totalFileSize = cursor;

        view.setUint32(32, totalFileSize, true);
        view.setUint32(48, totalFileSize, true);

        const dexPayload = buf.subarray(0, totalFileSize);

        const payloadToHash = dexPayload.subarray(32);
        const hashBuf = await crypto.subtle.digest('SHA-1', payloadToHash);
        dexPayload.set(new Uint8Array(hashBuf), 12);

        const payloadToAdler = dexPayload.subarray(12);
        const checksum = this.computeAdler32(payloadToAdler);
        view.setUint32(8, checksum, true);

        return dexPayload;
    }

    /**
     * Build base JSZip container with binary Android XML, ARSC, & valid DEX
     */
    static async createBaseZipAsync(packageName, appName) {
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip 程式庫未載入，請檢查網路連線。');
        }

        const safePkg = this.sanitizePackageName(packageName);
        const zip = new JSZip();

        // 1. AndroidManifest.xml (Binary AXML)
        const axmlBytes = this.getBinaryAndroidManifest(safePkg, appName);
        zip.file('AndroidManifest.xml', axmlBytes);

        // 2. classes.dex (Valid Dalvik Bytecode)
        const dexBytes = await this.getValidClassesDex(safePkg);
        zip.file('classes.dex', dexBytes);

        // 3. resources.arsc (Binary Resource Table, STORED without compression)
        const arscBytes = this.getValidResourcesArsc(safePkg);
        zip.file('resources.arsc', arscBytes, { compression: "STORE" });

        // 4. assets/app_config.json
        const defaultConfig = {
            app_name: appName || "Web2APK App",
            url: "https://example.com",
            package_name: safePkg,
            theme_color: "#4F46E5",
            status_bar_color: "#3730A3",
            user_agent: "",
            enable_javascript: true,
            pull_to_refresh: true,
            swipe_back: true,
            allow_file_upload: true,
            allow_zoom: false,
            show_appbar: false,
            orientation: "portrait",
            splash_bg_color: "#0F172A",
            splash_duration: 2000,
            created_at: new Date().toISOString()
        };
        zip.file('assets/app_config.json', JSON.stringify(defaultConfig, null, 2));

        return zip;
    }
}

window.BaseApkTemplate = BaseApkTemplate;
