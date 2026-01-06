// ==UserScript==
// @name         Microsoft Bing Rewards每日任务脚本
// @version      V26.1.6.1
// @description  自动完成微软 Rewards 每日搜索任务，实时显示进度
// @author       KEEPA
// @match        https://*.bing.com/*
// @exclude      https://rewards.bing.com/*
// @license      MIT
// @icon         https://www.bing.com/favicon.ico
// @connect      top.baidu.com
// @connect      www.toutiao.com
// @connect      r.inews.qq.com
// @connect      m.weibo.cn
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_log
// @downloadURL  https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js
// @updateURL    https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js
// ==/UserScript==

/*
 * 更新说明：
 * V26.1.6.1 (2026-01-06)
 * 1. 增加更多热词源，改进热词补充和过滤机制
 * 2. 改进Fisher-Yates洗牌算法，提高随机性
 * 3. 版本号机制改为 年：月：日：最小版本号 格式
 * 
 * V0.0.7 (2025-12-31)
 * 1. 修复获取精确的剩余时间错误，无法显示下个搜索词问题
 *
 * V0.0.6 (2025-12-24):
 * 1. 修复面板关闭按钮无效问题
 * 2. 添加面板显示/隐藏切换功能
 * 3. 优化关闭按钮的悬停交互效果
 * 4. 修复倒计时变量引用错误
 *
 * V0.0.5 (2025-10-31):
 * 1. 优化状态面板UI设计
 * 2. 添加精确计时器，不受页面可见性影响
 * 3. 优化搜索词获取逻辑
 *
 * V0.0.4 (2025-10-30):
 * 1. 添加搜索任务暂停机制
 * 2. 改进进度显示方式
 * 3. 修复移动端搜索数量限制问题
 *
 * V0.0.3 (2025-10-30):
 * 1. 优化搜索URL构建逻辑
 * 2. 添加更多搜索参数变化
 * 3. 改进错误处理和重试机制
 *
 * V0.0.2 (2025-10-13):
 * 1. 添加状态显示面板
 * 2. 支持后台运行和页面活跃状态显示
 * 3. 优化搜索词获取策略
 *
 * V0.0.1 (2025-08-22):
 * 1. 初始版本发布
 * 2. 支持PC和移动端自动搜索
 * 3. 基本的进度追踪功能
 */

'use strict';

// 配置参数
const CONFIG = {
    // PC端最大搜索次数
    // 注意：实际每日上限可能因地区而异，请根据实际情况调整
    maxWebSearches: 50,

    // 移动端最大搜索次数
    // 注意：实际每日上限可能因地区而异，请根据实际情况调整
    maxMobileSearches: 36,

    // 暂停间隔：每执行多少次搜索后暂停一次
    // 建议值：3-10，设置过小可能频繁暂停，设置过大可能触发反爬机制
    pauseInterval: 5,

    // 暂停时间（毫秒）：每次暂停的持续时间
    // 建议值：10-30分钟，可以有效降低被封风险
    // 15分钟 = 15 * 60 * 1000 毫秒
    pauseTime: 15 * 60 * 1000,

    // 搜索延迟相关配置
    decimalDelay: 3000,   // 小数部分延迟（随机延迟的基础值）
    minDelay: 8000,       // 最小延迟（毫秒）：两次搜索之间的最短间隔时间
    maxDelay: 15000,      // 最大延迟（毫秒）：两次搜索之间的最长间隔时间

    // 网络请求超时时间（毫秒）：获取热门搜索词的最大等待时间
    requestTimeout: 20000
};

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
        const result = [...array]; // 创建副本以避免修改原数组
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]]; // 交换元素
        }
        return result;
    },

    // 生成随机ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // 获取精确的剩余时间（不受标签页激活状态影响）
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

/**
 * 创建状态面板
 */
function createStatusPanel() {
    if (state.statusPanel) return state.statusPanel;

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

    const taskStatus = getTaskStatus();
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

    // 计算剩余时间（使用精确计时）
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
}

/**
 * 获取热门搜索词
 */
