/* ============================================================
   作品集数据（Projects）
   添加新作品：在数组里加一条记录即可，字段说明：
     title   作品名称（必填）
     desc    一句话描述（建议简洁，保证卡片内完整显示）
     tags    标签数组，如 ["AI", "Python"]
     image   封面图片地址（留空 "" 则显示 Grainient 渐变封面，
             可填自己的截图/图片 URL 或 ./projects/images/xxx.png）
     link    作品链接（留空则不显示“查看”按钮）
     detail  作品详情文章文件名（放在 articles/ 目录，留空则卡片不可点击）
     status  状态标识（可选：进行中 / 已完成 / 学习中）
   ============================================================ */
window.PROJECTS = [
  {
    title: "基础学科学习笔记",
    desc: "日常学习笔记 —— 从高等数学的公式推导，到大学物理的例题实验，再到大学英语的单词与阅读积累。",
    tags: ["高等数学", "大学物理", "大学英语"],
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=900&q=80",
    link: "",
    detail: "study-guide.md",
    status: "学习中",
  },
  {
    title: "大学生活分享",
    desc: "分享大学生活的日常 —— 学习、社团、朋友与成长的点点滴滴。",
    tags: ["大学生活", "分享"],
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    link: "",
    detail: "",
    status: "进行中",
  },
  {
    title: "旅游攻略",
    desc: "旅行攻略与游记 —— 目的地推荐、行程安排与旅途中的小确幸。",
    tags: ["旅游", "攻略"],
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80",
    link: "",
    detail: "",
    status: "进行中",
  },
];
