import os
import time
import random
import subprocess
import pyautogui
import pyperclip
import win32gui
import win32process
import win32con
import win32api
import psutil
import winreg
import ctypes

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
    
    def get_default_browser_path(self):
        """
        获取Windows系统默认浏览器路径
        
        Returns:
            str: 默认浏览器可执行文件路径，失败返回None
        """
        try:
            # 方法1: 通过注册表获取HTTP协议关联的应用
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                                r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice")
            prog_id = winreg.QueryValueEx(key, "ProgId")[0]
            winreg.CloseKey(key)
            
            if prog_id:
                # 根据ProgID获取浏览器路径
                browser_paths = {
                    "ChromeHTML": r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    "MSEdgeHTM": r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                    "FirefoxURL": r"C:\Program Files\Mozilla Firefox\firefox.exe",
                    "IE.HTTP": r"C:\Program Files\Internet Explorer\iexplore.exe",
                }
                
                # 检查常见的浏览器路径
                for browser_key, default_path in browser_paths.items():
                    if browser_key in prog_id:
                        if os.path.exists(default_path):
                            self.log("信息", f"检测到默认浏览器: {os.path.basename(default_path)}")
                            return default_path
                        break
                
                # 方法2: 尝试从App Paths注册表项获取
                try:
                    app_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                           f"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\{prog_id.split('.')[0]}.exe")
                    browser_path = winreg.QueryValueEx(app_key, "")[0]
                    winreg.CloseKey(app_key)
                    if os.path.exists(browser_path):
                        self.log("信息", f"从App Paths获取到默认浏览器路径: {browser_path}")
                        return browser_path
                except:
                    pass
            
            # 方法3: 通过查询注册表获取默认应用
            try:
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                                    r"Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.html\UserChoice")
                prog_id = winreg.QueryValueEx(key, "ProgId")[0]
                winreg.CloseKey(key)
                
                # 尝试常见浏览器名称
                browser_names = ["chrome", "msedge", "firefox", "opera", "brave"]
                for name in browser_names:
                    if name in prog_id.lower():
                        # 在PATH中搜索
                        import shutil
                        exe_name = f"{name}.exe" if name != "msedge" else "msedge.exe"
                        path = shutil.which(exe_name)
                        if path:
                            self.log("信息", f"通过PATH找到默认浏览器: {path}")
                            return path
            except:
                pass
            
            # 方法4: 返回常见浏览器的默认路径（按优先级）
            common_browsers = [
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files\Mozilla Firefox\firefox.exe",
            ]
            
            for path in common_browsers:
                if os.path.exists(path):
                    self.log("信息", f"使用找到的浏览器: {os.path.basename(path)}")
                    return path
            
            self.log("警告", "无法自动检测默认浏览器路径")
            return None
            
        except Exception as e:
            self.log("错误", f"获取默认浏览器路径时出错: {e}")
            return None
    
    def open_browser(self, custom_browser_title=None, custom_browser_process=None):
        """打开浏览器
        
        Args:
            custom_browser_title: 自定义浏览器标题
            custom_browser_process: 自定义浏览器进程名称
            
        Returns:
            bool: 成功打开并激活浏览器窗口返回True，失败返回False
        """
        process = None
        if self.browser_path:
            # 使用指定的浏览器路径打开
            # 构建命令行参数
            args = [self.browser_path, "https://www.bing.com"]
            
            # 为不同浏览器添加自定义标题的支持
            browser_name = os.path.basename(self.browser_path).lower()
            if custom_browser_title:
                if "chrome" in browser_name or "msedge" in browser_name:
                    # Chrome和Edge支持--app参数来设置标题
                    args = [self.browser_path, "--app=https://www.bing.com"]
                elif "firefox" in browser_name:
                    # Firefox支持-title参数
                    args.extend(["-title", custom_browser_title])
            
            self.log("信息", f"启动浏览器: {self.browser_path}")
            process = subprocess.Popen(args)
        else:
            # 使用系统默认浏览器 - 改进的实现
            self.log("信息", "未指定浏览器路径，尝试检测默认浏览器...")
            default_browser_path = self.get_default_browser_path()
            
            if default_browser_path:
                self.log("信息", f"使用检测到的默认浏览器: {default_browser_path}")
                args = [default_browser_path, "https://www.bing.com"]
                process = subprocess.Popen(args)
            else:
                # 回退到webbrowser模块
                self.log("警告", "无法检测默认浏览器，尝试使用webbrowser模块...")
                import webbrowser
                try:
                    webbrowser.open("https://www.bing.com")
                    self.log("信息", "已通过webbrowser打开URL，等待窗口出现...")
                except Exception as e:
                    self.log("错误", f"webbrowser.open失败: {e}")
                    return False
        
        # 等待浏览器窗口加载完成并激活
        success = self.wait_for_browser_window(
            process.pid if process else None,
            custom_browser_title=custom_browser_title,
            custom_browser_process=custom_browser_process
        )
        return success
    
    def activate_window(self, hwnd):
        """
        激活窗口到前台
        
        Args:
            hwnd: 窗口句柄
            
        Returns:
            bool: 成功激活返回True
        """
        try:
            # 使用AttachThreadInput解除前台锁定限制
            foreground_thread = win32process.GetWindowThreadProcessId(win32gui.GetForegroundWindow())[0]
            current_thread = win32api.GetCurrentThreadId()
            
            if foreground_thread != current_thread:
                win32process.AttachThreadInput(foreground_thread, current_thread, True)
            
            try:
                # 尝试多种激活方法
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hwnd)
                
                # 验证是否成功
                time.sleep(0.3)
                if win32gui.GetForegroundWindow() == hwnd:
                    return True
                
                # 如果SetForegroundWindow失败，模拟Alt键绕过前台锁定
                win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
                win32gui.BringWindowToTop(hwnd)
                
                # 模拟Alt键按下以允许设置前台窗口
                ctypes.windll.user32.keybd_event(0x12, 0, 0, 0)  # Alt down
                time.sleep(0.1)
                win32gui.SetForegroundWindow(hwnd)
                ctypes.windll.user32.keybd_event(0x12, 0, 2, 0)  # Alt up
                
                time.sleep(0.3)
                if win32gui.GetForegroundWindow() == hwnd:
                    return True
                    
            finally:
                if foreground_thread != current_thread:
                    win32process.AttachThreadInput(foreground_thread, current_thread, False)
            
            # 最后尝试最小化再恢复
            win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
            time.sleep(0.2)
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            win32gui.SetForegroundWindow(hwnd)
            
            time.sleep(0.3)
            return win32gui.GetForegroundWindow() == hwnd
            
        except Exception as e:
            self.log("错误", f"窗口激活失败: {e}")
            return False
    
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
                            # 使用窗口激活方法
                            if self.activate_window(self.browser_window_handle):
                                self.log("信息", "成功恢复浏览器窗口焦点")
                                return True
                            else:
                                self.log("警告", "无法激活浏览器窗口")
                        except Exception as e:
                            self.log("错误", f"激活窗口时出错: {e}")
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
    
    def wait_for_browser_window(self, process_id=None, timeout=30, check_interval=0.5, custom_browser_title=None, custom_browser_process=None):
        """
        等待浏览器窗口加载完成并激活
        
        Args:
            process_id: 浏览器进程ID，如果为None则通过窗口标题查找
            timeout: 超时时间（秒）
            check_interval: 检查间隔（秒）
            custom_browser_title: 自定义浏览器标题
            custom_browser_process: 自定义浏览器进程名称
            
        Returns:
            bool: 成功激活浏览器窗口返回True，失败返回False
        """
        start_time = time.time()
        attempts = 0
        max_attempts = int(timeout / check_interval)
        
        # 浏览器进程名称和标题匹配规则
        browser_processes = {
            "msedge.exe": ["Microsoft Edge", "Edge"],
            "chrome.exe": ["Google Chrome", "Chrome"],
            "firefox.exe": ["Mozilla Firefox", "Firefox"],
            "opera.exe": ["Opera"],
            "safari.exe": ["Safari"],
            "iexplore.exe": ["Internet Explorer", "IE"],
            "quark.exe": ["Quark", "夸克"],
            "ucbrowser.exe": ["UC"]
        }
        
        # 添加自定义浏览器进程和标题规则
        if custom_browser_process:
            browser_processes[custom_browser_process] = [custom_browser_title] if custom_browser_title else []
        
        # 通用浏览器标题关键词
        browser_keywords = ["Browser", "浏览器"]
        
        # 添加自定义标题到关键词列表
        if custom_browser_title:
            browser_keywords.insert(0, custom_browser_title)
        
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
                        
                        # 获取窗口所属进程ID
                        _, pid = win32process.GetWindowThreadProcessId(hwnd)
                        
                        # 检查是否指定了进程ID
                        if process_id:
                            # 如果指定了进程ID，验证窗口所属进程
                            if pid == process_id:
                                windows.append((hwnd, title))
                        else:
                            # 优先检查自定义浏览器标题和进程
                            if custom_browser_title and custom_browser_title in title:
                                # 如果有自定义标题且匹配，直接添加
                                windows.append((hwnd, title))
                            else:
                                # 未指定进程ID，通过进程名称和标题关键词识别浏览器
                                try:
                                    # 获取进程名称
                                    process = psutil.Process(pid)
                                    process_name = process.name().lower()
                                    
                                    # 检查进程名称是否在浏览器进程列表中
                                    is_browser_process = False
                                    for browser_process, browser_titles in browser_processes.items():
                                        if browser_process.lower() == process_name:
                                            is_browser_process = True
                                            break
                                    
                                    # 检查标题是否包含浏览器关键词
                                    has_browser_keyword = any(keyword in title for keyword in browser_keywords)
                                    
                                    # 检查标题是否包含特定浏览器的标题
                                    has_browser_title = False
                                    for browser_titles in browser_processes.values():
                                        if any(browser_title in title for browser_title in browser_titles):
                                            has_browser_title = True
                                            break
                                    
                                    # 至少满足以下条件之一：
                                    # 1. 进程名称是浏览器进程
                                    # 2. 标题包含浏览器关键词
                                    # 3. 标题包含特定浏览器的标题
                                    if is_browser_process or has_browser_keyword or has_browser_title:
                                        windows.append((hwnd, title))
                                except (psutil.NoSuchProcess, psutil.AccessDenied):
                                    # 无法获取进程信息，尝试通过标题识别
                                    has_browser_keyword = any(keyword in title for keyword in browser_keywords)
                                    has_browser_title = False
                                    for browser_titles in browser_processes.values():
                                        if any(browser_title in title for browser_title in browser_titles):
                                            has_browser_title = True
                                            break
                                    
                                    if has_browser_keyword or has_browser_title:
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
                        # 使用窗口激活方法
                        if self.activate_window(hwnd):
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
    
    def scroll_page(self, times=None, min_amount=200, max_amount=400):
        """滚动页面（随机上下滚动2-5次，滚动距离随机）"""
        # 确保浏览器窗口有焦点
        if not self.ensure_browser_focus():
            self.log("错误", "无法获得浏览器窗口焦点，无法滚动页面")
            return False
        
        # 如果没有指定次数，随机生成2-5次
        if times is None:
            times = random.randint(2, 5)
        
        self.log("信息", f"开始滚动页面，共{times}次")
        
        # 将鼠标移动到浏览器窗口中心区域，确保滚动事件能正确接收
        try:
            if self.browser_window_handle:
                # 获取窗口位置
                left, top, right, bottom = win32gui.GetWindowRect(self.browser_window_handle)
                center_x = (left + right) // 2
                center_y = (top + bottom) // 2
                # 移动鼠标到窗口中心
                pyautogui.moveTo(center_x, center_y, duration=0.3)
                time.sleep(0.3)
                self.log("信息", f"鼠标已移动到窗口中心位置: ({center_x}, {center_y})")
        except Exception as e:
            self.log("警告", f"移动鼠标到窗口中心失败: {e}")
        
        for i in range(times):
            # 随机决定向上或向下滚动
            scroll_direction = random.choice([-1, 1])
            # 随机生成滚动距离（在min_amount和max_amount之间）
            scroll_distance = random.randint(min_amount, max_amount)
            scroll_amount = scroll_distance * scroll_direction
            direction_text = "向下" if scroll_amount < 0 else "向上"
            
            self.log("信息", f"第{i+1}/{times}次滚动：{direction_text} {abs(scroll_amount)}像素")
            
            # 方法1: 使用pyautogui滚动
            pyautogui.scroll(scroll_amount)
            time.sleep(0.2)
            
            # 方法2: 同时使用Page Up/Page Down键作为补充（更可靠）
            if scroll_amount < 0:  # 向下滚动
                pyautogui.press('pagedown')
            else:  # 向上滚动
                pyautogui.press('pageup')
            
            time.sleep(random.uniform(0.5, 1.5))
        
        self.log("信息", "页面滚动完成")
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