async function fetchSearchKeywords() {
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const cacheKey = `cache_${isMobile ? 'mobile' : 'pc'}`;
    const cached = GM_getValue(cacheKey);

    if (cached && Date.now() - cached.time < 3600000) {
        return cached.words;
    }

    // 定义热词API源
    const sources = isMobile ? [
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
                        .filter(item => item.desc && !item.desc.match(/[\u4e00-\u9fa5]/) || item.desc.match(/[\u4e00-\u9fa5]/))
                        .map(item => item.desc)
                        .filter(Boolean);
                }
                return [];
            }
        }
    ] : [
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

    const allWords = new Set(); // 使用Set避免重复词

    // 并行请求所有API
    const promises = sources.map(source => 
        new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: source.url,
                timeout: CONFIG.requestTimeout,
                onload: res => {
                    if (res.status === 200) {
                        try {
                            const data = utils.safeJsonParse(res.responseText, {});
                            const words = source.parser(data).filter(word => 
                                word && 
                                word.length >= 2 && 
                                word.length <= 30 &&
                                !/^[0-9]+$/.test(word) // 过滤纯数字
                            );
                            GM_log(`从 ${source.name} 获取到 ${words.length} 个热词`);
                            resolve(words);
                        } catch (e) {
                            GM_log(`解析 ${source.name} 数据失败: ${e.message}`);
                            resolve([]);
                        }
                    } else {
                        GM_log(`${source.name} 请求失败: HTTP ${res.status}`);
                        resolve([]);
                    }
                },
                onerror: () => {
                    GM_log(`${source.name} 请求出错`);
                    resolve([]);
                },
                ontimeout: () => {
                    GM_log(`${source.name} 请求超时`);
                    resolve([]);
                }
            });
        })
    );

    // 等待所有API请求完成
    const results = await Promise.all(promises);
    
    // 合并所有结果并去重
    results.forEach(words => {
        words.forEach(word => {
            // 额外过滤条件
            if (word && !allWords.has(word)) {
                allWords.add(word);
            }
        });
    });

    const allWordsArray = Array.from(allWords);
    GM_log(`总共获取到 ${allWordsArray.length} 个不重复的热词`);

    const maxSearches = isMobile ? CONFIG.maxMobileSearches : CONFIG.maxWebSearches;
    // 如果从API获取的词不够，补充本地词库
    if (allWordsArray.length < maxSearches) {
        const remainingCount = Math.max(maxSearches, 50) - allWordsArray.length; // 总共至少最大搜索次数或50个词
        const localWords = utils.shuffleArray(SEARCH_WORDS);
        for (let i = 0; i < remainingCount && i < SEARCH_WORDS.length; i++) {
            if (!allWords.has(localWords[i])) {
                allWordsArray.push(localWords[i]);
            }
        }
    }

    // 随机打乱合并后的词库
    const words = utils.shuffleArray(allWordsArray);

    // 保存到缓存
    GM_setValue(cacheKey, { words, time: Date.now() });
    
    return words;
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

    return `${domain}/search?${urlParams.toString()}&startTask=1`;
}

/**
 * 获取任务状态
 */
function getTaskStatus() {
    const webCount = GM_getValue('webSearchCount', 0);
    const mobileCount = GM_getValue('mobileSearchCount', 0);
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
    const taskStatus = getTaskStatus();

    if (taskStatus.isCompleted) {
        updateStatusPanel();
        GM_notification({ text: "Bing Rewards 任务已完成", title: "任务完成", timeout: 3000 });
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
            state.searchWords = await fetchSearchKeywords();
        } catch {
            state.searchWords = utils.shuffleArray(SEARCH_WORDS);
        }
    }

    const searchIndex = taskStatus.currentCount % state.searchWords.length;
    const searchWord = state.searchWords[searchIndex];
    const delay = utils.getRandomDelay();

    // 设置精确倒计时
    state.countdownStartTime = Date.now();
    state.countdownDuration = delay;

    // 更新面板
    updateStatusPanel({ currentWord: searchWord });

    // 使用精确计时器，不受页面可见性影响
    const searchTimer = utils.addTimer(setTimeout(() => {
        utils.clearAllTimers();
        performSearch(searchWord, taskStatus);
    }, delay));

    // 添加一个定期更新面板的定时器（每秒更新一次）
    const updateTimer = utils.addTimer(setInterval(() => {
        updateStatusPanel({ currentWord: searchWord });
    }, 1000));
}

/**
 * 执行搜索
 */
function performSearch(searchWord, taskStatus) {
    const nextCount = taskStatus.currentCount + 1;
    const counterKey = taskStatus.currentType === 'web' ? 'webSearchCount' : 'mobileSearchCount';

    GM_setValue(counterKey, nextCount);
    GM_log(`搜索: ${searchWord} (${nextCount}/${taskStatus.maxCount})`);

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
function checkAndStartTask() {
    if (new URLSearchParams(window.location.search).has('startTask')) {
        setTimeout(executeSearch, 2000);
    } else {
        // createStatusPanel();
    }
}

// 注册菜单命令
GM_registerMenuCommand('🚀 开始任务', () => {
    GM_setValue('webSearchCount', 0);
    GM_setValue('mobileSearchCount', 0);
    // 清除热词缓存，确保开始新任务时获取新的热词
    GM_setValue('cache_pc', undefined);
    GM_setValue('cache_mobile', undefined);
    window.location.href = 'https://www.bing.com/?startTask=1';
});

GM_registerMenuCommand('⏹️ 停止任务', () => {
    const taskStatus = getTaskStatus();
    const counterKey = taskStatus.currentType === 'web' ? 'webSearchCount' : 'mobileSearchCount';
    GM_setValue(counterKey, taskStatus.maxCount);
    utils.clearAllTimers();
    state.isRunning = false;
    state.countdownStartTime = 0;
    state.countdownDuration = 0;
    updateStatusPanel();
});

GM_registerMenuCommand('📊 查看/隐藏面板', () => {
    if (!state.statusPanel) {
        createStatusPanel();
    } else {
        const panel = state.statusPanel;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
});

// 启动脚本
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndStartTask);
} else {
    checkAndStartTask();
}