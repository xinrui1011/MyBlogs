/* ============================================================
   Particle Text · 粒子文字效果（原生 Canvas 实现）
   —— 对应 React <ParticleText /> 组件，纯静态可用，无需构建工具

   用法：在任意元素上加 data-particle-text 属性（JSON 配置），
   脚本会自动扫描并渲染，例如：
     <span data-particle-text='{"text":"嗨，我是 Shirley","trigger":"mount"}'>
       原始文字（会被粒子替代显示，保留给无障碍/SEO）
     </span>

   配置项（默认值对齐 <ParticleText /> 示例）：
     text           粒子绘制的文字（缺省用元素文本）
     particleSize   粒子大小（默认 2.2）
     density        密度（默认 4）
     color          粒子主色（默认 #f8fafc 白）
     highlightColor 高亮粒子色（默认 #1f3bea 蓝）
     scatter        初始散开半径 px（默认 190）
     gatherDuration 聚拢时长 ms（默认 1600）
     stagger        逐列延迟 ms（默认 420）
     pointerRepel   鼠标排斥强度（默认 42）
     repelRadius    排斥半径 px（默认 120）
     idleDrift      聚拢后闲时漂移幅度（默认 0.8）
     trigger        "mount" 页面加载即触发
     glow           是否发光（默认 true）
   ============================================================ */
(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var MAX_PARTICLES = 2600;

  var DEFAULTS = {
    text: "",
    particleSize: 2.2,
    density: 4,
    color: "#f8fafc",
    highlightColor: "#1f3bea",
    scatter: 190,
    gatherDuration: 1600,
    stagger: 420,
    pointerRepel: 42,
    repelRadius: 120,
    idleDrift: 0.8,
    trigger: "mount",
    glow: true,
    highlightRatio: 0.18,
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

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function ParticleText(el, options) {
    var cfg = merge(DEFAULTS, options || {});
    if (!cfg.text) cfg.text = (el.innerText || "").trim();

    el.classList.add("pt-line");
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
    var particles = [];
    var startTime = 0;
    var t = 0;
    var mouse = { x: -9999, y: -9999 };
    var reducedMotion = false;
    try {
      reducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { /* 忽略 */ }

    var font = getComputedStyle(el).font || "700 3rem sans-serif";

    /* ---------- 从文字采样粒子 ---------- */
    function sample() {
      var spacing = cfg.particleSize * 1.5 * Math.sqrt(4 / Math.max(cfg.density, 0.5));

      var off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      var octx = off.getContext("2d");
      octx.font = font;
      octx.textBaseline = "middle";
      octx.fillStyle = "#fff";
      octx.fillText(cfg.text, 0, H / 2);

      var img = octx.getImageData(0, 0, W, H);
      var d = img.data;
      particles = [];

      var y, x, idx;
      for (y = 0; y < H; y += spacing) {
        for (x = 0; x < W; x += spacing) {
          if (particles.length >= MAX_PARTICLES) break;
          idx = (Math.floor(y) * W + Math.floor(x)) * 4;
          if (d[idx + 3] > 128) {
            particles.push({
              tx: x,
              ty: y,
              sx: x + (Math.random() - 0.5) * 2 * cfg.scatter,
              sy: y + (Math.random() - 0.5) * 2 * cfg.scatter,
              delay: (x / Math.max(W, 1)) * cfg.stagger,
              phase: Math.random() * TAU,
              highlight: Math.random() < cfg.highlightRatio,
              size: cfg.particleSize * (0.75 + Math.random() * 0.5),
            });
          }
        }
        if (particles.length >= MAX_PARTICLES) break;
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
      sample();
      startTime = performance.now();
    }

    /* ---------- 鼠标排斥 ---------- */
    window.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    window.addEventListener("mouseout", function () {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    /* ---------- 绘制 ---------- */
    function drawParticle(x, y, p) {
      var col = p.highlight ? cfg.highlightColor : cfg.color;
      var r = p.size / 2;
      if (cfg.glow) {
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, r * 3.4, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }

    function renderParticles(now) {
      var i, p, prog, ease, px, py, dx, dy, d2, dist, f;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        prog = clamp((now - startTime - p.delay) / cfg.gatherDuration, 0, 1);
        ease = easeOutCubic(prog);
        px = p.sx + (p.tx - p.sx) * ease;
        py = p.sy + (p.ty - p.sy) * ease;

        // 聚拢完成后的闲时漂移
        if (prog >= 1 && cfg.idleDrift > 0) {
          px += Math.sin(t * 1.2 + p.phase) * cfg.idleDrift * 1.6;
          py += Math.cos(t * 1.4 + p.phase) * cfg.idleDrift * 1.6;
        }

        // 鼠标排斥
        if (cfg.pointerRepel > 0) {
          dx = px - mouse.x;
          dy = py - mouse.y;
          d2 = dx * dx + dy * dy;
          if (d2 < cfg.repelRadius * cfg.repelRadius) {
            dist = Math.sqrt(d2) || 1;
            f = (1 - dist / cfg.repelRadius) * cfg.pointerRepel;
            px += (dx / dist) * f;
            py += (dy / dist) * f;
          }
        }

        drawParticle(px, py, p);
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (startTime === 0) startTime = now;
      t = (now - startTime) / 1000;
      ctx.clearRect(0, 0, W, H);
      renderParticles(now);
      if (!reducedMotion) requestAnimationFrame(frame);
    }

    /* ---------- 启动 ---------- */
    resize();
    window.addEventListener("resize", (function () {
      var wait = null;
      return function () {
        clearTimeout(wait);
        wait = setTimeout(resize, 200);
      };
    }()));

    if (reducedMotion) {
      // 直接渲染聚拢完成态（静态粒子文字）
      startTime = performance.now();
      t = 0;
      renderParticles(startTime + cfg.gatherDuration + 1);
    } else {
      requestAnimationFrame(frame);
    }
  }

  /* ---------- 自动扫描 [data-particle-text] 元素 ---------- */
  function init() {
    var els = document.querySelectorAll("[data-particle-text]");
    var i, el, opts;
    for (i = 0; i < els.length; i++) {
      el = els[i];
      opts = {};
      try {
        opts = JSON.parse(el.getAttribute("data-particle-text") || "{}");
      } catch (e) {
        opts = {};
      }
      ParticleText(el, opts);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.ParticleText = ParticleText;
})();
