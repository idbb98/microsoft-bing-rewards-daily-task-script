import logging
from datetime import datetime

class LogManager:
    def __init__(self, ui_manager=None):
        self.ui_manager = ui_manager
        self.setup_logging()
    
    def setup_logging(self):
        """配置日志系统"""
        # 配置标准logging模块
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('bing_rewards.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
    
    def log(self, level, message):
        """添加日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}\n"
        
        # 更新UI日志（如果UI管理器可用）
        if self.ui_manager:
            self.ui_manager.add_log_entry(log_entry)
        
        # 同时记录到标准日志
        if level == "错误":
            logging.error(message)
        elif level == "警告":
            logging.warning(message)
        else:
            logging.info(message)
    
    def set_ui_manager(self, ui_manager):
        """设置UI管理器"""
        self.ui_manager = ui_manager
