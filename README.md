# Microsoft Bing Rewards Daily Task Script (微软必应奖励每日任务脚本)

![](https://img.shields.io/badge/license-MIT-blue.svg)
![](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/badge/star.svg?theme=white) <!-- 星标数徽章 -->

---

## 浏览器扩展版本

> 【版本已过期】本项目曾经提供 **浏览器扩展** 和 **Tampermonkey 用户脚本** 两种版本。 
> 现在推荐使用新的 **bing-rewards-simulator** 版本，它提供了更好的功能和维护支持。

---

## bing-rewards-simulator 版本

> 新版本：**bing-rewards-simulator** 是一个桌面自动化程序，使用 .NET Framework 实现，可以更稳定地完成 Bing Rewards 搜索任务。

- ✅ **更稳定**：基于桌面应用的自动化，不受浏览器扩展政策影响
- ✅ **功能更强**：支持键盘模拟、更精细的浏览器控制
- ✅ **易于配置**：通过配置文件灵活调整各项参数

👉 **[查看 bing-rewards-simulator 版本](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/blob/master/bing-rewards-simulator/README.md)**

---

**自动化完成微软必应每日搜索任务，轻松积累奖励积分**

此脚本是一个浏览器用户脚本（UserScript），可在安装 Tampermonkey 等脚本管理器后，自动模拟人工搜索行为，帮助您完成 Microsoft Bing Rewards（微软必应奖励）的每日PC端和移动端搜索任务，节省您的时间。

---

## ✨ 核心功能特性

### 🎯 自动化与效率
-   **全自动任务执行**：一键启动，自动完成当日所有可完成的搜索任务。
-   **智能进度管理**：自动计算并显示任务进度，清晰了解完成情况。

### 🔧 智能模拟与安全
-   **双端模式支持**：脚本自动识别并模拟PC和手机两种设备环境进行搜索。
-   **动态搜索策略**：内置丰富词库，自动获取并随机使用热门搜索词，使行为更接近真人。
-   **隐私与混淆**：支持随机化用户代理（User-Agent），并对搜索词进行混淆处理，有效降低被识别为自动化脚本的风险。

### 👁️ 用户体验
-   **透明化操作**：在页面实时显示当前搜索词和任务进度。
-   **简易控制**：通过 Tampermonkey 菜单提供清晰的开始控制项。

---

## 🚀 快速开始指南

### 第一步：安装脚本管理器
本脚本需要在用户脚本管理器扩展中运行。我们推荐使用 **Tampermonkey**。

-   **Microsoft Edge 用户**：请前往 [Edge 加载项商店](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) 安装。
-   **Firefox 用户**：请前往 [Firefox 附加组件商店](https://addons.mozilla.org/firefox/addon/tampermonkey/) 安装。
-   其他浏览器请访问 [Tampermonkey 官网](https://www.tampermonkey.net/) 查看安装指南。

**重要前置步骤：确保开启开发者模式**
> 若您并非从上述官方商店安装扩展，或遇到扩展无法正常运行的情况，请确保在浏览器的扩展管理页面中**开启了“开发者模式”**。此模式允许安装来自第三方源的扩展程序（`.crx` 或 `.xpi` 文件）。

### 第二步：安装脚本
点击下面的链接，Tampermonkey 会提示您进行安装：

👉 **[点击此处一键安装脚本](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js)**

在打开的安装确认页面，点击 **“安装”** 按钮即可。

### 第三步：运行脚本
1.  **打开 Bing**：在新的标签页中访问 **[https://www.bing.com](https://www.bing.com)**，并**确保已登录您的微软账户**。
2.  **启动任务**：
    -   点击浏览器工具栏中的 **Tampermonkey** 图标。
    -   在弹出菜单中找到 **“开始Bing任务”** 并点击。
3.  **等待完成**：脚本开始运行后，请在页面顶部查看进度。**请保持此标签页为前台激活状态**，不要最小化浏览器或切换到其他标签，直至所有任务完成。

---

## ⚠️ 重要注意事项与常见问题

### 使用前提与运行环境
-   **必须已登录**：使用前请在 Bing 网页版登录您的微软账户。
-   **保持页面激活**：浏览器标签页需处于前台活动状态，部分浏览器在页面后台时会限制脚本执行。
-   **网络要求**：需要稳定访问 Bing 国际站 (`www.bing.com`)。

### 账户安全与风险提示
> **重要**：使用自动化脚本存在理论上的账户风险，请合理谨慎使用。
-   **隐私声明**：本脚本仅在您当前访问的 Bing 网页上运行，**不收集、不上传任何您的 Cookie 或个人信息**。
-   **风险行为**：以下行为可能增加账号被微软系统标记的风险，建议避免：
    -   在极短时间内（如几分钟内）完成全部每日搜索限额。
    -   频繁切换网络IP地址或使用不稳定的代理。
    -   每日都精准获取满分积分，毫无波动。
-   **使用建议**：建议模拟真人使用习惯，例如不定时运行、不每日都用满额度等。

### 故障排除 (脚本未运行？)

-   **确认脚本已安装并启用**：点击 Tampermonkey 图标，检查“仪表盘”中 `BingRewards` 脚本是否在列表内且为启用状态（开关为绿色）。
-   **检查访问的网站**：确保您打开的网址是 `https://www.bing.com` 或其子域名。
-   **检查脚本管理器**：
    -   确认 Tampermonkey 扩展本身已启用（浏览器扩展管理页面中）。
    -   **如果 Tampermonkey 安装后无法使用，请检查是否已在浏览器扩展管理页面开启“开发者模式”。**
-   **重新安装**：如果问题依旧，尝试从 Tampermonkey 仪表盘中移除旧脚本，然后重新点击安装链接进行安装。

---

## 🛠️ 技术说明

-   **脚本类型**：纯粹的前端用户脚本，运行于您的浏览器沙盒环境中。
-   **工作原理**：通过模拟鼠标点击、键盘输入和等待延迟，自动在搜索框输入关键词并触发搜索。
-   **更新**：脚本会通过 Tampermonkey 自动检查更新。您也可以在 Tampermonkey 仪表盘中手动检查。

---

## 🤝 贡献与支持

我们欢迎并感谢所有的贡献，让这个工具变得更好！

*   **报告问题与建议**：如果您发现了 Bug 或有功能改进建议，请在 [Gitee Issues](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/issues) 页面提交。
*   **贡献代码**：欢迎 Fork 项目并提交 Pull Request 来帮助改进脚本。
*   **讨论交流**：关于使用中的任何疑问，也可以在项目的 Issue 区发起讨论。

---

## 📄 许可证

本项目基于 **MIT 许可证** 开源。
完整许可证文本请查看项目根目录下的 [LICENSE](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/blob/master/LICENSE) 文件。

---
*本脚本仅供学习与交流自动化技术之用，请尊重微软必应奖励的服务条款，合理使用。*
