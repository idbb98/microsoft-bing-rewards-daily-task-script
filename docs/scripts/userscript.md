# 🌐 浏览器脚本版

> 纯粹的前端用户脚本，运行于浏览器沙盒环境中，跨平台支持，轻量便捷。**官方推荐版本。**

## 基本信息

| 项目 | 说明 |
|------|------|
| 技术栈 | JavaScript (ES6+) + Violentmonkey API |
| 运行环境 | 浏览器沙盒，通过 Violentmonkey 注入到 `https://*.bing.com/*` |
| 当前版本 | `26.7.16.2` |
| 安装方式 | 一键安装，无需构建 |

!!! success "核心优势"
    - **纯前端运行**：不收集、不上传任何 Cookie 或个人信息
    - **无需安装依赖**：仅需浏览器 + 脚本管理器
    - **自动更新**：通过 `@updateURL` 自动检查并更新版本

---

## ✨ 核心特性

### 🎯 智能自动化
- **全自动任务执行**：一键启动，自动完成当日所有搜索任务
- **智能进度管理**：实时显示任务进度与剩余时间，完成情况一目了然
- **日常任务自动点击**：自动点击待完成且有积分的日常任务
- **Dashboard 每日活动**：自动处理 `rewards.bing.com/dashboard` 页面 `#dailyset` 区域的未完成任务

### 🔒 安全模拟
- **动态搜索策略**：内置丰富词库，自动获取并随机使用热搜关键词
- **行为混淆技术**：支持随机加词/截词、随机滚动，模拟真人行为
- **随机延迟控制**：可配置搜索延迟范围与暂停间隔，避免短时间大量搜索

### 🎨 现代 UI
- **实时状态面板**：优雅渐变设计与流畅动画，支持展开/收起切换
- **可视化配置**：图形化设置界面，参数调整直观便捷
- **暗色主题支持**：自动适配系统级暗色模式

---

## 🚀 安装与使用

### 1. 安装脚本管理器

推荐使用 **Violentmonkey** 扩展：

- **Microsoft Edge**：[Edge 加载项商店](https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjdenkkddmbclomhiblgggliao)
- **Firefox**：[Firefox 附加组件商店](https://addons.mozilla.org/firefox/addon/violentmonkey/)
- **Chrome/其他浏览器**：[Chrome 网上应用店](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)

### 2. 安装脚本

👉 **[一键安装脚本](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js)**

### 3. 运行任务

1. 打开 [https://www.bing.com](https://www.bing.com) 并登录微软账户
2. 点击 Violentmonkey 图标 → 菜单中点击 **"开始Bing任务"**
3. 保持标签页前台激活，任务完成后自动停止

---

## ⚙️ 配置参数详解

!!! warning "必填配置"
    `searchFormParam`（搜索 form 参数）默认值为 `QBLH`，**必须修改**为你的实际值。
    获取方法：登录后访问 cn.bing.com 执行几次搜索，查看地址栏 URL 中 `form=xxx` 的值。

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

- **运行环境**：浏览器沙盒（Violentmonkey 注入）
- **核心 API**：`GM_xmlhttpRequest`（热词获取）、`GM_setValue/GM_getValue`（配置持久化）、`GM_registerMenuCommand`（菜单命令）
- **配置管理**：所有用户可配置项通过 `CONFIG` 对象统一管理，getter/setter 绑定 GM 存储
- **数据安全**：纯前端运行，所有数据仅存储在本地浏览器

---

## 📋 注意事项

- ✅ 使用前必须在 Bing 网页版登录微软账户
- ✅ 浏览器标签页需保持前台激活状态
- ✅ 需稳定访问 Bing 国际站 (`www.bing.com`)
- ⚠️ `rewards.bing.com` 已被排除在脚本注入范围之外

!!! danger "风险提示"
    极短时间内完成全部每日搜索限额、频繁切换网络 IP、每日精准获取满分积分等行为可能增加账号风险，请模拟真人使用习惯，合理使用。
