/* ============================================================
   Grainient · 颗粒动感渐变背景（原生 Canvas 逐像素实现）
   —— 对应 React Bits <Grainient /> 组件，纯静态可用

   用法：在元素上加 data-grainient 属性（可选 JSON 配置），自动渲染：
     <div class="cover" data-grainient='{"color1":"#9faeff","color2":"#2789ff"}'></div>

   实现说明：
   - 渐变层：低分辨率逐像素渲染（三色插值 + 正弦扭曲流动），
     平滑放大到封面，得到接近原版的流动渐变
   - 颗粒层：独立高分辨率噪点画布叠加（pixelated 保持颗粒清晰），
     grainAnimated=false 时噪点静态
   - 后处理：对比度 / 饱和度 / gamma 逐像素应用

   配置项（默认值对齐 <Grainient /> 示例）：
     color1/color2/color3  三色渐变（默认蓝紫 #9faeff #2789ff #B497CF）
     timeSpeed             时间速度（0.25）
     colorBalance          颜色中段偏移（0）
     warpStrength          扭曲强度（1）
     warpFrequency         扭曲波纹频率（5）
     warpSpeed             扭曲流动速度（2）
     warpAmplitude         扭曲幅度（50）
     blendAngle            渐变初始角度（0）
     blendSoftness         渐变柔和度（0.05）
     rotationAmount        渐变旋转速度（500）
     noiseScale            噪声尺度（2）
     grainAmount           噪点密度（0.1）
     grainScale            噪点大小（2）
     grainAnimated         噪点动画（false）
     contrast/gamma/saturation  后处理（1.5 / 1 / 1）
     centerX/centerY       渐变中心偏移（0 / 0）
     zoom                  渐变缩放（0.9）
   ============================================================ */
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  var DEFAULTS = {
    color1: "#9faeff",
    color2: "#2789ff",
    color3: "#B497CF",
    timeSpeed: 0.25,
    colorBalance: 0,
    warpStrength: 1,
    warpFrequency: 5,
    warpSpeed: 2,
    warpAmplitude: 50,
    blendAngle: 0,
    blendSoftness: 0.05,
    rotationAmount: 500,
    noiseScale: 2,
    grainAmount: 0.1,
    grainScale: 2,
    grainAnimated: false,
    animated: true,
    contrast: 1.5,
    gamma: 1,
    saturation: 1,
    centerX: 0,
    centerY: 0,
    zoom: 0.9,
  };

  function merge(base, extra) {
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (k in extra || {}) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    }
    return out;
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }

  function hexToRgb(hex) {
    var h = String(hex || "#000").replace("#", "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var n = parseInt(h, 16);
    if (isNaN(n)) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  function Grainient(el, options) {
    var cfg = merge(DEFAULTS, options || {});
    var c1 = hexToRgb(cfg.color1);
    var c2 = hexToRgb(cfg.color2);
    var c3 = hexToRgb(cfg.color3);

    el.classList.add("grainient-cover");
    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    /* 渐变层（低分辨率，平滑放大） */
    var gradCanvas = document.createElement("canvas");
    gradCanvas.setAttribute("aria-hidden", "true");
    gradCanvas.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;" +
      "z-index:0;pointer-events:none;";
    /* 颗粒层（高分辨率噪点，pixelated 保持颗粒） */
    var grainCanvas = document.createElement("canvas");
    grainCanvas.setAttribute("aria-hidden", "true");
    grainCanvas.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;" +
      "z-index:1;pointer-events:none;image-rendering:pixelated;";

    if (el.firstChild) {
      el.insertBefore(grainCanvas, el.firstChild);
      el.insertBefore(gradCanvas, grainCanvas);
    } else {
      el.appendChild(gradCanvas);
      el.appendChild(grainCanvas);
    }

    var gradCtx = gradCanvas.getContext("2d");
    var grainCtx = grainCanvas.getContext("2d");
    var W = 0;
    var H = 0;
    var LW = 0;
    var LH = 0;
    var reducedMotion = false;
    try {
      reducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { /* 忽略 */ }

    /* ---------- 颗粒噪点（离屏） ---------- */
    function makeGrain() {
      var gw = Math.max(8, Math.round(W / cfg.grainScale));
      var gh = Math.max(8, Math.round(H / cfg.grainScale));
      grainCanvas.width = gw;
      grainCanvas.height = gh;
      var img = grainCtx.createImageData(gw, gh);
      var d = img.data;
      var i;
      for (i = 0; i < d.length; i += 4) {
        var v = Math.random() * 255;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = Math.random() < cfg.grainAmount ? 36 : 0;
      }
      grainCtx.putImageData(img, 0, 0);
    }

    /* ---------- 尺寸 ---------- */
    function resize() {
      W = el.offsetWidth;
      H = el.offsetHeight;
      if (W < 4 || H < 4) return;
      LW = Math.max(48, Math.round(W / 4));
      LH = Math.max(28, Math.round(H / 4));
      gradCanvas.width = LW;
      gradCanvas.height = LH;
      makeGrain();
    }

    /* ---------- 逐像素渲染渐变帧 ---------- */
    var t = 0;
    var imgData = null;

    function render() {
      if (!imgData) imgData = gradCtx.createImageData(LW, LH);
      var d = imgData.data;

      var angle =
        (cfg.blendAngle + t * cfg.rotationAmount * cfg.timeSpeed) *
        Math.PI / 180;
      var gx = Math.cos(angle);
      var gy = Math.sin(angle);
      var cx = LW / 2 + cfg.centerX * LW;
      var cy = LH / 2 + cfg.centerY * LH;
      var half = Math.hypot(LW, LH) * 0.7 * cfg.zoom;
      var amp = cfg.warpAmplitude * 0.045 * cfg.warpStrength;
      var freq = cfg.warpFrequency * TAU;
      var mid = 0.5 + cfg.colorBalance * 0.4;

      var i = 0;
      var y, x, wx, wy, px, py, proj, k, r, g, b, lum;
      for (y = 0; y < LH; y++) {
        for (x = 0; x < LW; x++) {
          // 正弦扭曲（流动）
          wx = x + Math.sin((y / LH) * freq + t * cfg.warpSpeed) * amp;
          wy = y + Math.cos((x / LW) * freq + t * cfg.warpSpeed * 0.8) * amp;

          // 投影到渐变线，得到 0..1 位置
          px = wx - cx;
          py = wy - cy;
          proj = (px * gx + py * gy) / (2 * half) + 0.5;
          if (proj < 0) proj = 0;
          else if (proj > 1) proj = 1;

          // 三色分段插值
          if (proj <= mid) {
            k = proj / mid;
            r = c1.r + (c2.r - c1.r) * k;
            g = c1.g + (c2.g - c1.g) * k;
            b = c1.b + (c2.b - c1.b) * k;
          } else {
            k = (proj - mid) / (1 - mid);
            r = c2.r + (c3.r - c2.r) * k;
            g = c2.g + (c3.g - c2.g) * k;
            b = c2.b + (c3.b - c2.b) * k;
          }

          // gamma
          if (cfg.gamma !== 1) {
            r = 255 * Math.pow(r / 255, 1 / cfg.gamma);
            g = 255 * Math.pow(g / 255, 1 / cfg.gamma);
            b = 255 * Math.pow(b / 255, 1 / cfg.gamma);
          }
          // 饱和度
          lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = lum + (r - lum) * cfg.saturation;
          g = lum + (g - lum) * cfg.saturation;
          b = lum + (b - lum) * cfg.saturation;
          // 对比度
          r = (r - 128) * cfg.contrast + 128;
          g = (g - 128) * cfg.contrast + 128;
          b = (b - 128) * cfg.contrast + 128;

          d[i] = clamp255(r);
          d[i + 1] = clamp255(g);
          d[i + 2] = clamp255(b);
          d[i + 3] = 255;
          i += 4;
        }
      }
      gradCtx.putImageData(imgData, 0, 0);
    }

    /* ---------- 动画循环 ---------- */
    var last = null;

    function frame(now) {
      if (last === null) last = now;
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt * cfg.timeSpeed * 10;
      render();
      if (!reducedMotion) requestAnimationFrame(frame);
    }

    /* ---------- 启动 ---------- */
    resize();
    window.addEventListener("resize", debounce(resize, 200));

    if (!cfg.animated || reducedMotion) {
      render(); // 静态一帧（关闭动态闪光时）
    } else {
      requestAnimationFrame(frame);
    }
  }

  /* ---------- 自动扫描 [data-grainient] 元素 ---------- */
  function init() {
    var els = document.querySelectorAll("[data-grainient]");
    var i, el, opts;
    for (i = 0; i < els.length; i++) {
      el = els[i];
      opts = {};
      try {
        opts = JSON.parse(el.getAttribute("data-grainient") || "{}");
      } catch (e) {
        opts = {};
      }
      Grainient(el, opts);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.Grainient = Grainient;
})();
