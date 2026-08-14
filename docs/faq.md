# ❓ 常见问题 FAQ

这里汇总了使用过程中的常见问题与解决方案。如果未找到答案，请前往 [Gitee Issues](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/issues) 提交反馈。

---

## 📋 使用前提

- ✅ **必须登录**：使用前请在 Bing 网页版登录微软账户
- ✅ **保持前台**：浏览器标签页需处于前台活动状态
- ✅ **网络要求**：需稳定访问 Bing 国际站 (`www.bing.com`)

!!! info "脚本注入范围"
    - 支持：`https://*.bing.com/*`、`https://rewards.bing.com/earn*`、`https://rewards.bing.com/dashboard*`
    - 排除：`rewards.bing.com`（根域名已被排除在注入范围之外）

---

## 🔒 安全与风险

### 隐私保障

- 纯前端运行，**不收集、不上传任何 Cookie 或个人信息**
- 所有数据仅存储在本地浏览器中
- 热词请求通过 `GM_xmlhttpRequest` 直接访问公开热搜接口，不经过任何第三方中转

### ⚠️ 风险行为（建议避免）

| 风险行为 | 潜在后果 |
|----------|----------|
| 极短时间内（如几分钟内）完成全部每日搜索限额 | 触发反自动化检测 |
| 频繁切换网络 IP 或使用不稳定代理 | 账户行为异常标记 |
| 每日精准获取满分积分，毫无波动 | 行为模式被识别 |

### 💡 使用建议

- 模拟真人使用习惯，不定时运行
- 避免每日都用满额度
- 合理设置随机间隔时间（建议保持默认的 15-30 秒）

!!! danger "重要提示"
    使用自动化工具存在理论上的账户风险，请合理使用。本脚本仅供学习与交流自动化技术之用，请尊重微软必应奖励的服务条款。

---

## 🔧 故障排除

### 脚本未运行？

1. **确认脚本已启用**
   - 点击 Violentmonkey 图标 → "仪表盘"
   - 检查 `BingRewards` 脚本是否在列表中且开关为绿色

2. **检查访问网址**
   - 确保打开的是 `https://www.bing.com` 或其子域名
   - 注意：`rewards.bing.com` 根域名已被排除

3. **检查扩展状态**
   - 确认 Violentmonkey 扩展已启用
   - 如无法使用，请检查浏览器是否开启"开发者模式"

4. **重新安装**
   - 从 Violentmonkey 仪表盘移除旧脚本
   - 重新点击 [安装链接](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js) 进行安装

### 积分未增加？

1. **检查登录状态**：确认浏览器已登录 Microsoft 账户
2. **检查每日限额**：确认是否已达到当日积分上限
3. **等待同步**：积分到账可能有延迟，刷新 `rewards.bing.com` 页面查看
4. **检查网络**：确认可正常访问 Bing 国际站

### 搜索任务卡住不动？

- 确认标签页处于 **前台激活状态**（后台标签页会暂停任务）
- 检查是否进入了暂停间隔（默认每 2-3 次搜索暂停 20-30 分钟）
- 刷新页面后重新启动任务

### 任务打开了很多标签页？

这是 **「搜索打开的标签页自动关闭」** 功能的正常行为。若不想自动关闭，可在设置中调整相关参数（`tasksCloseTabDelay`）。

---

## ⚙️ 配置相关

### 什么是搜索 form 参数？为什么必须修改？

`form` 是 Bing 搜索 URL 中的参数（如 `form=QBLH`），不同地区、不同搜索入口的值不同。**默认值 `QBLH` 仅为占位**，不修改可能导致搜索不被计入 Rewards。

**获取方法**：
1. 打开 [https://cn.bing.com](https://cn.bing.com) 并登录微软账户
2. 执行几次搜索操作
3. 查看地址栏 URL，提取 `form=xxx` 中的 `xxx` 值
4. 在脚本设置中替换 `searchFormParam` 字段

### 随机加词/截词是什么？

一种行为混淆技术：
- **随机加词**：`人工智能发展` → `人工1智能发z展`（在词语中随机插入字符）
- **随机截词**：`人工1智能发z展` → `人工1智`（随机截断词语）

默认关闭，开启后通过因子（0-1 小数）控制操作概率。

### 参数兼容性问题

- `earnTasks*` / `dashboardTasks*` 参数已自动迁移到统一的 `tasks*` 参数体系
- 旧版本导出的配置文件会自动映射到新格式，**无需手动调整**

---

## 🧩 各版本常见问题

### Python 桌面版

- **配置文件路径错误**：确保 `config.json` 和 `about_config.json` 与可执行文件在同一目录
- **浏览器无法启动**：确认浏览器已安装，或尝试重新选择浏览器路径
- **Windows 11 异常**：确保使用最新版本，必要时以管理员身份运行

### 浏览器扩展版

- **扩展加载失败**：确认选择了包含 `manifest.json` 的正确目录（`bing-rewards-extension`），而非外层项目目录
- **扩展图标不显示**：点击浏览器工具栏的拼图图标，将扩展固定到工具栏
- **移动端无法安装扩展**：推荐改用**浏览器脚本版**（配合 Kiwi Browser 等支持扩展的移动浏览器）

### .NET 桌面版

该版本**已停止维护**，问题将不再修复。建议迁移至 [浏览器脚本版](scripts/userscript.md) 或 [Python 桌面版](python/desktop.md)。

---

## 📢 其他问题

### 如何获取最新版本？

- **浏览器脚本版**：脚本通过 `@updateURL` 自动更新，无需手动操作
- **Python 桌面版**：关注 [Gitee Releases](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/releases) 页面
- 更新日志请查看 [更新日志](changelog.md) 页面

### 如何反馈问题或参与贡献？

- 🐛 **报告问题**：在 [Gitee Issues](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/issues) 提交 Bug 或建议
- 💻 **贡献代码**：Fork 项目并提交 Pull Request
- 💬 **参与讨论**：在 Issue 区交流使用心得与疑问
