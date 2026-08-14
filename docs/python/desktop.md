# 🖥️ Python 桌面版

> 基于 Python 实现的桌面自动化工具，支持 Windows 系统，配置灵活，功能丰富。

## 基本信息

| 项目 | 说明 |
|------|------|
| 技术栈 | Python 3.7+ + tkinter |
| 运行环境 | Windows 10/11（推荐） |
| 浏览器 | Microsoft Edge、Google Chrome 或其他浏览器 |
| 分发方式 | 可执行文件（`.exe`）或源码运行 |

!!! info "普通用户无需安装 Python"
    直接下载可执行文件即可使用；仅开发者运行/打包源码时需要 Python 环境。

---

## ✨ 功能特性

- 自动执行 Bing 搜索任务
- 支持多种浏览器选择
- 可视化用户界面（tkinter GUI）
- 日志记录功能
- 可配置的搜索次数

---

## 🚀 快速开始

### 方式一：直接使用可执行文件（推荐普通用户）

1. 前往 [Gitee Releases](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/releases)
2. 选择带有 `python` 后缀标签的版本下载
3. 解压后双击 `.exe` 运行

### 方式二：从源码运行（适合开发者）

#### 1. 克隆项目

```bash
git clone https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script.git
cd bing-rewards-python
```

#### 2. 安装依赖

```bash
pip install -r requirements.txt
```

#### 3. 运行程序

```bash
python main.py
```

---

## 📦 打包为可执行文件（开发者）

### 1. 安装打包工具

```bash
pip install cx-Freeze
```

### 2. 清理并执行打包

```powershell
# 删除旧的构建目录（如果存在）
Remove-Item -Path "./build" -Recurse -Force -ErrorAction SilentlyContinue

# 执行打包命令
python setup.py build
```

### 3. 复制配置文件

打包完成后，需要将配置文件复制到可执行文件所在目录：

```powershell
# 注意：路径中的版本号可能因 Python 版本而异
Copy-Item -Path "./config.json" -Destination "./build/exe.win-amd64-3.13/"
Copy-Item -Path "./about_config.json" -Destination "./build/exe.win-amd64-3.13/"
```

### 4. 获取可执行文件

打包完成后的可执行文件位置：

```
build/exe.win-amd64-3.13/xxx.exe
```

!!! tip "提示"
    路径中的 `3.13` 为您的 Python 版本号，实际路径可能因您的 Python 版本而有所不同。

---

## ⚙️ 配置说明

### config.json

主配置文件，包含以下设置：
- 默认浏览器选择
- 搜索次数配置
- 其他自动化参数

### about_config.json

关于页面配置文件，用于显示软件版本和相关信息。

---

## 📖 使用说明

1. **启动程序**：双击 `.exe` 文件
2. **配置浏览器**：切换到「配置」界面，选择要使用的浏览器
3. **设置搜索次数**：根据需要调整每日搜索次数
4. **开始执行**：切换到「主页」界面，点击「开始执行」按钮
5. **等待完成**：程序将自动执行搜索任务，请勿操作鼠标或键盘
6. **查看日志**：任务完成后，可在日志文件中查看执行结果

!!! warning "重要提醒"
    程序运行期间请勿操作鼠标或键盘，否则可能导致程序行为异常或搜索任务中断！

---

## 🗂️ 项目结构

```
bing-rewards-python/
├── main.py                 # 主程序入口
├── browser_automation.py   # 浏览器自动化核心逻辑
├── ui.py                   # 图形用户界面
├── search_word_provider.py # 搜索词提供者
├── log.py                  # 日志模块
├── config.json             # 配置文件
├── about_config.json       # 关于页面配置
├── requirements.txt        # Python 依赖列表
├── setup.py                # 打包脚本
└── README.md               # 说明文档
```

---

## 🛠️ 技术栈

- **Python**: 3.7+
- **GUI框架**: tkinter
- **浏览器自动化**: pywin32, selenium
- **打包工具**: cx-Freeze
- **日志系统**: logging

---

## ❓ 常见问题

### 1. 配置文件路径错误
- **问题**：提示找不到配置文件
- **解决**：确保 `config.json` 和 `about_config.json` 与可执行文件在同一目录

### 2. 浏览器无法启动
- **问题**：选择的浏览器无法打开
- **解决**：确认浏览器已正确安装；尝试重新选择浏览器路径；检查浏览器是否被安全软件阻止

### 3. 搜索任务未完成
- **问题**：程序提前结束或搜索次数不足
- **解决**：检查网络连接；确认可以正常访问 Bing 网站；查看日志文件 (`bing_rewards.log`) 了解详细错误信息

### 4. Windows 11 兼容性问题
- **问题**：在 Windows 11 上运行时出现异常
- **解决**：确保使用最新版本的程序；以管理员身份运行程序；检查安全软件是否阻止了程序运行

### 5. 积分未增加
- **问题**：任务执行成功但 Bing Rewards 积分未增加
- **解决**：确认浏览器已登录 Microsoft 账户；检查是否已达到每日积分上限；等待几分钟后刷新页面查看

---

## 📜 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。
