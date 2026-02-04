import time
import random
import subprocess
import pyautogui
import pyperclip

class BrowserAutomation:
    def __init__(self, browser_path=None):
        """初始化浏览器自动化模块"""
        self.browser_path = browser_path
    
    def open_browser(self):
        """打开浏览器"""
        if self.browser_path:
            # 使用指定的浏览器路径打开
            subprocess.Popen([self.browser_path, "https://www.bing.com"])
        else:
            # 使用系统默认浏览器
            import webbrowser
            webbrowser.open("https://www.bing.com")
        time.sleep(5)  # 等待浏览器加载完成
    
    def open_new_tab(self):
        """打开新标签页"""
        pyautogui.hotkey('ctrl', 't')
        time.sleep(1)  # 等待标签页打开
    
    def navigate_to(self, url):
        """导航到指定网址"""
        pyperclip.copy(url)
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.5)
        pyautogui.press('enter')
        time.sleep(3)  # 等待页面加载
    
    def perform_search(self, search_term):
        """输入搜索词"""
        pyperclip.copy(search_term)
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.5)
        """执行搜索"""
        pyautogui.press('enter')
        time.sleep(3)  # 等待搜索结果加载
    
    def scroll_page(self, times=3, amount=-200):
        """滚动页面"""
        for _ in range(times):
            pyautogui.scroll(amount)  # 向下滚动
            time.sleep(random.uniform(0.5, 1.5))
    
    def close_tab(self):
        """关闭标签页"""
        pyautogui.hotkey('ctrl', 'w')
        time.sleep(1)  # 等待标签页关闭
    
    def perform_single_search(self, search_term):
        """执行单次搜索的完整流程"""
        # 打开新标签页
        self.open_new_tab()
        
        # 导航到Bing网站
        self.navigate_to("https://www.bing.com")

        # 输入搜索词并执行搜索
        self.perform_search(search_term)
        
        # 滚动页面以模拟用户行为
        self.scroll_page()
        
        # 关闭标签页
        self.close_tab()
