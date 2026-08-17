---
title: 我的第六篇文章：由Reasonix到Codex
date: 2026-08-16
tags: [第六篇，Codex，学习笔记]
summary: Resasonix与Codex，流程图与思维导图
---
今天AI工具由Reasonix变为了codex，作为一个AI初学者，我将会用最直白且简单易懂的话来描述这两者的使用感受与运行区别。这篇笔记记录了我从Reasonix到codex的过程。

## Reasonix与Codex
- Reasonix—— DeepSeek 系列，一个开源社区项目。它 1.0 版本用 Go 重写成了单个静态二进制文件，最大的特色是围绕 DeepSeek 的前缀缓存机制做了设计，让长会话能重复利用已付费的上下文，跑久了成本更低。
- Codex——OpenAI 官方的编程智能体产品。按 OpenAI 官方文档的说法，它帮你写代码、审查代码、调试代码，可以在 IDE 扩展、命令行、网页/手机端、以及 CI/CD（通过 SDK）里使用。

## 在Codex上使用DeepSeek模型
```bash
# 终端示例
<(curl -fsSL https://cdn.deepseek.com/api-docs/codex-deepseek-setup-en.sh0
```
将代码输入终端，在Codex上使用DeepSeek模型

## 让AI分析我的产品，告诉我产品逻辑。
将我的English Learning项目导入Codex**帮我熟悉一下这个项目。**
![聊天记录](images/熟悉文档.jpg)
## 学习产品逻辑
我想知道我的产品逻辑的步骤，我认为思维导图与流程图能更好的帮助我学习。
### 思维导图
![思维导图](images/线形思维导图.jpg)
### 流程图
![流程图](images/产品流程图.jpg)
### 流程图说明：
| 形状 | 含义 | 在这套图里的例子 |
|---|---|---|
| **圆角矩形**（两端圆弧） | 开始 / 结束 | 「打开 App」 |
| **普通矩形** | 一个操作、一个页面或一个动作 | 「目标选择 goal.html」「生成 30 天计划」 |
| **菱形** | 判断 / 分支点，一定有"是/否"两个出口 | 「已有学习目标?」「答对率 ≥ 80%?」 |
| **箭头** | 流程走向 | 从首页指向学习页 |
| **箭头上的文字** | 这条分支走的条件 | 「无」「有」「是」「否」 |

## 学习收获
作为一个AI使用的小白，使用这两种工具下来，Reasonix适合新手去打磨自己与AI
