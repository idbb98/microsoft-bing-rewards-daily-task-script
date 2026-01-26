// ==UserScript==
// @name         Microsoft Bing Rewards Daily Task Script (微软必应奖励每日任务脚本)
// @version      26.1.26.1
// @description  自动化完成微软必应每日搜索任务，实时显示进度，轻松积累奖励积分。
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
 * V26.1.26.1
 * • 统一搜索配置：移除设备类型区分，采用单一最大搜索次数配置
 * • 动态间隔控制：暂停间隔与暂停时间采用区间随机配置，增强行为真实性
 * • UI界面优化：重构状态面板样式，提升用户体验与信息展示效率
 * • 行为模拟优化：实现随机滚动策略，模拟真实用户浏览行为
 * • 参数稳定性：启动参数采用每日固定机制，增强行为一致性
 * • 扩展参数池：扩充启动参数标记数组，增强脚本随机性与安全性
 * 
 * V26.1.15.1
 * • 功能增强：增加随机加词和截词功能（默认关闭）
 * • 参数化配置：实现启动参数标记可配置化
 * 
 * V26.1.6.1 (2026-01-06)
 * • 热词获取优化：增加多源热词接口，完善热词补充与过滤机制
 * • 随机算法升级：改进Fisher-Yates洗牌算法，提高随机性质量
 * • 版本管理：调整版本号格式为年-月-日-版本号格式
 * 
 * V0.0.7 (2025-12-31)
 * • 问题修复：修正剩余时间计算错误及下个搜索词显示异常
 *
 * V0.0.6 (2025-12-24):
 * • 问题修复：解决面板关闭按钮失效问题
 * • 功能增强：增加面板显示/隐藏切换功能
 * • 交互优化：优化关闭按钮悬停效果
 * • 问题修复：修复倒计时变量引用错误
 *
 * V0.0.5 (2025-10-31):
 * • UI优化：改进状态面板UI设计
 * • 功能增强：添加精确计时器，不受页面可见性影响
 * • 逻辑优化：改进搜索词获取策略
 *
 * V0.0.4 (2025-10-30):
 * • 功能增强：添加搜索任务暂停机制
 * • 显示优化：改进进度显示方式
 * • 问题修复：修复移动端搜索数量限制问题
 *
 * V0.0.3 (2025-10-30):
 * • 逻辑优化：优化搜索URL构建逻辑
 * • 参数丰富：添加更多搜索参数变化
 * • 错误处理：改进错误处理和重试机制
 *
 * V0.0.2 (2025-10-13):
 * • 功能新增：添加状态显示面板
 * • 后台支持：支持后台运行和页面活跃状态显示
 * • 策略优化：优化搜索词获取策略
 *
 * V0.0.1 (2025-08-22):
 * • 功能发布：初始版本发布
 * • 设备兼容：支持PC和移动端自动搜索
 * • 进度追踪：基础进度追踪功能
 */

'use strict';

// 配置参数
const CONFIG = {
    // 最大搜索次数
    maxSearches: 25,

    // 是否随机加词，如：人工智能发展  -->  人工1智能发z展 
    randomAddSearchWords: false,
    // 随机加词因子，控制加词的概率（0-1之间的小数），默认为0.3即30%概率添加字符
    randomAddSearchWordsFactor: 0.3,

    // 是否随机截词，如：人工1智能发z展  --> 人工1智
    randomCutSearchWords: false,
    // 随机截词因子，控制截取的概率（0-1之间的小数），默认为0.2即20%概率截取字符
    randomCutSearchWordsFactor: 0.2,

    // 暂停间隔范围：每执行多少次搜索后暂停一次的区间
    // 建议值：3-8，设置过小可能频繁暂停，设置过大可能触发反爬机制
    pauseIntervalMin: 3,
    pauseIntervalMax: 8,

    // 暂停时间范围（毫秒）：每次暂停的持续时间区间
    // 建议值：10-30分钟，可以有效降低被封风险
    pauseTimeMin: 10 * 60 * 1000,  // 10分钟
    pauseTimeMax: 30 * 60 * 1000,  // 30分钟

    // 搜索延迟相关配置
    decimalDelay: 3000,   // 小数部分延迟（随机延迟的基础值）
    minDelay: 8000,       // 最小延迟（毫秒）：两次搜索之间的最短间隔时间
    maxDelay: 15000,      // 最大延迟（毫秒）：两次搜索之间的最长间隔时间

    // 网络请求超时时间（毫秒）：获取热门搜索词的最大等待时间
    requestTimeout: 20000,

    // 启动参数标记数组
    startParams: ['bingTask', 'runSearch', 'initiateSearch', 'bingSearchMode', 'autoSearch', 'startTask', 'executeSearch', 'launchSearch', 'beginSearch', 'processSearch'],
};

