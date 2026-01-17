'use strict';

// 配置参数 - 初始默认值
let CONFIG = {
    // PC端最大搜索次数
    maxWebSearches: 50,

    // 移动端最大搜索次数
    maxMobileSearches: 36,

    // 是否随机加词，如：人工智能发展  -->  人工1智能发z展 
    randomAddSearchWords: false,
    // 随机加词因子，控制加词的概率（0-1之间的小数），默认为0.3即30%概率添加字符
    randomAddSearchWordsFactor: 0.3,

    // 是否随机截词，如：人工1智能发z展  --> 人工1智
    randomCutSearchWords: false,
    // 随机截词因子，控制截取的概率（0-1之间的小数），默认为0.2即20%概率截取字符
    randomCutSearchWordsFactor: 0.2,

    // 暂停间隔：每执行多少次搜索后暂停一次
    pauseInterval: 5,

    // 暂停时间（毫秒）：每次暂停的持续时间
    pauseTime: 15 * 60 * 1000,

    // 搜索延迟相关配置
    decimalDelay: 3000,   // 小数部分延迟（随机延迟的基础值）
    minDelay: 8000,       // 最小延迟（毫秒）：两次搜索之间的最短间隔时间
    maxDelay: 15000,      // 最大延迟（毫秒）：两次搜索之间的最长间隔时间

    // 网络请求超时时间（毫秒）：获取热门搜索词的最大等待时间
    requestTimeout: 20000,

    // 启动参数标记
    startParam: 'bingTask',
};

// 从存储加载配置
async function loadConfig() {
    try {
        const settings = await storage.get([
            'randomAddSearchWords',
            'randomAddSearchWordsFactor',
            'randomCutSearchWords',
            'randomCutSearchWordsFactor',
            'maxWebSearches',
            'maxMobileSearches',
            'minDelay',
            'maxDelay',
            'pauseInterval',
            'pauseTime',
            'requestTimeout',
            'startParam'
        ]);
        
        // 更新CONFIG对象
        if (settings.randomAddSearchWords !== undefined) {
            CONFIG.randomAddSearchWords = settings.randomAddSearchWords;
        }
        if (settings.randomAddSearchWordsFactor !== undefined) {
            CONFIG.randomAddSearchWordsFactor = settings.randomAddSearchWordsFactor;
        }
        if (settings.randomCutSearchWords !== undefined) {
            CONFIG.randomCutSearchWords = settings.randomCutSearchWords;
        }
        if (settings.randomCutSearchWordsFactor !== undefined) {
            CONFIG.randomCutSearchWordsFactor = settings.randomCutSearchWordsFactor;
        }
        if (settings.maxWebSearches !== undefined) {
            CONFIG.maxWebSearches = settings.maxWebSearches;
        }
        if (settings.maxMobileSearches !== undefined) {
            CONFIG.maxMobileSearches = settings.maxMobileSearches;
        }
        if (settings.minDelay !== undefined) {
            CONFIG.minDelay = settings.minDelay * 1000; // 转换为毫秒
        }
        if (settings.maxDelay !== undefined) {
            CONFIG.maxDelay = settings.maxDelay * 1000; // 转换为毫秒
        }
        if (settings.pauseInterval !== undefined) {
            CONFIG.pauseInterval = settings.pauseInterval;
        }
        if (settings.pauseTime !== undefined) {
            CONFIG.pauseTime = settings.pauseTime * 60 * 1000; // 转换为毫秒
        }
        if (settings.requestTimeout !== undefined) {
            CONFIG.requestTimeout = settings.requestTimeout * 1000; // 转换为毫秒
        }
        if (settings.startParam !== undefined) {
            CONFIG.startParam = settings.startParam;
        }
        
        console.log('配置已加载:', CONFIG);
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

// 监听配置变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        // 重新加载配置
        loadConfig().then(() => {
            console.log('配置已更新，新配置:', CONFIG);
            
            // 如果任务正在运行，更新状态面板以显示新配置的效果
            if (state.isRunning && state.statusPanel) {
                updateStatusPanel();
            }
        });
    }
});

