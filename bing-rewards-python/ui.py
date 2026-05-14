import tkinter as tk
from tkinter import ttk, scrolledtext, filedialog
import json
import os
import sys

class UIManager:
    def __init__(self, root, automation_instance):
        self.root = root
        self.automation_instance = automation_instance
        # 配置文件路径
        # 处理打包后的路径问题
        # 尝试多种方法来确定正确的运行目录
        try:
            # 方法1: 检查是否是cx-Freeze打包
            if hasattr(sys, 'frozen') and sys.frozen:
                # cx-Freeze打包后的运行目录
                base_path = os.path.dirname(sys.executable)
            # 方法2: 检查是否是PyInstaller打包
            elif hasattr(sys, '_MEIPASS'):
                # PyInstaller打包后的运行目录
                base_path = os.path.dirname(sys.executable)
            else:
                # 未打包时的运行目录
                base_path = os.path.dirname(__file__)
        except Exception as e:
            # 如果以上方法都失败，使用当前工作目录
            base_path = os.getcwd()
        self.config_file = os.path.join(base_path, "config.json")
        self.about_config_file = os.path.join(base_path, "about_config.json")
        # 加载关于页面配置
        self.about_config = self.load_about_config()
        # 加载配置
        self.setup_ui()
        self.load_config()
    
    def setup_ui(self):
        """设置用户界面"""
        self.root.geometry("750x500")
        self.root.resizable(False, False)
        self.root.attributes('-topmost', True)  # 默认置顶
        
        # 获取窗口尺寸
        window_width = 750
        window_height = 500
        
        # 尝试使用工作区域尺寸（排除任务栏）
        try:
            work_area = self.root.winfo_workarea()
            work_width = work_area[2]
            work_height = work_area[3]
            # 计算右下角位置
            x = work_width - window_width
            y = work_height - window_height
        except AttributeError:
            # 兼容不支持winfo_workarea的环境
            screen_width = self.root.winfo_screenwidth()
            screen_height = self.root.winfo_screenheight()
            # 计算右下角位置，留出任务栏空间
            x = screen_width - window_width
            y = screen_height - window_height - 60  # 减去任务栏高度的估计值
        
        # 设置窗口位置
        self.root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        # 禁用窗口装饰，使窗口不可移动
        self.root.overrideredirect(True)
        
        # 创建自定义标题栏
        self.title_frame = ttk.Frame(self.root, relief=tk.RAISED, borderwidth=1)
        self.title_frame.pack(fill=tk.X, side=tk.TOP)
        
        # 添加窗口标题
        project_name = self.about_config.get("project", {}).get("name", "Bing Rewards 自动化工具")
        version = self.about_config.get("project", {}).get("version", "1.0")
        author = self.about_config.get("project", {}).get("author", "Brian")
        title_text = f"{project_name} v{version} - {author}"
        title_label = ttk.Label(self.title_frame, text=title_text, font= ("Microsoft YaHei", 10))
        title_label.pack(side=tk.LEFT, padx=10, pady=5)
        
        # 添加关闭按钮
        self.close_button = ttk.Button(self.title_frame, text="关闭", width=5, command=self.automation_instance.exit_program)
        self.close_button.pack(side=tk.RIGHT, padx=10, pady=5)
        
        # 创建主框架
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.pack(fill=tk.BOTH, expand=True, side=tk.TOP)
        
        # 创建Notebook控件用于标签页
        self.notebook = ttk.Notebook(self.main_frame)
        self.notebook.pack(fill=tk.BOTH, expand=True)
        
        # 创建主页面标签
        self.main_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.main_tab, text="主页面")
        
        # 创建警告区域
        self.warning_frame = ttk.LabelFrame(self.main_tab, text="⚠️ 警告", padding="10")
        self.warning_frame.pack(fill=tk.X, pady=5)
        
        # 添加警告信息
        ttk.Label(self.warning_frame, text="程序运行期间请勿使用键盘和鼠标进行任何操作，否则可能导致程序异常或任务中断！\n"
                                          "请避免打开或编辑重要文档，防止因鼠标键盘被占用导致误操作或数据异常！！！", 
                  wraplength=650, foreground="#FF0000", font=("Microsoft YaHei", 10, "bold")).pack(anchor=tk.W, pady=5)
        
        # 创建按钮区域
        self.button_frame = ttk.Frame(self.main_tab)
        self.button_frame.pack(fill=tk.X, pady=5)
        
        self.start_button = ttk.Button(self.button_frame, text="开始执行", command=self.automation_instance.start_automation)
        self.start_button.pack(side=tk.LEFT, padx=5)
        
        self.stop_button = ttk.Button(self.button_frame, text="停止", command=self.automation_instance.stop_automation, state=tk.DISABLED)
        self.stop_button.pack(side=tk.LEFT, padx=5)
        
        self.exit_button = ttk.Button(self.button_frame, text="退出", command=self.automation_instance.exit_program)
        self.exit_button.pack(side=tk.RIGHT, padx=5)
        
        # 添加作者信息
        self.author_label = ttk.Label(self.button_frame, text="Brian", font=("Microsoft YaHei", 8))
        self.author_label.pack(side=tk.RIGHT, padx=10)
        
        # 创建日志区域
        self.log_frame = ttk.LabelFrame(self.main_tab, text="执行日志", padding="10")
        self.log_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        
        self.log_text = scrolledtext.ScrolledText(self.log_frame, width=80, height=18, wrap=tk.WORD, state=tk.DISABLED)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # 创建配置页面标签
        self.config_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.config_tab, text="配置")
        
        # 创建配置区域
        self.config_frame = ttk.LabelFrame(self.config_tab, text="配置", padding="10")
        self.config_frame.pack(fill=tk.X, pady=5)
        
        # 浏览器路径配置
        ttk.Label(self.config_frame, text="浏览器路径：").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.browser_var = tk.StringVar(value="（自动检测默认浏览器）")
        # 添加变量变化监听，自动保存配置
        self.browser_var.trace_add('write', lambda *args: self.save_config())
        
        # 常用浏览器路径
        self.common_browser_paths = [
            "（自动检测默认浏览器）",
            r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",  # Chrome
            r"D:\\development\\PortableTool\\CentBrowserPortable\\chrome.exe",
            r"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",  # Edge
            r"C:\\Program Files\\Mozilla Firefox\\firefox.exe",  # Firefox
            r"C:\\Users\\User\\AppData\\Local\\Programs\\Quark\\quark.exe",  # 夸克浏览器
            r"C:\\Program Files\\Opera\\launcher.exe",  # Opera
            r"C:\\Program Files\\UC\\UCBrowser\\Application\\UCBrowser.exe"  # UC浏览器
        ]
        
        # 创建下拉框
        self.browser_combobox = ttk.Combobox(self.config_frame, textvariable=self.browser_var, values=self.common_browser_paths, width=48)
        self.browser_combobox.grid(row=1, column=1, sticky=tk.W, pady=5)
        self.browse_button = ttk.Button(self.config_frame, text="浏览", command=self.browse_browser_path)
        self.browse_button.grid(row=1, column=2, sticky=tk.W, padx=5, pady=5)
        
        # 置顶选项
        self.topmost_var = tk.BooleanVar(value=True)
        self.topmost_checkbox = ttk.Checkbutton(self.config_frame, text="窗口置顶", variable=self.topmost_var, command=self.toggle_topmost)
        self.topmost_checkbox.grid(row=2, column=0, sticky=tk.W, padx=0, pady=5)
        
        # 搜索词搜索次数配置
        ttk.Label(self.config_frame, text="搜索词搜索次数：").grid(row=3, column=0, sticky=tk.W, pady=5)
        self.search_count_var = tk.StringVar(value="20")
        # 添加变量变化监听，自动保存配置
        self.search_count_var.trace_add('write', lambda *args: self.save_config())
        self.search_count_entry = ttk.Entry(self.config_frame, textvariable=self.search_count_var, width=10)
        self.search_count_entry.grid(row=3, column=1, sticky=tk.W, pady=5)
        
        # 重置按钮
        self.reset_button = ttk.Button(self.config_frame, text="重置配置", command=self.reset_config)
        self.reset_button.grid(row=4, column=0, columnspan=3, pady=10)
        
        # 创建关于页面标签
        self.about_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.about_tab, text="关于")
        
        # 添加滚动容器
        about_canvas = tk.Canvas(self.about_tab)
        about_scrollbar = ttk.Scrollbar(self.about_tab, orient="vertical", command=about_canvas.yview)
        about_scrollbar.pack(side="right", fill="y")
        
        about_canvas.pack(side="left", fill="both", expand=True)
        about_canvas.configure(yscrollcommand=about_scrollbar.set)
        
        # 创建内部容器
        about_frame = ttk.Frame(about_canvas, padding="20")
        about_canvas.create_window((0, 0), window=about_frame, anchor="nw")
        
        # 配置画布大小
        def on_configure(event):
            about_canvas.configure(scrollregion=about_canvas.bbox("all"))
        
        about_frame.bind("<Configure>", on_configure)
        
        # 当画布大小改变时，调整内部容器宽度
        def on_canvas_configure(event):
            # 获取画布宽度，减去滚动条宽度
            canvas_width = event.width - about_scrollbar.winfo_width()
            # 调整内部容器宽度
            about_frame.configure(width=canvas_width)
        
        about_canvas.bind("<Configure>", on_canvas_configure)
        
        # 项目标题
        project_name = self.about_config.get("project", {}).get("name", "Bing Rewards 自动化工具")
        ttk.Label(about_frame, text=project_name, font=("Microsoft YaHei", 16, "bold")).pack(pady=10)
        
        # 版本信息
        version = self.about_config.get("project", {}).get("version", "1.0")
        author = self.about_config.get("project", {}).get("author", "Brian")
        ttk.Label(about_frame, text=f"版本: {version}", font=("Microsoft YaHei", 10)).pack(pady=2)
        ttk.Label(about_frame, text=f"作者: {author}", font=("Microsoft YaHei", 10)).pack(pady=2)
        
        # 开源免费提示
        is_open_source = self.about_config.get("project", {}).get("is_open_source", True)
        is_free = self.about_config.get("project", {}).get("is_free", True)
        if is_open_source and is_free:
            open_source_frame = ttk.Frame(about_frame)
            open_source_frame.pack(pady=10)
            ttk.Label(open_source_frame, text="🎉 开源免费", font=("Microsoft YaHei", 12, "bold"), foreground="#28a745").pack(side=tk.LEFT, padx=5)
        
        # 项目地址链接
        repository_url = self.about_config.get("project", {}).get("repository_url", "")
        if repository_url:
            repo_frame = ttk.Frame(about_frame)
            repo_frame.pack(pady=5)
            ttk.Label(repo_frame, text="项目地址:", font=("Microsoft YaHei", 10)).pack(side=tk.LEFT, padx=5)
            # 创建可点击的链接
            repo_link = ttk.Label(repo_frame, text=repository_url, font=("Microsoft YaHei", 10, "underline"), foreground="#0066cc", cursor="hand2")
            repo_link.pack(side=tk.LEFT)
            repo_link.bind("<Button-1>", lambda e: self.open_url(repository_url))
        
        # 项目简介
        description = self.about_config.get("description", "")
        if description:
            desc_frame = ttk.LabelFrame(about_frame, text="项目简介", padding="10")
            desc_frame.pack(fill=tk.X, pady=10)
            ttk.Label(desc_frame, text=description, font=("Microsoft YaHei", 10), wraplength=650).pack(anchor=tk.W)
        
        # 功能特点
        features = self.about_config.get("features", [])
        if features:
            features_frame = ttk.LabelFrame(about_frame, text="功能特点", padding="10")
            features_frame.pack(fill=tk.X, pady=10)
            for feature in features:
                ttk.Label(features_frame, text=f"• {feature}", font=("Microsoft YaHei", 10), wraplength=650).pack(anchor=tk.W, pady=2)
        
        # 重要注意事项
        important_notes = self.about_config.get("important_notes", [])
        if important_notes:
            notes_frame = ttk.LabelFrame(about_frame, text="⚠️ 重要注意事项", padding="15")
            notes_frame.pack(fill=tk.X, pady=15)
            # 设置标签框架的样式
            notes_frame.configure(relief="raised")
            for note in important_notes:
                ttk.Label(notes_frame, text=f"{note}", font=("Microsoft YaHei", 11, "bold"), wraplength=650, foreground="#dc3545").pack(anchor=tk.W, pady=3)
        
        # 免责声明
        disclaimer = self.about_config.get("disclaimer", "")
        if disclaimer:
            disclaimer_frame = ttk.LabelFrame(about_frame, text="免责声明", padding="10")
            disclaimer_frame.pack(fill=tk.X, pady=10)
            ttk.Label(disclaimer_frame, text=disclaimer, font=("Microsoft YaHei", 10, "italic"), wraplength=650, foreground="#666666").pack(anchor=tk.W)
        
        # 添加鼠标滚轮支持
        def on_mouse_wheel(event):
            about_canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        about_canvas.bind_all("<MouseWheel>", on_mouse_wheel)
        
        # 添加触摸滑动支持
        def on_touch_scroll(event):
            about_canvas.yview_scroll(int(-1*event.delta), "units")
        
        about_canvas.bind("<MouseWheel>", on_mouse_wheel)
        about_canvas.bind("<Button-4>", lambda e: about_canvas.yview_scroll(-1, "units"))
        about_canvas.bind("<Button-5>", lambda e: about_canvas.yview_scroll(1, "units"))
    
    def get_browser_selection(self):
        """获取用户选择的浏览器"""
        browser_path = self.browser_var.get()
        # 如果选择的是"自动检测默认浏览器"，返回空字符串
        if "自动检测" in browser_path or browser_path == "":
            return ""
        return browser_path
    
    def get_search_count(self):
        """获取用户配置的搜索词搜索次数"""
        try:
            count = int(self.search_count_var.get())
            # 确保搜索次数在合理范围内
            return max(1, min(count, 100))
        except ValueError:
            # 如果输入无效，返回默认值20
            return 20
    
    def update_button_states(self, running):
        """更新按钮状态"""
        if running:
            self.start_button.config(state=tk.DISABLED)
            self.stop_button.config(state=tk.NORMAL)
        else:
            self.start_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
    
    def add_log_entry(self, log_entry):
        """添加日志条目到界面"""
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, log_entry)
        self.log_text.see(tk.END)  # 滚动到底部
        self.log_text.config(state=tk.DISABLED)
    
    def toggle_topmost(self):
        """切换窗口置顶状态"""
        self.root.attributes('-topmost', self.topmost_var.get())
        # 保存配置
        self.save_config()
    
    def set_opacity(self, opacity):
        """设置窗口透明度 (0.0-1.0)"""
        self.root.attributes('-alpha', opacity)
    
    def browse_browser_path(self):
        """浏览选择浏览器可执行文件路径"""
        file_path = filedialog.askopenfilename(
            title="选择浏览器可执行文件",
            filetypes=[("可执行文件", "*.exe"), ("所有文件", "*.*")]
        )
        if file_path:
            self.browser_var.set(file_path)
            # 保存配置
            self.save_config()
    
    def save_config(self):
        """保存配置到文件"""
        try:
            config = {
                "browser_path": self.browser_var.get(),
                "topmost": self.topmost_var.get(),
                "search_count": self.search_count_var.get()
            }
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            self.automation_instance.log("错误", f"保存配置失败: {e}")
    
    def load_config(self):
        """从文件加载配置"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    # 加载浏览器路径
                    if "browser_path" in config:
                        self.browser_var.set(config["browser_path"])
                    # 加载置顶选项
                    if "topmost" in config:
                        self.topmost_var.set(config["topmost"])
                        self.root.attributes('-topmost', config["topmost"])
                    # 加载搜索词搜索次数
                    if "search_count" in config:
                        self.search_count_var.set(config["search_count"])
        except Exception as e:
            self.automation_instance.log("错误", f"加载配置失败: {e}")
    
    def reset_config(self):
        """重置配置到默认值"""
        # 恢复默认值
        self.browser_var.set("（自动检测默认浏览器）")
        self.topmost_var.set(True)
        self.root.attributes('-topmost', True)
        self.search_count_var.set("20")
        # 保存默认配置
        self.save_config()
    
    def load_about_config(self):
        """加载关于页面配置"""
        try:
            if os.path.exists(self.about_config_file):
                with open(self.about_config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            self.automation_instance.log("错误", f"加载关于页面配置失败: {e}")
        # 返回默认配置
        return {
            "project": {
                "name": "Bing Rewards 自动化工具",
                "version": "1.0",
                "author": "Brian",
                "is_open_source": True,
            "is_free": True,
                "repository_url": "https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script"
            },
            "description": "微软必应奖励每日任务脚本，自动完成Bing Rewards搜索任务，帮助用户轻松积累微软积分。",
            "features": [],
            "important_notes": [],
            "disclaimer": "本工具仅用于学习和研究目的，请勿用于任何违反微软服务条款的行为。使用本工具产生的一切后果由使用者自行承担。"
        }
    
    def open_url(self, url):
        """打开指定的URL"""
        import webbrowser
        try:
            webbrowser.open(url)
        except Exception as e:
            self.automation_instance.log("错误", f"打开URL失败: {e}")
