@echo off
chcp 65001 > nul

REM ============================================================================
REM BingSearchAutomation 发布脚本
REM 功能：一键执行清理、构建和发布流程
REM 版本：2.2
REM ============================================================================

echo.
echo ==================== BingSearchAutomation 发布脚本 ====================
echo.

REM 设置变量
set "PROJECT_NAME=BingSearchAutomation"
set "PUBLISH_DIR=publish"

REM 检查 .NET SDK
echo 1. 检查 .NET SDK 版本...
dotnet --version > nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到 .NET SDK，请确保已安装 .NET SDK 8.0 或更高版本
    echo 请访问微软官网下载安装
    pause
    exit /b 1
)

dotnet --version

echo.
echo 2. 清理旧的构建文件...
dotnet clean -c Release > nul 2>&1
if %errorlevel% neq 0 (
    echo 警告：清理操作失败，继续执行构建
)

echo.
echo 3. 构建 Release 版本...
dotnet build -c Release
if %errorlevel% neq 0 (
    echo 错误：构建失败
    pause
    exit /b 1
)

echo.
echo 4. 发布应用程序...
dotnet publish -c Release -o "%PUBLISH_DIR%"
if %errorlevel% neq 0 (
    echo 错误：发布失败
    pause
    exit /b 1
)

echo.
echo 5. 验证发布结果...
if exist "%PUBLISH_DIR%\%PROJECT_NAME%.exe" (
    echo 发布成功！
    echo 发布目录：%cd%\%PUBLISH_DIR%
) else (
    echo 发布失败：未找到可执行文件
    pause
    exit /b 1
)

echo.
echo 6. 显示发布文件结构...
echo 发布文件：
dir "%PUBLISH_DIR%" /B

echo.
echo ==================== 发布完成 ====================
echo 发布目录：%PUBLISH_DIR% 目录（包含所有文件）
pause