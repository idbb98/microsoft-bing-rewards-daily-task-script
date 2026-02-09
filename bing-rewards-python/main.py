import tkinter as tk
import threading
import time
import os
import requests
import random
import webbrowser
import pyautogui
import win32api
import win32con
import win32gui
import json

# 导入自定义模块
from ui import UIManager
from log import LogManager
from browser_automation import BrowserAutomation
from search_word_provider import SearchWordProvider

class BingRewardsAutomation:
    def __init__(self, root):
        self.root = root
        
        # 初始化变量
        self.is_running = False
        self.thread = None
        
        # 初始化日志管理器
        self.log_manager = LogManager()
        
        # 初始化UI管理器
        self.ui_manager = UIManager(root, self)
        
        # 初始化浏览器自动化模块（稍后会更新浏览器路径）
        self.browser_automation = BrowserAutomation(log_manager=self.log_manager)
        
        # 将UI管理器设置到日志管理器
        self.log_manager.set_ui_manager(self.ui_manager)
        
        # 初始化搜索词获取器
        self.search_word_provider = SearchWordProvider(self.log_manager)
        
        # 记录程序初始化完成
        self.log("信息", "程序初始化完成")
    
    def log(self, level, message):
        """添加日志"""
        self.log_manager.log(level, message)
    
    def start_automation(self):
        """开始自动化任务"""
        if self.is_running:
            return
        
        self.is_running = True
        self.ui_manager.update_button_states(True)
        self.ui_manager.set_opacity(0.7)  # 设置透明度为50%
        
        # 获取浏览器路径
        browser_path = self.ui_manager.get_browser_selection()
        
        # 更新浏览器自动化模块的浏览器路径
        self.browser_automation = BrowserAutomation(browser_path, log_manager=self.log_manager)
        
        # 在新线程中执行自动化任务
        self.thread = threading.Thread(target=self.run_automation, args=(browser_path,))
        self.thread.daemon = True
        self.thread.start()
    
    def stop_automation(self):
        """停止自动化任务"""
        self.is_running = False
        
        # 更新按钮状态
        self.ui_manager.update_button_states(False)
        self.ui_manager.set_opacity(1.0)  # 恢复不透明
        
        self.log("信息", "自动化任务已停止")
    


    def exit_program(self):
        """退出程序"""
        if self.is_running:
            self.stop_automation()
        self.ui_manager.set_opacity(1.0)  # 恢复不透明
        self.root.quit()
    
    def run_automation(self, browser_path):
        """执行自动化任务"""
        try:
            # 执行自动化任务
            self.sync_run_automation(browser_path)
        except Exception as e:
            self.log("错误", f"执行过程中出错: {str(e)}")
            self.stop_automation()
    
    def generate_search_terms(self, count=10):
        """生成搜索词"""
        return self.search_word_provider.generate_search_terms(count)
    

    
    def sync_run_automation(self, browser_path):
        """同步执行自动化任务"""
        try:
            # 获取用户配置的搜索词搜索次数
            search_count = self.ui_manager.get_search_count()
            # 生成搜索词
            search_terms = self.generate_search_terms(search_count)
            self.log("信息", f"生成了{len(search_terms)}个搜索词")

            # 记录使用的浏览器路径
            self.log("信息", f"使用浏览器路径: {browser_path}")

            # 打开浏览器并导航到Bing
            self.log("信息", "正在启动浏览器...")
            success = self.browser_automation.open_browser()
            if not success:
                self.log("错误", "无法启动或激活浏览器窗口")
                self.stop_automation()
                return
            self.log("信息", "浏览器启动并激活成功")

            # 预热浏览器
            self.log("信息", "正在预热浏览器...")
            success = self.browser_automation.preheat_browser()
            if not success:
                self.log("错误", "浏览器预热失败")
                self.stop_automation()
                return
            self.log("信息", "浏览器预热完成")
            
            # 执行多次搜索
            for i, term in enumerate(search_terms):
                if not self.is_running:
                    break

                self.log("信息", f"执行第{i+1}次搜索，搜索词: {term}")
                
                # 调用浏览器自动化模块的单次搜索方法
                success = self.browser_automation.perform_single_search(term)
                if not success:
                    self.log("错误", f"第{i+1}次搜索失败")
                    # 可以选择继续执行下一次搜索或停止
                    # 这里选择继续执行
                    self.log("信息", "继续执行下一次搜索")
                
                # 随机延迟
                if i < len(search_terms) - 1:
                    delay = random.uniform(2, 5)
                    self.log("信息", f"等待{delay:.1f}秒后执行下一次搜索")
                    time.sleep(delay)
            
            # 任务完成
            self.log("信息", "自动化任务执行完成")
            
            # 等待用户查看
            time.sleep(5)
            
        except Exception as e:
            self.log("错误", f"执行过程中出错: {str(e)}")
        finally:
            # 停止自动化任务
            self.stop_automation()

if __name__ == "__main__":
    root = tk.Tk()
    app = BingRewardsAutomation(root)
    root.mainloop()
