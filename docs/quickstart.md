# 🚀 快速开始（浏览器脚本版）

本文档以 **浏览器脚本版** 为例，介绍从安装到运行的完整流程。该版本是官方推荐的入门方式，仅需浏览器即可使用，无需安装任何依赖。

---

## 步骤 1：安装脚本管理器

本脚本需要用户脚本管理器扩展运行，推荐使用 **Edge 浏览器** 和开源的 **Violentmonkey**：

| 浏览器 | 安装地址 |
|--------|----------|
| **Microsoft Edge** | [Edge 加载项商店](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao) |
| **Firefox** | [Firefox 附加组件商店](https://addons.mozilla.org/firefox/addon/violentmonkey/) |
| **Chrome/其他浏览器** | [Chrome 网上应用店](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) |

!!! warning "注意"
    若非从官方商店安装，请在浏览器扩展管理页面开启 **"开发者模式"**。

---

## 步骤 2：安装脚本

点击以下链接，Violentmonkey 将自动提示安装：

👉 **[一键安装脚本](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js)**

在安装确认页面点击 **"安装"** 按钮即可。

!!! info "提示"
    脚本会通过 `@updateURL` 自动检查更新，后续版本发布后无需手动重装。

---

## 步骤 3：配置参数

!!! warning "首次使用前必读"
    需要配置关键参数以确保脚本正常运行。

### ⚙️ 必填配置：搜索 form 参数

- **默认值**：`QBLH`（**必须修改**）
- **获取方法**：

1. 打开 [https://cn.bing.com](https://cn.bing.com) 并登录微软账户
2. 执行几次搜索操作
3. 查看地址栏 URL，提取 `form=xxx` 中的 `xxx` 值
4. 在脚本设置中替换 `searchFormParam` 字段

### 🔧 可选配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| **最大搜索次数** | `20` | 根据个人需求调整 |
| **随机加词/截词** | 关闭 | 开启后增强行为真实性 |
| **暂停间隔** | 区间随机 | 支持区间随机配置，模拟真人使用习惯 |

---

## 步骤 4：运行脚本

1. **打开 Bing**：访问 [https://www.bing.com](https://www.bing.com) 并 **确保已登录微软账户**
2. **启动任务**：
   - 点击浏览器工具栏的 **Violentmonkey** 图标
   - 在菜单中找到 **"开始Bing任务"** 并点击
3. **等待完成**：
   - 页面顶部将显示进度面板
   - **请保持标签页为前台激活状态**，不要最小化或切换标签
   - 任务完成后会自动停止

!!! success "完成"
    任务执行完成后，Bing Rewards 积分将自动到账。可在 [rewards.bing.com](https://rewards.bing.com) 查看积分变化。

---

## 🛠️ 其他版本快速入口

- 🐍 **Python 桌面版**：下载 [Gitee Releases](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/releases) 中带 `python` 后缀的可执行文件，解压后双击运行 → [查看详细文档](python/desktop.md)
- 🧩 **浏览器扩展版**：已停止维护，历史版本详见文档 → [查看详细文档](extension/browser-extension.md)
- 🪟 **.NET 桌面版**：已停止维护，历史版本详见文档 → [查看详细文档](dotnet/desktop.md)

---

遇到问题？请查阅 [常见问题 FAQ](faq.md) 或前往 [Gitee Issues](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/issues) 提交反馈。