// 状态管理
const state = {
    searchWords: [],
    statusPanel: null,
    timers: new Set(),
    isRunning: false,
    searchHistory: [],
    countdownStartTime: 0,
    countdownDuration: 0,
    lastActiveTime: Date.now()
};

// 工具函数
const utils = {
    // 清理所有定时器
    clearAllTimers() {
        state.timers.forEach(timer => {
            clearTimeout(timer);
            clearInterval(timer);
        });
        state.timers.clear();
    },

    // 添加定时器到管理集合
    addTimer(timer) {
        state.timers.add(timer);
        return timer;
    },

    // 随机对搜索词加词
    addRandomCharsToSearchWord(word) {
        if (!CONFIG.randomAddSearchWords || !word || Math.random() > CONFIG.randomAddSearchWordsFactor) return word;

        const maxAdditions = Math.min(3, Math.floor(word.length / 3));
        let result = word;

        for (let i = 0; i < Math.floor(Math.random() * (maxAdditions + 1)); i++) {
            const insertPos = Math.floor(Math.random() * (result.length - 1)) + 1;
            const randomChar = String.fromCharCode(
                Math.random() > 0.5 ? 
                Math.floor(Math.random() * 10) + 48 : // 数字 0-9
                Math.floor(Math.random() * 26) + 97   // 小写字母 a-z
            );
            
            result = result.slice(0, insertPos) + randomChar + result.slice(insertPos);
        }

        return result;
    },

    // 随机对搜索词进行截取
    cutSearchWordRandomly(word) {
        if (!CONFIG.randomCutSearchWords || !word || Math.random() > CONFIG.randomCutSearchWordsFactor) return word;

        const minLength = Math.max(2, Math.ceil(word.length / 2));
        const maxLength = word.length;
        
        if (minLength >= maxLength) return word;

        const cutLength = Math.floor(Math.random() * (maxLength - minLength)) + minLength;

        return word.substring(0, cutLength);
    },

    // 依次应用加词和截取
    processSearchWord(word) {
        let processedWord = this.addRandomCharsToSearchWord(word);
        processedWord = this.cutSearchWordRandomly(processedWord);
        return processedWord;
    },

    // 生成随机延迟
    getRandomDelay() {
        return Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay;
    },

    // 安全JSON解析
    safeJsonParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch {
            return defaultValue;
        }
    },

    // Fisher-Yates洗牌算法
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    // 生成随机ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // 获取精确的剩余时间
    getAccurateRemainingTime() {
        if (!state.countdownStartTime || !state.countdownDuration) return 0;

        const elapsed = Date.now() - state.countdownStartTime;
        const remaining = Math.max(0, state.countdownDuration - elapsed);
        return remaining / 1000; // 转换为秒
    },

    // 检查页面是否可见
    isPageVisible() {
        return !document.hidden;
    },

    // 页面可见性变化处理
    handleVisibilityChange(callback) {
        document.addEventListener('visibilitychange', () => {
            state.lastActiveTime = Date.now();
            if (!document.hidden) {
                callback();
            }
        });
    }
};

