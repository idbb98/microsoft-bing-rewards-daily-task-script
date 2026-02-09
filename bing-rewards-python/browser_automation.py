import time
import random
import subprocess
import pyautogui
import pyperclip
import win32gui
import win32process
import win32con
import psutil

class BrowserAutomation:
    def __init__(self, browser_path=None, log_manager=None):
        """初始化浏览器自动化模块"""
        self.browser_path = browser_path
        self.log_manager = log_manager
        self.browser_window_handle = None  # 存储当前浏览器窗口句柄
    
    def log(self, level, message):
        """添加日志"""
        if self.log_manager:
            self.log_manager.log(level, message)
        else:
            # 回退到print
            print(f"[{level}] {message}")
    
    def open_browser(self):
        """打开浏览器"""
        process = None
        if self.browser_path:
            # 使用指定的浏览器路径打开
            process = subprocess.Popen([self.browser_path, "https://www.bing.com"])
        else:
            # 使用系统默认浏览器
            import webbrowser
            webbrowser.open("https://www.bing.com")
        
        # 等待浏览器窗口加载完成并激活
        success = self.wait_for_browser_window(process.pid if process else None)
        return success
    
    def ensure_browser_focus(self, timeout=10, check_interval=0.5):
        """
        确保浏览器窗口获得焦点
        
        Args:
            timeout: 超时时间（秒）
            check_interval: 检查间隔（秒）
            
        Returns:
            bool: 成功获得焦点返回True，失败返回False
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # 检查是否有存储的窗口句柄
            if self.browser_window_handle:
                try:
                    # 检查窗口是否存在且可见
                    if win32gui.IsWindow(self.browser_window_handle) and win32gui.IsWindowVisible(self.browser_window_handle):
                        # 检查窗口是否已经在前台
                        if win32gui.GetForegroundWindow() == self.browser_window_handle:
                            # self.log("信息", "浏览器窗口已经有焦点")
                            return True
                        
                        # 尝试激活窗口
                        self.log("信息", "尝试激活浏览器窗口...")
                        try:
                            # 方法1: SetForegroundWindow
                            win32gui.SetForegroundWindow(self.browser_window_handle)
                            # 方法2: ShowWindow 确保窗口可见
                            win32gui.ShowWindow(self.browser_window_handle, win32con.SW_RESTORE)
                            # 方法3: SetForegroundWindow 再次尝试
                            win32gui.SetForegroundWindow(self.browser_window_handle)
                        except Exception as e:
                            self.log("错误", f"激活窗口时出错: {e}")
                            
                        # 确保窗口被激活
                        time.sleep(0.5)
                        
                        # 验证窗口是否在前台
                        if win32gui.GetForegroundWindow() == self.browser_window_handle:
                            self.log("信息", "成功恢复浏览器窗口焦点")
                            return True
                        else:
                            self.log("警告", "无法激活浏览器窗口")
                    else:
                        self.log("警告", "存储的浏览器窗口句柄无效或不可见")
                        # 尝试重新查找浏览器窗口
                        self.browser_window_handle = None
                except Exception as e:
                    self.log("错误", f"检查窗口焦点时出错: {e}")
                    self.browser_window_handle = None
            
            # 如果没有存储的窗口句柄，尝试重新查找
            if not self.browser_window_handle:
                self.log("信息", "没有存储的浏览器窗口句柄，尝试查找...")
                # 尝试重新查找浏览器窗口
                success = self.wait_for_browser_window()
                if success:
                    return True
            
            time.sleep(check_interval)
        
        self.log("错误", f"超时: 无法在{timeout}秒内恢复浏览器窗口焦点")
        return False
    
    def wait_for_browser_window(self, process_id=None, timeout=30, check_interval=0.5):
        """
        等待浏览器窗口加载完成并激活
        
        Args:
            process_id: 浏览器进程ID，如果为None则通过窗口标题查找
            timeout: 超时时间（秒）
            check_interval: 检查间隔（秒）
            
        Returns:
            bool: 成功激活浏览器窗口返回True，失败返回False
        """
        start_time = time.time()
        attempts = 0
        max_attempts = int(timeout / check_interval)
        
        # 扩展浏览器窗口标题匹配模式
        browser_titles = ["Bing", "bing", "Microsoft Edge", "Chrome", "Firefox", "Opera", "浏览器", "Quark", "夸克", "UC", "Safari", "Internet Explorer", "IE"]
        
        # 初始等待时间，让浏览器有机会启动
        initial_wait = 3
        self.log("信息", f"等待{initial_wait}秒让浏览器启动...")
        time.sleep(initial_wait)
        
        while time.time() - start_time < timeout:
            attempts += 1
            
            # 检查进程状态（如果指定了进程ID）
            if process_id:
                try:
                    process = psutil.Process(process_id)
                    process_status = process.status()
                    if process_status not in [psutil.STATUS_RUNNING, psutil.STATUS_SLEEPING]:
                        self.log("警告", f"浏览器进程状态异常: {process_status}，等待进程启动...")
                        time.sleep(check_interval)
                        continue
                except psutil.NoSuchProcess:
                    # 进程可能已经退出，但浏览器窗口可能已经打开
                    self.log("警告", f"浏览器进程{process_id}不存在，尝试查找窗口...")
                    process_id = None
                    continue
                except Exception as e:
                    self.log("错误", f"检查进程状态时出错: {e}")
                    # 出错时不立即返回，继续尝试查找窗口
            
            # 枚举所有顶级窗口
            def callback(hwnd, windows):
                if win32gui.IsWindowVisible(hwnd):
                    try:
                        title = win32gui.GetWindowText(hwnd)
                        # 跳过空标题窗口
                        if not title or title.strip() == "":
                            return True
                        
                        # 检查是否包含浏览器特征标题
                        if any(browser_title in title for browser_title in browser_titles):
                            # 如果指定了进程ID，验证窗口所属进程
                            if process_id:
                                try:
                                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                                    if pid == process_id:
                                        windows.append((hwnd, title))
                                except Exception as e:
                                    self.log("错误", f"获取窗口进程ID时出错: {e}")
                            else:
                                windows.append((hwnd, title))
                        # 如果没有找到匹配的浏览器窗口，记录所有窗口用于调试
                        elif attempts == 1:
                            windows.append((hwnd, f"[DEBUG] {title}"))
                    except Exception as e:
                        self.log("错误", f"枚举窗口时出错: {e}")
                return True
            
            windows = []
            try:
                win32gui.EnumWindows(callback, windows)
            except Exception as e:
                self.log("错误", f"枚举窗口时出错: {e}")
                time.sleep(check_interval)
                continue
            
            if not windows:
                # 第一次尝试时，显示所有可见窗口用于调试
                if attempts == 1:
                    self.log("信息", "正在扫描所有可见窗口以帮助调试...")
                    debug_windows = []
                    def debug_callback(hwnd, debug_list):
                        if win32gui.IsWindowVisible(hwnd):
                            try:
                                title = win32gui.GetWindowText(hwnd)
                                if title and title.strip():
                                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                                    debug_list.append(f"  - [{pid}] {title}")
                            except:
                                pass
                        return True
                    win32gui.EnumWindows(debug_callback, debug_windows)
                    self.log("信息", "当前可见窗口:")
                    for window_info in debug_windows[:10]:  # 只显示前10个窗口
                        self.log("信息", window_info)
                    if len(debug_windows) > 10:
                        self.log("信息", f"  ... 还有 {len(debug_windows) - 10} 个窗口")
                
                self.log("信息", f"尝试 {attempts}/{max_attempts}: 未找到浏览器窗口")
                time.sleep(check_interval)
                continue
            
            self.log("信息", f"找到 {len(windows)} 个浏览器窗口")
            
            for hwnd, title in windows:
                try:
                    # 检查窗口是否响应
                    if win32gui.IsWindowEnabled(hwnd) and win32gui.IsWindow(hwnd):
                        # 激活窗口 - 尝试多种方法确保激活
                        try:
                            # 方法1: SetForegroundWindow
                            win32gui.SetForegroundWindow(hwnd)
                            # 方法2: ShowWindow 确保窗口可见
                            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                            # 方法3: SetForegroundWindow 再次尝试
                            win32gui.SetForegroundWindow(hwnd)
                        except Exception as e:
                            self.log("错误", f"激活窗口时出错: {e}")
                            
                        # 确保窗口被激活
                        time.sleep(0.5)
                        
                        # 验证窗口是否在前台
                        if win32gui.GetForegroundWindow() == hwnd:
                            self.log("信息", f"成功激活浏览器窗口: {title}")
                            self.browser_window_handle = hwnd  # 保存窗口句柄
                            return True
                        else:
                            self.log("警告", f"窗口未成功激活: {title}")
                except Exception as e:
                    self.log("错误", f"处理窗口时出错: {e}")
            
            time.sleep(check_interval)
        
        self.log("错误", f"超时: 无法在{timeout}秒内激活浏览器窗口")
        return False
    
    def open_new_tab(self):
        """打开新标签页"""
        # 确保浏览器窗口有焦点
        if not self.ensure_browser_focus():
            self.log("错误", "无法获得浏览器窗口焦点，无法打开新标签页")
            return False
        
        pyautogui.hotkey('ctrl', 't')
        time.sleep(1)  # 等待标签页打开
        return True
    
    def navigate_to(self, url):
        """导航到指定网址"""
        # 确保浏览器窗口有焦点
        if not self.ensure_browser_focus():
            self.log("错误", "无法获得浏览器窗口焦点，无法导航到网址")
            return False
        
        pyperclip.copy(url)
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.5)
        pyautogui.press('enter')
        time.sleep(3)  # 等待页面加载
        return True
    
    def perform_search(self, search_term):
        """输入搜索词并执行搜索"""
        # 确保浏览器窗口有焦点
        if not self.ensure_browser_focus():
            self.log("错误", "无法获得浏览器窗口焦点，无法执行搜索")
            return False
        
        time.sleep(0.5)
        pyperclip.copy(search_term)
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.5)
        pyautogui.press('enter')
        time.sleep(3)  # 等待搜索结果加载
        return True
    
    def scroll_page(self, times=3, amount=-200):
        """滚动页面"""
        # 确保浏览器窗口有焦点
        if not self.ensure_browser_focus():
            self.log("错误", "无法获得浏览器窗口焦点，无法滚动页面")
            return False
        
        for _ in range(times):
            pyautogui.scroll(amount)  # 向下滚动
            time.sleep(random.uniform(0.5, 1.5))
        return True
    
    def close_tab(self):
        """关闭标签页"""
        # 确保浏览器窗口有焦点
        if not self.ensure_browser_focus():
            self.log("错误", "无法获得浏览器窗口焦点，无法关闭标签页")
            return False
        
        pyautogui.hotkey('ctrl', 'w')
        time.sleep(1)  # 等待标签页关闭
        return True

    def preheat_browser(self):
        """预热浏览器，打开新标签页并导航到Bing网站后关闭标签页"""
        # 打开新标签页
        if not self.open_new_tab():
            self.log("错误", "无法打开新标签页，预热流程失败")
            return False
        
        # 导航到Bing网站
        success_navigation = self.navigate_to("https://www.bing.com")
        time.sleep(5)  # 等待页面加载
        if not success_navigation:
            self.log("错误", "无法导航到Bing网站，预热流程失败")
            self.close_tab()
            return False
        
        # 关闭标签页
        if not self.close_tab():
            self.log("错误", "无法关闭标签页")
            return False
        
        return True

    def perform_single_search(self, search_term):
        """执行单次搜索的完整流程"""
        # 打开新标签页
        if not self.open_new_tab():
            self.log("错误", "无法打开新标签页，搜索流程失败")
            return False
        
        # 导航到Bing网站
        if not self.navigate_to("https://www.bing.com"):
            self.log("错误", "无法导航到Bing网站，搜索流程失败")
            self.close_tab()
            return False

        # 输入搜索词并执行搜索
        if not self.perform_search(search_term):
            self.log("错误", "无法执行搜索，搜索流程失败")
            self.close_tab()
            return False
        
        # 滚动页面以模拟用户行为
        if not self.scroll_page():
            self.log("错误", "无法滚动页面，搜索流程失败")
            self.close_tab()
            return False
        
        # 关闭标签页
        if not self.close_tab():
            self.log("错误", "无法关闭标签页")
            return False
        
        return True
