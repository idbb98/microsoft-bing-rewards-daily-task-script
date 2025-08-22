// ==UserScript==
// @name         Microsoft Bing Rewards每日任务脚本
// @version      V0.0.1
// @description  自动完成微软 Rewards 每日搜索任务，实时显示进度，按设备类型获取热门词（PC:百度热榜，手机:微博热榜）
// @author       KEEPA
// @match        https://*.bing.com/*
// @exclude      https://rewards.bing.com/*
// @license      MIT
// @icon         https://www.bing.com/favicon.ico
// @connect      top.baidu.com
// @connect      trends.so.com
// @connect      s.weibo.com
// @connect      gist.githubusercontent.com
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @downloadURL  https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js
// @updateURL    https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js
// ==/UserScript==

'use strict';

// 核心配置参数
const config = {
    maxWebSearches: 40,
    maxMobileSearches: 35,
    pauseInterval: 5,
    pauseTime: 1000 * 60 * 15, // 15分钟暂停
    panelPosition: { bottom: '50px', right: '20px' },
    decimalDelay: 3000
};

let searchWords = []; // 热门搜索词库（优先使用）
let statusPanel = null;
let progressTimer = null;
let countdownInterval = null;
let pauseCountdownInterval = null; 

// 默认搜索词库（分类结构化）
const defaultSearchWords = {
    culture: [
        "敦煌莫高窟数字化成果", "非遗技艺传承现状", "故宫文物修复技术",
        "丝绸之路文化交流", "古代建筑保护方法", "传统戏曲创新发展"
    ],
    technology: [
        "量子计算最新突破", "可再生能源存储技术", "人工智能伦理规范",
        "脑机接口研究进展", "5G应用场景拓展", "太空探索新发现"
    ],
    life: [
        "季节性食材营养搭配", "居家节能省电技巧", "高效时间管理方法",
        "心理健康调节方式", "家庭急救知识普及", "简易健身动作教学"
    ],
    knowledge: [
        "冷门历史知识科普", "趣味数学问题解析", "常见科学误区纠正",
        "各国节日传统习俗", "动植物有趣特性", "语言演变趣味知识"
    ]
};

// 动态热门词（按季节更新）
const seasonalHotWords = [
    "2025夏季健康养生指南", "暑期亲子活动推荐", "高温天气防护措施",
    "秋季旅行目的地推荐", "开学季必备清单", "新能源汽车夏季保养"
];


/**
 * 创建状态面板
 */
function createStatusPanel() {
    if (statusPanel) {
        updateStatusPanel();
        return;
    }

    statusPanel = document.createElement('div');
    statusPanel.id = 'bing-rewards-status-panel';
    statusPanel.style.cssText = `
        position: fixed;
        bottom: ${config.panelPosition.bottom};
        right: ${config.panelPosition.right};
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 12px 15px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
        z-index: 99999;
        font-family: Arial, sans-serif;
        font-size: 13px;
        max-width: 300px;
        transition: all 0.3s ease;
    `;

    // 关闭按钮
    const closeBtn = document.createElement('div');
    closeBtn.style.cssText = `position: absolute; top: 5px; right: 8px; color: #999; cursor: pointer; font-size: 16px;`;
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
        if (progressTimer) clearTimeout(progressTimer);
        if (countdownInterval) clearInterval(countdownInterval);
        if (pauseCountdownInterval) clearInterval(pauseCountdownInterval);
        statusPanel.style.display = 'none';
    });
    statusPanel.appendChild(closeBtn);

    // 标题和内容容器
    const title = document.createElement('h3');
    title.style.cssText = `margin: 0 0 10px 0; color: #0066cc; font-size: 15px;`;
    title.textContent = 'Bing Rewards 任务状态';
    statusPanel.appendChild(title);

    const content = document.createElement('div');
    content.id = 'panel-content';
    statusPanel.appendChild(content);

    document.body.appendChild(statusPanel);
    updateStatusPanel();
}

/**
 * 更新状态面板内容
 */