// 搜索词库
const SEARCH_WORDS = [
    // 科技类
    "人工智能发展", "量子计算机", "5G技术应用", "区块链", "物联网",
    "自动驾驶技术", "机器学习", "云计算", "大数据分析", "虚拟现实",
    "增强现实", "边缘计算", "网络安全", "人工智能伦理", "深度学习",
    "神经网络", "机器人技术", "无人机技术", "智能家居", "数字孪生",
    
    // 科学研究
    "黑洞研究", "基因编辑", "火星探测", "气候变化", "量子纠缠",
    "暗物质探索", "纳米技术", "生物技术", "干细胞研究", "基因测序",
    "蛋白质折叠", "量子力学", "相对论", "宇宙起源", "粒子物理",
    
    // 生活健康
    "健康饮食", "运动健身", "心理健康", "营养搭配", "睡眠质量",
    "减肥方法", "养生之道", "中医养生", "瑜伽练习", "冥想技巧",
    "维生素补充", "健身器材", "家庭护理", "疾病预防", "免疫力提升",
    
    // 旅游文化
    "旅游景点", "传统文化", "世界遗产", "民俗文化", "历史古迹",
    "美食文化", "民族风情", "古镇旅游", "自然风光", "文化遗产",
    "博物馆之旅", "艺术展览", "摄影技巧", "旅行攻略", "民宿体验",
    
    // 教育学习
    "在线教育", "学习方法", "技能提升", "编程学习", "外语学习",
    "考试技巧", "读书笔记", "知识管理", "思维导图", "终身学习",
    "职业技能", "证书考试", "学术研究", "论文写作", "图书馆资源",
    
    // 经济金融
    "数字货币", "股票投资", "基金理财", "房地产投资", "保险规划",
    "经济趋势", "货币政策", "国际贸易", "创业机会", "商业模式",
    "财务管理", "税收政策", "银行业务", "投资策略", "财富管理",
    
    // 娱乐休闲
    "电影推荐", "音乐欣赏", "游戏攻略", "电视剧推荐", "综艺节目",
    "体育赛事", "明星资讯", "动漫推荐", "小说阅读", "短视频制作",
    "直播平台", "电竞比赛", "体育锻炼", "户外运动", "极限运动"
];

// 搜索参数配置
const SEARCH_CONFIG = {
    domains: ['https://www.bing.com', 'https://cn.bing.com'],
    pcParams: ['QBLH', 'QBRE', 'QBRP', 'QBRL', 'QBSB', 'QBVA'],
    mobileParams: ['QBNT', 'QBUS', 'QBIN', 'QBEN'],
    markets: ['zh-CN', 'en-US', 'en-GB', 'ja-JP']
};

// 存储API封装
const storage = {
    async get(keys, defaultValue = undefined) {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(keys, (result) => {
                    if (Array.isArray(keys)) {
                        // 处理数组请求
                        resolve(result);
                    } else {
                        // 处理单个key请求
                        resolve(result[keys] !== undefined ? result[keys] : defaultValue);
                    }
                });
            } catch (error) {
                console.error('storage.get error:', error);
                if (Array.isArray(keys)) {
                    resolve({});
                } else {
                    resolve(defaultValue);
                }
            }
        });
    },
    
    async set(key, value) {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.set({ [key]: value }, resolve);
            } catch (error) {
                console.error('storage.set error:', error);
                resolve();
            }
        });
    }
};

/**
 * 创建状态面板
 */
function createStatusPanel() {
    // 首先检查DOM中是否已经存在面板，防止重复创建
    let existingPanel = document.getElementById('bing-rewards-panel');
    if (existingPanel) {
        // 如果存在，更新状态引用并显示它
        state.statusPanel = existingPanel;
        existingPanel.style.display = 'block';
        updateStatusPanel();
        return existingPanel;
    }
    
    // 然后检查状态变量
    if (state.statusPanel) {
        // 如果状态变量存在但DOM中没有，可能是状态不同步，需要重新创建
        state.statusPanel = null;
    }

    const panel = document.createElement('div');
    panel.id = 'bing-rewards-panel';
    panel.innerHTML = `
        <div id="panel-close-btn" style="position:absolute;top:8px;right:10px;cursor:pointer;font-size:18px;color:#666;">×</div>
        <h3 style="margin:0 0 12px 0;color:#0067b8;font-size:16px;">📈 Bing Rewards</h3>
        <div id="panel-content"></div>
        <div style="margin-top:8px;font-size:11px;color:#999;text-align:center;">
            <span id="page-status">🟢 页面活跃</span>
        </div>
    `;

    Object.assign(panel.style, {
        position: 'fixed',
        bottom: '50px',
        right: '20px',
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid #e1e5e9',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: '10000',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        minWidth: '280px',
        maxWidth: '400px',
        height: 'auto',
        minHeight: 'auto',
        maxHeight: '80vh',
        overflowY: 'auto',
        backdropFilter: 'blur(10px)'
    });

    document.body.appendChild(panel);
    state.statusPanel = panel;

    // 为关闭按钮添加事件监听器
    const closeBtn = document.getElementById('panel-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // 添加悬停效果
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.color = '#000';
            closeBtn.style.transform = 'scale(1.2)';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.color = '#666';
            closeBtn.style.transform = 'scale(1)';
        });
    }

    // 监听页面可见性变化
    utils.handleVisibilityChange(updateStatusPanel);

    updateStatusPanel();
    return panel;
}

