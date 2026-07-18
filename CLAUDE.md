# CLAUDE.md

## Project Overview

Microsoft Bing Rewards 自动化工具集 - 自动化完成微软必应每日搜索任务，智能积累奖励积分。项目提供多种实现方式，帮助用户自动完成 Bing Rewards 的每日搜索任务。

## Architecture

项目包含 **3 个独立子项目**，共享相同核心功能但面向不同使用场景：

### 1. Tampermonkey 浏览器脚本（推荐）

- **入口文件**: `BingRewards.user.js`（根目录）
- **技术栈**: JavaScript (ES6+) + Tampermonkey API
- **运行环境**: 浏览器沙盒，通过 Tampermonkey 扩展注入到 `https://*.bing.com/*`
- **核心功能**:
  - 自动搜索任务执行，通过 GM_xmlhttpRequest 获取热搜关键词
  - 动态搜索策略（随机加词/截词混淆）
  - 实时进度面板 UI（CSS 渐变设计，响应式布局）
  - GM_setValue/GM_getValue 持久化配置存储
  - 所有配置项通过 `CONFIG` 对象管理，使用 getter/setter 绑定 GM 存储

### 2. Python 桌面程序

- **目录**: `bing-rewards-python/`
- **入口文件**: `bing-rewards-python/browser_automation.py`（浏览器自动化核心模块）
- **技术栈**: Python 3.x + pyautogui + pywin32 + psutil + pyperclip
- **运行环境**: Windows 桌面（仅支持 Windows）
- **核心依赖**:
  - `pyautogui` - 模拟键盘/鼠标操作
  - `pywin32` (win32gui, win32con, win32api, win32process) - Windows API 调用
  - `psutil` - 进程管理
  - `pyperclip` - 剪贴板操作
  - `requests` - HTTP 请求
  - `cx_Freeze` - 打包为 .exe
- **打包**: `setup.py` 使用 cx_Freeze 构建独立可执行文件，输出到 `build/exe.win-amd64-3.14/`
- **配置文件**: `config.json`（运行时配置）, `about_config.json`（项目元信息）

### 3. 浏览器扩展

- **目录**: `bing-rewards-extension/`
- **技术栈**: Chrome Extension Manifest V3
- **核心文件**:
  - `manifest.json` - 扩展配置，host_permissions 覆盖 bing.com 及热搜来源站点
  - `background.js` - Service Worker 后台脚本
  - `content.js` - 内容脚本，注入到 `https://*.bing.com/*`（排除 `rewards.bing.com`）
  - `popup.html` / `popup.js` - 弹出窗口 UI
  - `options.html` / `options.js` - 设置页面
- **第三方库**: Bootstrap 5（`css/bootstrap.min.css`, `js/bootstrap.bundle.min.js`）

## Project Conventions

### Code Style

- **JavaScript**: 使用 `'use strict'` 严格模式，ES6+ 语法，单引号字符串
- **Python**: 标准 PEP 8 风格，类名使用 PascalCase，方法/函数使用 snake_case
- **配置管理**: JavaScript 中所有用户可配置项通过 `CONFIG` 对象的 getter/setter 绑定到 `GM_getValue`/`GM_setValue`
- **日志**: Python 端使用 `log_manager` 统一日志接口，JavaScript 端使用 `GM_log`

### File Organization

- 根目录 `.gitignore` 管理所有子项目的忽略规则
- 各子项目独立维护自己的 `.gitignore`
- 构建产物（`build/`, `__pycache__/`）和日志文件（`*.log`）均被 git 忽略
- 第三方 CSS/JS 库（Bootstrap）被排除在版本控制之外

### Versioning

- 版本号格式: `YY.M.D.Revision`（如 `26.7.6.1`）
- 版本号在 `BingRewards.user.js` 的 `@version` 和 `manifest.json` 的 `version` 中分别维护

## Build & Run

### 浏览器脚本

无需构建，直接通过 Tampermonkey 安装 `BingRewards.user.js`。用户在 `https://www.bing.com` 打开后通过菜单启动。

### Python 桌面程序

```bash
cd bing-rewards-python
pip install -r requirements.txt
python main.py
```

打包为 exe:
```bash
cd bing-rewards-python
python setup.py build
```

### 浏览器扩展

在 Chrome/Edge 的 `chrome://extensions` 中加载 `bing-rewards-extension/` 目录（开发者模式）。

## Collaboration Rules

- **修改前先出方案**: 对项目进行任何代码修改前，必须先给出修改方案让用户确认，确认后再执行修改。不要直接修改代码。

## Key Constraints

- 所有自动化操作必须模拟真人行为（随机间隔、随机搜索词、随机滚动）
- 不收集、不上传任何用户 Cookie 或个人信息
- 纯前端运行，数据仅存储在本地浏览器
- 需要保持浏览器标签页为前台激活状态
- 基于 MIT 许可证开源