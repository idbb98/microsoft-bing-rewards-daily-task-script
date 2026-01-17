// 后台脚本，处理通知和API请求等任务

// 工具函数
const utils = {
    // Fisher-Yates洗牌算法
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    
    // 安全JSON解析
    safeJsonParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch {
            return defaultValue;
        }
    }
};

// 封装带超时的fetch请求
const fetchWithTimeout = async (url, options = {}, timeout = 20000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
};

// 默认搜索词库
const defaultSearchWords = [
    "人工智能发展", "量子计算机", "5G技术应用", "区块链", "物联网",
    "自动驾驶技术", "机器学习", "云计算", "大数据分析", "虚拟现实",
    "增强现实", "边缘计算", "网络安全", "人工智能伦理", "深度学习",
    "神经网络", "机器人技术", "无人机技术", "智能家居", "数字孪生",
    "黑洞研究", "基因编辑", "火星探测", "气候变化", "量子纠缠",
    "暗物质探索", "纳米技术", "生物技术", "干细胞研究", "基因测序",
    "蛋白质折叠", "量子力学", "相对论", "宇宙起源", "粒子物理",
    "健康饮食", "运动健身", "心理健康", "营养搭配", "睡眠质量",
    "减肥方法", "养生之道", "中医养生", "瑜伽练习", "冥想技巧",
    "维生素补充", "健身器材", "家庭护理", "疾病预防", "免疫力提升",
    "旅游景点", "传统文化", "世界遗产", "民俗文化", "历史古迹",
    "美食文化", "民族风情", "古镇旅游", "自然风光", "文化遗产",
    "博物馆之旅", "艺术展览", "摄影技巧", "旅行攻略", "民宿体验",
    "在线教育", "学习方法", "技能提升", "编程学习", "外语学习",
    "考试技巧", "读书笔记", "知识管理", "思维导图", "终身学习",
    "职业技能", "证书考试", "学术研究", "论文写作", "图书馆资源",
    "数字货币", "股票投资", "基金理财", "房地产投资", "保险规划",
    "经济趋势", "货币政策", "国际贸易", "创业机会", "商业模式",
    "财务管理", "税收政策", "银行业务", "投资策略", "财富管理",
    "电影推荐", "音乐欣赏", "游戏攻略", "电视剧推荐", "综艺节目",
    "体育赛事", "明星资讯", "动漫推荐", "小说阅读", "短视频制作",
    "直播平台", "电竞比赛", "体育锻炼", "户外运动", "极限运动"
];

// 默认PC端热词源
const defaultPcSources = [
    {
        name: "百度热搜",
        url: "https://top.baidu.com/api/board?tab=realtime",
        parser: data => data.data?.cards?.[0]?.content?.map(item => item.word) || []
    },
    {
        name: "腾讯新闻热点",
        url: "https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=50",
        parser: data => data.idlist?.[0]?.newslist?.map(item => item.title) || []
    }
];

// 默认移动端热词源
const defaultMobileSources = [
    {
        name: "今日头条热榜",
        url: "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
        parser: data => data.data?.map(item => item.Title?.trim()).filter(Boolean) || []
    },
    {
        name: "微博实时热点",
        url: "https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot",
        parser: data => {
            if (data.data.cards && data.data.cards[0].card_group) {
                return data.data.cards[0].card_group
                    .filter(item => item.desc && item.desc.length > 0)
                    .map(item => item.desc)
                    .filter(Boolean);
            }
            return [];
        }
    }
];