/**
 * 更新状态面板
 */
function updateStatusPanel(data = {}) {
    if (!state.statusPanel) return;

    getTaskStatus().then(taskStatus => {
        const content = document.getElementById('panel-content');
        const pageStatus = document.getElementById('page-status');
        const { currentWord = '', pauseTimeLeft = null } = data;

        // 更新页面状态指示器
        if (utils.isPageVisible()) {
            pageStatus.textContent = '🟢 页面活跃';
            pageStatus.style.color = '#107c10';
        } else {
            pageStatus.textContent = '⚫ 后台运行';
            pageStatus.style.color = '#666';
        }

        const progress = taskStatus.overallProgress;
        const deviceType = taskStatus.currentType === 'web' ? '💻 PC端' : '📱 移动端';

        // 计算剩余时间
        const remainingTime = utils.getAccurateRemainingTime();

        content.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="color:#666;">${deviceType}</span>
                <span style="color:#333;font-weight:500;">${taskStatus.currentCount}/${taskStatus.maxCount}</span>
            </div>
            <div style="margin:10px 0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;color:#666;">
                    <span>总体进度</span>
                    <span>${progress}%</span>
                </div>
                <div style="height:8px;background:#f0f0f0;border-radius:4px;">
                    <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,#0067b8,#00bcf2);border-radius:4px;transition:width 0.5s;"></div>
                </div>
            </div>
            ${taskStatus.isCompleted ? '<div style="color:#107c10;margin-top:8px;padding:6px;background:#f0f9f0;border-radius:4px;text-align:center;">✅ 今日任务已完成</div>' : ''}
            ${pauseTimeLeft !== null ? `
                <div style="margin-top:10px;padding:8px;background:#fff8e6;border-radius:6px;border-left:4px solid #ffb900;">
                    <div style="font-size:12px;color:#8a6900;">⏸️ 任务暂停中</div>
                    <div style="font-size:14px;color:#8a6900;font-weight:600;">剩余 ${Math.floor(pauseTimeLeft/60)}分${Math.round(pauseTimeLeft%60)}秒</div>
                </div>
            ` : ''}
            ${!pauseTimeLeft && currentWord && remainingTime > 0 ? `
                <div style="margin-top:10px;padding:8px;background:#f0f7ff;border-radius:6px;">
                    <div style="font-size:12px;color:#005a9e;margin-bottom:4px;">🔍 下个搜索词（${remainingTime.toFixed(1)}秒后）:</div>
                    <div style="font-size:13px;word-break:break-all;color:#0067b8;">${currentWord}</div>
                </div>
            ` : ''}
            ${state.isRunning ? '<div style="margin-top:8px;text-align:center;color:#666;font-size:11px;">🔄 任务执行中...</div>' : ''}
        `;
    });
}

/**
 * 获取热门搜索词（通过后台脚本，避免跨域问题）
 */
async function fetchSearchKeywords() {
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const cacheKey = `cache_${isMobile ? 'mobile' : 'pc'}`;
    const cached = await storage.get(cacheKey);

    if (cached && Date.now() - cached.time < 3600000) {
        return cached.words;
    }

    try {
        console.log('向后台请求热词...');
        // 向后台脚本发送消息，获取热词
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { type: 'fetchSearchKeywords', isMobile },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                }
            );
        });

        if (response && response.success) {
            console.log(`从后台成功获取到 ${response.words.length} 个热词`);
            // 保存到缓存
            await storage.set(cacheKey, { words: response.words, time: Date.now() });
            return response.words;
        } else {
            console.warn('后台获取热词失败，使用备选词库:', response?.error);
            const fallbackWords = response?.words || utils.shuffleArray(SEARCH_WORDS);
            // 保存到缓存
            await storage.set(cacheKey, { words: fallbackWords, time: Date.now() });
            return fallbackWords;
        }
    } catch (error) {
        console.error('获取热词时发生错误:', error.message);
        const fallbackWords = utils.shuffleArray(SEARCH_WORDS);
        // 保存到缓存
        await storage.set(cacheKey, { words: fallbackWords, time: Date.now() });
        return fallbackWords;
    }
}

/**
 * 构建搜索URL
 */
function buildSearchUrl(searchWord) {
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const params = isMobile ? SEARCH_CONFIG.mobileParams : SEARCH_CONFIG.pcParams;
    const domain = SEARCH_CONFIG.domains[Math.floor(Math.random() * SEARCH_CONFIG.domains.length)];
    const form = params[Math.floor(Math.random() * params.length)];
    const mkt = SEARCH_CONFIG.markets[Math.floor(Math.random() * SEARCH_CONFIG.markets.length)];

    const urlParams = new URLSearchParams({
        q: searchWord,
        form,
        cvid: utils.generateId(),
        pc: isMobile ? 'U03' : 'U01',
        mkt
    });

    return `${domain}/search?${urlParams.toString()}&${CONFIG.startParam}=1`;
}

/**
 * 获取任务状态
 */
async function getTaskStatus() {
    const webCount = await storage.get('webSearchCount', 0);
    const mobileCount = await storage.get('mobileSearchCount', 0);
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);

    const currentType = isMobile ? 'mobile' : 'web';
    const maxCount = isMobile ? CONFIG.maxMobileSearches : CONFIG.maxWebSearches;
    const currentCount = isMobile ? mobileCount : webCount;
    const totalProgress = ((webCount + mobileCount) / (CONFIG.maxWebSearches + CONFIG.maxMobileSearches)) * 100;

    return {
        currentType,
        currentCount,
        maxCount,
        isCompleted: currentCount >= maxCount,
        overallProgress: Math.round(totalProgress),
        overallProgressRaw: totalProgress
    };
}

/**
 * 执行搜索任务
 */
async function executeSearch() {
    if (state.isRunning) return;
    state.isRunning = true;

    createStatusPanel();
    const taskStatus = await getTaskStatus();

    if (taskStatus.isCompleted) {
        updateStatusPanel();
        chrome.runtime.sendMessage({ type: 'showNotification', title: '任务完成', message: 'Bing Rewards 任务已完成' });
        state.isRunning = false;
        return;
    }

    // 更新标题
    const title = document.querySelector('title');
    if (title) title.textContent = `[${taskStatus.currentCount}/${taskStatus.maxCount}] Bing任务...`;

    // 滚动页面
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

    // 获取搜索词
    if (state.searchWords.length === 0) {
        try {
            console.log('开始获取热词...');
            state.searchWords = await fetchSearchKeywords();
            console.log(`成功获取到 ${state.searchWords.length} 个热词`);
            
            // 确保热词数量足够
            if (state.searchWords.length < 10) {
                console.warn('热词数量不足，使用本地词库');
                state.searchWords = utils.shuffleArray(SEARCH_WORDS);
            }
        } catch (error) {
            console.error('获取热词时发生严重错误:', error.message);
            console.log('使用本地词库作为备选');
            state.searchWords = utils.shuffleArray(SEARCH_WORDS);
        }
    }

    const searchIndex = taskStatus.currentCount % state.searchWords.length;
    const searchWord = state.searchWords[searchIndex];

    // 对搜索词进行处理
    const processedSearchWord = utils.processSearchWord(searchWord);
    
    const delay = utils.getRandomDelay();

    // 设置精确倒计时
    state.countdownStartTime = Date.now();
    state.countdownDuration = delay;

    // 更新面板
    updateStatusPanel({ currentWord: processedSearchWord });

    // 使用精确计时器，不受页面可见性影响
    const searchTimer = utils.addTimer(setTimeout(async () => {
        utils.clearAllTimers();
        await performSearch(processedSearchWord, taskStatus);
    }, delay));

    // 添加一个定期更新面板的定时器（每秒更新一次）
    const updateTimer = utils.addTimer(setInterval(() => {
        updateStatusPanel({ currentWord: processedSearchWord });
    }, 1000));
}

/**
 * 执行搜索
 */
async function performSearch(searchWord, taskStatus) {
    const nextCount = taskStatus.currentCount + 1;
    const counterKey = taskStatus.currentType === 'web' ? 'webSearchCount' : 'mobileSearchCount';

    await storage.set(counterKey, nextCount);
    console.log(`搜索: ${searchWord} (${nextCount}/${taskStatus.maxCount})`);

    // 重置倒计时状态
    state.countdownStartTime = 0;
    state.countdownDuration = 0;

    // 暂停检查
    if (nextCount % CONFIG.pauseInterval === 0) {
        let pauseTimeLeft = CONFIG.pauseTime / 1000;
        updateStatusPanel({ pauseTimeLeft });

        // 使用精确的暂停计时
        const pauseStartTime = Date.now();
        const pauseTimer = utils.addTimer(setInterval(() => {
            const elapsed = Date.now() - pauseStartTime;
            pauseTimeLeft = Math.max(0, (CONFIG.pauseTime - elapsed) / 1000);
            updateStatusPanel({ pauseTimeLeft });

            if (pauseTimeLeft <= 0) {
                utils.clearAllTimers();
                window.location.href = buildSearchUrl(searchWord);
            }
        }, 1000));
    } else {
        window.location.href = buildSearchUrl(searchWord);
    }
}

/**
 * 检查并启动任务
 */
async function checkAndStartTask() {
    // 加载配置
    await loadConfig();
    
    if (new URLSearchParams(window.location.search).has(CONFIG.startParam)) {
        setTimeout(executeSearch, 2000);
    } else {
        // createStatusPanel();
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.type === 'startTask') {
            // 重置计数和缓存
            Promise.all([
                storage.set('webSearchCount', 0),
                storage.set('mobileSearchCount', 0),
                storage.set('cache_pc', undefined),
                storage.set('cache_mobile', undefined)
            ]).then(() => {
                window.location.href = 'https://www.bing.com/?' + CONFIG.startParam + '=1';
                sendResponse({ success: true });
            }).catch(error => {
                console.error('重置任务失败:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // 表示会异步调用sendResponse
        } else if (message.type === 'stopTask') {
            getTaskStatus().then(taskStatus => {
                const counterKey = taskStatus.currentType === 'web' ? 'webSearchCount' : 'mobileSearchCount';
                storage.set(counterKey, taskStatus.maxCount).then(() => {
                    utils.clearAllTimers();
                    state.isRunning = false;
                    state.countdownStartTime = 0;
                    state.countdownDuration = 0;
                    updateStatusPanel();
                    sendResponse({ success: true });
                }).catch(error => {
                    console.error('停止任务失败:', error);
                    sendResponse({ success: false, error: error.message });
                });
            }).catch(error => {
                console.error('获取任务状态失败:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // 表示会异步调用sendResponse
        } else if (message.type === 'togglePanel') {
            if (!state.statusPanel) {
                createStatusPanel();
            } else {
                const panel = state.statusPanel;
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
            sendResponse({ success: true });
            return true;
        } else if (message.type === 'configUpdated') {
            // 配置已更新，重新加载配置
            loadConfig().then(() => {
                console.log('收到配置更新通知，已重新加载配置');
                sendResponse({ success: true });
            }).catch(error => {
                console.error('重新加载配置失败:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true;
        } else if (message.type === 'checkTaskStatus') {
            // 返回当前任务状态
            sendResponse({ 
                success: true, 
                isRunning: state.isRunning 
            });
            return true;
        }
        sendResponse({ success: false, error: 'Unknown message type' });
        return true;
    } catch (error) {
        console.error('处理消息时发生错误:', error);
        sendResponse({ success: false, error: error.message });
        return true;
    }
});

// 启动脚本
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndStartTask);
} else {
    checkAndStartTask();
}