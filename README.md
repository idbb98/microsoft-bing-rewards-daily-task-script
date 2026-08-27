# Microsoft Bing Rewards 自动化工具集

![](https://img.shields.io/badge/license-MIT-blue.svg)
![](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/badge/star.svg?theme=white)

**🤖 自动化完成微软必应每日搜索任务，智能积累奖励积分**

📖 **[在线文档](https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/)**：完整使用指南、版本历史与常见问题

---

## 📦 版本一览

| 版本 | 技术栈 | 适用场景 | 特点 |
|------|--------|----------|------|
| 🌐 **浏览器脚本**（推荐） | JavaScript + Violentmonkey | 全平台浏览器 | 轻量便捷，无需安装 |
| 🖥️ **Python 桌面程序** | Python + 浏览器自动化 | Windows 用户 | 功能丰富，配置灵活 |
| 🧩 ~~**浏览器扩展**~~（停止维护） | Chrome Extension (MV3) | 全平台浏览器 | 双端搜索，无需脚本管理器 |
| 🪟 ~~**.NET 桌面程序**~~（停止维护） | .NET Framework | Windows 用户 | 运行稳定，开箱即用 |

各版本说明文档：

- 🐍 **[Python 桌面版](bing-rewards-python/README.md)**
- 🪟 **[.NET 桌面版](bing-rewards-simulator/README.md)**（停止维护）
- 🧩 **[浏览器扩展版](bing-rewards-extension/README.md)**（停止维护）

---

## 🌐 浏览器脚本版（推荐）快速开始

纯前端用户脚本，运行于浏览器沙盒环境，跨平台、轻量便捷。

### ✨ 核心特性

- **全自动执行**：一键启动，自动完成当日所有搜索任务，实时显示进度
- **安全模拟**：自动获取热搜词并随机使用，支持随机化 User-Agent 与搜索词混淆，降低识别风险
- **隐私保护**：纯前端运行，**不收集、不上传任何 Cookie 或个人信息**
- **现代 UI**：实时状态面板、图形化设置、自动适配暗色模式

### 🚀 安装与使用

**步骤 1：安装脚本管理器**（Violentmonkey）

- **Edge**：[Edge 加载项商店](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)
- **Firefox**：[Firefox 附加组件商店](https://addons.mozilla.org/firefox/addon/violentmonkey/)
- **Chrome/其他**：[Chrome 网上应用店](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)

> ⚠️ 若非从官方商店安装，请在浏览器扩展管理页面开启「开发者模式」。

**步骤 2：安装脚本**

👉 **[一键安装脚本](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js)**，在确认页面点击「安装」即可。

**步骤 3：配置参数**

> ⚙️ **必填**：`searchFormParam` 默认 `QBLH`，必须修改。
> 打开 [cn.bing.com](https://cn.bing.com) 登录并搜索几次，查看地址栏 `form=xxx` 的值，替换到脚本设置中。

可选配置：最大搜索次数（默认 `20`）、随机加词/截词、随机暂停间隔。

**步骤 4：运行脚本**

1. 打开 [www.bing.com](https://www.bing.com) 并**确保已登录微软账户**
2. 点击工具栏 **Violentmonkey** 图标 → 菜单中点击 **「开始Bing任务」**
3. 页面顶部显示进度面板，**请保持标签页前台激活**，任务完成后自动停止

### 📌 版本历史

> 📜 查看完整更新说明，请浏览 [在线文档 - 版本历史](https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/changelog/)。

---

## ⚠️ 注意事项

**使用前提**
- 必须登录微软账户；保持标签页前台活动；需稳定访问 Bing 国际站（`www.bing.com`）
- 建议使用 Edge 浏览器，并进入 `edge://settings/system/managePerformance` 将「内存 - 自动将标签页置于睡眠状态」关闭，避免标签页休眠中断任务

**安全与风险**

> **重要提示**：使用自动化工具存在理论上的账户风险，请合理使用。

- 纯前端运行，不收集、不上传任何 Cookie 或个人信息
- 避免：极短时间内完成全部搜索限额、频繁切换网络 IP、每日精准满分毫无波动
- 建议：模拟真人使用习惯、不定时运行、合理设置随机间隔

**故障排除**

- 确认脚本已在 Violentmonkey 仪表盘中启用
- 确认打开的是 `www.bing.com` 或其子域名（`rewards.bing.com` 已被排除）
- 无法使用时检查浏览器是否开启「开发者模式」
- 仍不行则移除旧脚本后重新安装

---

## 📖 文档网站

[在线文档](https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/)

本地预览：

```bash
pip install -r requirements.txt
mkdocs serve   # 访问 http://127.0.0.1:8000
```

---

## 🤝 贡献与支持

- 🐛 在 [Gitee Issues](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/issues) 提交 Bug 或建议
- 💻 Fork 项目并提交 Pull Request
- 💬 在 Issue 区交流使用心得

---

## 📄 开源许可

基于 **MIT 许可证** 开源，完整文本见 [LICENSE](LICENSE)。

> ⚖️ **免责声明**：本脚本仅供学习与交流自动化技术之用，请尊重微软必应奖励的服务条款，合理使用。

---

**⭐ 如果这个项目对您有帮助，欢迎 [前往 Gitee 点个 Star](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script) 支持！**
