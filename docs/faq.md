# ❓ 常见问题 FAQ

这里汇总了**浏览器脚本版**的常见问题与解决方案。如果未找到答案，请前往 [Gitee Issues](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/issues) 提交反馈。

---

## 📋 使用前提

- ✅ **必须登录**：使用前请在 Bing 网页版登录微软账户
- ✅ **保持前台**：浏览器标签页需处于前台活动状态
- ✅ **网络要求**：需稳定访问 Bing 国际站（`www.bing.com`）

!!! info "脚本注入范围"
    - 支持：`https://*.bing.com/*`、`https://rewards.bing.com/earn*`、`https://rewards.bing.com/dashboard*`
    - 排除：`rewards.bing.com` 根域名

---

## 🔒 安全与风险

- 纯前端运行，**不收集、不上传任何 Cookie 或个人信息**
- 所有数据仅存储在本地浏览器
- 热词请求通过 `GM_xmlhttpRequest` 直接访问公开热搜接口，不经过任何第三方中转

!!! danger "风险提示"
    极短时间内完成全部搜索限额、频繁切换网络 IP、每日精准满分毫无波动等行为可能触发反自动化检测。请模拟真人使用习惯、不定时运行、合理设置随机间隔（建议保持默认 15-30 秒）。

---

## 🔧 故障排除

### 脚本未运行？

1. **确认脚本已启用**：Violentmonkey 仪表盘中检查 `BingRewards` 脚本开关为绿色
2. **检查访问网址**：确认打开的是 `www.bing.com` 或其子域名（`rewards.bing.com` 根域名已排除）
3. **检查扩展状态**：确认 Violentmonkey 已启用；如无法使用，检查浏览器是否开启「开发者模式」
4. **重新安装**：移除旧脚本后，重新点击[安装链接](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js)

### 积分未增加？

1. 确认浏览器已登录 Microsoft 账户
2. 确认是否已达到当日积分上限
3. 积分到账可能有延迟，刷新 `rewards.bing.com` 页面查看
4. 确认可正常访问 Bing 国际站

### 搜索任务卡住不动？

- 确认标签页处于**前台激活状态**（后台标签页会暂停任务）
- 检查是否进入了暂停间隔（默认每 2-3 次搜索暂停 20-30 分钟）
- 刷新页面后重新启动任务

### 任务打开了很多标签页？

这是「搜索打开的标签页自动关闭」功能的正常行为。若不想自动关闭，可在设置中调整 `tasksCloseTabDelay` 参数。

---

## ⚙️ 配置相关

### 什么是搜索 form 参数？为什么必须修改？

`form` 是 Bing 搜索 URL 中的参数（如 `form=QBLH`），不同地区、不同搜索入口的值不同。**默认值 `QBLH` 仅为占位**，不修改可能导致搜索不被计入 Rewards。

**获取方法**：
1. 打开 [cn.bing.com](https://cn.bing.com) 并登录微软账户
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

## 📢 其他问题

### 如何获取最新版本？

- 脚本通过 `@updateURL` 自动更新，无需手动操作
- 更新日志请查看[浏览器脚本版指南](scripts/userscript.md)的「版本历史」章节

### 如何反馈问题或参与贡献？

- 🐛 **报告问题**：在 [Gitee Issues](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/issues) 提交 Bug 或建议
- 💻 **贡献代码**：Fork 项目并提交 Pull Request
- 💬 **参与讨论**：在 Issue 区交流使用心得与疑问