function updateStatusPanel(data = {}) {
    if (!statusPanel) return;

    if (progressTimer) clearTimeout(progressTimer);

    const taskStatus = getTaskStatus();
    const content = document.getElementById('panel-content');
    const { currentWord = '', nextWord = '', remainingTime = 0, pauseTimeLeft = null } = data;

    const baseProgress = taskStatus.overallProgress;
    const progressBar = `
        <div style="height: 6px; background: #eee; border-radius: 3px; margin: 8px 0;">
            <div class="progress-bar-fill" style="width: ${baseProgress}%; height: 100%; background: #0066cc; border-radius: 3px; transition: width 0.5s ease;"></div>
        </div>
    `;

    // 当前搜索词显示（保持隐藏）
    const currentWordDisplay = '';

    // 暂停倒计时显示
    const pauseDisplay = pauseTimeLeft !== null ? `
        <div style="margin-top: 8px; padding: 6px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
            <div style="font-size: 12px; color: #856404; margin-bottom: 2px;">
                任务暂停中:
            </div>
            <div style="font-size: 13px; color: #856404;">
                剩余 ${Math.floor(pauseTimeLeft / 60)}分${Math.round(pauseTimeLeft % 60)}秒
            </div>
        </div>
    ` : '';

    // 下个搜索词显示
    const nextWordDisplay = !pauseDisplay && currentWord ? `
        <div style="margin-top: 8px; padding: 6px; background: #f0f7ff; border-radius: 4px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
                下个搜索词（${remainingTime.toFixed(2)}秒后）:
            </div>
            <div style="font-size: 13px; word-break: break-all; color: #0066cc;">${currentWord}</div>
        </div>
    ` : '';

    content.innerHTML = `
        <div>环境: ${taskStatus.currentType === 'web' ? '网页' : '移动'}</div>
        <div>当前进度: ${taskStatus.currentCount}/${taskStatus.maxCount}</div>
        <div class="overall-progress-text">总体进度: ${baseProgress}%</div>
        ${progressBar}
        ${taskStatus.isCompleted ? '<div style="color: #28a745; margin-top: 5px;">✓ 今日任务已完成</div>' : ''}
        ${currentWordDisplay}
        ${pauseDisplay}
        ${nextWordDisplay}
    `;

    // 延迟显示精确进度
    progressTimer = setTimeout(() => {
        const preciseProgress = taskStatus.overallProgressRaw.toFixed(2);
        const progressTextEl = content.querySelector('.overall-progress-text');
        if (progressTextEl) progressTextEl.textContent = `总体进度: ${preciseProgress}%`;
        const progressBarEl = content.querySelector('.progress-bar-fill');
        if (progressBarEl) progressBarEl.style.width = `${preciseProgress}%`;
    }, config.decimalDelay);
}

/**
 * 整合并随机化保底词库
 */
function getMergedSearchWords() {
    const allDefaultWords = [
        ...defaultSearchWords.culture,
        ...defaultSearchWords.technology,
        ...defaultSearchWords.life,
        ...defaultSearchWords.knowledge,
        ...seasonalHotWords
    ];
    return shuffleArray([...new Set(allDefaultWords)]); // 去重后随机排序
}

/**
 * 数组随机排序
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * 根据设备类型获取热门词（PC:百度热榜，手机:微博热榜）
 */
async function fetchSearchKeywords() {
    // 判断设备类型（PC/移动）
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const deviceType = isMobile ? "移动端" : "PC端";
    console.log(`检测到${deviceType}，将从对应来源获取热门词`);

    const cachedWords = GM_getValue('cachedHotWords');
    const cacheTime = GM_getValue('cacheTime');
    const cacheDevice = GM_getValue('cacheDevice');
    
    // 检查缓存是否有效（1小时内且设备类型一致）
    if (cachedWords && cacheTime && cacheDevice === deviceType && (Date.now() - cacheTime < 3600000)) {
        console.log(`使用${deviceType}缓存的热门词（1小时内有效）`);
        return cachedWords;
    }

    // 根据设备类型选择不同的热词来源
    const sources = isMobile ? [
        // 移动端优先微博热榜
        {
            name: "微博热榜",
            url: "https://s.weibo.com/top/summary",
            isHtml: true,
            parser: (html) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const links = tempDiv.querySelectorAll('#pl_top_realtimehot table tbody tr td.td-02 a');
                return Array.from(links).map(link => link.textContent.trim());
            }
        }
    ] : [
        // PC端优先百度热榜
        {
            name: "百度热榜",
            url: "https://top.baidu.com/api/board?tab=realtime",
            parser: (data) => data.data?.cards?.[0]?.content?.map(item => item.word) || []
        }
    ];

    for (const source of sources) {
        for (let retry = 0; retry < 2; retry++) {
            try {
                await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 10000));

                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: source.url,
                        headers: {
                            "User-Agent": getRandomUA(isMobile),
                            "Referer": source.url.includes('weibo') ? "https://s.weibo.com/" :
                                       source.url.includes('baidu') ? "https://top.baidu.com/" : ""
                        },
                        timeout: 15000,
                        onload: (res) => res.status === 200 ? resolve(res.responseText) : reject(new Error(`状态码: ${res.status}`)),
                        onerror: (e) => reject(new Error(`请求失败: ${e.message}`)),
                        ontimeout: () => reject(new Error("请求超时"))
                    });
                });

                let words = [];
                if (source.isHtml) {
                    words = source.parser(response);
                } else {
                    words = source.parser(JSON.parse(response));
                }

                const validWords = [...new Set(words)].filter(word =>
                    word && word.length >= 2 && !word.includes('http')
                );

                if (validWords.length > 0) {
                    GM_setValue('cachedHotWords', validWords);
                    GM_setValue('cacheTime', Date.now());
                    GM_setValue('cacheDevice', deviceType); // 记录缓存对应的设备类型
                    console.log(`从[${source.name}]获取到${validWords.length}个有效热词`);
                    return validWords;
                }
                throw new Error("未解析到有效热词");
            } catch (error) {
                console.warn(`[${source.name}]第${retry+1}次尝试失败:`, error);
                if (retry === 1) break;
            }
        }
    }

    console.warn(`${deviceType}热词来源失败，启用保底词库`);
    return getMergedSearchWords();
}

