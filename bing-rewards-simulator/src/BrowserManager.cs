using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace BingSearchAutomation
{
    public class BrowserManager
    {
        // Windows API 函数，用于获取和设置窗口状态
        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool IsIconic(IntPtr hWnd);

        // 常量定义
        private const int SW_RESTORE = 9;
        private const int SW_SHOWMAXIMIZED = 3;

        public Process OpenBrowser(string browserPath = "", string url = "")
        {
            Process browserProcess = null;
            
            try
            {
                if (!string.IsNullOrEmpty(browserPath))
                {
                    // 使用配置的浏览器路径
                    if (!string.IsNullOrEmpty(url))
                    {
                        browserProcess = Process.Start(browserPath, url);
                    }
                    else
                    {
                        browserProcess = Process.Start(browserPath);
                    }
                }
                else
                {
                    // 如果没有配置浏览器路径，使用默认浏览器
                    if (!string.IsNullOrEmpty(url))
                    {
                        browserProcess = Process.Start(url);
                    }
                    else
                    {
                        // 只打开浏览器，不指定URL
                        browserProcess = Process.Start(new ProcessStartInfo
                        {
                            FileName = "explorer.exe",
                            Arguments = "microsoft-edge:"
                        });
                    }
                }
            }
            catch
            {
                // 如果找不到指定浏览器，尝试打开Edge浏览器
                browserProcess = Process.Start(new ProcessStartInfo
                {
                    FileName = "explorer.exe",
                    Arguments = "microsoft-edge:"
                });
            }
            
            // 等待浏览器进程启动
            if (browserProcess != null)
            {
                browserProcess.WaitForInputIdle(5000);
                // 激活浏览器窗口
                ActivateBrowserWindow(browserProcess);
            }
            
            return browserProcess;
        }

        public void ActivateBrowserWindow(Process browserProcess)
        {
            if (browserProcess != null)
            {
                try
                {
                    // 即使进程已退出，也尝试获取主窗口句柄（针对夸克等多进程浏览器）
                    IntPtr mainWindowHandle = browserProcess.MainWindowHandle;
                    
                    if (mainWindowHandle != IntPtr.Zero)
                    {
                        // 如果窗口被最小化，先恢复
                        if (IsIconic(mainWindowHandle))
                        {
                            ShowWindow(mainWindowHandle, SW_RESTORE);
                        }
                        
                        // 激活窗口并置于前台
                        SetForegroundWindow(mainWindowHandle);
                        // 确保窗口最大化
                        ShowWindow(mainWindowHandle, SW_SHOWMAXIMIZED);
                    }
                }
                catch
                {
                    // 进程可能已退出，忽略异常
                }
            }
        }
 
    }
}