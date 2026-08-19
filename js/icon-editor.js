/**
 * Web2APK Studio - Icon Editor Module (HTML5 Canvas)
 */

class IconEditor {
    constructor(canvasId, maskPreviewId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.maskPreview = document.getElementById(maskPreviewId);
        
        this.state = {
            image: null,
            text: 'W',
            bgColor: '#FFFFFF',
            paddingPercent: 20,
            shape: 'squircle' // 'squircle', 'circle', 'square'
        };

        this.init();
    }

    init() {
        this.redraw();
    }

    setImage(img) {
        this.state.image = img;
        this.redraw();
    }

    setTextLogo(text) {
        this.state.image = null;
        this.state.text = (text || 'A').charAt(0).toUpperCase();
        this.redraw();
    }

    setBgColor(color) {
        this.state.bgColor = color;
        this.redraw();
    }

    setPadding(padding) {
        this.state.paddingPercent = parseInt(padding, 10);
        this.redraw();
    }

    setShape(shape) {
        this.state.shape = shape;
        if (this.maskPreview) {
            this.maskPreview.className = `icon-shape-mask ${shape}`;
        }
        this.redraw();
    }

    redraw() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        this.ctx.clearRect(0, 0, w, h);

        // Draw shape background fill
        this.ctx.save();
        this.clipShape(this.ctx, w, h, this.state.shape);
        
        this.ctx.fillStyle = this.state.bgColor;
        this.ctx.fillRect(0, 0, w, h);

        // Draw Content (Image or Letter Logo)
        const padding = (w * this.state.paddingPercent) / 100;
        const drawW = w - padding;
        const drawH = h - padding;
        const drawX = padding / 2;
        const drawY = padding / 2;

        if (this.state.image) {
            // Draw uploaded image
            this.ctx.drawImage(this.state.image, drawX, drawY, drawW, drawH);
        } else {
            // Draw default / letter logo
            this.ctx.fillStyle = '#4f46e5';
            this.ctx.font = `900 ${Math.floor(drawH * 0.65)}px "Plus Jakarta Sans", sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.state.text, w / 2, h / 2 + 10);
        }

        this.ctx.restore();
    }

    clipShape(ctx, w, h, shape) {
        ctx.beginPath();
        if (shape === 'circle') {
            ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
        } else if (shape === 'squircle') {
            const r = w * 0.22; // Squircle corner radius
            ctx.moveTo(r, 0);
            ctx.lineTo(w - r, 0);
            ctx.quadraticCurveTo(w, 0, w, r);
            ctx.lineTo(w, h - r);
            ctx.quadraticCurveTo(w, h, w - r, h);
            ctx.lineTo(r, h);
            ctx.quadraticCurveTo(0, h, 0, h - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
        } else {
            // Square
            ctx.rect(0, 0, w, h);
        }
        ctx.closePath();
        ctx.clip();
    }

    /**
     * Renders icon scaled to a specific width and height
     * Returns Promise<Uint8Array> PNG bytes
     */
    async getScaledPngBytes(targetSize) {
        const offscreen = document.createElement('canvas');
        offscreen.width = targetSize;
        offscreen.height = targetSize;
        const octx = offscreen.getContext('2d');

        octx.drawImage(this.canvas, 0, 0, targetSize, targetSize);

        return new Promise((resolve) => {
            offscreen.toBlob((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(new Uint8Array(reader.result));
                };
                reader.readAsArrayBuffer(blob);
            }, 'image/png');
        });
    }

    /**
     * Render icon to target canvas element (e.g., home screen preview)
     */
    renderToCanvas(targetCanvas) {
        if (!targetCanvas) return;
        const ctx = targetCanvas.getContext('2d');
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.drawImage(this.canvas, 0, 0, targetCanvas.width, targetCanvas.height);
    }
}

window.IconEditor = IconEditor;
