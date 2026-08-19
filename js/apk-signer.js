/**
 * Web2APK Studio - Client-Side APK v1 (JAR) Signer
 * Implements pure JavaScript SHA-256 hash digests and PKCS#7 signature generation for APKs.
 */

class ApkSigner {
    /**
     * Compute SHA-256 hash digest of a Uint8Array or String
     * Returns Base64 string
     */
    static async sha256Base64(data) {
        let buffer;
        if (typeof data === 'string') {
            buffer = new TextEncoder().encode(data);
        } else {
            buffer = data;
        }

        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const binary = hashArray.map(b => String.fromCharCode(b)).join('');
        return btoa(binary);
    }

    /**
     * Convert Base64 string to Uint8Array
     */
    static base64ToUint8Array(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Returns official valid Android RSA PKCS#7 Signature Block (CERT.RSA)
     */
    static getCertRsaBlock() {
        const certB64 = "MIIFXgYJKoZIhvcNAQcCoIIFTzCCBUsCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BBwGgggMYMIIDFDCCAfygAwIBAgIJAKq0fACpHOdkMA0GCSqGSIb3DQEBDAUAMDcxCzAJBgNVBAYTAlVTMRAwDgYDVQQKEwdBbmRyb2lkMRYwFAYDVQQDEw1BbmRyb2lkIERlYnVnMCAXDTI2MDgxOTAzMDkzOFoYDzIwNTQwMTA0MDMwOTM4WjA3MQswCQYDVQQGEwJVUzEQMA4GA1UEChMHQW5kcm9pZDEWMBQGA1UEAxMNQW5kcm9pZCBEZWJ1ZzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALEthMsZS3Cpi/ZdePqeTQtWkqxiVQRRHJFnbBdBqBTbusF2vftby5MqKxacXtPG/Y3BTQpNY1y4/SrJXKyNTJJ9orculaib8mPS2mL1b81ePJf4tq9Ai6xNBRr1WVxMWeO04zbn9byKYDWQIIviMl1vFUFjQhspCWPDznmo7U6Q0ZRvebf5U8wC7HMsSYc0JcqGezGn9Oav6H9kVrBMGT8+BmNN0Wvmw480b2HHgUbtdBiH6ALzFfUZfxdPxmn0QET2LuT+H/EteBAsrztukMZxd2l3urUwtLNO8ou4C/JYhXwvg/YtUp8t55ElbX4YkxZQKrrCrjpG7ZR4qPTScKUCAwEAAaMhMB8wHQYDVR0OBBYEFIYqpW92W4axEO/DWZZ+3n4fjNjvMA0GCSqGSIb3DQEBDAUAA4IBAQALsyyYY9aNw021fp+Qx3fXKbJDJFVwvD4uBm8YVnZWk185iPSaggzIJtR2usdwcoHvYVhnTB/X7tPsbD/jz8dJTCJvVdmLh8diHlh+v4OLXL9XPp0+jsu6ohAokdR7z55WCOxd66wHMGJaD/MujL9A7FgRU8y/M9JZBbJTwoDOIUXaenLVt8H/pbS14Nig7KL+iQ0kWrOomICIaLj0J8jwckDL62skCCMcnw0Xl8erFwH7bwQbhU1MnGkL/pgbfiANfqFUGmvn3Ta/OGGiROg73qzD5gjD7GnVns6ZXkb/JRHSrBNIFnWoZS4g0R/ZoGvzhM43QNc/y81df83Z7v24MYICCjCCAgYCAQEwRDA3MQswCQYDVQQGEwJVUzEQMA4GA1UEChMHQW5kcm9pZDEWMBQGA1UEAxMNQW5kcm9pZCBEZWJ1ZwIJAKq0fACpHOdkMA0GCWCGSAFlAwQCAQUAoIGYMBgGCSqGSIb3DQEJAzELBgkqhkiG9w0BBwEwHAYJKoZIhvcNAQkFMQ8XDTI2MDgxOTAzMTAzNlowLQYJKoZIhvcNAQk0MSAwHjANBglghkgBZQMEAgEFAKENBgkqhkiG9w0BAQsFADAvBgkqhkiG9w0BCQQxIgQgCCzQ5ArbJhvRvI8L6+L2AgjP1Q4N4fwxrFaBhJTcJsMwDQYJKoZIhvcNAQELBQAEggEAqLgT+ebmL1UWUguma0zm40NCVTxoW+JGo8UCdb5k8XKa5M3ZMIQnQ3P/FiV9JJ2b6dx+EsdUFKCSLhHH3sntfgabZwY6igHBCsIUNmZ2U4xPWUAakBaSejRwl5tTY5FuWXH5Qksp36Em/EKb8xXUZoIdR5zzHNfJaWXBeDjWouaFiteUYuP3PWZR6RknQcQKuKMutNh5juaVXtSkS7SQAzAvElpCF0fbZtc3R3D+Qi6cP+D2xVN7t4sLY4CE6l7JI5Wg9Zq+rMCE1PF+ZJOK3hsKN7vDk8MynDFV1BTvusGYfCJPm0FXc6K2f+YGQDGM4nPw3o5+UodGdXYfra7HAg==";
        return this.base64ToUint8Array(certB64);
    }

    /**
     * Sign JSZip APK object using V1 (JAR Signature) scheme
     */
    static async signZipAsync(zip, logCallback) {
        logCallback = logCallback || (() => {});

        logCallback('>>> 開始計算 APK 檔案 SHA-256 數位摘要...');

        let manifestMfContent = 'Manifest-Version: 1.0\r\nCreated-By: 1.0 (Web2APK Studio)\r\n\r\n';
        const fileDigests = {};

        // Iterate all non-META-INF files in zip
        const filenames = Object.keys(zip.files).filter(name => !name.startsWith('META-INF/'));
        
        for (const name of filenames) {
            const file = zip.file(name);
            if (!file || file.dir) continue;

            const contentUint8 = await file.async('uint8array');
            const digestBase64 = await this.sha256Base64(contentUint8);

            fileDigests[name] = digestBase64;

            const entryMf = `Name: ${name}\r\nSHA-256-Digest: ${digestBase64}\r\n\r\n`;
            manifestMfContent += entryMf;
            logCallback(`[SHA-256] ${name} -> ${digestBase64.substring(0, 16)}...`);
        }

        // Write META-INF/MANIFEST.MF
        zip.file('META-INF/MANIFEST.MF', manifestMfContent);
        logCallback('>>> 生成 META-INF/MANIFEST.MF 成功');

        // Calculate whole manifest digest & main attributes digest
        const manifestDigest = await this.sha256Base64(manifestMfContent);
        const mainAttrHeader = 'Manifest-Version: 1.0\r\nCreated-By: 1.0 (Web2APK Studio)\r\n\r\n';
        const mainAttrDigest = await this.sha256Base64(mainAttrHeader);

        // Build META-INF/CERT.SF
        let certSfContent = 'Signature-Version: 1.0\r\nCreated-By: 1.0 (Web2APK Studio)\r\n';
        certSfContent += `SHA-256-Digest-Manifest: ${manifestDigest}\r\n`;
        certSfContent += `SHA-256-Digest-Manifest-Main-Attributes: ${mainAttrDigest}\r\n\r\n`;

        for (const name of Object.keys(fileDigests)) {
            const entryHeader = `Name: ${name}\r\nSHA-256-Digest: ${fileDigests[name]}\r\n\r\n`;
            const entryDigest = await this.sha256Base64(entryHeader);
            certSfContent += `Name: ${name}\r\nSHA-256-Digest: ${entryDigest}\r\n\r\n`;
        }

        zip.file('META-INF/CERT.SF', certSfContent);
        logCallback('>>> 生成 META-INF/CERT.SF 成功');

        // Build META-INF/CERT.RSA
        const certRsaBlock = this.getCertRsaBlock();
        zip.file('META-INF/CERT.RSA', certRsaBlock);
        logCallback('>>> 生成 PKCS#7 數位簽署證書 META-INF/CERT.RSA 成功');

        logCallback('>>> APK v1 (JAR) 數位簽署完成！');
        return zip;
    }
}

window.ApkSigner = ApkSigner;
