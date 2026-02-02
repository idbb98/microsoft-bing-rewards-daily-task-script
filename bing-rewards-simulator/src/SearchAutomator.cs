using System;
using System.Diagnostics;
using NLog;

namespace BingSearchAutomation
{
    public class SearchAutomator
    {
        private static readonly Logger logger = LogManager.GetCurrentClassLogger();
        private readonly BrowserManager _browserManager;
        private readonly KeyboardSimulator _keyboardSimulator;
        private Process _browserProcess;
        private string _browserPath;

        public SearchAutomator()
        {
            _browserManager = new BrowserManager();
            _keyboardSimulator = new KeyboardSimulator();
        }

        public void OpenBrowser(string browserPath = "")
        {
            // 保存浏览器路径
            _browserPath = browserPath;
            
            // 打开浏览器窗口
            if (!string.IsNullOrEmpty(browserPath))
            {
                logger.Info($"使用指定路径打开浏览器: {browserPath}");
            }
            else
            {
                logger.Info("使用默认浏览器打开...");
            }
            _browserProcess = _browserManager.OpenBrowser(browserPath);
            _keyboardSimulator.Wait(5000); // 等待浏览器启动
        }

        public void EnsureBrowserActive()
        {
            // 确保浏览器窗口处于活动状态
            bool browserActive = false;
            
            // 首先尝试使用原始进程激活浏览器
            if (_browserProcess != null)
            {
                try
                {
                    // 即使进程已退出，也尝试激活（针对夸克等多进程浏览器）
                    logger.Info("尝试激活浏览器窗口...");
                    _browserManager.ActivateBrowserWindow(_browserProcess);
                    _keyboardSimulator.Wait(1000); // 等待窗口激活
                    browserActive = true;
                }
                catch (Exception ex)
                {
                    logger.Warn($"使用原始进程激活浏览器失败: {ex.Message}");
                }
            }
            
            // 如果激活失败且有浏览器路径，尝试重新打开
            if (!browserActive && !string.IsNullOrEmpty(_browserPath))
            {
                try
                {
                    logger.Info("浏览器窗口未激活，尝试重新打开...");
                    _browserProcess = _browserManager.OpenBrowser(_browserPath, "https://www.bing.com");
                    _keyboardSimulator.Wait(2000); // 等待页面加载
                }
                catch (Exception ex)
                {
                    logger.Error($"重新打开浏览器失败: {ex.Message}");
                }
            }
        }

        public void PerformSingleSearch(string searchTerm)
        {
            // 确保浏览器窗口处于活动状态
            EnsureBrowserActive();
            
            // 打开新标签页
            logger.Info("打开新标签页...");
            _keyboardSimulator.OpenNewTab();
            _keyboardSimulator.Wait(1000); // 等待标签页打开
            
            // 确保浏览器窗口处于活动状态
            EnsureBrowserActive();
            
            // 输入Bing网址并导航
            logger.Info("导航到Bing网站...");
            _keyboardSimulator.TypeText("https://www.bing.com ");
            _keyboardSimulator.PressSpace();
            _keyboardSimulator.PressEnter();
            _keyboardSimulator.Wait(3000); // 等待页面加载
            
            // 确保浏览器窗口处于活动状态
            EnsureBrowserActive();
            
            // 输入搜索词
            logger.Info($"输入搜索词: {searchTerm}...");
            _keyboardSimulator.TypeText(searchTerm);
            
            // 确保浏览器窗口处于活动状态
            EnsureBrowserActive();
            
            // 点击搜索按钮（按Enter键替代点击）
            logger.Info("点击搜索按钮...");
            _keyboardSimulator.PressEnter();
            _keyboardSimulator.Wait(3000); // 等待搜索结果加载
            
            // 确保浏览器窗口处于活动状态
            EnsureBrowserActive();
            
            // 滚动标签页
            logger.Info("滚动标签页...");
            _keyboardSimulator.ScrollPage();

            _keyboardSimulator.Wait(1000);

            // 关闭标签页
            logger.Info("关闭标签页...");
            _keyboardSimulator.CloseTab();
            _keyboardSimulator.Wait(1000); // 等待标签页关闭
        }

    }
}