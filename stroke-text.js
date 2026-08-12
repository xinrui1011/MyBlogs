/* ============================================================
   Stroke Text · 描边文字动画（原生 Canvas 实现）
   —— 对应 React <StrokeText /> 组件，纯静态可用，无需构建工具

   用法：在元素上加 data-stroke-text 属性（JSON 配置），自动扫描渲染：
     <span data-stroke-text='{"text":"嗨，我是 Shirley"}'>
       原始文字（会被动画文字替代显示，保留给无障碍/SEO）
     </span>

   配置项（默认值对齐 <StrokeText /> 示例）：
     text           要动画的文字（缺省用元素文本）
     strokeColor    描边颜色（默认 #245ea7 蓝）
     fillColor      填充颜色（默认 #F8FAFC 白）
     strokeWidth    描边宽度（默认 1.4）
     drawDuration   描边绘制时长 s（默认 1.6）
     fillDelay      填充延迟 s（默认 0.2）
     stagger        逐字延迟 s（默认 0.05）
     fillMode       "wipe" 填充从左到右擦除
     ease           "power2.out"
     trigger        "mount"
     letterSpacing  字间距 px（默认 -4）
     reverse        是否反向绘制（默认 false）
   ============================================================ */
(function () {
  "use strict";

  var DEFAULTS = {
    text: "",
    strokeColor: "#245ea7",
    fillColor: "#F8FAFC",
    strokeWidth: 1.4,
    drawDuration: 1.6,
    fillDelay: 0.2,
    stagger: 0.05,
    fillMode: "wipe",
    ease: "power2.out",
    trigger: "mount",
    letterSpacing: -4,
    reverse: false,
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

  function easePower2Out(t) { return 1 - Math.pow(1 - t, 2); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait);
    };
  }

  function StrokeText(el, options) {
    var cfg = merge(DEFAULTS, options || {});
    if (!cfg.text) cfg.text = (el.innerText || "").trim();

    el.classList.add("st-line");
    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;" +
      "pointer-events:none;";
    el.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0;
    var H = 0;
    var chars = []; // { ch, x, w }
    var startTime = 0;
    var reducedMotion = false;
    try {
      reducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { /* 忽略 */ }

    var font = getComputedStyle(el).font || "700 3rem sans-serif";

    /* ---------- 逐字测量（手动 letterSpacing） ---------- */
    function measureChars() {
      chars = [];
      var x = 0;
      var i, ch, w;
      for (i = 0; i < cfg.text.length; i++) {
        ch = cfg.text[i];
        w = ctx.measureText(ch).width;
        chars.push({ ch: ch, x: x, w: w, index: i });
        x += w + cfg.letterSpacing;
      }
    }

    /* ---------- 尺寸与重建 ---------- */
    function resize() {
      W = el.offsetWidth;
      H = el.offsetHeight;
      if (W < 2 || H < 2) return;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.font = font;
      ctx.textBaseline = "middle";
      measureChars();
      startTime = performance.now();
    }

    /* ---------- 单个字符：描边 → 填充 wipe ---------- */
    function drawChar(c, elapsed) {
      var delay = c.index * cfg.stagger;
      var sp = easePower2Out(clamp((elapsed - delay) / cfg.drawDuration, 0, 1));
      var fp = easePower2Out(
        clamp(
          (elapsed - delay - cfg.drawDuration - cfg.fillDelay) /
            cfg.drawDuration,
          0,
          1
        )
      );

      // 描边（dashOffset 模拟一笔一划的绘制）
      if (sp > 0) {
        var dash = Math.max(c.w * 2.4, 8);
        ctx.save();
        ctx.strokeStyle = cfg.strokeColor;
        ctx.lineWidth = cfg.strokeWidth;
        ctx.lineCap = "round";
        ctx.setLineDash([dash, dash]);
        ctx.lineDashOffset = cfg.reverse ? dash * sp : dash * (1 - sp);
        ctx.strokeText(c.ch, c.x, H / 2);
        ctx.restore();
      }

      // 填充 wipe（clip 从左到右展开）
      if (fp > 0) {
        ctx.save();
        ctx.fillStyle = cfg.fillColor;
        ctx.beginPath();
        ctx.rect(c.x, -H, c.w * fp, H * 3);
        ctx.clip();
        ctx.fillText(c.ch, c.x, H / 2);
        ctx.restore();
      }
    }

    /* ---------- 动画循环 ---------- */
    function frame(now) {
      if (startTime === 0) startTime = now;
      var elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, W, H);

      var allDone = true;
      var i, c, endAt;
      for (i = 0; i < chars.length; i++) {
        c = chars[i];
        drawChar(c, elapsed);
        endAt = c.index * cfg.stagger + cfg.drawDuration + cfg.fillDelay + cfg.drawDuration;
        if (elapsed < endAt) allDone = false;
      }

      if (!reducedMotion && !allDone) {
        requestAnimationFrame(frame);
      }
      // 完成后停止循环，保留最终画面
    }

    /* ---------- 启动 ---------- */
    resize();
    window.addEventListener("resize", debounce(resize, 200));

    if (reducedMotion) {
      // 直接渲染完成态（描边 + 填充完整）
      var i2, c2;
      for (i2 = 0; i2 < chars.length; i2++) {
        c2 = chars[i2];
        drawChar(c2, 9999);
      }
    } else {
      requestAnimationFrame(frame);
    }
  }

  /* ---------- 自动扫描 [data-stroke-text] 元素 ---------- */
  function init() {
    var els = document.querySelectorAll("[data-stroke-text]");
    var i, el, opts;
    for (i = 0; i < els.length; i++) {
      el = els[i];
      opts = {};
      try {
        opts = JSON.parse(el.getAttribute("data-stroke-text") || "{}");
      } catch (e) {
        opts = {};
      }
      StrokeText(el, opts);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.StrokeText = StrokeText;
})();
