/* ============================================================
   Markdown 文章 front matter 解析器（博客列表页 / 阅读页共用）
   支持的 front matter 字段（写在 md 文件开头的 --- 之间）：
     title: 文章标题
     date: 2025-01-01
     tags: [AI, 入门]    或   tags: AI, 入门
     summary: 列表页显示的摘要
   ============================================================ */

window.BlogParser = (function () {
  "use strict";

  /**
   * 解析 md 文本，返回 { meta, body, error }
   * meta: { title, date, tags: [], summary }
   */
  function parse(mdText) {
    const result = { meta: {}, tags: [], body: mdText, error: null };

    // 提取开头的 --- 包裹的 front matter
    const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(mdText);
    if (!fmMatch) {
      result.error = "缺少 front matter（文件开头需有 --- 包裹的标题等元信息）";
      return result;
    }
    result.body = mdText.slice(fmMatch[0].length).trim();

    const meta = {};
    fmMatch[1].split(/\r?\n/).forEach((line) => {
      const idx = line.indexOf(":");
      if (idx <= 0) return;
      const key = line.slice(0, idx).trim().toLowerCase();
      let value = line.slice(idx + 1).trim();
      if (key === "tags") {
        // 支持 [a, b] 或 a, b
        value = value.replace(/^\[|\]$/g, "");
        result.tags = value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (value) {
        meta[key] = value.replace(/^['"]|['"]$/g, "");
      }
    });

    result.meta = meta;
    return result;
  }

  /** 格式化日期，如 2025-01-01 -> 2025-01-01（原样返回，便于排序与展示） */
  function formatDate(dateStr) {
    return dateStr || "未知日期";
  }

  return { parse: parse, formatDate: formatDate };
})();
