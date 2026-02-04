# Bing Rewards 自动化工具

这是一个用于自动完成 Bing Rewards 每日搜索任务的工具，帮助用户轻松积累微软积分。

## 功能特性

- 自动执行 Bing 搜索任务
- 支持多种浏览器选择
- 可视化用户界面
- 日志记录功能
- 可配置的搜索次数

## 系统要求

- Windows 操作系统
- Python 3.7 或更高版本（仅用于开发和打包）
- 已安装的浏览器（Edge、Chrome 等）

## 安装依赖

在开发环境中，需要安装以下依赖：

```bash
pip install -r requirements.txt
```

## 运行方式

### 开发环境运行

```bash
python main.py
```

### 可执行文件运行

直接双击 `BingRewardsAutomation.exe` 文件即可运行。

## 打包步骤

### 1. 安装打包工具

```bash
pip install cx-Freeze
```

### 2. 执行打包命令

```bash
# 删除旧的构建目录（如果存在）
Remove-Item -Path "./build" -Recurse -Force

# 执行打包命令
python setup.py build
```

### 3. 复制配置文件

打包完成后，需要将配置文件复制到可执行文件所在的目录：

```bash
# 复制配置文件
Copy-Item -Path "./config.json" -Destination "./build/exe.win-amd64-3.13/"
Copy-Item -Path "./about_config.json" -Destination "./build/exe.win-amd64-3.13/"
```

### 4. 获取可执行文件

打包完成后，可执行文件位于以下路径：

```
build/exe.win-amd64-3.13/BingRewardsAutomation.exe
```

## 配置说明

### config.json

包含工具的基本配置，如默认浏览器选择等。

## 使用说明

1. 运行 `BingRewardsAutomation.exe` 文件
2. 切换配置界面中选择要使用的浏览器
3. 设置要执行的搜索次数
4. 切换主页面点击「开始执行」按钮开始执行自动化任务
5. 等待任务执行完成

## 注意事项

- 请确保您的浏览器已登录 Microsoft 账户
- ⚠️ **请不要在任务执行过程中操作鼠标或键盘**
- 任务执行过程中，工具会自动控制浏览器进行搜索操作

## 故障排除

### 配置文件路径错误

如果遇到配置文件路径错误，请确保配置文件 `config.json` 和 `about_config.json` 与可执行文件位于同一目录。

### 浏览器未启动

请确保您选择的浏览器已正确安装，并且路径设置正确。

### 搜索任务未完成

如果搜索任务未完成，请检查您的网络连接，确保可以正常访问 Bing 网站。

## 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。
