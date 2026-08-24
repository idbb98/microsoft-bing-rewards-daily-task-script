# 🌐 浏览器脚本版（推荐）

> 纯粹的前端用户脚本，运行于浏览器沙盒环境，跨平台支持，轻量便捷，**官方推荐版本**。

| 项目 | 说明 |
|------|------|
| 技术栈 | JavaScript (ES6+) + Violentmonkey API |
| 当前版本 | `26.7.16.2` |
| 安装方式 | 一键安装，无需构建，自动更新 |

---

## ✨ 核心特性

- **全自动执行**：一键启动，自动完成当日所有搜索与日常任务，实时显示进度
- **日常任务自动点击**：自动点击待完成且有积分的日常任务及 Dashboard `#dailyset` 区域未完成任务
- **安全模拟**：自动获取热搜词并随机使用，支持随机加词/截词、随机滚动、随机延迟
- **隐私保护**：纯前端运行，**不收集、不上传任何 Cookie 或个人信息**
- **现代 UI**：实时状态面板、图形化设置、自动适配暗色模式

---

## 🚀 快速开始

### 1. 安装脚本管理器（Violentmonkey）

| 浏览器 | 安装地址 |
|--------|----------|
| **Microsoft Edge** | [Edge 加载项商店](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao) |
| **Firefox** | [Firefox 附加组件商店](https://addons.mozilla.org/firefox/addon/violentmonkey/) |
| **Chrome/其他** | [Chrome 网上应用店](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) |

!!! warning "注意"
    若非从官方商店安装，请在浏览器扩展管理页面开启「开发者模式」。

### 2. 安装脚本

👉 **[一键安装脚本](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js)**，在确认页面点击「安装」即可。

!!! info "自动更新"
    脚本通过 `@updateURL` 自动检查更新，后续版本发布后无需手动重装。

### 3. 配置参数

!!! warning "必填配置"
    `searchFormParam`（搜索 form 参数）默认值为 `QBLH`，**必须修改**。
    获取方法：登录后访问 [cn.bing.com](https://cn.bing.com) 执行几次搜索，查看地址栏 URL 中 `form=xxx` 的值，在脚本设置中替换。

可选配置：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 最大搜索次数 | `20` | 根据个人需求调整 |
| 随机加词/截词 | 关闭 | 开启后增强行为真实性 |
| 暂停间隔 | 区间随机 | 模拟真人使用习惯 |

### 4. 运行脚本

1. 打开 [www.bing.com](https://www.bing.com) 并**确保已登录微软账户**
2. 点击工具栏 **Violentmonkey** 图标 → 菜单中点击 **「开始Bing任务」**
3. 页面顶部显示进度面板，**保持标签页前台激活**，任务完成后自动停止

!!! success "完成"
    任务执行完成后，Rewards 积分将自动到账，可在 [rewards.bing.com](https://rewards.bing.com) 查看。

### 📸 界面预览

**展开状态 - 完整信息展示**

![面板展开状态](../assets/panel.png)

**收起状态 - 紧凑模式**

![面板收起状态](../assets/panel-collapsed.png)

**设置面板**

![设置面板](../assets/panel-setting.png)

**关于面板**

![关于面板](../assets/panel-about.png)

---

## ⚙️ 配置参数详解

### 搜索配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `searchFormParam` | `QBLH` | 搜索 form 参数，**必填** |
| `maxSearches` | `20` | 最大搜索次数 |
| `clickSearchResults` | 关闭 | 是否点击搜索结果链接 |

### 行为混淆配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `randomAddSearchWords` | 关闭 | 随机加词（如：人工智能发展 → 人工1智能发z展） |
| `randomAddSearchWordsFactor` | `0.3` | 加词概率（0-1 小数） |
| `randomCutSearchWords` | 关闭 | 随机截词（如：人工1智能发z展 → 人工1智） |
| `randomCutSearchWordsFactor` | `0.2` | 截取概率（0-1 小数） |

### 延迟控制配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `minDelay` / `maxDelay` | `15s` / `30s` | 两次搜索之间的延迟区间 |
| `pauseIntervalMin` / `pauseIntervalMax` | `2` / `3` | 每执行多少次搜索后暂停一次 |
| `pauseTimeMin` / `pauseTimeMax` | `20min` / `30min` | 每次暂停的持续时间区间 |

### 任务点击配置（日常任务 + 每日活动）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `tasksScrollDelay` | `3000` | 任务区滚动延迟（毫秒） |
| `tasksMaxRetries` | `0` | 最大重试次数 |
| `tasksRetryDelay` | `2000` | 重试间隔（毫秒） |
| `tasksCloseTabDelay` | `1500` | 任务标签页关闭延迟（毫秒） |

!!! tip "参数兼容性"
    旧版本的 `earnTasks*` / `dashboardTasks*` 参数会自动迁移到统一的 `tasks*` 参数体系；从旧版本导出的配置文件也会自动映射，无需手动调整。

---

## 🛠️ 技术架构

- **运行环境**：浏览器沙盒（Violentmonkey 注入到 `https://*.bing.com/*`）
- **核心 API**：`GM_xmlhttpRequest`（热词获取）、`GM_setValue/GM_getValue`（配置持久化）、`GM_registerMenuCommand`（菜单命令）
- **配置管理**：所有可配置项通过 `CONFIG` 对象统一管理，getter/setter 绑定 GM 存储
- **数据安全**：纯前端运行，所有数据仅存储在本地浏览器

---

## 📋 注意事项

- ✅ 使用前必须在 Bing 网页版登录微软账户
- ✅ 浏览器标签页需保持前台激活状态
- ✅ 需稳定访问 Bing 国际站（`www.bing.com`）
- ⚠️ `rewards.bing.com` 根域名已被排除在脚本注入范围之外

!!! danger "风险提示"
    极短时间内完成全部每日搜索限额、频繁切换网络 IP、每日精准获取满分积分等行为可能增加账号风险，请模拟真人使用习惯，合理使用。

---

## 📌 版本历史

> 完整的更新日志与版本号说明已独立成页，请查看 [**版本历史**](../changelog.md)。
