# 🪟 .NET 桌面版

> 基于 .NET Framework 开发的 Windows 桌面程序，运行稳定，开箱即用。

!!! danger "已停止维护"
    该版本**已停止维护**，不再提供更新。目前推荐使用 [**浏览器脚本版**](../scripts/userscript.md)（如需桌面程序可选 [**Python 桌面版**](../python/desktop.md)）。

---

## 基本信息

| 项目 | 说明 |
|------|------|
| 技术栈 | C# / .NET Framework |
| 运行环境 | Windows（需 .NET Framework 4.x） |
| 当前状态 | ⚠️ 已停止维护 |

---

## ✨ 功能特性

- 自动化完成 Bing 每日搜索任务
- 实时模拟浏览器搜索行为
- 可视化界面控制
- 简单易用的配置方式

---

## 🚀 快速开始

### 1. 获取程序

从 [Gitee Releases](https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/releases) 下载 `bing-rewards-simulator` 版本。

### 2. 运行环境

- Windows 7 及以上版本
- 已安装 .NET Framework 4.x（Windows 10/11 通常自带）

### 3. 使用步骤

1. 解压下载的程序包
2. 双击运行主程序
3. 登录微软账户（程序内提示）
4. 点击「开始」执行每日搜索任务
5. 等待任务自动完成

---

## 🗂️ 项目结构

```
bing-rewards-simulator/
├── Program.cs            # 程序入口
├── BingSimulator.cs      # 核心模拟逻辑
├── BrowserAutomation.cs  # 浏览器自动化
├── ConfigManager.cs      # 配置管理
├── UI/                   # 界面相关
└── README.md             # 说明文档
```

---

## ⚠️ 迁移建议

由于该版本已停止维护，建议按需迁移：

| 替代方案 | 适用场景 | 迁移成本 |
|----------|----------|----------|
| [**浏览器脚本版**](../scripts/userscript.md)（目前推荐） | 普通用户日常使用 | 极低，一键安装 |
| [**Python 桌面版**](../python/desktop.md) | 需要桌面程序、可视化配置 | 低，功能丰富 |

!!! tip "推荐迁移路径"
    从 .NET 版迁移到浏览器脚本版仅需：安装 Violentmonkey → 一键安装脚本 → 配置 form 参数，全程不超过 5 分钟。

---

## 📜 许可证

本项目采用 MIT 许可证，详见 LICENSE 文件。