/**
 * 根据设备类型生成随机User-Agent
 */
function getRandomUA(isMobile) {
    const pcUAs = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0"
    ];
    
    const mobileUAs = [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0"
    ];
    
    return isMobile 
        ? mobileUAs[Math.floor(Math.random() * mobileUAs.length)]
        : pcUAs[Math.floor(Math.random() * pcUAs.length)];
}

/**
 * 搜索词混淆（用于实际搜索）
 */
function obfuscateSearchWord(str) {
    if (!str) return "";
    const obfuscChars = "abcdefghijklmnopqrstuvwxyz0123456789_";
    let result = "";
    let lastPos = 0;
    for (let i = 0; i < str.length; i += Math.floor(Math.random() * 3) + 1) {
        result += str.substring(lastPos, i + 1);
        if (Math.random() > 0.7) {
            result += obfuscChars.charAt(Math.floor(Math.random() * obfuscChars.length));
        }
        lastPos = i + 1;
    }
    return lastPos < str.length ? result + str.substring(lastPos) : result;
}

/**
 * 生成随机字符串
 */
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 平滑滚动到底部
 */
function smoothScrollToBottom() {
    const scrollTarget = document.scrollingElement || document.documentElement || document.body;
    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

/**
 * 获取当前任务状态
 */
function getTaskStatus() {
    const webCount = GM_getValue('webSearchCount') || 0;
    const mobileCount = GM_getValue('mobileSearchCount') || 0;
    const totalSearches = config.maxWebSearches + config.maxMobileSearches;

    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    const currentType = isMobile ? 'mobile' : 'web';
    const maxCount = isMobile ? config.maxMobileSearches : config.maxWebSearches;
    const currentCount = isMobile ? mobileCount : webCount;
    const isCompleted = currentCount >= maxCount;

    const overallProgressRaw = ((webCount + mobileCount) / totalSearches) * 100;
    return {
        currentType,
        currentCount,
        maxCount,
        isCompleted,
        overallProgressRaw,
        overallProgress: Math.round(overallProgressRaw)
    };
}

/**
 * 获取当前和下个搜索词
 */
function getCurrentAndNextWords(currentCount) {
    // 确保词库可用（优先热门词库，否则用保底词库）
    const activeWordList = searchWords.length > 0 ? searchWords : getMergedSearchWords();
    if (activeWordList.length === 0) {
        console.error("所有词库为空，使用默认应急词");
        activeWordList = ["默认搜索词"]; // 最终兜底
    }

    // 计算当前词索引（基于未递增的计数）
    const currentIndex = (currentCount % activeWordList.length);
    // 计算下个词索引（当前索引+1，循环取模）
    const nextIndex = (currentIndex + 1) % activeWordList.length;

    // 安全取词（防止索引异常）
    const currentWord = activeWordList[currentIndex] || activeWordList[0];
    const nextWord = activeWordList[nextIndex] || activeWordList[0];

    return { currentWord, nextWord };
}

/**
 * 核心执行函数
 */
function executeSearch() {
    createStatusPanel();
    const taskStatus = getTaskStatus();

    if (taskStatus.isCompleted) {
        updateStatusPanel();
        console.log(`今日${taskStatus.currentType}搜索任务已完成（共${taskStatus.maxCount}次）`);
        return;
    }

    // 更新页面标题
    const titleElement = document.querySelector('title');
    if (titleElement) {
        titleElement.textContent = `[${taskStatus.currentCount}/${taskStatus.maxCount}] Bing任务执行中...`;
    }

    // 模拟滚动
    smoothScrollToBottom();

    // 动态延迟（10-30秒）
    const randomDelay = Math.floor(Math.random() * 20000) + 10000;
    let remainingTime = randomDelay / 1000;

    // 获取当前和下个词
    const { currentWord: originalWord, nextWord } = getCurrentAndNextWords(taskStatus.currentCount);
    const obfuscatedWord = obfuscateSearchWord(originalWord); // 混淆后的搜索词

    // 更新面板
    updateStatusPanel({
        currentWord: obfuscatedWord,
        nextWord: nextWord,
        remainingTime
    });

    // 随机Bing域名和参数
    const bingDomain = Math.random() > 0.5 ? 'https://www.bing.com' : 'https://cn.bing.com';
    const randomForm = generateRandomString(4);
    const randomCvid = generateRandomString(32);

    // 清除旧倒计时
    if (countdownInterval) clearInterval(countdownInterval);
    if (pauseCountdownInterval) clearInterval(pauseCountdownInterval);

    // 倒计时更新
    countdownInterval = setInterval(() => {
        remainingTime -= 0.1;
        if (remainingTime <= 0) {
            clearInterval(countdownInterval);
            return;
        }
        updateStatusPanel({
            currentWord: obfuscatedWord,
            nextWord: nextWord,
            remainingTime
        });
    }, 100);

    // 执行搜索（延迟后）
    setTimeout(() => {
        clearInterval(countdownInterval);

        // 更新计数器（在搜索执行时才递增，确保取词逻辑基于原始计数）
        const nextCount = taskStatus.currentCount + 1;
        if (taskStatus.currentType === 'web') {
            GM_setValue('webSearchCount', nextCount);
        } else {
            GM_setValue('mobileSearchCount', nextCount);
        }

        // 处理暂停逻辑
        if (nextCount % config.pauseInterval === 0) {
            const pauseMinutes = config.pauseTime / 60000;
            let pauseTimeLeft = config.pauseTime / 1000; // 转换为秒

            console.log(`第${nextCount}次搜索后暂停${pauseMinutes}分钟`);

            // 启动暂停倒计时
            pauseCountdownInterval = setInterval(() => {
                pauseTimeLeft -= 1;
                updateStatusPanel({
                    pauseTimeLeft: pauseTimeLeft
                });

                if (pauseTimeLeft <= 0) {
                    clearInterval(pauseCountdownInterval);
                }
            }, 1000); // 每秒更新一次

            // 暂停结束后继续搜索
            setTimeout(() => {
                clearInterval(pauseCountdownInterval);
                window.location.href = `${bingDomain}/search?q=${encodeURIComponent(obfuscatedWord)}&form=${randomForm}&cvid=${randomCvid}&startTask=1`;
            }, config.pauseTime);

            // 立即更新面板显示暂停状态
            updateStatusPanel({
                pauseTimeLeft: pauseTimeLeft
            });
        } else {
            window.location.href = `${bingDomain}/search?q=${encodeURIComponent(obfuscatedWord)}&form=${randomForm}&cvid=${randomCvid}&startTask=1`;
        }
    }, randomDelay);
}

/**
 * 检查并启动任务
 */
async function checkAndStartTask() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('startTask')) {
        console.log("检测到启动信号，加载搜索词库");
        try {
            searchWords = await fetchSearchKeywords();
            console.log(`成功加载${searchWords.length}个搜索词`);
        } catch (err) {
            console.error("加载搜索词失败，使用保底词库", err);
            searchWords = getMergedSearchWords();
        }
        setTimeout(executeSearch, 1000);
    }
}

