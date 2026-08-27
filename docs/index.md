# Microsoft Bing Rewards 自动化工具集

> **🤖 自动化完成微软必应每日搜索任务，智能积累奖励积分**

本项目提供多种实现方式，帮助您自动完成 Microsoft Bing Rewards 的每日搜索任务，节省时间并轻松获取积分奖励。

⭐ 如果这个项目对您有帮助，欢迎 [前往 Gitee 点个 Star](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script) 支持！

<div class="grid cards" markdown>

-   :material-rocket-launch:{ .lg .middle } __一键安装浏览器脚本__

    ---

    1. 先安装脚本管理器：[**Violentmonkey**](https://violentmonkey.github.io/get-it/)（或 Tampermonkey）
    2. 点击下方按钮一键安装脚本
    3. 打开 `www.bing.com` 并登录账户后启动

    [**🚀点击一键安装**](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js){ .md-button .md-button--primary }

</div>

## 📦 版本一览

| 版本 | 技术栈 | 适用场景 | 特点 |
|------|--------|----------|------|
| 🌐 **浏览器脚本**（推荐） | JavaScript + Violentmonkey | 全平台浏览器 | 轻量便捷，一键安装，自动更新 |
| 🖥️ **Python 桌面程序** | Python | Windows 用户 | 功能丰富，配置灵活 |

??? warning "已停止维护的版本（点击展开）"

    | 版本 | 技术栈 | 适用场景 | 特点 |
    |------|--------|----------|------|
    | 🧩 浏览器扩展 | Chrome Extension (MV3) | 全平台浏览器 | 双端搜索，无需脚本管理器 |
    | 🪟 .NET 桌面程序 | .NET Framework | Windows 用户 | 运行稳定，开箱即用 |

    以上版本不再更新，仅保留存档，详见[其他版本](other-versions.md)。

!!! tip "推荐选择"
    目前**推荐使用[浏览器脚本版](scripts/userscript.md)**：纯前端运行、无需安装依赖、跨浏览器支持，一键安装即可使用。

## ✨ 核心特性

- **智能自动化**：一键启动，自动完成当日所有搜索与日常任务，实时显示进度
- **安全模拟**：自动获取热搜词并随机使用，支持随机加词/截词等行为混淆
- **隐私保护**：纯前端运行，**不收集、不上传任何 Cookie 或个人信息**
- **现代 UI**：实时状态面板、图形化配置、自动适配暗色模式

## ⚠️ 使用前提

- ✅ **必须登录**：使用前请在 Bing 网页版登录微软账户
- ✅ **保持前台**：浏览器标签页需处于前台激活状态
- ✅ **网络要求**：需稳定访问 Bing 国际站（`www.bing.com`）
- ✅ **建议浏览器**：推荐使用 Edge，并进入 `edge://settings/system/managePerformance` 将「内存 - 自动将标签页置于睡眠状态」关闭，避免标签页休眠中断任务

!!! danger "风险提示"
    自动化工具存在理论上的账户风险，请模拟真人使用习惯、合理设置随机间隔，遵守微软必应服务条款。

---

**⭐ 如果这个项目对您有帮助，欢迎 Star 支持！**