// 搜索参数配置
const SEARCH_CONFIG = {
    domains: ['https://www.bing.com', 'https://cn.bing.com'],
    params: ['QBLH', 'QBRE', 'QBRP', 'QBRL', 'QBSB', 'QBVA', 'QBNT', 'QBUS', 'QBIN', 'QBEN'],
    markets: ['zh-CN', 'en-US', 'en-GB', 'ja-JP']
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

    // 随机对搜索词加词，例如：人工智能发展  -->  人工1智能发z展
    addRandomCharsToSearchWord(word) {
        if (!CONFIG.randomAddSearchWords || !word || Math.random() > CONFIG.randomAddSearchWordsFactor) return word;

        // 控制添加字符的数量，避免过度添加导致词无意义
        const maxAdditions = Math.min(3, Math.floor(word.length / 3)); // 最多添加原词长度1/3的随机字符
        let result = word;

        for (let i = 0; i < Math.floor(Math.random() * (maxAdditions + 1)); i++) {
            // 随机选择插入位置（避开开头和结尾）
            const insertPos = Math.floor(Math.random() * (result.length - 1)) + 1;
            // 随机选择要插入的字符
            const randomChar = String.fromCharCode(
                Math.random() > 0.5 ? 
                Math.floor(Math.random() * 10) + 48 : // 数字 0-9
                Math.floor(Math.random() * 26) + 97   // 小写字母 a-z
            );
            
            result = result.slice(0, insertPos) + randomChar + result.slice(insertPos);
        }

        return result;
    },

    // 随机对搜索词进行截取，例如：人工1智能发z展  --> 人工1智
    cutSearchWordRandomly(word) {
        if (!CONFIG.randomCutSearchWords || !word || Math.random() > CONFIG.randomCutSearchWordsFactor) return word;

        // 控制截取长度，保留至少一半的字符
        const minLength = Math.max(2, Math.ceil(word.length / 2)); // 至少保留2个字符或一半字符
        const maxLength = word.length; // 最大不超过原词长度
        
        if (minLength >= maxLength) return word;

        // 随机选择截取长度
        const cutLength = Math.floor(Math.random() * (maxLength - minLength)) + minLength;

        return word.substring(0, cutLength);
    },

    // 依次应用加词和截取
    processSearchWord(word) {
        // 先加词
        let processedWord = this.addRandomCharsToSearchWord(word);
        // 再截取
        processedWord = this.cutSearchWordRandomly(processedWord);
        return processedWord;
    },

    // 生成随机延迟
    getRandomDelay() {
        return Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay;
    },

    // 从区间内随机取暂停间隔
    getRandomPauseInterval() {
        return Math.floor(Math.random() * (CONFIG.pauseIntervalMax - CONFIG.pauseIntervalMin + 1)) + CONFIG.pauseIntervalMin;
    },

    // 从区间内随机取暂停时间
    getRandomPauseTime() {
        return Math.floor(Math.random() * (CONFIG.pauseTimeMax - CONFIG.pauseTimeMin + 1)) + CONFIG.pauseTimeMin;
    },

    // 随机选择一个启动参数（每天保持相同值）
    getRandomStartParam() {
        // 获取今天的日期字符串（格式：YYYY-MM-DD）
        const today = new Date().toISOString().split('T')[0];
        // 检查是否已经为今天选择了启动参数
        const todayStartParamKey = 'todaySelectedStartParam';
        const todayStartParamDateKey = 'todaySelectedStartParamDate';
        
        // 如果存储的日期不是今天，则重新选择
        if (GM_getValue(todayStartParamDateKey) !== today) {
            // 随机选择一个新的启动参数
            const startParam = CONFIG.startParams[Math.floor(Math.random() * CONFIG.startParams.length)];
            // 存储选中的参数及其对应的日期
            GM_setValue(todayStartParamKey, startParam);
            GM_setValue(todayStartParamDateKey, today);
            // 同时更新内存中的状态
            state.selectedStartParam = startParam;
            console.log(`Selected start parameter for today: ${startParam}`);
            return startParam;
        } else {
            // 返回当天已选择的参数
            const startParam = GM_getValue(todayStartParamKey);
            // 更新内存中的状态
            state.selectedStartParam = startParam;
            console.log(`Using previously selected start parameter: ${startParam}`);
            return startParam;
        }
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


/**
 * 构建搜索URL
 */
function buildSearchUrl(searchWord) {
    const domain = SEARCH_CONFIG.domains[Math.floor(Math.random() * SEARCH_CONFIG.domains.length)];
    const form = SEARCH_CONFIG.params[Math.floor(Math.random() * SEARCH_CONFIG.params.length)];
    const mkt = SEARCH_CONFIG.markets[Math.floor(Math.random() * SEARCH_CONFIG.markets.length)];

    const urlParams = new URLSearchParams({
        q: searchWord,
        form,
        cvid: utils.generateId(),
        pc: 'U01',  // 固定使用U01参数
        mkt
    });

    const startParam = utils.getRandomStartParam();
    return `${domain}/search?${urlParams.toString()}&${startParam}=1`;
}

/**
 * 创建状态面板
 */
function createStatusPanel() {
    if (state.statusPanel) return state.statusPanel;

    const panel = document.createElement('div');
    panel.id = 'bing-rewards-panel';
    panel.innerHTML = `
        <div id="panel-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h3 style="margin:0;font-size:15px;color:#0067b8;">📈 Bing Rewards</h3>
            <div id="panel-close-btn" style="cursor:pointer;font-size:18px;color:#666;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background-color 0.2s;">×</div>
        </div>
        <div id="panel-content"></div>
        <div style="margin-top:10px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:8px;">
            <span id="page-status">🟢 页面活跃</span>
        </div>
    `;

    Object.assign(panel.style, {
        position: 'fixed',
        bottom: '50px',
        right: '20px',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '10px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10000',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        minWidth: '260px',
        maxWidth: '300px',
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
            closeBtn.style.backgroundColor = '#f0f0f0';
            closeBtn.style.color = '#333';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
            closeBtn.style.color = '#666';
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

    // 计算剩余时间（使用精确计时）
    const remainingTime = utils.getAccurateRemainingTime();

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="color:#666;font-size:12px;">${taskStatus.currentCount}/${taskStatus.maxCount}</span>
            <span style="color:#0067b8;font-weight:500;font-size:12px;">${progress}%</span>
        </div>
        <div style="margin:8px 0;">
            <div style="height:10px;background:#f0f0f0;border-radius:5px;overflow:hidden;">
                <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,#0067b8,#00bcf2);"></div>
            </div>
        </div>
        ${taskStatus.isCompleted ? '<div style="color:#107c10;margin-top:10px;padding:6px;background:#f0f9f0;border-radius:5px;text-align:center;font-size:12px;">✅ 今日任务已完成</div>' : ''}
        ${pauseTimeLeft !== null ? `
            <div style="margin-top:10px;padding:8px;background:#fff8e6;border-radius:5px;border-left:3px solid #ffb900;">
                <div style="font-size:12px;color:#8a6900;text-align:center;">⏸️ 暂停中 ${Math.floor(pauseTimeLeft/60)}分${Math.round(pauseTimeLeft%60)}秒</div>
            </div>
        ` : ''}
        ${!pauseTimeLeft && currentWord && remainingTime > 0 ? `
            <div style="margin-top:10px;padding:8px;background:#f0f7ff;border-radius:5px;">
                <div style="font-size:11px;color:#005a9e;margin-bottom:3px;">🔍 下个搜索词:</div>
                <div style="font-size:12px;word-break:break-all;color:#0067b8;max-height:40px;overflow-y:auto;">${currentWord}</div>
                <div style="text-align:right;margin-top:4px;font-size:11px;color:#666;">${remainingTime.toFixed(1)}秒后</div>
            </div>
        ` : ''}
        ${state.isRunning && !pauseTimeLeft && !taskStatus.isCompleted ? '<div style="margin-top:8px;text-align:center;color:#666;font-size:11px;">🔄 执行中...</div>' : ''}
    `;
}

/**
 * 获取热门搜索词
 */
async function fetchSearchKeywords() {
    const cacheKey = `cache_search_words`;
    const cached = GM_getValue(cacheKey);

    if (cached && Date.now() - cached.time < 3600000) {
        return cached.words;
    }

    // 定义热词API源
    const sources = [
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
        },
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

    // 如果从API获取的词不够，补充本地词库
    if (allWordsArray.length < CONFIG.maxSearches) {
        const remainingCount = CONFIG.maxSearches - allWordsArray.length;
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
 * 获取任务状态
 */
function getTaskStatus() {
    const searchCount = GM_getValue('searchCount', 0);

    return {
        currentCount: searchCount,
        maxCount: CONFIG.maxSearches,
        isCompleted: searchCount >= CONFIG.maxSearches,
        overallProgress: Math.round((searchCount / CONFIG.maxSearches) * 100),
        overallProgressRaw: (searchCount / CONFIG.maxSearches) * 100
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

    // 对搜索词进行处理
    const processedSearchWord = utils.processSearchWord(searchWord);
    
    const delay = utils.getRandomDelay();

    // 设置精确倒计时
    state.countdownStartTime = Date.now();
    state.countdownDuration = delay;

    // 更新面板
    updateStatusPanel({ currentWord: processedSearchWord });

    // 使用精确计时器，不受页面可见性影响
    const searchTimer = utils.addTimer(setTimeout(() => {
        // 随机滚动到页面任意位置，增加随机性
        const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const viewportHeight = window.innerHeight;
        const maxScroll = scrollHeight - viewportHeight;
        
        // 随机滚动到页面的某个位置，而不是总是滚动到底部
        const randomScrollPosition = Math.floor(Math.random() * maxScroll);
        
        window.scrollTo({ 
            top: randomScrollPosition, 
            behavior: 'smooth' 
        });

        utils.clearAllTimers();
        performSearch(processedSearchWord, taskStatus);
    }, delay));

    // 添加一个定期更新面板的定时器（每秒更新一次）
    const updateTimer = utils.addTimer(setInterval(() => {
        updateStatusPanel({ currentWord: processedSearchWord });
    }, 1000));
}

/**
 * 执行搜索
 */
function performSearch(searchWord, taskStatus) {

    const nextCount = taskStatus.currentCount + 1;
    const counterKey = 'searchCount';

    GM_setValue(counterKey, nextCount);
    GM_log(`搜索: ${searchWord} (${nextCount}/${taskStatus.maxCount})`);

    // 重置倒计时状态
    state.countdownStartTime = 0;
    state.countdownDuration = 0;

    // 随机暂停间隔检查
    // 生成本次搜索周期内的暂停间隔（只在首次搜索时确定，之后保持不变直到完成一次完整搜索）
    let currentPauseInterval = GM_getValue('currentPauseInterval', null);
    if(currentPauseInterval === null) {
        currentPauseInterval = utils.getRandomPauseInterval();
        GM_setValue('currentPauseInterval', currentPauseInterval);
    }
    
    if (nextCount % currentPauseInterval === 0) {
        // 每次暂停时生成新的随机暂停时间
        const pauseTime = utils.getRandomPauseTime();
        let pauseTimeLeft = pauseTime / 1000;
        updateStatusPanel({ pauseTimeLeft });

        // 使用精确的暂停计时
        const pauseStartTime = Date.now();
        const pauseTimer = utils.addTimer(setInterval(() => {
            const elapsed = Date.now() - pauseStartTime;
            pauseTimeLeft = Math.max(0, (pauseTime - elapsed) / 1000);
            updateStatusPanel({ pauseTimeLeft });

            if (pauseTimeLeft <= 0) {
                utils.clearAllTimers();
                
                // 完成暂停后，重新生成下一个暂停间隔
                const newPauseInterval = utils.getRandomPauseInterval();
                GM_setValue('currentPauseInterval', newPauseInterval);
                
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
    const startParam = utils.getRandomStartParam();
    console.log(`检查并启动任务: ${startParam}`);
    if (new URLSearchParams(window.location.search).has(startParam)) {
        setTimeout(executeSearch, 2000);
        console.log(`启动任务: ${startParam}`);
    } else {
        // createStatusPanel();
    }
}

// 注册菜单命令
GM_registerMenuCommand('🚀 开始任务', () => {
    GM_setValue('searchCount', 0);
    // 重置当前暂停间隔值以开始新的搜索周期
    GM_setValue('currentPauseInterval', utils.getRandomPauseInterval());
    // 清除热词缓存，确保开始新任务时获取新的热词
    GM_setValue('cache_search_words', undefined);
    // 获取当天的启动参数
    const startParam = utils.getRandomStartParam();
    window.location.href = 'https://www.bing.com/?' + startParam + '=1';
});

GM_registerMenuCommand('⏹️ 终止任务', () => {
    const taskStatus = getTaskStatus();
    const counterKey = 'searchCount';
    GM_setValue(counterKey, taskStatus.maxCount);
    // 同时清除当前暂停间隔值
    GM_setValue('currentPauseInterval', null);
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