// 注册菜单命令
GM_registerMenuCommand('📌 开始Bing任务', () => {
    GM_setValue('webSearchCount', 0);
    GM_setValue('mobileSearchCount', 0);
    window.location.href = 'https://www.bing.com/?startTask=1';
}, 's');

GM_registerMenuCommand('🛑 停止Bing任务', () => {
    const taskStatus = getTaskStatus();
    if (taskStatus.currentType === 'web') {
        GM_setValue('webSearchCount', config.maxWebSearches);
    } else {
        GM_setValue('mobileSearchCount', config.maxMobileSearches);
    }
    if (countdownInterval) clearInterval(countdownInterval);
    if (progressTimer) clearTimeout(progressTimer);
    if (pauseCountdownInterval) clearInterval(pauseCountdownInterval);
    alert(`已停止任务，当前进度: ${taskStatus.overallProgressRaw.toFixed(2)}%`);
    if (statusPanel) updateStatusPanel();
}, 't');

GM_registerMenuCommand('🔄 清除热词缓存', () => {
    GM_setValue('cachedHotWords', null);
    GM_setValue('cacheTime', 0);
    GM_setValue('cacheDevice', null);
    alert('已清除热词缓存，下次将重新获取');
}, 'c');

GM_registerMenuCommand('📊 查看任务进度', () => {
    createStatusPanel();
    statusPanel.style.display = 'block';
}, 'p');

// 页面加载时启动检查
checkAndStartTask();