// 从后台获取热词
async function fetchSearchKeywords(isMobile) {
    try {
        // 从配置中获取热词API源和搜索词库
        const settings = await chrome.storage.local.get(['pcSources', 'mobileSources', 'searchWords']);
        
        const sources = isMobile ? (settings.mobileSources || defaultMobileSources) : (settings.pcSources || defaultPcSources);
        const searchWords = settings.searchWords || defaultSearchWords;
        
        // 将parser字符串转换为函数
        const sourcesWithParsers = sources.map(source => ({
            ...source,
            parser: typeof source.parser === 'string' ? new Function('data', `return ${source.parser}`) : source.parser
        }));

        const allWords = new Set();

        // 串行请求所有API（避免并发过多导致问题）
        for (const source of sourcesWithParsers) {
            try {
                console.log(`正在从 ${source.name} 获取热词...`);
                
                const response = await fetchWithTimeout(source.url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    cache: 'no-cache',
                    credentials: 'omit'
                }, 15000);

                if (!response.ok) {
                    console.warn(`从 ${source.name} 获取热词失败: HTTP ${response.status}`);
                    continue;
                }

                const data = await response.json();
                const words = source.parser(data).filter(word => 
                    word && 
                    word.length >= 2 && 
                    word.length <= 30 &&
                    !/^[0-9]+$/.test(word) &&
                    /[\u4e00-\u9fa5]/.test(word)
                );
                
                console.log(`从 ${source.name} 获取到 ${words.length} 个热词`);
                
                words.forEach(word => {
                    if (word && !allWords.has(word)) {
                        allWords.add(word);
                    }
                });
            } catch (error) {
                console.error(`获取 ${source.name} 热词失败:`, error.message);
                // 继续尝试下一个API源
            }
        }

        const allWordsArray = Array.from(allWords);
        console.log(`总共获取到 ${allWordsArray.length} 个不重复的热词`);

        const maxSearches = isMobile ? 36 : 50;
        const totalNeeded = Math.max(maxSearches, 50);
        
        // 如果从API获取的词不够，补充本地词库
        if (allWordsArray.length < totalNeeded) {
            console.log(`API获取的热词不足(${allWordsArray.length}/${totalNeeded})，补充本地词库`);
            const localWords = utils.shuffleArray(searchWords);
            for (let i = 0; i < localWords.length; i++) {
                if (allWordsArray.length >= totalNeeded) break;
                if (!allWords.has(localWords[i])) {
                    allWordsArray.push(localWords[i]);
                }
            }
        }
        
        // 确保最终热词数量足够
        if (allWordsArray.length < totalNeeded) {
            console.warn(`警告：热词总数(${allWordsArray.length})仍少于所需数量(${totalNeeded})`);
            while (allWordsArray.length < totalNeeded) {
                allWordsArray.push(...utils.shuffleArray([...allWordsArray]).slice(0, totalNeeded - allWordsArray.length));
            }
        }

        // 随机打乱合并后的词库
        return utils.shuffleArray(allWordsArray);
    } catch (error) {
        console.error('获取热词时发生严重错误:', error);
        // 返回本地词库作为最后的保底
        const settings = await chrome.storage.local.get(['searchWords']);
        const searchWords = settings.searchWords || defaultSearchWords;
        return utils.shuffleArray(searchWords);
    }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.type === 'showNotification') {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/favicon.png',
                title: message.title,
                message: message.message
            }).then(notificationId => {
                sendResponse({ success: true, notificationId });
            }).catch(error => {
                console.error('显示通知失败:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true;
        } else if (message.type === 'fetchSearchKeywords') {
            // 处理热词请求
            fetchSearchKeywords(message.isMobile)
                .then(words => {
                    sendResponse({ success: true, words });
                })
                .catch(error => {
                    console.error('获取热词失败:', error);
                    // 返回本地词库作为备选
                    chrome.storage.local.get(['searchWords'], (settings) => {
                        const searchWords = settings.searchWords || defaultSearchWords;
                        sendResponse({ 
                            success: false, 
                            words: utils.shuffleArray(searchWords),
                            error: error.message 
                        });
                    });
                });
            // 保持消息通道打开，直到sendResponse被调用
            return true;
        }
        // 默认返回
        sendResponse({ success: false, error: 'Unknown message type' });
        return true;
    } catch (error) {
        console.error('处理消息时发生错误:', error);
        sendResponse({ success: false, error: error.message });
        return true;
    }
});

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('Bing Rewards 扩展已安装');
    
    // 初始化默认配置
    chrome.storage.local.get(['pcSources', 'mobileSources', 'searchWords'], (result) => {
        if (!result.pcSources) {
            chrome.storage.local.set({ pcSources: defaultPcSources });
        }
        if (!result.mobileSources) {
            chrome.storage.local.set({ mobileSources: defaultMobileSources });
        }
        if (!result.searchWords) {
            chrome.storage.local.set({ searchWords: defaultSearchWords });
        }
    });
});

// 监听更新事件
chrome.runtime.onUpdateAvailable.addListener(() => {
    console.log('Bing Rewards 扩展有更新可用');
});

// Service Worker 保活机制（定期ping）
setInterval(() => {
    // 简单的保活操作
    chrome.storage.local.get(['keepalive'], () => {});
}, 25000); // 每25秒执行一次，避免Service Worker被终止
