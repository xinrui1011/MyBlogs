/* ============================================================
   Shirley's AI Journey · 交互脚本
   - 导航栏滚动效果 + 移动端菜单
   - 打字机效果
   - 滚动渐入动画 + 当前章节高亮
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 1. 导航栏：滚动后加深背景 ---------- */
  const navbar = document.querySelector(".navbar");
  const onScrollNav = () => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- 2. 移动端汉堡菜单 ---------- */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // 点击菜单项后自动收起
  navLinks.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- 3. 打字机效果 ---------- */
  const typeText = document.getElementById("typeText");
  const words = ["AI", "机器学习", "深度学习", "大模型", "新事物"];
  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function typeLoop() {
    const current = words[wordIndex];

    if (!deleting) {
      charIndex++;
      typeText.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(typeLoop, 1800); // 停顿
        return;
      }
    } else {
      charIndex--;
      typeText.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        setTimeout(typeLoop, 400);
        return;
      }
    }
    setTimeout(typeLoop, deleting ? 55 : 140);
  }
  typeLoop();

  /* ---------- 4. 滚动渐入动画 ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  /* ---------- 5. 当前章节高亮 ---------- */
  const sections = document.querySelectorAll("section[id]");
  const linkMap = {};
  document.querySelectorAll(".nav-link").forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    linkMap[id] = link;
  });

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          Object.values(linkMap).forEach((l) => l.classList.remove("active"));
          if (linkMap[entry.target.id]) linkMap[entry.target.id].classList.add("active");
        }
      });
    },
    { threshold: 0.35 }
  );
  sections.forEach((section) => sectionObserver.observe(section));

  /* ---------- 6. 页脚年份 ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
