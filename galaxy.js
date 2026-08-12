/* ============================================================
   Galaxy Background · 星系星空背景（原生 Canvas 实现）
   —— 对应 React <Galaxy /> 组件的效果，纯静态可用，无需构建工具

   使用方式（页面底部引入本脚本后自动启用）：
     <script src="galaxy.js"></script>

   也可手动调用自定义参数（默认即蓝色主题）：
     GalaxyBackground({
       starSpeed: 0.5,       // 星星漂移速度
       density: 1,           // 粒子密度（1 = 默认数量）
       hueShift: 0,          // 色相偏移（围绕蓝色基准色相旋转）
       speed: 1,             // 整体速度倍率
       glowIntensity: 0.3,   // 光晕强度
       saturation: 0,        // 星星饱和度（0 = 白亮星）
       mouseRepulsion: true, // 鼠标排斥
       repulsionStrength: 2, // 排斥强度
       twinkleIntensity: 0.3,// 闪烁强度
       rotationSpeed: 0.1,   // 星系旋转速度
       transparent: true     // 背景透明（叠加在页面深蓝背景上）
     });
   ============================================================ */
(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var BASE_HUE = 215; // 蓝色主题基准色相

  var defaults = {
    starSpeed: 0.5,
    density: 1,
    hueShift: 0,
    speed: 1,
    glowIntensity: 0.3,
    saturation: 0,
    mouseRepulsion: true,
    repulsionStrength: 2,
    twinkleIntensity: 0.3,
    rotationSpeed: 0.1,
    transparent: true,
  };

  function GalaxyBackground(options) {
    var cfg = {};
    var key;
    for (key in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
        cfg[key] = defaults[key];
      }
    }
    for (key in options || {}) {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        cfg[key] = options[key];
      }
    }

    /* ---------- 创建画布 ---------- */
    var canvas = document.createElement("canvas");
    canvas.id = "galaxy-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:-2;" +
      "pointer-events:none;";
    // 插到光晕背景之前，让光晕叠加在星空中，形成氛围
    var glow = document.querySelector(".bg-glow");
    if (glow && glow.parentNode) {
      glow.parentNode.insertBefore(canvas, glow);
    } else {
      document.body.appendChild(canvas);
    }

    var ctx = canvas.getContext("2d");
    var stars = [];
    var W = 0;
    var H = 0;
    var CX = 0;
    var CY = 0;
    var MAX_R = 0;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var mouse = { x: -9999, y: -9999 };
    var reducedMotion = false;

    try {
      reducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { /* 忽略 */ }

    /* ---------- 粒子生成 ---------- */
    function spawn() {
      var count = Math.round(1300 * cfg.density);
      if (W < 768) count = Math.round(count * 0.6); // 移动端减密度

      stars = [];
      for (var i = 0; i < count; i++) {
        var isSpiral = Math.random() < 0.75;
        var s = {};

        s.size = 0.5 + Math.random() * 1.6;
        s.phase = Math.random() * TAU;             // 闪烁相位
        s.twinkleSpeed = 1 + Math.random() * 2.5;  // 闪烁频率
        s.hue = BASE_HUE + cfg.hueShift + (Math.random() - 0.5) * 24;
        s.depth = 0.35 + Math.random() * 0.65;     // 深度 → 大小/亮度

        if (isSpiral) {
          // 银河旋臂分布（3 条旋臂，越靠中心越密）
          s.r = Math.pow(Math.random(), 0.6) * MAX_R;
          var armIndex = Math.floor(Math.random() * 3);
          s.angle =
            s.r * 0.022 + armIndex * (TAU / 3) + (Math.random() - 0.5) * 0.4;
          s.spiral = true;
        } else {
          // 随机散星
          s.r = Math.sqrt(Math.random()) * MAX_R;
          s.angle = Math.random() * TAU;
          s.spiral = false;
        }
        s.x0 = s.r * Math.cos(s.angle);
        s.y0 = s.r * Math.sin(s.angle);
        s.vx = (Math.random() - 0.5) * 0.12; // 轻微自身漂移
        s.vy = (Math.random() - 0.5) * 0.12;
        stars.push(s);
      }
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      CX = W / 2;
      CY = H / 2;
      MAX_R = Math.sqrt(W * W + H * H) / 2 + 120;
      spawn();
    }

    /* ---------- 鼠标 ---------- */
    if (cfg.mouseRepulsion) {
      window.addEventListener("mousemove", function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      });
      window.addEventListener("mouseout", function () {
        mouse.x = -9999;
        mouse.y = -9999;
      });
    }

    /* ---------- 绘制 ---------- */
    function drawStar(s, x, y, alpha) {
      var size = s.size * (0.5 + s.depth * 0.9);
      var flicker = 1 + cfg.twinkleIntensity * Math.sin(t * s.twinkleSpeed + s.phase);
      size *= 0.6 + 0.4 * flicker;
      alpha *= 0.35 + 0.65 * s.depth;
      alpha *= flicker > 1 ? 1 : 0.55 + 0.45 * flicker;

      // 光晕层（低 alpha 大圆，性能优于 shadowBlur）
      if (cfg.glowIntensity > 0.02) {
        ctx.globalAlpha = alpha * cfg.glowIntensity * 0.85;
        ctx.fillStyle = "hsl(" + s.hue + ", 60%, 72%)";
        ctx.beginPath();
        ctx.arc(x, y, size * 3.4, 0, TAU);
        ctx.fill();
      }
      // 星核
      ctx.globalAlpha = Math.min(alpha, 1);
      ctx.fillStyle = "hsl(" + s.hue + ", " + cfg.saturation + "%, 92%)";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }

    var t = 0;
    var last = null;

    function frame(now) {
      if (last === null) last = now;
      var dt = Math.min((now - last) / 1000, 0.05); // 上限防跳变
      last = now;
      t += dt;

      ctx.clearRect(0, 0, W, H);

      var i, s, x, y;
      var rot = cfg.rotationSpeed * cfg.speed * dt;
      var drift = cfg.starSpeed * cfg.speed * dt * 14;
      var repulse = cfg.repulsionStrength * 26 * dt;

      for (i = 0; i < stars.length; i++) {
        s = stars[i];

        // 旋转（旋臂粒子绕中心公转）
        if (s.spiral) {
          s.angle += rot;
        }
        // 漂移（缓慢向外扩散）
        s.r += drift;
        if (s.r > MAX_R) {
          s.r = 0;
          s.angle = Math.random() * TAU;
        }

        x = CX + s.r * Math.cos(s.angle) + s.x0 * 0.05 + s.vx * 10;
        y = CY + s.r * Math.sin(s.angle) + s.y0 * 0.05 + s.vy * 10;

        // 鼠标排斥
        if (cfg.mouseRepulsion) {
          var dx = x - mouse.x;
          var dy = y - mouse.y;
          var dist2 = dx * dx + dy * dy;
          var repR = 130 + s.size * 40;
          if (dist2 < repR * repR && dist2 > 0.01) {
            var dist = Math.sqrt(dist2);
            var force = (1 - dist / repR) * repulse;
            x += (dx / dist) * force;
            y += (dy / dist) * force;
          }
        }

        // 亮度：中心亮、边缘渐暗
        var centerDist = Math.sqrt(
          (x - CX) * (x - CX) + (y - CY) * (y - CY)
        );
        var alpha = 0.95 - (centerDist / MAX_R) * 0.85;
        if (alpha <= 0.02) continue;

        drawStar(s, x, y, alpha);
      }

      ctx.globalAlpha = 1;

      if (!reducedMotion) {
        requestAnimationFrame(frame);
      }
    }

    /* ---------- 启动 ---------- */
    resize();
    window.addEventListener("resize", function () {
      var wait = null;
      return function () {
        clearTimeout(wait);
        wait = setTimeout(resize, 200);
      };
    }());

    if (reducedMotion) {
      frame(performance.now()); // 只画一帧静态星空
    } else {
      requestAnimationFrame(frame);
    }
  }

  /* ---------- 页面加载后自动启动 ---------- */
  function init() {
    if (!document.getElementById("galaxy-canvas")) {
      GalaxyBackground();
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.GalaxyBackground = GalaxyBackground;
})();
