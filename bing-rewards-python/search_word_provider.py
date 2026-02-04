import requests
import json
import random
from datetime import datetime, timedelta


class SearchWordProvider:
    """搜索词获取器
    
    该类负责从多个来源获取搜索词，包括：
    1. 从API获取热词（今日头条热榜、百度热搜、腾讯新闻热点）
    2. 使用本地搜索词库作为兜底
    3. 实现热词缓存机制，避免频繁API调用
    
    示例用法：
        provider = SearchWordProvider()
        search_terms = provider.generate_search_terms(10)
    """
    
    def __init__(self, logger=None):
        """初始化搜索词获取器
        
        Args:
            logger: 日志记录器，用于记录运行信息和错误
        """
        # 热词缓存相关
        self.hot_words_cache = []
        self.cache_timestamp = None
        self.cache_expiry = timedelta(hours=1)
        
        # 日志记录器
        self.logger = logger
    
    def log(self, level, message):
        """记录日志
        
        Args:
            level: 日志级别
            message: 日志消息
        """
        if self.logger:
            self.logger.log(level, message)
    
    def get_hot_words_from_api(self):
        """从API获取热词
        
        Returns:
            list: 热词列表
        """
        try:
            self.log("信息", "开始从API获取搜索词...")
            
            # 定义热词API源
            sources = [
                {
                    "name": "今日头条热榜",
                    "url": "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
                    "parser": self._parse_toutiao_hot_board
                },
                {
                    "name": "百度热搜",
                    "url": "https://top.baidu.com/api/board?tab=realtime",
                    "parser": self._parse_baidu_hot_search
                },
                {
                    "name": "腾讯新闻热点",
                    "url": "https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=50",
                    "parser": self._parse_tencent_news_hot
                }
            ]
            
            all_words = set()
            
            # 请求所有API
            for source in sources:
                try:
                    response = requests.get(source["url"], timeout=10)
                    if response.status_code == 200:
                        content = response.text
                        words = source["parser"](content)
                        self.log("信息", f"从 {source['name']} 获取到 {len(words)} 个热词")
                        all_words.update(words)
                    else:
                        self.log("错误", f"{source['name']} 请求失败: HTTP {response.status_code}")
                except Exception as ex:
                    self.log("错误", f"{source['name']} 请求出错: {str(ex)}")
            
            hot_words = list(all_words)
            self.log("信息", f"总共获取到 {len(hot_words)} 个不重复的热词")
            
            # 更新缓存
            if hot_words:
                self.hot_words_cache = hot_words
                self.cache_timestamp = datetime.now()
                self.log("信息", "热词缓存已更新")
            
            return hot_words
        except Exception as ex:
            self.log("错误", f"从API获取搜索词失败: {str(ex)}")
            return []
    
    def _parse_toutiao_hot_board(self, content):
        """解析今日头条热榜
        
        Args:
            content: API返回的内容
            
        Returns:
            list: 解析出的热词列表
        """
        try:
            data = json.loads(content)
            if "data" in data:
                data_list = data["data"]
                words = []
                for item in data_list:
                    if "Title" in item:
                        title = item["Title"].strip()
                        if self._validate_search_word(title):
                            words.append(title)
                return words
        except Exception as ex:
            self.log("错误", f"解析今日头条热榜失败: {str(ex)}")
        return []
    
    def _parse_baidu_hot_search(self, content):
        """解析百度热搜
        
        Args:
            content: API返回的内容
            
        Returns:
            list: 解析出的热词列表
        """
        try:
            data = json.loads(content)
            if "data" in data:
                data_obj = data["data"]
                if "cards" in data_obj:
                    cards = data_obj["cards"]
                    if cards:
                        card = cards[0]
                        if "content" in card:
                            content_list = card["content"]
                            words = []
                            for item in content_list:
                                if "word" in item:
                                    word = item["word"].strip()
                                    if self._validate_search_word(word):
                                        words.append(word)
                            return words
        except Exception as ex:
            self.log("错误", f"解析百度热搜失败: {str(ex)}")
        return []
    
    def _parse_tencent_news_hot(self, content):
        """解析腾讯新闻热点
        
        Args:
            content: API返回的内容
            
        Returns:
            list: 解析出的热词列表
        """
        try:
            data = json.loads(content)
            if "idlist" in data:
                idlist = data["idlist"]
                if idlist:
                    first_item = idlist[0]
                    if "newslist" in first_item:
                        newslist = first_item["newslist"]
                        words = []
                        for item in newslist:
                            if "title" in item:
                                title = item["title"].strip()
                                if self._validate_search_word(title):
                                    words.append(title)
                        return words
        except Exception as ex:
            self.log("错误", f"解析腾讯新闻热点失败: {str(ex)}")
        return []
    
    def _validate_search_word(self, word):
        """验证搜索词
        
        Args:
            word: 搜索词
            
        Returns:
            bool: 是否为有效的搜索词
        """
        return word and 2 <= len(word) <= 30 and not word.isdigit()
    
    def _get_local_search_terms(self, count=50):
        """获取本地搜索词
        
        Args:
            count: 返回的搜索词数量
            
        Returns:
            list: 本地搜索词列表
        """
        self.log("信息", "使用本地搜索词库...")
        
        search_words = [
            # 科技类
            "人工智能发展", "量子计算机", "5G技术应用", "区块链", "物联网",
            "自动驾驶技术", "机器学习", "云计算", "大数据分析", "虚拟现实",
            "增强现实", "边缘计算", "网络安全", "人工智能伦理", "深度学习",
            "神经网络", "机器人技术", "无人机技术", "智能家居", "数字孪生",
            
            # 科学研究
            "黑洞研究", "基因编辑", "火星探测", "气候变化", "量子纠缠",
            "暗物质探索", "纳米技术", "生物技术", "干细胞研究", "基因测序",
            "蛋白质折叠", "量子力学", "相对论", "宇宙起源", "粒子物理",
            
            # 生活健康
            "健康饮食", "运动健身", "心理健康", "营养搭配", "睡眠质量",
            "减肥方法", "养生之道", "中医养生", "瑜伽练习", "冥想技巧",
            "维生素补充", "健身器材", "家庭护理", "疾病预防", "免疫力提升",
            
            # 旅游文化
            "旅游景点", "传统文化", "世界遗产", "民俗文化", "历史古迹",
            "美食文化", "民族风情", "古镇旅游", "自然风光", "文化遗产",
            "博物馆之旅", "艺术展览", "摄影技巧", "旅行攻略", "民宿体验",
            
            # 教育学习
            "在线教育", "学习方法", "技能提升", "编程学习", "外语学习",
            "考试技巧", "读书笔记", "知识管理", "思维导图", "终身学习",
            "职业技能", "证书考试", "学术研究", "论文写作", "图书馆资源",
            
            # 经济金融
            "数字货币", "股票投资", "基金理财", "房地产投资", "保险规划",
            "经济趋势", "货币政策", "国际贸易", "创业机会", "商业模式",
            "财务管理", "税收政策", "银行业务", "投资策略", "财富管理",
            
            # 娱乐休闲
            "电影推荐", "音乐欣赏", "游戏攻略", "电视剧推荐", "综艺节目",
            "体育赛事", "明星资讯", "动漫推荐", "小说阅读", "短视频制作",
            "直播平台", "电竞比赛", "体育锻炼", "户外运动", "极限运动"
        ]
        
        # 打乱顺序
        random.shuffle(search_words)
        return search_words[:count]
    
    def generate_search_terms(self, count=10):
        """生成搜索词
        
        Args:
            count: 需要生成的搜索词数量
            
        Returns:
            list: 搜索词列表
        """
        # 检查缓存是否有效
        if self.hot_words_cache and self.cache_timestamp:
            time_since_cache = datetime.now() - self.cache_timestamp
            if time_since_cache < self.cache_expiry:
                self.log("信息", "使用缓存的热词")
                hot_words = self.hot_words_cache
            else:
                self.log("信息", "缓存已过期，重新获取热词")
                hot_words = self.get_hot_words_from_api()
        else:
            self.log("信息", "缓存为空，获取热词")
            hot_words = self.get_hot_words_from_api()
        
        # 如果API获取失败，使用本地词库
        if not hot_words:
            self.log("信息", "API获取热词失败，使用本地词库")
            hot_words = self._get_local_search_terms(count)
        
        # 确保获取足够的搜索词
        if len(hot_words) < count:
            self.log("信息", "热词数量不足，补充本地词库")
            local_words = self._get_local_search_terms(count)
            needed = count - len(hot_words)
            
            for word in local_words:
                if word not in hot_words:
                    hot_words.append(word)
                    needed -= 1
                    if needed <= 0:
                        break
        
        # 打乱顺序并返回指定数量
        random.shuffle(hot_words)
        self.log("信息", f"最终获取到 {len(hot_words[:count])} 个搜索词")
        return hot_words[:count]
    
    def clear_cache(self):
        """清除热词缓存
        
        当需要强制重新获取热词时使用此方法
        """
        self.hot_words_cache = []
        self.cache_timestamp = None
        self.log("信息", "热词缓存已清除")
    
    def get_cache_status(self):
        """获取缓存状态
        
        Returns:
            dict: 缓存状态信息
        """
        if self.cache_timestamp:
            time_since_cache = datetime.now() - self.cache_timestamp
            is_valid = time_since_cache < self.cache_expiry
            return {
                "cached_at": self.cache_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "time_since_cache": f"{time_since_cache.total_seconds():.1f}秒",
                "is_valid": is_valid,
                "cache_size": len(self.hot_words_cache)
            }
        else:
            return {
                "cached_at": None,
                "time_since_cache": None,
                "is_valid": False,
                "cache_size": 0
            }
