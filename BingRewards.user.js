// ==UserScript==
// @name         Microsoft Bing Rewards每日任务脚本
// @version      V0.0.4
// @description  自动完成微软 Rewards 每日搜索任务，实时显示进度
// @author       KEEPA
// @match        https://*.bing.com/*
// @exclude      https://rewards.bing.com/*
// @license      MIT
// @icon         https://www.bing.com/favicon.ico
// @connect      top.baidu.com
// @connect      www.toutiao.com
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

'use strict';

// 配置参数
const CONFIG = {
    maxWebSearches: 40,
    maxMobileSearches: 35,
    pauseInterval: 5,
    pauseTime: 15 * 60 * 1000, // 15分钟
    decimalDelay: 3000,
    minDelay: 8000,
    maxDelay: 15000,
    requestTimeout: 20000
};

// 状态管理
const state = {
    searchWords: [],
    statusPanel: null,
    timers: new Set(),
    isRunning: false,
    searchHistory: []
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

    // 数组洗牌
    shuffleArray(array) {
        return [...array].sort(() => Math.random() - 0.5);
    },

    // 生成随机ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
};

// 搜索词库
const SEARCH_WORDS = [
    "人工智能发展", "量子计算机", "5G技术应用", "区块链", "物联网",
    "自动驾驶技术", "黑洞研究", "基因编辑", "火星探测", "气候变化",
    "传统文化", "世界遗产", "健康饮食", "运动健身", "旅游景点"
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
        <div style="position:absolute;top:8px;right:10px;cursor:pointer;font-size:18px;" onclick="this.parentElement.style.display='none'">×</div>
        <h3 style="margin:0 0 12px 0;color:#0067b8;font-size:16px;">📈 Bing Rewards</h3>
        <div id="panel-content"></div>
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
    const { currentWord = '', remainingTime = 0, pauseTimeLeft = null } = data;

    const progress = taskStatus.overallProgress;
    const deviceType = taskStatus.currentType === 'web' ? '💻 PC端' : '📱 移动端';

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
        ${!pauseTimeLeft && currentWord ? `
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

    const sources = isMobile ? [
        {
            url: "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
            parser: data => data.data?.map(item => item.Title?.trim()).filter(Boolean) || []
        }
    ] : [
        {
            url: "https://top.baidu.com/api/board?tab=realtime",
            parser: data => data.data?.cards?.[0]?.content?.map(item => item.word) || []
        }
    ];

    for (const source of sources) {
        try {
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: source.url,
                    timeout: CONFIG.requestTimeout,
                    onload: res => res.status === 200 ? resolve(res.responseText) : reject(new Error(`HTTP ${res.status}`)),
                    onerror: reject,
                    ontimeout: () => reject(new Error("请求超时"))
                });
            });

            const data = utils.safeJsonParse(response, {});
            const words = source.parser(data).filter(word => word && word.length >= 2 && word.length <= 20);

            if (words.length >= 5) {
                GM_setValue(cacheKey, { words, time: Date.now() });
                return words;
            }
        } catch (error) {
            GM_log(`获取热词失败: ${error.message}`);
        }
    }

    return utils.shuffleArray(SEARCH_WORDS);
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
    let remainingTime = delay / 1000;

    // 更新面板
    updateStatusPanel({ currentWord: searchWord, remainingTime });

    // 倒计时
    const countdown = utils.addTimer(setInterval(() => {
        remainingTime -= 0.1;
        if (remainingTime <= 0) {
            utils.clearAllTimers();
            performSearch(searchWord, taskStatus);
        } else {
            updateStatusPanel({ currentWord: searchWord, remainingTime });
        }
    }, 100));

    // 超时保护
    utils.addTimer(setTimeout(() => {
        utils.clearAllTimers();
        performSearch(searchWord, taskStatus);
    }, delay + 1000));
}

/**
 * 执行搜索
 */
function performSearch(searchWord, taskStatus) {
    const nextCount = taskStatus.currentCount + 1;
    const counterKey = taskStatus.currentType === 'web' ? 'webSearchCount' : 'mobileSearchCount';

    GM_setValue(counterKey, nextCount);
    GM_log(`搜索: ${searchWord} (${nextCount}/${taskStatus.maxCount})`);

    // 暂停检查
    if (nextCount % CONFIG.pauseInterval === 0) {
        let pauseTimeLeft = CONFIG.pauseTime / 1000;
        updateStatusPanel({ pauseTimeLeft });

        const pauseTimer = utils.addTimer(setInterval(() => {
            pauseTimeLeft -= 1;
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
    window.location.href = 'https://www.bing.com/?startTask=1';
});

GM_registerMenuCommand('⏹️ 停止任务', () => {
    const taskStatus = getTaskStatus();
    const counterKey = taskStatus.currentType === 'web' ? 'webSearchCount' : 'mobileSearchCount';
    GM_setValue(counterKey, taskStatus.maxCount);
    utils.clearAllTimers();
    state.isRunning = false;
    updateStatusPanel();
});

GM_registerMenuCommand('📊 查看进度', createStatusPanel);

// 启动脚本
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndStartTask);
} else {
    checkAndStartTask();
}