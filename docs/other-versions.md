# 📦 其他版本

> 本项目的其他实现方式。**推荐使用[浏览器脚本版](scripts/userscript.md)**，其他版本仅供特定场景选用。

---

## 🐍 Python 桌面版

基于 Python 实现的 Windows 桌面自动化工具，功能丰富，配置灵活。

| 项目 | 说明 |
|------|------|
| 技术栈 | Python 3.7+ + tkinter + pywin32 |
| 运行环境 | Windows 10/11（推荐） |
| 获取方式 | [Gitee Releases](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/releases) 下载带 `python` 后缀的可执行文件，解压后双击运行 |

普通用户下载可执行文件即可，无需安装 Python；仅开发者运行/打包源码需要 Python 环境。

**从源码运行**：

```bash
git clone https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script.git
cd bing-rewards-python
pip install -r requirements.txt
python main.py
```

**打包为可执行文件**：

```bash
pip install cx-Freeze
python setup.py build   # 输出到 build/exe.win-amd64-<python版本>/
```

使用说明、配置与常见问题详见 [项目目录 README](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/blob/master/bing-rewards-python/README.md)。

---

## 🧩 浏览器扩展版（已停止维护）

基于 Manifest V3 的 Chrome 扩展，支持 PC / 移动端双端搜索，无需脚本管理器。

> ⚠️ **该版本已停止维护，不再提供更新**。历史源码位于仓库 `bing-rewards-extension/` 目录，可自行查阅。

---

## 🪟 .NET 桌面版（已停止维护）

基于 .NET Framework 开发的 Windows 桌面程序。

> ⚠️ **该版本已停止维护，不再提供更新**。历史源码位于仓库 `bing-rewards-simulator/` 目录，可自行查阅。

---

## 如何选择

| 需求场景 | 推荐版本 |
|----------|----------|
| 日常使用、追求轻量便捷 | 🌐 **浏览器脚本版** |
| 需要 Windows 桌面程序、可视化配置 | 🐍 **Python 桌面版** |
| 仅体验/学习历史实现 | 🧩 扩展版、🪟 .NET 版（已停维护） |