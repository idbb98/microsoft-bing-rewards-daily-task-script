// ==UserScript==
// @name         Microsoft Bing Rewards Daily Task Script (微软必应奖励每日任务脚本)
// @version      26.8.31.6
// @description  Brian 自动完成微软必应每日搜索任务，智能积累奖励积分。支持实时进度追踪、热搜关键词、随机行为模拟，安全高效获取 Bing Rewards 积分。
// @author       Brian
// @match        https://*.bing.com/*
// @match        https://login.live.com/oauth20_desktop.srf*
// @license      MIT
// @icon         https://www.bing.com/favicon.ico
// @connect      top.baidu.com
// @connect      www.toutiao.com
// @connect      r.inews.qq.com
// @connect      m.weibo.cn
// @connect      login.live.com
// @connect      prod.rewardsplatform.microsoft.com
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_log
// @grant        GM_openInTab
// @grant        GM_saveTab
// @grant        GM_closeTab
// @grant        GM_deleteValue
// @downloadURL  https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js
// @updateURL    https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/raw/master/BingRewards.user.js
// ==/UserScript==

'use strict';

// 配置参数

// 用户可配置参数表：参数名 → { key: GM 存储键, default: 默认值 }
// CONFIG 的 getter/setter、设置页读取、配置导出/导入均以此表为唯一定义处
const CONFIG_SCHEMA = {
    // 搜索form参数，⚠️ 手动进入https://cn.bing.com，确保登录后执行几次搜索，根据实际地址栏的form=xxx修改
    searchFormParam: { key: 'customSearchFormParam', default: 'QBLH' },
    // 面板默认是否收缩 (true=收缩, false=展开)
    panelDefaultCollapsed: { key: 'customPanelDefaultCollapsed', default: false },
    // 最大搜索次数
    maxSearches: { key: 'customMaxSearches', default: 20 },
    // 是否随机加词，如：人工智能发展  -->  人工1智能发z展
    randomAddSearchWords: { key: 'customRandomAddSearchWords', default: false },
    // 随机加词因子，控制加词的概率（0-1之间的小数），默认为0.3即30%概率添加字符
    randomAddSearchWordsFactor: { key: 'customRandomAddSearchWordsFactor', default: 0.3 },
    // 是否随机截词，如：人工1智能发z展  --> 人工1智
    randomCutSearchWords: { key: 'customRandomCutSearchWords', default: false },
    // 随机截词因子，控制截取的概率（0-1之间的小数），默认为0.2即20%概率截取字符
    randomCutSearchWordsFactor: { key: 'customRandomCutSearchWordsFactor', default: 0.2 },
    // 是否点击搜索结果链接
    clickSearchResults: { key: 'customClickSearchResults', default: false },
    // 暂停间隔范围：每执行多少次搜索后暂停一次的区间
    pauseIntervalMin: { key: 'customPauseIntervalMin', default: 2 },
    pauseIntervalMax: { key: 'customPauseIntervalMax', default: 3 },
    // 暂停时间范围（毫秒）：每次暂停的持续时间区间
    pauseTimeMin: { key: 'customPauseTimeMin', default: 20 * 60 * 1000 },
    pauseTimeMax: { key: 'customPauseTimeMax', default: 30 * 60 * 1000 },
    // 搜索延迟范围（毫秒）：两次搜索之间的随机延迟区间
    minDelay: { key: 'customMinDelay', default: 15 * 1000 },
    maxDelay: { key: 'customMaxDelay', default: 30 * 1000 },
    // 任务点击相关配置（日常任务 + 每日活动共用）
    tasksScrollDelay: { key: 'customTasksScrollDelay', default: 3000 },
    tasksMaxRetries: { key: 'customTasksMaxRetries', default: 0 },
    tasksRetryDelay: { key: 'customTasksRetryDelay', default: 2000 },
    tasksCloseTabDelay: { key: 'customTasksCloseTabDelay', default: 1500 },
    // 自动点击任务总开关（earn 日常任务 + dashboard 每日活动区域未完成任务共用，默认关闭）
    autoClickTasks: { key: 'customAutoClickTasks', default: false },
    // APP 端每日签到开关
    appCheckInEnabled: { key: 'customAppCheckInEnabled', default: false },
    // APP 端资讯阅读开关
    appReadEnabled: { key: 'customAppReadEnabled', default: false },
    // APP 端资讯阅读每日上报上限（篇）
    appReadDailyLimit: { key: 'customAppReadDailyLimit', default: 10 },
    // APP 端区域锁定（开启后请求固定走国区）
    appRegionLock: { key: 'customAppRegionLock', default: true }
};

const CONFIG = {
    // ==================== 脚本基础信息 ====================

    // 版本号（动态从GM_info获取）
    get version() {
        return GM_info?.script?.version || '1.0.0';
    },

    // ==================== 内部固定参数 (不建议修改) ====================

    // 网络请求超时时间（毫秒）：获取热门搜索词的最大等待时间
    requestTimeout: 20 * 1000,

    // 启动参数标记数组
    startParams: ['bingTask', 'runSearch', 'initiateSearch', 'bingSearchMode', 'autoSearch', 'startTask', 'executeSearch', 'launchSearch', 'beginSearch', 'processSearch', 'bingQuest', 'dailyTask', 'searchFlow', 'rewardsTask', 'bingBrowse', 'autoFlow']
};

// 依据参数表为 CONFIG 生成与 GM 存储一一绑定的 getter/setter（键名前缀 custom*）
Object.entries(CONFIG_SCHEMA).forEach(([name, def]) => {
    Object.defineProperty(CONFIG, name, {
        enumerable: true,
        get() {
            return GM_getValue(def.key, def.default);
        },
        set(value) {
            GM_setValue(def.key, value);
        }
    });
});

// 状态管理
const state = {
    searchWords: [],
    statusPanel: null,
    timers: new Set(),
    isRunning: false,
    countdownStartTime: 0,
    countdownDuration: 0,
    // 任务点击相关状态（earn 日常任务 / dashboard 每日活动共用流程）
    taskFlows: {
        earn: { clicked: new Set(), retryCount: 0, processing: false },
        dashboard: { clicked: new Set(), retryCount: 0, processing: false }
    },
    // APP 端任务相关状态（签到 + 资讯阅读）
    appToken: '',
    appTasks: {
        checkInDone: false,
        readDone: false,
        readCurrent: 0,
        readTotal: 0,
        authRequired: false,
        // 当日阅读进度是否已从服务端同步（页面生命周期内，避免重复查询）
        readProgressSynced: false,
        // 随机阅读是否正在执行（面板状态提示）
        readRunning: false
    }
};

// 旧参数迁移逻辑（一次性执行）：将 earnTasks* 和 dashboardTasks* 参数合并为统一的 tasks* 参数
// 优先级规则：优先使用 earnTasks* 的值（它存在更早，更可能反映用户意图），若未设置则使用 dashboardTasks*，最后使用默认值
function migrateOldTaskParams() {
    const params = ['ScrollDelay', 'MaxRetries', 'RetryDelay', 'CloseTabDelay'];
    let migrated = false;

    params.forEach(param => {
        const newKey = 'customTasks' + param;
        const oldEarnKey = 'customEarnTasks' + param;
        const oldDashboardKey = 'customDashboardTasks' + param;

        if (GM_getValue(newKey, undefined) !== undefined) {
            return;
        }

        const earnVal = GM_getValue(oldEarnKey, undefined);
        const dashboardVal = GM_getValue(oldDashboardKey, undefined);

        if (earnVal !== undefined) {
            GM_setValue(newKey, earnVal);
            migrated = true;
        } else if (dashboardVal !== undefined) {
            GM_setValue(newKey, dashboardVal);
            migrated = true;
        }

        try {
            GM_deleteValue(oldEarnKey);
            GM_deleteValue(oldDashboardKey);
        } catch (e) {
            console.log(`[Migration] 清理旧参数失败（非致命）: ${e.message}`);
        }
    });

    if (migrated) {
        console.log('[Migration] 已完成任务点击参数迁移');
    }
}
migrateOldTaskParams();

// ==================== APP 端任务模块（每日签到 + 资讯阅读） ====================

// APP 端协议常量（Rewards Platform 移动端接口契约）
const REWARDS_APP_SPEC = {
    endpoints: {
        activityReport: 'https://prod.rewardsplatform.microsoft.com/dapi/me/activities',
        accountProfile: 'https://prod.rewardsplatform.microsoft.com/dapi/me?channel=SAAndroid&options=613',
        tokenIssue: 'https://login.live.com/oauth20_token.srf',
        authorizePage: 'https://login.live.com/oauth20_authorize.srf?client_id=0000000040170455&response_type=code&scope=service::prod.rewardsplatform.microsoft.com::MBI_SSL&redirect_uri=https://login.live.com/oauth20_desktop.srf'
    },
    client: {
        appId: 'SAAndroid/32.6.2110003560',
        channel: 'SAAndroid',
        userAgent: 'Mozilla/5.0 (Linux; Android 16; Xiaomi 15 Pro Build/BP1A.250605.012; ) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/144.0.7559.132 Mobile Safari/537.36 BingSapphire/32.6.2110003560'
    },
    // 活动上报类型码：103=每日签到，101=资讯阅读
    activities: {
        checkIn: 103,
        readArticle: 101
    },
    offers: {
        checkIn: 'Gamification_Sapphire_DailyCheckIn',
        readArticle: 'ENUS_readarticle3_30points'
    },
    // 令牌超过该天数后预防性续期
    tokenMaxAgeDays: 7,
    requestTimeout: 15 * 1000
};

/**
 * APP 端网络请求封装（GM_xmlhttpRequest 的 Promise 形态）
 * 非 2xx 响应抛出携带状态码的错误，供上层识别 401 等场景
 */
function appHttpRequest(options) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: options.method || 'GET',
            url: options.url,
            headers: options.headers || {},
            data: options.data,
            timeout: REWARDS_APP_SPEC.requestTimeout,
            onload: res => {
                if (res.status >= 200 && res.status < 300) {
                    resolve(res.responseText);
                } else {
                    reject(new Error(`HTTP ${res.status}`));
                }
            },
            onerror: () => reject(new Error('网络请求失败')),
            ontimeout: () => reject(new Error('请求超时'))
        });
    });
}

/**
 * APP 端授权管理：授权码捕获 → 令牌兑换/刷新 → 续期 → 401 自动重试
 */
const AppAuth = {
    // 是否为授权落地页（login.live.com 授权跳转后的回调页）
    isAuthLandingPage() {
        return location.hostname === 'login.live.com' && location.pathname === '/oauth20_desktop.srf';
    },

    // 从 URL 中提取授权码
    extractAuthCode(url) {
        try {
            return new URL(url).searchParams.get('code') || '';
        } catch {
            return '';
        }
    },

    /**
     * 授权落地页处理：仅捕获授权码并落盘，随后通知并关页
     * 令牌兑换不在此处执行（页面即将关闭，请求易被中断），
     * 由设置页轮询或任务执行时的 ensureToken 在长生命周期上下文中完成
     */
    async handleAuthLanding() {
        const code = this.extractAuthCode(location.href);
        if (!code) return;

        GM_setValue('appPendingAuthCode', code);
        GM_setValue('appAuthLastError', '');
        GM_log('APP授权：授权码已捕获，待主页面兑换令牌');
        try {
            GM_notification({ title: 'APP任务授权', text: '授权码已捕获，即将关闭此页面', timeout: 3000 });
        } catch {}
        try { history.replaceState({}, '', 'about:blank'); } catch {}
        setTimeout(() => {
            try { window.close(); } catch {}
        }, 500);
    },

    // 打开授权页（由设置页按钮/菜单触发，复用浏览器真实登录态）
    openAuthorizePage() {
        GM_openInTab(REWARDS_APP_SPEC.endpoints.authorizePage, { active: true });
    },

    /**
     * 令牌兑换/刷新（GET 查询串形式，MSA 端点契约要求必传 client_id）
     * @param grantType 'authorization_code'（授权码兑换）或 'REFRESH_TOKEN'（刷新令牌续期）
     * @param credential 授权码或刷新令牌
     */
    async exchangeToken(grantType, credential) {
        const params = new URLSearchParams();
        params.set('client_id', '0000000040170455');
        if (grantType === 'authorization_code') {
            params.set('grant_type', 'authorization_code');
            params.set('code', credential);
            params.set('redirect_uri', 'https://login.live.com/oauth20_desktop.srf');
        } else {
            params.set('grant_type', 'REFRESH_TOKEN');
            params.set('refresh_token', credential);
            params.set('scope', 'service::prod.rewardsplatform.microsoft.com::MBI_SSL');
        }

        try {
            const res = await appHttpRequest({
                url: `${REWARDS_APP_SPEC.endpoints.tokenIssue}?${params.toString()}`
            });
            const data = utils.safeJsonParse(res, null);
            if (!data) {
                GM_setValue('appAuthLastError', '令牌响应非JSON');
                return false;
            }

            if (data.error) {
                const reason = `${data.error}${data.error_description ? ' - ' + data.error_description : ''}`;
                GM_setValue('appAuthLastError', reason);
                GM_log(`APP任务令牌错误: ${reason}`);
                if (data.error === 'invalid_grant' || data.error === 'invalid_request') {
                    this.clearCredentials();
                }
                return false;
            }
            if (data.access_token && data.refresh_token) {
                GM_setValue('appRefreshToken', data.refresh_token);
                GM_setValue('appAccessToken', data.access_token);
                GM_setValue('appTokenIssuedAt', Date.now());
                GM_setValue('appAuthLastError', '');
                state.appToken = data.access_token;
                state.appTasks.authRequired = false;
                GM_log(`APP授权：令牌已获取（${grantType === 'authorization_code' ? '授权码兑换' : '刷新续期'}）`);
                return true;
            }
            GM_setValue('appAuthLastError', '令牌响应缺少字段');
            return false;
        } catch (e) {
            GM_setValue('appAuthLastError', `请求失败: ${e.message}`);
            GM_log(`APP任务令牌请求失败: ${e.message}`);
            if (e.message.includes('400') || e.message.includes('401')) {
                this.clearCredentials();
            }
            return false;
        }
    },

    // 清空本地令牌凭据
    clearCredentials() {
        GM_setValue('appRefreshToken', '');
        GM_setValue('appAccessToken', '');
        GM_setValue('appTokenIssuedAt', 0);
        GM_setValue('appPendingAuthCode', '');
        state.appToken = '';
    },

    // 当前刷新令牌的持有天数（无记录时视为无穷大）
    tokenAgeDays() {
        const issuedAt = GM_getValue('appTokenIssuedAt', 0);
        return issuedAt > 0 ? (Date.now() - issuedAt) / (24 * 60 * 60 * 1000) : Infinity;
    },

    /**
     * 确保内存中存在有效令牌：
     * 补兑换暂存授权码 → 校验有效期（超7天续期）→ 刷新令牌续期
     * 全部失败时标记待授权并返回 false
     */
    async ensureToken() {
        // 补兑换：落地页兑换失败时暂存的授权码
        const pendingCode = GM_getValue('appPendingAuthCode', '');
        if (!state.appToken && pendingCode) {
            GM_setValue('appPendingAuthCode', '');
            if (await this.exchangeToken('authorization_code', pendingCode)) return true;
        }

        // 优先恢复本地缓存的访问令牌（页面跳转后内存令牌丢失，避免每次搜索页都刷新令牌）
        if (!state.appToken) {
            const cachedToken = GM_getValue('appAccessToken', '');
            if (cachedToken && this.tokenAgeDays() <= REWARDS_APP_SPEC.tokenMaxAgeDays) {
                state.appToken = cachedToken;
            }
        }

        if (state.appToken) {
            if (this.tokenAgeDays() > REWARDS_APP_SPEC.tokenMaxAgeDays) {
                GM_log('APP任务令牌已超7天，提前续期');
                state.appToken = '';
            } else {
                return true;
            }
        }

        const refreshToken = GM_getValue('appRefreshToken', '');
        if (refreshToken && await this.exchangeToken('REFRESH_TOKEN', refreshToken)) {
            return true;
        }

        state.appTasks.authRequired = true;
        return false;
    },

    /**
     * 请求包装：401 时清空令牌、重新刷新并原请求重试一次
     * 刷新失败返回 null（标记待授权），其他错误向上抛出
     */
    async withAuth(requestFn) {
        if (!state.appToken) return null;
        try {
            return await requestFn(state.appToken);
        } catch (e) {
            if (e.message && e.message.includes('401')) {
                GM_log('APP任务令牌过期，尝试刷新后重试');
                state.appToken = '';
                GM_setValue('appAccessToken', '');
                GM_setValue('appTokenIssuedAt', 0);
                const refreshToken = GM_getValue('appRefreshToken', '');
                if (refreshToken && await this.exchangeToken('REFRESH_TOKEN', refreshToken)) {
                    return await requestFn(state.appToken);
                }
                state.appTasks.authRequired = true;
                return null;
            }
            throw e;
        }
    }
};

/**
 * APP 端业务接口：签到上报、阅读上报、阅读进度查询
 */
const AppApi = {
    // 请求区域（锁定时固定国区）
    getRegion() {
        return CONFIG.appRegionLock ? 'cn' : String(GM_getValue('appAccountRegion', 'cn')).toLowerCase();
    },

    // 组装移动端公共请求头
    buildHeaders(extra) {
        return Object.assign({
            'content-type': 'application/json; charset=UTF-8',
            'user-agent': REWARDS_APP_SPEC.client.userAgent,
            'x-rewards-appid': REWARDS_APP_SPEC.client.appId,
            'x-rewards-ismobile': 'true',
            'x-rewards-country': this.getRegion(),
            'x-rewards-language': 'zh'
        }, extra || {});
    },

    // 生成64位hex随机活动ID（模拟移动端活动上报格式）
    generateActivityId() {
        if (window.crypto && crypto.getRandomValues) {
            const bytes = new Uint8Array(32);
            crypto.getRandomValues(bytes);
            return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        }
        let id = '';
        for (let i = 0; i < 64; i++) id += Math.floor(Math.random() * 16).toString(16);
        return id;
    },

    // 解析活动上报响应（积分/重复标记/余额）
    parseActivityResponse(res) {
        const data = utils.safeJsonParse(res, null);
        if (!data || !data.response) return null;
        return {
            points: Number(data.response.activity?.p || 0),
            duplicate: Boolean(data.response.isDuplicate),
            balance: Number(data.response.balance || 0)
        };
    },

    // 解析阅读进度（从账户画像的 promotions 中匹配阅读活动）
    parseReadProgress(res) {
        const data = utils.safeJsonParse(res, null);
        const promos = data?.response?.promotions || [];
        const task = promos.find(p => p.attributes?.offerid === REWARDS_APP_SPEC.offers.readArticle);
        if (task && task.attributes) {
            return {
                current: parseInt(task.attributes.progress) || 0,
                total: parseInt(task.attributes.max) || 30
            };
        }
        return null;
    },

    /**
     * 每日签到上报（type=103，无 offerid）
     * 返回 {points, duplicate}；isDuplicate/空 activity 视为当日已签（幂等成功）
     */
    async reportCheckIn() {
        const region = this.getRegion();
        try {
            const res = await AppAuth.withAuth(token => appHttpRequest({
                method: 'POST',
                url: REWARDS_APP_SPEC.endpoints.activityReport,
                headers: this.buildHeaders({
                    authorization: `Bearer ${token}`,
                    'x-rewards-partnerid': 'startapp',
                    'x-rewards-flights': 'rwgobig'
                }),
                data: JSON.stringify({
                    amount: 1,
                    id: this.generateActivityId(),
                    type: REWARDS_APP_SPEC.activities.checkIn,
                    country: region,
                    channel: REWARDS_APP_SPEC.client.channel
                })
            }));
            if (res === null) return null;

            const result = this.parseActivityResponse(res);
            if (result) {
                // 有积分为成功；无积分（含 isDuplicate/空 activity）按当日已签的幂等成功处理
                return { points: result.points, duplicate: result.duplicate || result.points === 0 };
            }
            return null;
        } catch (e) {
            GM_log(`APP签到请求失败: ${e.message}`);
            return null;
        }
    },

    /**
     * 单篇资讯阅读上报（type=101，attributes 携带阅读活动标识）
     * 返回 {points, duplicate}；失败返回 null
     */
    async reportArticleRead() {
        const region = this.getRegion();
        try {
            const res = await AppAuth.withAuth(token => appHttpRequest({
                method: 'POST',
                url: REWARDS_APP_SPEC.endpoints.activityReport,
                headers: this.buildHeaders({ authorization: `Bearer ${token}` }),
                data: JSON.stringify({
                    amount: 1,
                    id: this.generateActivityId(),
                    type: REWARDS_APP_SPEC.activities.readArticle,
                    country: region,
                    channel: REWARDS_APP_SPEC.client.channel,
                    attributes: { offerid: REWARDS_APP_SPEC.offers.readArticle }
                })
            }));
            if (res === null) return null;

            const result = this.parseActivityResponse(res);
            if (result && (result.points > 0 || result.duplicate)) {
                return result;
            }
            return null;
        } catch (e) {
            GM_log(`APP阅读请求失败: ${e.message}`);
            return null;
        }
    },

    // 查询阅读进度（当前/上限）
    async queryReadProgress() {
        try {
            const res = await AppAuth.withAuth(token => appHttpRequest({
                url: REWARDS_APP_SPEC.endpoints.accountProfile,
                headers: this.buildHeaders({ authorization: `Bearer ${token}` })
            }));
            if (res === null) return null;
            return this.parseReadProgress(res);
        } catch (e) {
            GM_log(`APP阅读进度查询失败: ${e.message}`);
            return null;
        }
    }
};

/**
 * APP 端任务编排：签到流程、阅读流程、日期戳幂等、重试计数
 */
const AppTaskRunner = {
    // 当日日期戳（YYYYMMDD 数字形式）
    getTodayNum() {
        const now = new Date();
        return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`);
    },

    // 同步当日签到完成状态到内存（供面板渲染）
    syncCheckInState() {
        const today = this.getTodayNum();
        state.appTasks.checkInDone = GM_getValue('appCheckInDate', 0) === today;
        if (state.appTasks.checkInDone) {
            state.appTasks.checkInPoints = GM_getValue('appCheckInPoints', 0);
        }
    },

    getRetryCounters() {
        return GM_getValue('appTaskRetryCounters', {});
    },

    // 重试计数跨日清零（保证每日重试额度与完成兜底可靠生效）
    resetRetryCountersIfNewDay() {
        const today = this.getTodayNum();
        if (GM_getValue('appTaskRetryDate', 0) !== today) {
            GM_setValue('appTaskRetryCounters', {});
            GM_setValue('appTaskRetryDate', today);
        }
    },

    bumpRetry(taskName) {
        const counters = this.getRetryCounters();
        counters[taskName] = (counters[taskName] || 0) + 1;
        GM_setValue('appTaskRetryCounters', counters);
    },

    // 任务重试次数是否未用尽（每任务每日最多2次）
    retryLeft(taskName) {
        return (this.getRetryCounters()[taskName] || 0) < 2;
    },

    // APP 任务是否已全部完成（开关关闭的任务视为完成）
    isAllDone() {
        const today = this.getTodayNum();
        const checkInDone = !CONFIG.appCheckInEnabled || GM_getValue('appCheckInDate', 0) === today;
        const readDone = !CONFIG.appReadEnabled || GM_getValue('appReadDate', 0) === today;
        return checkInDone && readDone;
    },

    // 当日 APP 阅读已上报篇数（跨页面跳转持久化，受每日上限约束）
    getReadReportedToday() {
        if (GM_getValue('appReadReportedDate', 0) !== this.getTodayNum()) return 0;
        return GM_getValue('appReadReportedCount', 0);
    },

    bumpReadReported() {
        if (GM_getValue('appReadReportedDate', 0) !== this.getTodayNum()) {
            GM_setValue('appReadReportedDate', this.getTodayNum());
            GM_setValue('appReadReportedCount', 0);
        }
        GM_setValue('appReadReportedCount', GM_getValue('appReadReportedCount', 0) + 1);
    },

    /**
     * APP 签到流程入口（搜索开始前执行）：授权校验 → 签到 → 更新面板
     * 资讯阅读不在此处执行，改为每次搜索前随机穿插上报（见 runRandomReads）
     */
    async runCheckInFlow() {
        if (!CONFIG.appCheckInEnabled) return;
        this.syncCheckInState();
        this.resetRetryCountersIfNewDay();

        createStatusPanel();

        if (!(await AppAuth.ensureToken())) {
            GM_log('APP任务待授权，跳过执行（请在设置中点击「开始APP授权」）');
            updateStatusPanel();
            return;
        }

        try {
            await this.runCheckIn();
        } catch (e) {
            GM_log(`APP签到异常: ${e.message}`);
        }
        updateStatusPanel();
    },

    /**
     * APP 端任务总入口（搜索完成后的兜底补跑）：授权校验 → 签到 → 资讯阅读
     * 各任务独立 try/catch 隔离，互不影响也不阻断搜索主任务
     */
    async runAll() {
        if (!CONFIG.appCheckInEnabled && !CONFIG.appReadEnabled) return;
        this.syncCheckInState();
        this.resetRetryCountersIfNewDay();

        createStatusPanel();

        if (!(await AppAuth.ensureToken())) {
            GM_log('APP任务待授权，跳过执行（请在设置中点击「开始APP授权」）');
            updateStatusPanel();
            return;
        }

        try {
            await this.runCheckIn();
        } catch (e) {
            GM_log(`APP签到异常: ${e.message}`);
        }
        try {
            await this.runArticleRead();
        } catch (e) {
            GM_log(`APP阅读异常: ${e.message}`);
        }
        updateStatusPanel();
    },

    // 每日签到流程：幂等判断 → 上报 → 日期戳落盘
    async runCheckIn() {
        if (!CONFIG.appCheckInEnabled) return;
        const today = this.getTodayNum();

        if (state.appTasks.checkInDone) {
            GM_log(`APP签到今日已完成（+${GM_getValue('appCheckInPoints', 0)}积分）`);
            return;
        }
        if (!this.retryLeft('checkIn')) {
            GM_log('APP签到重试次数已用尽，今日不再执行');
            return;
        }

        const result = await AppApi.reportCheckIn();
        if (result) {
            const points = result.points || 0;
            GM_setValue('appCheckInDate', today);
            GM_setValue('appCheckInPoints', points);
            state.appTasks.checkInDone = true;
            state.appTasks.checkInPoints = points;
            GM_log(points > 0
                ? `APP签到成功，+${points}积分`
                : 'APP签到确认完成（今日已签，无新增积分）');
        } else {
            this.bumpRetry('checkIn');
            GM_log('APP签到失败，稍后重试');
        }
    },

    /**
     * 搜索前随机阅读：随机上报 0-3 篇（受剩余缺口与每日上报上限约束）
     * 失败不消耗重试预算（预算仅由兜底流程消耗，避免每日约20次调用放大耗尽）
     * 进度优先从当日 GM 缓存恢复，未缓存时实时查询；当日已完成直接跳过
     */
    async runRandomReads() {
        if (!CONFIG.appReadEnabled) return;
        const today = this.getTodayNum();

        // 当日已完成：直接跳过（进度二次校验由搜索完成后的兜底流程负责）
        if (GM_getValue('appReadDate', 0) === today) return;
        // 重试预算已耗尽（由兜底流程消耗），当日不再尝试
        if (!this.retryLeft('read')) return;
        // 本地无令牌凭据（从未授权/凭据已清除）
        if (!state.appToken && !GM_getValue('appRefreshToken', '')) return;

        createStatusPanel();
        state.appTasks.readRunning = true;
        updateStatusPanel();

        try {
            if (!(await AppAuth.ensureToken())) return;

            // 当日进度未同步：优先恢复缓存，未缓存再实时查询真实进度
            if (!state.appTasks.readProgressSynced && !this.restoreCachedReadProgress()) {
                const progress = await this.syncReadProgress();
                if (!progress) {
                    GM_log('APP阅读进度获取失败，跳过本次随机阅读');
                    return;
                }
                if (progress.current >= progress.total) return;
            }

            const limitLeft = CONFIG.appReadDailyLimit - this.getReadReportedToday();
            const remaining = state.appTasks.readTotal - state.appTasks.readCurrent;
            const maxBatch = Math.min(remaining, limitLeft);
            if (maxBatch <= 0) return;

            // 随机执行 0-3 次 APP 阅读上报
            const batch = Math.min(maxBatch, Math.floor(Math.random() * 4));
            if (batch <= 0) return;

            GM_log(`APP阅读进度 ${state.appTasks.readCurrent}/${state.appTasks.readTotal}，搜索前随机上报 ${batch} 篇`);
            await this.reportReadBatch(batch, false);
        } finally {
            state.appTasks.readRunning = false;
            updateStatusPanel();
        }
    },

    /**
     * 从当日 GM 缓存恢复阅读进度到内存（跨页面跳转免重复查询）
     * 返回是否命中当日缓存
     */
    restoreCachedReadProgress() {
        const cache = GM_getValue('appReadProgressCache', null);
        if (!cache || cache.date !== this.getTodayNum()) return false;
        state.appTasks.readCurrent = cache.current;
        state.appTasks.readTotal = cache.total;
        state.appTasks.readProgressSynced = true;
        return true;
    },

    /**
     * 同步当日真实阅读进度到内存（随机阅读与面板实时渲染共用）
     * 返回进度对象；查询失败返回 null
     */
    async syncReadProgress() {
        const today = this.getTodayNum();
        const progress = await AppApi.queryReadProgress();
        if (!progress) return null;

        state.appTasks.readCurrent = progress.current;
        state.appTasks.readTotal = progress.total;
        state.appTasks.readProgressSynced = true;
        // 持久化当日进度（跨页面跳转恢复，避免每次搜索页都重复查询）
        GM_setValue('appReadProgressCache', { date: today, current: progress.current, total: progress.total });
        updateStatusPanel();

        if (progress.current >= progress.total) {
            GM_setValue('appReadDate', today);
            state.appTasks.readDone = true;
            GM_log(`APP阅读任务已完成（已验证 ${progress.current}/${progress.total}）`);
        } else if (GM_getValue('appReadDate', 0) === today) {
            // 误标自愈：日期戳已标记完成但真实进度未达标，重置后继续
            GM_log(`APP阅读标记有误（${progress.current}/${progress.total}），重置后继续`);
            GM_setValue('appReadDate', 0);
            state.appTasks.readDone = false;
        }
        return progress;
    },

    /**
     * 批量阅读上报：逐篇上报 + 篇间随机间隔，全部完成后落盘日期戳
     * @param {number} count 本次上报篇数
     * @param {boolean} countRetry 失败时是否消耗重试预算（随机阅读不消耗，兜底补跑消耗）
     */
    async reportReadBatch(count, countRetry = false) {
        const today = this.getTodayNum();

        for (let i = 0; i < count; i++) {
            const result = await AppApi.reportArticleRead();
            if (!result) {
                GM_log(`APP阅读第 ${i + 1} 篇上报失败，中止本次循环`);
                if (countRetry) this.bumpRetry('read');
                return;
            }
            // 重复上报（服务端未新增计数）不累加本地计数，防止进度漂移
            if (!result.duplicate) {
                state.appTasks.readCurrent++;
            }
            this.bumpReadReported();
            GM_setValue('appReadProgressCache', { date: today, current: state.appTasks.readCurrent, total: state.appTasks.readTotal });
            updateStatusPanel();
            if (state.appTasks.readTotal > 0 && state.appTasks.readCurrent >= state.appTasks.readTotal) break;
            // 篇间随机间隔，模拟真实阅读行为
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000 + Math.floor(Math.random() * 5000)));
            }
        }

        if (state.appTasks.readTotal > 0 && state.appTasks.readCurrent >= state.appTasks.readTotal) {
            GM_setValue('appReadDate', today);
            state.appTasks.readDone = true;
            GM_log('APP阅读任务完成');
            updateStatusPanel();
        }
    },

    /**
     * 资讯阅读兜底流程（搜索完成后补跑）：实时查询进度 → 缺口循环上报
     */
    async runArticleRead() {
        if (!CONFIG.appReadEnabled) return;

        const progress = await this.syncReadProgress();
        if (!progress) {
            this.bumpRetry('read');
            GM_log('APP阅读进度获取失败，稍后重试');
            return;
        }
        if (progress.current >= progress.total) return;
        if (!this.retryLeft('read')) {
            GM_log('APP阅读重试次数已用尽，今日不再执行');
            return;
        }

        const limitLeft = CONFIG.appReadDailyLimit - this.getReadReportedToday();
        const remaining = Math.min(progress.total - progress.current, limitLeft);
        if (remaining <= 0) {
            GM_log(`APP阅读已达每日上报上限（${CONFIG.appReadDailyLimit} 篇），今日不再上报`);
            return;
        }

        GM_log(`APP阅读进度 ${progress.current}/${progress.total}，本次上报 ${remaining} 篇（每日上限 ${CONFIG.appReadDailyLimit} 篇）`);
        await this.reportReadBatch(remaining, true);
    }
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
        const today = utils.getTodayStr();
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
            console.log(`Selected start parameter for today: ${startParam}`);
            return startParam;
        } else {
            // 返回当天已选择的参数
            const startParam = GM_getValue(todayStartParamKey);
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

    // HTML转义（外部内容写入面板前必须转义，防止注入）
    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // 获取本地日期字符串（格式：YYYY-MM-DD）
    getTodayStr() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
            if (!document.hidden) {
                callback();
            }
        });
    },

    // 获取ISO周数（返回1-53）
    getWeekNumber(d) {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    },

    // 获取当前年份和ISO周数组成的字符串，如 "2026-W27"
    getWeekString() {
        const now = new Date();
        return now.getFullYear() + '-W' + String(this.getWeekNumber(now)).padStart(2, '0');
    }
};

/**
 * 为按钮绑定悬停/按压样式（enter/leave/down/up 四态对应的 style 属性集合）
 */
function addButtonHoverEffects(btn, { enter, leave, down, up }) {
    if (!btn) return;
    if (enter) btn.addEventListener('mouseenter', () => Object.assign(btn.style, enter));
    if (leave) btn.addEventListener('mouseleave', () => Object.assign(btn.style, leave));
    if (down) btn.addEventListener('mousedown', () => Object.assign(btn.style, down));
    if (up) btn.addEventListener('mouseup', () => Object.assign(btn.style, up));
}

// 搜索词库
const SEARCH_WORDS = [
    // 日常生活类
    "今天天气怎么样", "附近有什么好吃的", "怎么做红烧肉", "天气预报",
    "快递查询", "手机丢了怎么办", "忘记密码怎么找回", "如何办理身份证",
    "地铁线路图", "公交时刻表", "医院挂号流程", "社保怎么交",
    "个人所得税怎么算", "公积金提取条件", "居住证办理流程",

    // 购物消费
    "淘宝优惠券", "京东白条怎么用", "拼多多靠谱吗", "二手交易平台",
    "哪个牌子的空调好", "冰箱怎么选", "洗衣机推荐", "扫地机器人测评",
    "运动鞋品牌对比", "护肤品推荐", "化妆品正品查询",

    // 美食餐饮
    "附近奶茶店", "火锅底料做法", "蛋糕烘焙教程", "减肥餐食谱",
    "早餐吃什么健康", "外卖平台哪个好", "咖啡机推荐", "空气炸锅食谱",
    "家常菜做法", "烘焙入门教程", "日料制作", "西餐做法",

    // 旅游出行
    "周末去哪玩", "假期旅游攻略", "机票什么时候买便宜", "酒店比价",
    "签证办理流程", "自驾游路线推荐", "背包客装备清单", "民宿预订平台",
    "高铁票怎么抢", "航班延误怎么办", "旅行保险有必要吗",

    // 学习工作
    "Excel技巧大全", "PPT模板下载", "Python入门教程", "英语学习方法",
    "考研复习资料", "公务员考试条件", "简历怎么写", "面试技巧",
    "远程办公软件", "时间管理方法", "职场沟通技巧", "副业赚钱项目",
    "在线课程平台", "编程学习路线", "数据分析工具",

    // 娱乐休闲
    "最近好看的电影", "Netflix推荐剧集", "switch游戏推荐", "Steam打折游戏",
    "抖音热门视频", "B站up主推荐", "音乐播放器哪个好", "耳机音质对比",
    "摄影入门教程", "吉他教学视频", "绘画学习app", "手账制作教程",

    // 健康运动
    "健身房怎么选", "瑜伽初学者动作", "跑步姿势纠正", "减脂增肌计划",
    "失眠怎么办", "颈椎保健操", "护眼方法", "久坐危害",
    "体检项目有哪些", "疫苗接种预约", "心理咨询哪里好", "中医调理方法",

    // 科技数码
    "WiFi信号增强方法", "电脑卡顿怎么办", "手机电池保养", "数据备份方案",
    "智能家居设备推荐", "路由器怎么选", "NAS搭建教程", "云服务器价格",
    "AI工具有哪些", "ChatGPT使用技巧", "VR眼镜值得买吗", "无人机航拍技巧",

    // 金融理财
    "基金定投策略", "股票开户流程", "理财产品对比", "信用卡积分兑换",
    "房贷利率计算", "养老保险怎么交", "儿童教育金规划", "应急资金准备",
    "通货膨胀影响", "黄金投资方式", "外汇交易入门", "税务筹划方法",

    // 家居装修
    "小户型装修灵感", "家具购买指南", "除甲醛方法", "智能家居安装",
    "墙面颜色搭配", "厨房收纳技巧", "卫生间防水处理", "阳台改造方案",
    "灯具选择建议", "窗帘搭配技巧", "地板材质对比", "装修公司怎么选",

    // 亲子教育
    "早教机构推荐", "儿童绘本清单", "学区房政策", "兴趣班选择",
    "亲子游目的地", "儿童营养餐", "育儿经验分享", "家庭教育方法",
    "暑假活动安排", "儿童安全常识", "青少年心理健康", "留学申请流程",

    // 汽车交通
    "新能源汽车补贴", "二手车估值", "驾校报名流程", "违章查询",
    "车险怎么买划算", "汽车保养周期", "新能源车充电桩", "堵车路段查询",
    "停车位怎么找", "共享汽车平台", "摩托车驾照考试", "电动车新国标",

    // 宠物养护
    "猫咪喂养指南", "狗狗训练方法", "宠物医院推荐", "猫粮品牌对比",
    "宠物美容教程", "鱼缸 setup", "鸟笼清洁", "仓鼠饲养注意事项",
    "宠物保险有必要吗", "流浪猫救助", "宠物寄养服务", "训犬师推荐",

    // 本地生活
    "附近停车场", "药店营业时间", "超市促销信息", "理发店推荐",
    "洗衣店价格", "修手机的地方", "开锁电话", "搬家公司收费",
    "家政保洁服务", "管道疏通电话", "家电维修", "宠物洗澡",

    // 实用工具查询
    "汇率换算", "单位转换", "日历农历", "黄道吉日",
    "成语解释", "诗词鉴赏", "历史事件查询", "名人传记",
    "地图导航", "翻译软件", "计算器在线", "单位换算器"
];


/**
 * 构建搜索URL
 */
function buildSearchUrl(searchWord) {
    const domain = 'https://cn.bing.com';
    const form = CONFIG.searchFormParam;

    const length = searchWord.length;
    const hitPosition = Math.random() < 0.9 ? 0 : Math.floor(Math.random() * Math.min(length, 5)) + 1;
    const sc = `${hitPosition}-${length}`;

    const urlParams = new URLSearchParams({
        q: searchWord,
        form,
        sp: -1,
        lq: 0,
        pq: searchWord,
        sc,
        qs: 'n',
        sk: '',
        cvid: utils.generateId(),
    });

    const startParam = utils.getRandomStartParam();
    return `${domain}/search?${urlParams.toString()}&${startParam}=1`;
}

/**
 * 每周首次执行时显示提示（优化UI版 + 道歉语）
 */
function showWeeklyTip() {
    const currentWeek = utils.getWeekString();
    const storedWeek = GM_getValue('lastWeeklyTipWeek', '');
    if (currentWeek === storedWeek) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.55);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(6px);
        animation: fadeIn 0.3s ease;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        background: #ffffff;
        border-radius: 20px;
        padding: 0;
        max-width: 440px;
        width: 92%;
        box-shadow: 0 24px 80px rgba(0,0,0,0.3);
        position: relative;
        overflow: hidden;
        animation: dialogSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        background: linear-gradient(135deg, #0067b8, #00bcf2);
        padding: 28px 28px 20px;
        color: #fff;
        text-align: center;
    `;
    header.innerHTML = `
        <div style="font-size: 48px; line-height: 1; margin-bottom: 8px;">⭐</div>
        <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">支持作者</div>
        <div style="font-size: 13px; opacity: 0.85; margin-top: 4px;">您的 Star 是我持续更新的动力</div>
    `;
    card.appendChild(header);

    const body = document.createElement('div');
    body.style.cssText = `
        padding: 24px 28px 80px 28px;
        position: relative;
    `;
    body.innerHTML = `
        <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 8px 0;">
            本脚本完全免费，如果对你有帮助，请给作者一个 <strong style="color: #0067b8;">Star</strong> 支持一下！
        </p>   
        <div style="font-size: 12px; color: #bbb; margin-top: 8px; text-align: center;">
            〒 本通知一周弹一次，如有打扰，非常抱歉。
        </div>
    `;
    card.appendChild(body);

    const btn = document.createElement('button');
    btn.textContent = '前往支持';
    btn.style.cssText = `
        position: absolute;
        bottom: 24px;
        right: 28px;
        padding: 12px 28px;
        background: linear-gradient(135deg, #0067b8, #00bcf2);
        color: #fff;
        border: none;
        border-radius: 40px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.2s;
        box-shadow: 0 6px 20px rgba(0, 103, 184, 0.35);
        letter-spacing: 0.3px;
    `;
    addButtonHoverEffects(btn, {
        enter: { transform: 'scale(1.05)', boxShadow: '0 8px 28px rgba(0, 103, 184, 0.5)' },
        leave: { transform: 'scale(1)', boxShadow: '0 6px 20px rgba(0, 103, 184, 0.35)' },
        down: { transform: 'scale(0.95)' },
        up: { transform: 'scale(1.05)' }
    });
    btn.onclick = () => {
        window.open('https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/', '_blank');
        overlay.remove();
    };
    body.appendChild(btn);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 12px;
        right: 16px;
        background: rgba(255,255,255,0.2);
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 18px;
        color: #fff;
        cursor: pointer;
        transition: background 0.2s, transform 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    addButtonHoverEffects(closeBtn, {
        enter: { background: 'rgba(255,255,255,0.35)', transform: 'scale(1.1)' },
        leave: { background: 'rgba(255,255,255,0.2)', transform: 'scale(1)' }
    });
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    GM_setValue('lastWeeklyTipWeek', currentWeek);
}

/**
 * 创建状态面板
 */
function createStatusPanel() {
    if (state.statusPanel) return state.statusPanel;

    const panel = document.createElement('div');
    panel.id = 'bing-rewards-panel';

    // 从配置中读取默认展开/收缩状态
    const defaultCollapsed = CONFIG.panelDefaultCollapsed;
    state.isPanelCollapsed = defaultCollapsed;

    panel.innerHTML = `
        <div id="panel-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0;">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                <div id="panel-title-container" style="flex:1;min-width:0;">
                    <h3 style="margin:0;font-size:16px;color:var(--panel-primary-color,#0067b8);white-space:nowrap;font-weight:700;letter-spacing:-0.3px;">
                        Brian Tool
                    </h3>
                    <div style="font-size:11px;color:var(--panel-text-muted,#999);margin-top:2px;font-weight:500;">
                        自动化搜索任务助手
                    </div>
                </div>
                <div id="panel-countdown" style="font-size:12px;color:var(--panel-text-secondary,#666);white-space:nowrap;font-weight:600;margin-left:12px;padding:6px 12px;background:linear-gradient(135deg,var(--panel-hover-bg,#f5f5f5),var(--panel-bg,#fff));border-radius:8px;border:1px solid var(--panel-border,#eee);box-shadow:0 2px 6px rgba(0,0,0,0.05);"></div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-left:12px;">
                <div id="panel-toggle-btn" style="cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);flex-shrink:0;background:transparent;user-select:none;position:relative;" title="${defaultCollapsed ? '展开面板' : '收起面板'}">
                    <span id="toggle-icon" style="font-size:16px;line-height:1;display:inline-block;transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);transform:rotate(${defaultCollapsed ? '0deg' : '180deg'});">🔽</span>
                </div>
                <div id="panel-settings-btn" style="cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);flex-shrink:0;background:transparent;font-size:18px;user-select:none;" title="打开设置">
                    ⚙️
                </div>
                <div id="panel-close-btn" style="cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);flex-shrink:0;background:transparent;font-size:16px;user-select:none;" title="关闭面板">
                    ✕
                </div>
            </div>
        </div>
        <div id="panel-body" style="animation:slideDown 0.3s cubic-bezier(0.4,0,0.2,1);">
            <div id="panel-content"></div>
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--panel-border,#eee);display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <span id="page-status" style="display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--panel-text-muted,#999);font-weight:500;white-space:nowrap;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#107c10;box-shadow:0 0 6px rgba(16,124,16,0.5);animation:pulse 2s ease-in-out infinite;"></span>
                    <span id="page-status-text">页面活跃</span>
                </span>
                <span id="task-running-status" style="display:none;align-items:center;gap:5px;font-size:11px;color:var(--panel-primary-color,#0067b8);font-weight:600;">
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--panel-primary-color,#0067b8);animation:pulse 1.5s ease-in-out infinite;"></span>
                    正在执行搜索任务...
                </span>
                <span style="font-size:10px;color:var(--panel-text-muted,#999);opacity:0.6;font-weight:500;white-space:nowrap;">v${GM_info.script.version}</span>
            </div>
        </div>
    `;

    // 添加CSS动画样式
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.6;
                transform: scale(1.2);
            }
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
                max-height: 0;
            }
            to {
                opacity: 1;
                transform: translateY(0);
                max-height: 1000px;
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-5px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* ===== 基础布局（桌面 >1024px，尺寸/位置全部由 CSS 管理，JS 仅切换状态类） ===== */
        #bing-rewards-panel {
            position: fixed;
            bottom: 50px;
            right: 20px;
            border-radius: 20px;
            padding: 24px;
            /* 宽度计算含 padding/border，避免小屏 min-width 撑破视口导致左侧遮挡 */
            box-sizing: border-box;
            min-width: 380px;
            max-width: 420px;
            /* 展开态防溢出：内容过多时面板内部滚动 */
            max-height: calc(100vh - 80px);
            overflow-y: auto;
            box-shadow: 0 16px 48px var(--panel-shadow), 0 0 0 1px var(--panel-border), 0 0 80px var(--panel-primary-glow);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* 自定义滚动条（深浅色主题由变量适配） */
        #bing-rewards-panel::-webkit-scrollbar {
            width: 6px;
        }
        #bing-rewards-panel::-webkit-scrollbar-track {
            background: transparent;
        }
        #bing-rewards-panel::-webkit-scrollbar-thumb {
            background: var(--panel-text-muted);
            border-radius: 3px;
            opacity: 0.4;
        }

        /* 展开态头部底部留白（收缩态重置，见下方状态类规则） */
        #bing-rewards-panel #panel-header {
            padding-bottom: 16px;
        }

        /* 展开态隐藏倒计时（收缩态显示，见下方状态类规则） */
        #bing-rewards-panel #panel-countdown {
            display: none;
        }

        /* ===== 收缩状态（所有断点一致交互：类切换即完成视觉转换） ===== */
        #bing-rewards-panel.collapsed {
            padding: 10px 16px;
            min-width: 200px;
            width: fit-content;
            max-height: none;
            overflow-y: visible;
            box-shadow: 0 8px 24px var(--panel-shadow), 0 0 0 1px var(--panel-border);
        }
        /* 收缩态重置头部底部内边距，消除多余高度 */
        #bing-rewards-panel.collapsed #panel-header {
            padding-bottom: 0;
        }
        #bing-rewards-panel.collapsed #panel-body {
            display: none;
        }
        #bing-rewards-panel.collapsed #panel-title-container {
            display: none;
        }
        #bing-rewards-panel.collapsed #panel-countdown {
            display: block;
        }

        /* ===== 响应式断点（@media 平铺写法，兼容不支持 CSS 嵌套的旧浏览器） ===== */

        /* 平板横屏/窄桌面 ≤1024px */
        @media (max-width: 1024px) {
            #bing-rewards-panel {
                right: 16px;
                max-width: 440px;
            }
            #bing-rewards-panel.collapsed {
                max-width: 60vw;
            }
        }

        /* 平板竖屏/大屏手机 ≤768px */
        @media (max-width: 768px) {
            #bing-rewards-panel {
                right: 12px;
                bottom: 24px;
                min-width: calc(100vw - 48px);
                max-width: calc(100vw - 48px);
                border-radius: 16px;
                max-height: calc(100vh - 48px);
            }
            #bing-rewards-panel.collapsed {
                min-width: 0;
                max-width: 60vw;
            }
        }

        /* 手机 ≤480px */
        @media (max-width: 480px) {
            #bing-rewards-panel {
                right: 12px;
                bottom: 12px;
                padding: 14px;
                min-width: calc(100vw - 24px);
                max-width: calc(100vw - 24px);
                max-height: calc(100vh - 40px);
            }
            #bing-rewards-panel.collapsed {
                padding: 10px 14px;
                max-width: 70vw;
            }

            /* 面板头部响应式 */
            #bing-rewards-panel #panel-header {
                padding: 0 0 10px 0;
                gap: 6px;
            }

            /* 面板头部标题容器 */
            #bing-rewards-panel #panel-title-container h3 {
                font-size: 14px;
            }

            #bing-rewards-panel #panel-title-container div {
                font-size: 10px;
            }

            /* 倒计时响应式 */
            #bing-rewards-panel #panel-countdown {
                font-size: 11px;
                padding: 5px 10px;
                margin-left: 8px;
            }

            /* 按钮响应式 */
            #bing-rewards-panel #panel-toggle-btn,
            #bing-rewards-panel #panel-settings-btn,
            #bing-rewards-panel #panel-close-btn {
                width: 28px;
                height: 28px;
                font-size: 14px;
            }

            /* 面板底部状态栏响应式 */
            #bing-rewards-panel #panel-body > div:last-child {
                flex-wrap: wrap;
                gap: 6px;
                padding-top: 10px;
                margin-top: 12px;
            }

            /* 任务摘要行（单行 4 列）小屏保持单行：列内 ellipsis 收缩防溢出 */
            #bing-rewards-panel #panel-content > div {
                gap: 8px;
            }
        }

        /* 小屏手机 ≤360px */
        @media (max-width: 360px) {
            #bing-rewards-panel {
                padding: 12px;
                min-width: calc(100vw - 16px);
                max-width: calc(100vw - 16px);
            }
            #bing-rewards-panel.collapsed {
                max-width: 72vw;
            }

            /* 隐藏副标题，保留主标题 */
            #bing-rewards-panel #panel-title-container div {
                display: none;
            }

            #bing-rewards-panel #panel-title-container h3 {
                font-size: 13px;
            }

            #bing-rewards-panel #panel-toggle-btn,
            #bing-rewards-panel #panel-settings-btn,
            #bing-rewards-panel #panel-close-btn {
                width: 26px;
                height: 26px;
                font-size: 13px;
            }
        }
    `;
    document.head.appendChild(styleElement);

    // 检测系统主题并应用相应的CSS变量
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 定义主题变量
    const themeVariables = {
        light: {
            '--panel-bg': '#ffffff',
            '--panel-border': '#e0e0e0',
            '--panel-shadow': 'rgba(0, 0, 0, 0.1)',
            '--panel-primary-color': '#0067b8',
            '--panel-text-primary': '#1a1a1a',
            '--panel-text-secondary': '#666666',
            '--panel-text-muted': '#999999',
            '--panel-progress-bg': '#f0f0f0',
            '--panel-success-bg': '#f0f9f0',
            '--panel-success-text': '#107c10',
            '--panel-warning-bg': '#fff8e6',
            '--panel-warning-border': '#ffb900',
            '--panel-warning-text': '#8a6900',
            '--panel-info-bg': '#f0f7ff',
            '--panel-info-text': '#005a9e',
            '--panel-hover-bg': '#f5f5f5',
            '--panel-primary-glow': 'rgba(0, 103, 184, 0.06)'
        },
        dark: {
            '--panel-bg': '#1e1e1e',
            '--panel-border': '#3f3f3f',
            '--panel-shadow': 'rgba(0, 0, 0, 0.4)',
            '--panel-primary-color': '#4fc3f7',
            '--panel-text-primary': '#e0e0e0',
            '--panel-text-secondary': '#b0b0b0',
            '--panel-text-muted': '#888888',
            '--panel-progress-bg': '#2d2d2d',
            '--panel-success-bg': '#1a3a1a',
            '--panel-success-text': '#4caf50',
            '--panel-warning-bg': '#3d3520',
            '--panel-warning-border': '#ffa726',
            '--panel-warning-text': '#ffd54f',
            '--panel-info-bg': '#1a2a3a',
            '--panel-info-text': '#64b5f6',
            '--panel-hover-bg': '#2a2a2a',
            '--panel-primary-glow': 'rgba(79, 195, 247, 0.08)'
        }
    };

    const theme = isDarkMode ? themeVariables.dark : themeVariables.light;

    // 尺寸/位置/内边距/阴影全部由 CSS 状态类管理（响应式断点统一生效），内联仅保留主题与视觉特性
    if (defaultCollapsed) {
        panel.classList.add('collapsed');
    }
    Object.assign(panel.style, {
        position: 'fixed',
        background: theme['--panel-bg'],
        border: `1px solid ${theme['--panel-border']}`,
        zIndex: '10000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '13px',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        color: theme['--panel-text-primary'],
        letterSpacing: '-0.2px'
    });

    // 设置CSS变量
    Object.entries(theme).forEach(([key, value]) => {
        panel.style.setProperty(key, value);
    });

    document.body.appendChild(panel);
    state.statusPanel = panel;

    // 为展开/收缩按钮添加事件监听器
    const toggleBtn = document.getElementById('panel-toggle-btn');
    const panelBody = document.getElementById('panel-body');
    const panelHeader = document.getElementById('panel-header');
    const countdownElement = document.getElementById('panel-countdown');

    if (toggleBtn && panelBody && panelHeader) {
        toggleBtn.addEventListener('click', () => {
            state.isPanelCollapsed = !state.isPanelCollapsed;

            // 同步更新 Config 的缓存值
            CONFIG.panelDefaultCollapsed = state.isPanelCollapsed;

            // 状态切换由 CSS 类驱动：body 显隐、标题/倒计时切换、尺寸/阴影/内边距在所有断点下统一生效
            panel.classList.toggle('collapsed', state.isPanelCollapsed);
            const toggleIcon = document.getElementById('toggle-icon');
            if (toggleIcon) {
                toggleIcon.style.transform = state.isPanelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
            }
            toggleBtn.title = state.isPanelCollapsed ? '展开面板' : '收起面板';

            // 立即更新面板内容以刷新倒计时显示
            updateStatusPanel();

            // 展开面板时实时获取最新任务数据
            if (!state.isPanelCollapsed) {
                refreshAppTaskPanelData();
            }
        });

        // 添加悬停效果
        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.backgroundColor = theme['--panel-hover-bg'];
            toggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            const toggleIcon = document.getElementById('toggle-icon');
            if (toggleIcon) {
                toggleIcon.style.transform = state.isPanelCollapsed ? 'scale(1.1) rotate(0deg)' : 'scale(1.1) rotate(180deg)';
            }
        });

        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.backgroundColor = 'transparent';
            toggleBtn.style.boxShadow = 'none';
            const toggleIcon = document.getElementById('toggle-icon');
            if (toggleIcon) {
                toggleIcon.style.transform = state.isPanelCollapsed ? 'scale(1) rotate(0deg)' : 'scale(1) rotate(180deg)';
            }
        });

        toggleBtn.addEventListener('mousedown', () => {
            const toggleIcon = document.getElementById('toggle-icon');
            if (toggleIcon) {
                toggleIcon.style.transform = state.isPanelCollapsed ? 'scale(0.95) rotate(0deg)' : 'scale(0.95) rotate(180deg)';
            }
        });

        toggleBtn.addEventListener('mouseup', () => {
            const toggleIcon = document.getElementById('toggle-icon');
            if (toggleIcon) {
                toggleIcon.style.transform = state.isPanelCollapsed ? 'scale(1.1) rotate(0deg)' : 'scale(1.1) rotate(180deg)';
            }
        });
    }

    // 为设置按钮添加事件监听器
    const settingsBtn = document.getElementById('panel-settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showSettingsDialog(theme);
        });

        // 添加悬停效果
        addButtonHoverEffects(settingsBtn, {
            enter: { backgroundColor: theme['--panel-hover-bg'], transform: 'scale(1.1) rotate(30deg)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
            leave: { backgroundColor: 'transparent', transform: 'scale(1) rotate(0deg)', boxShadow: 'none' },
            down: { transform: 'scale(0.95) rotate(30deg)' },
            up: { transform: 'scale(1.1) rotate(30deg)' }
        });
    }

    // 为关闭按钮添加事件监听器
    const closeBtn = document.getElementById('panel-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // 添加悬停效果
        addButtonHoverEffects(closeBtn, {
            enter: { backgroundColor: '#ffebee', color: '#f44336', transform: 'scale(1.1) rotate(90deg)', boxShadow: '0 2px 8px rgba(244,67,54,0.2)' },
            leave: { backgroundColor: 'transparent', color: theme['--panel-text-secondary'], transform: 'scale(1) rotate(0deg)', boxShadow: 'none' },
            down: { transform: 'scale(0.95) rotate(90deg)' },
            up: { transform: 'scale(1.1) rotate(90deg)' }
        });
    }

    // 监听系统主题变化
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = (e) => {
            const newTheme = e.matches ? themeVariables.dark : themeVariables.light;

            // 更新面板背景
            panel.style.background = newTheme['--panel-bg'];
            panel.style.borderColor = newTheme['--panel-border'];
            panel.style.color = newTheme['--panel-text-primary'];
            // 阴影由 CSS 状态类引用变量渲染（--panel-shadow/--panel-border/--panel-primary-glow），更新变量即自动生效

            // 更新CSS变量
            Object.entries(newTheme).forEach(([key, value]) => {
                panel.style.setProperty(key, value);
            });

            // 更新按钮颜色
            if (toggleBtn) {
                toggleBtn.style.color = newTheme['--panel-text-secondary'];
            }
            if (settingsBtn) {
                settingsBtn.style.color = newTheme['--panel-text-secondary'];
            }
            if (closeBtn) {
                closeBtn.style.color = newTheme['--panel-text-secondary'];
            }

            // 重新渲染面板内容
            updateStatusPanel();
        };

        // 兼容不同浏览器
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleThemeChange);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleThemeChange);
        }
    }

    // 监听页面可见性变化
    utils.handleVisibilityChange(updateStatusPanel);

    // 面板创建后实时获取任务数据（页面刷新后进度实时同步）
    refreshAppTaskPanelData();

    updateStatusPanel();
    return panel;
}

/**
 * 显示设置对话框
 */
function showSettingsDialog(theme) {
    // 检查是否已存在对话框
    const existingDialog = document.getElementById('settings-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // 每次打开对话框时重新获取最新配置值（CONFIG getter 实时读取 GM 存储，无缓存）
    const saved = {};
    Object.keys(CONFIG_SCHEMA).forEach(name => {
        saved[name] = CONFIG[name];
    });
    // 面板展示单位换算：暂停时间毫秒→分钟，搜索延迟毫秒→秒
    const savedPauseTimeMin = saved.pauseTimeMin / 60000;
    const savedPauseTimeMax = saved.pauseTimeMax / 60000;
    const savedMinDelay = saved.minDelay / 1000;
    const savedMaxDelay = saved.maxDelay / 1000;
    // APP 端授权状态（根据本地刷新令牌判断）
    const appAuthRefreshToken = GM_getValue('appRefreshToken', '');
    const appAuthIssuedAt = GM_getValue('appTokenIssuedAt', 0);
    const appAuthStatusText = appAuthRefreshToken
        ? `已授权（${Math.floor((Date.now() - appAuthIssuedAt) / 86400000)}天前）`
        : '未授权';

    console.log('📋 加载最新设置:', {
        searchFormParam: saved.searchFormParam,
        panelCollapsed: saved.panelDefaultCollapsed,
        maxSearches: saved.maxSearches,
        randomAdd: saved.randomAddSearchWords,
        randomAddFactor: saved.randomAddSearchWordsFactor,
        randomCut: saved.randomCutSearchWords,
        randomCutFactor: saved.randomCutSearchWordsFactor,
        clickSearchResults: saved.clickSearchResults,
        pauseInterval: `${saved.pauseIntervalMin}-${saved.pauseIntervalMax}`,
        pauseTime: `${savedPauseTimeMin}-${savedPauseTimeMax}分钟`,
        delay: `${savedMinDelay}-${savedMaxDelay}秒`,
        autoClickTasks: saved.autoClickTasks
    });

    // 版本号（从CONFIG获取）
    const currentVersion = CONFIG.version;

    // 创建设置对话框
    const dialog = document.createElement('div');
    dialog.id = 'settings-dialog';
    dialog.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:fadeIn 0.2s ease;">
            <div class="dialog-container" style="background:${theme['--panel-bg']};border:1px solid ${theme['--panel-border']};border-radius:24px;padding:0;min-width:600px;max-width:800px;width:92vw;max-height:90vh;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,0.6),0 0 0 1px ${theme['--panel-border']}40;animation:dialogSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1);display:flex;flex-direction:column;">
                <!-- 固定头部 -->
                <div class="dialog-header" style="display:flex;justify-content:space-between;align-items:center;padding:20px 32px;flex-wrap:wrap;gap:16px;background:linear-gradient(135deg,${theme['--panel-bg']} 0%,${theme['--panel-hover-bg']} 100%);">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div class="dialog-header-icon" style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,${theme['--panel-primary-color']},${theme['--panel-primary-color']}cc);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 12px ${theme['--panel-primary-color']}40;">
                            🌐
                        </div>
                        <div>
                            <h3 style="margin:0;font-size:24px;color:${theme['--panel-primary-color']};font-weight:800;letter-spacing:-0.5px;">
                                Brian Tool
                            </h3>
                            <p style="margin:4px 0 0;font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">
                                v${currentVersion}
                            </p>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <!-- 搜索框 -->
                        <div id="search-wrapper" style="position:relative;flex:1;max-width:280px;">
                            <input type="text" id="settings-search-input"
                                style="width:100%;box-sizing:border-box;padding:10px 14px 10px 40px;border:2px solid ${theme['--panel-border']};border-radius:10px;font-size:13px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:42px;"
                                placeholder="搜索设置项...">
                            <span id="search-icon" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:${theme['--panel-text-muted']};font-size:14px;">🔍</span>
                            <button id="clear-search-btn" style="display:none;position:absolute;right:12px;top:50%;transform:translateY(-50%);color:${theme['--panel-text-muted']};font-size:14px;cursor:pointer;background:none;border:none;padding:2px;" title="清除搜索">✕</button>
                        </div>
                        <!-- 导航标签 -->
                        <div class="nav-tabs" style="display:flex;gap:4px;background:${theme['--panel-bg']};padding:4px;border-radius:10px;border:1px solid ${theme['--panel-border']};">
                            <button id="nav-settings-btn" class="nav-tab active" style="padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;color:#ffffff;background:${theme['--panel-primary-color']};border:none;cursor:pointer;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);">
                                ⚙️ 设置
                            </button>
                            <button id="nav-about-btn" class="nav-tab" style="padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;color:${theme['--panel-text-secondary']};background:transparent;border:none;cursor:pointer;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);">
                                ℹ️ 关于
                            </button>
                        </div>

                        <div id="settings-close-btn" class="dialog-close-btn" style="cursor:pointer;font-size:20px;color:${theme['--panel-text-secondary']};width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:12px;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);background:transparent;user-select:none;" title="关闭设置">
                            ✕
                        </div>
                    </div>
                </div>

                <!-- 可滚动内容区 -->
                <div class="dialog-content" style="padding:24px 32px;overflow-y:auto;flex:1;">
                    <!-- 基础配置 -->
                    <div class="config-section" style="margin-bottom:24px;" data-section="基础配置">
                        <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${theme['--panel-primary-color']}20;cursor:pointer;" title="点击展开/收起">
                            <div class="section-icon" style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-info-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                🔧
                            </div>
                            <div style="flex:1;">
                                <h4 class="section-title" style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    基础配置
                                </h4>
                                <p class="section-desc" style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    设置脚本运行的基本参数
                                </p>
                            </div>
                            <span class="section-toggle" style="font-size:14px;color:${theme['--panel-text-muted']};transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">▼</span>
                        </div>
                        <div class="section-content" style="overflow:hidden;max-height:1000px;transition:max-height 0.3s ease, opacity 0.3s ease;">
                        <div class="form-card" style="margin-bottom:18px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="搜索表单参数 form参数">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">🔍</span>
                                搜索表单参数
                                <span style="color:#f44336;">*</span>
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="登录必应后手动搜索几次，从地址栏获取form=xxx参数值">❓</span>
                            </label>
                            <input type="text" id="search-form-param-input" class="form-input" value="${utils.escapeHtml(saved.searchFormParam)}"
                                style="width:100%;box-sizing:border-box;padding:14px 16px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:48px;font-weight:500;letter-spacing:0.5px;"
                                placeholder="例如: QBLH">
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>登录必应后手动搜索几次，从地址栏获取 <code style="background:${theme['--panel-bg']};padding:3px 8px;border-radius:6px;font-family:'Courier New',monospace;font-size:11px;font-weight:600;border:1px solid ${theme['--panel-border']};">form=xxx</code> 参数值</span>
                            </div>
                        </div>

                        <div class="form-card" style="margin-bottom:18px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="每日最大搜索次数 搜索次数">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">📊</span>
                                每日最大搜索次数
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="设置每日执行的最大搜索次数，建议10-20次">❓</span>
                            </label>
                            <input type="number" id="max-searches-input" class="form-input" value="${saved.maxSearches}" min="1" max="50"
                                style="width:100%;box-sizing:border-box;padding:14px 16px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:48px;font-weight:500;"
                                placeholder="建议 10-20 次">
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">⚠️</span>
                                <span>建议设置为 <strong style="color:${theme['--panel-warning-text']};">10-20次</strong>，过高可能触发微软风控机制，增加账号风险</span>
                            </div>
                        </div>

                        <div class="form-card" style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="面板默认显示状态 面板状态">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">📱</span>
                                面板默认显示状态
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="选择脚本加载时面板的默认显示状态">❓</span>
                            </label>
                            <div class="radio-cards" style="display:flex;gap:12px;">
                                <label class="radio-card" style="flex:1;display:flex;align-items:center;gap:12px;padding:16px;border:2px solid ${!saved.panelDefaultCollapsed ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:12px;background:${!saved.panelDefaultCollapsed ? 'linear-gradient(135deg,' + theme['--panel-success-bg'] + ',' + theme['--panel-hover-bg'] + ')' : theme['--panel-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;">
                                    <input type="radio" name="panel-default-state" value="expanded" ${!saved.panelDefaultCollapsed ? 'checked' : ''}
                                        style="width:20px;height:20px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                    <div style="flex:1;">
                                        <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:2px;">✨ 展开状态</div>
                                        <div style="font-size:11px;color:${theme['--panel-text-muted']};">显示完整面板信息</div>
                                    </div>
                                </label>
                                <label class="radio-card" style="flex:1;display:flex;align-items:center;gap:12px;padding:16px;border:2px solid ${saved.panelDefaultCollapsed ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:12px;background:${saved.panelDefaultCollapsed ? 'linear-gradient(135deg,' + theme['--panel-info-bg'] + ',' + theme['--panel-hover-bg'] + ')' : theme['--panel-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;">
                                    <input type="radio" name="panel-default-state" value="collapsed" ${saved.panelDefaultCollapsed ? 'checked' : ''}
                                        style="width:20px;height:20px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                    <div style="flex:1;">
                                        <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:2px;">🔽 收缩状态</div>
                                        <div style="font-size:11px;color:${theme['--panel-text-muted']};">仅显示标题栏</div>
                                    </div>
                                </label>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>选择脚本加载时面板的默认显示状态，可随时手动切换</span>
                            </div>
                        </div>
                        </div>
                    </div>

                    <!-- 搜索行为配置 -->
                    <div class="config-section" style="margin-bottom:24px;" data-section="搜索行为优化">
                        <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${theme['--panel-primary-color']}20;cursor:pointer;" title="点击展开/收起">
                            <div class="section-icon" style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-success-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                🎲
                            </div>
                            <div style="flex:1;">
                                <h4 class="section-title" style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    搜索行为优化
                                </h4>
                                <p class="section-desc" style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    模拟真实用户搜索习惯，降低检测风险
                                </p>
                            </div>
                            <span class="section-toggle" style="font-size:14px;color:${theme['--panel-text-muted']};transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">▼</span>
                        </div>
                        <div class="section-content" style="overflow:hidden;max-height:1000px;transition:max-height 0.3s ease, opacity 0.3s ease;">
                        <div class="checkbox-cards" style="display:flex;gap:14px;margin-bottom:14px;">
                            <label class="checkbox-card" style="flex:1;display:flex;align-items:flex-start;gap:12px;padding:18px;border:2px solid ${saved.randomAddSearchWords ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:14px;background:${saved.randomAddSearchWords ? 'linear-gradient(135deg,' + theme['--panel-info-bg'] + ',transparent)' : theme['--panel-hover-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;" data-search-tags="随机加词功能 加词">
                                ${saved.randomAddSearchWords ? '<div class="badge" style="position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:' + theme['--panel-primary-color'] + ';color:#fff;font-size:10px;font-weight:700;">已启用</div>' : ''}
                                <input type="checkbox" id="random-add-checkbox" ${saved.randomAddSearchWords ? 'checked' : ''}
                                    style="width:20px;height:20px;margin-top:2px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                <div style="flex:1;">
                                    <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                        <span style="font-size:16px;">🔤</span>
                                        随机加词功能
                                    </div>
                                    <div style="font-size:12px;color:${theme['--panel-text-muted']};line-height:1.6;background:${theme['--panel-bg']};padding:8px 10px;border-radius:8px;border:1px solid ${theme['--panel-border']};font-family:'Courier New',monospace;">
                                        人工智能发展 → 人工1智能发z展
                                    </div>
                                </div>
                            </label>
                            <label class="checkbox-card" style="flex:1;display:flex;align-items:flex-start;gap:12px;padding:18px;border:2px solid ${saved.randomCutSearchWords ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:14px;background:${saved.randomCutSearchWords ? 'linear-gradient(135deg,' + theme['--panel-success-bg'] + ',transparent)' : theme['--panel-hover-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;" data-search-tags="随机截词功能 截词">
                                ${saved.randomCutSearchWords ? '<div class="badge" style="position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:' + theme['--panel-primary-color'] + ';color:#fff;font-size:10px;font-weight:700;">已启用</div>' : ''}
                                <input type="checkbox" id="random-cut-checkbox" ${saved.randomCutSearchWords ? 'checked' : ''}
                                    style="width:20px;height:20px;margin-top:2px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                <div style="flex:1;">
                                    <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                        <span style="font-size:16px;">✂️</span>
                                        随机截词功能
                                    </div>
                                    <div style="font-size:12px;color:${theme['--panel-text-muted']};line-height:1.6;background:${theme['--panel-bg']};padding:8px 10px;border-radius:8px;border:1px solid ${theme['--panel-border']};font-family:'Courier New',monospace;">
                                        人工1智能发展 → 人工1智
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div class="factor-inputs" style="display:flex;gap:14px;margin-bottom:14px;">
                            <div class="factor-input-card" style="flex:1;padding:18px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="加词触发概率">
                                <label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;color:${theme['--panel-text-primary']};font-weight:600;">
                                    加词触发概率
                                    <span class="help-icon" style="font-size:12px;color:${theme['--panel-text-muted']};cursor:help;" title="控制加词功能的触发概率，0-1之间，值越高触发概率越大">❓</span>
                                </label>
                                <input type="number" id="random-add-factor-input" class="form-input" value="${saved.randomAddSearchWordsFactor}" min="0" max="1" step="0.1"
                                    style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid ${theme['--panel-border']};border-radius:10px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:46px;font-weight:600;">
                                <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:11px;color:${theme['--panel-text-muted']};">范围：0-1</span>
                                    <span style="font-size:11px;color:${theme['--panel-primary-color']};font-weight:600;background:${theme['--panel-info-bg']};padding:3px 8px;border-radius:6px;">默认 0.3 (30%)</span>
                                </div>
                            </div>
                            <div class="factor-input-card" style="flex:1;padding:18px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="截词触发概率">
                                <label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;color:${theme['--panel-text-primary']};font-weight:600;">
                                    截词触发概率
                                    <span class="help-icon" style="font-size:12px;color:${theme['--panel-text-muted']};cursor:help;" title="控制截词功能的触发概率，0-1之间，值越高触发概率越大">❓</span>
                                </label>
                                <input type="number" id="random-cut-factor-input" class="form-input" value="${saved.randomCutSearchWordsFactor}" min="0" max="1" step="0.1"
                                    style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid ${theme['--panel-border']};border-radius:10px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:46px;font-weight:600;">
                                <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:11px;color:${theme['--panel-text-muted']};">范围：0-1</span>
                                    <span style="font-size:11px;color:${theme['--panel-primary-color']};font-weight:600;background:${theme['--panel-info-bg']};padding:3px 8px;border-radius:6px;">默认 0.2 (20%)</span>
                                </div>
                            </div>
                        </div>
                        <div class="form-hint" style="font-size:12px;color:${theme['--panel-text-muted']};line-height:1.8;padding:14px 16px;background:linear-gradient(135deg,${theme['--panel-warning-bg']},${theme['--panel-hover-bg']});border-radius:10px;display:flex;align-items:flex-start;gap:8px;border-left:3px solid ${theme['--panel-warning-border']};">
                            <span style="flex-shrink:0;font-size:16px;">💡</span>
                            <div>
                                <strong style="color:${theme['--panel-text-primary']};">使用建议：</strong>开启后可有效混淆搜索行为，模拟真人输入习惯。因子值越高，触发概率越大。建议保持默认值，既能保证真实性，又不会影响搜索效果。
                            </div>
                        </div>
                        <div class="checkbox-cards" style="margin-top:14px;">
                            <label class="checkbox-card" style="flex:1;display:flex;align-items:flex-start;gap:12px;padding:18px;border:2px solid ${saved.clickSearchResults ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:14px;background:${saved.clickSearchResults ? 'linear-gradient(135deg,' + theme['--panel-success-bg'] + ',transparent)' : theme['--panel-hover-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;" data-search-tags="点击搜索结果链接">
                                ${saved.clickSearchResults ? '<div class="badge" style="position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:' + theme['--panel-primary-color'] + ';color:#fff;font-size:10px;font-weight:700;">已启用</div>' : ''}
                                <input type="checkbox" id="click-search-results-checkbox" ${saved.clickSearchResults ? 'checked' : ''}
                                    style="width:20px;height:20px;margin-top:2px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                <div style="flex:1;">
                                    <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                        <span style="font-size:16px;">🔗</span>
                                        点击搜索结果链接
                                    </div>
                                    <div style="font-size:12px;color:${theme['--panel-text-muted']};line-height:1.8;background:${theme['--panel-bg']};padding:12px 14px;border-radius:8px;border:1px solid ${theme['--panel-border']};">
                                        <div style="margin-bottom:8px;">搜索完成后自动点击（非100%）一个搜索结果链接，模拟真实用户行为。</div>
                                        <div style="color:${theme['--panel-warning-color']};font-weight:500;padding:6px 8px;background:${theme['--panel-warning-bg']};border-radius:6px;border-left:3px solid ${theme['--panel-warning-color']};">
                                            ⚠️ 注意：首次运行请允许弹出窗口。
                                        </div>
                                    </div>
                                </div>
                            </label>
                        </div>
                        </div>
                    </div>

                    <!-- 暂停配置 -->
                    <div class="config-section" style="margin-bottom:24px;" data-section="智能暂停策略">
                        <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${theme['--panel-primary-color']}20;cursor:pointer;" title="点击展开/收起">
                            <div class="section-icon" style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-warning-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                ⏸️
                            </div>
                            <div style="flex:1;">
                                <h4 class="section-title" style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    智能暂停策略
                                </h4>
                                <p class="section-desc" style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    模拟人类休息节奏，大幅降低检测风险
                                </p>
                            </div>
                            <span class="section-toggle" style="font-size:14px;color:${theme['--panel-text-muted']};transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">▼</span>
                        </div>
                        <div class="section-content" style="overflow:hidden;max-height:1000px;transition:max-height 0.3s ease, opacity 0.3s ease;">
                        <div class="form-card" style="margin-bottom:16px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="暂停间隔设置">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">🔄</span>
                                暂停间隔设置
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="设置每执行多少次搜索后暂停一次">❓</span>
                            </label>
                            <div class="interval-inputs" style="display:flex;gap:12px;align-items:center;">
                                <div class="interval-input-card" style="flex:1;position:relative;">
                                    <input type="number" id="pause-interval-min-input" class="form-input" value="${saved.pauseIntervalMin}" min="1" max="20"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:50px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">次</span>
                                </div>
                                <span style="color:${theme['--panel-text-muted']};font-size:14px;font-weight:600;padding:0 4px;">至</span>
                                <div class="interval-input-card" style="flex:1;position:relative;">
                                    <input type="number" id="pause-interval-max-input" class="form-input" value="${saved.pauseIntervalMax}" min="1" max="20"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:50px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">次</span>
                                </div>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">📝</span>
                                <span>默认每完成 <strong style="color:${theme['--panel-primary-color']};">2-3次</strong> 搜索后随机暂停一次，模拟人类工作节奏</span>
                            </div>
                        </div>

                        <div class="form-card" style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="暂停时长设置">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">⏱️</span>
                                暂停时长设置
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="设置每次暂停的持续时间">❓</span>
                            </label>
                            <div class="interval-inputs" style="display:flex;gap:12px;align-items:center;">
                                <div class="interval-input-card" style="flex:1;position:relative;">
                                    <input type="number" id="pause-time-min-input" class="form-input" value="${savedPauseTimeMin}" min="1" max="60" step="1"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:65px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">分钟</span>
                                </div>
                                <span style="color:${theme['--panel-text-muted']};font-size:14px;font-weight:600;padding:0 4px;">至</span>
                                <div class="interval-input-card" style="flex:1;position:relative;">
                                    <input type="number" id="pause-time-max-input" class="form-input" value="${savedPauseTimeMax}" min="1" max="120" step="1"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:65px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">分钟</span>
                                </div>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">⚠️</span>
                                <span>建议设置为 <strong style="color:${theme['--panel-warning-text']};">20-30分钟</strong>，有效模拟人类休息间隔，显著降低账号被封风险</span>
                            </div>
                        </div>
                        </div>
                    </div>

                    <!-- 延迟配置 -->
                    <div class="config-section" style="margin-bottom:24px;" data-section="搜索延迟控制">
                        <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${theme['--panel-primary-color']}20;cursor:pointer;" title="点击展开/收起">
                            <div class="section-icon" style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-info-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                ⏱️
                            </div>
                            <div style="flex:1;">
                                <h4 class="section-title" style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    搜索延迟控制
                                </h4>
                                <p class="section-desc" style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    控制搜索间隔时间，避免过于频繁
                                </p>
                            </div>
                            <span class="section-toggle" style="font-size:14px;color:${theme['--panel-text-muted']};transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">▼</span>
                        </div>
                        <div class="section-content" style="overflow:hidden;max-height:1000px;transition:max-height 0.3s ease, opacity 0.3s ease;">
                        <div class="form-card" style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="搜索间隔时间">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">⏳</span>
                                两次搜索之间的间隔时间
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="设置两次搜索之间的随机延迟时间范围">❓</span>
                            </label>
                            <div class="delay-inputs" style="display:flex;gap:12px;align-items:center;">
                                <div class="interval-input-card" style="flex:1;position:relative;">
                                    <input type="number" id="min-delay-input" class="form-input" value="${savedMinDelay}" min="5" max="60" step="1"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:45px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">秒</span>
                                </div>
                                <span style="color:${theme['--panel-text-muted']};font-size:14px;font-weight:600;padding:0 4px;">至</span>
                                <div class="interval-input-card" style="flex:1;position:relative;">
                                    <input type="number" id="max-delay-input" class="form-input" value="${savedMaxDelay}" min="10" max="120" step="1"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:45px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">秒</span>
                                </div>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>建议设置为 <strong style="color:${theme['--panel-primary-color']};">15-30秒</strong>，模拟真人浏览搜索结果页的自然节奏</span>
                            </div>
                        </div>
                        </div>
                    </div>

                    <!-- 任务点击配置（日常任务 + 每日活动共用） -->
                    <div class="config-section" style="margin-bottom:24px;" data-section="任务点击">
                        <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${theme['--panel-primary-color']}20;cursor:pointer;" title="点击展开/收起">
                            <div class="section-icon" style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-info-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                🎯
                            </div>
                            <div style="flex:1;">
                                <h4 class="section-title" style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    任务点击
                                </h4>
                                <p class="section-desc" style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    自动点击 earn 日常任务与 dashboard 每日活动区域未完成任务（共用配置）
                                </p>
                            </div>
                            <span class="section-toggle" style="font-size:14px;color:${theme['--panel-text-muted']};transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">▼</span>
                        </div>
                        <div class="section-content" style="overflow:hidden;max-height:1000px;transition:max-height 0.3s ease, opacity 0.3s ease;">
                        <div class="checkbox-cards" style="margin-bottom:16px;">
                            <label class="checkbox-card" style="flex:1;display:flex;align-items:flex-start;gap:12px;padding:18px;border:2px solid ${saved.autoClickTasks ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:14px;background:${saved.autoClickTasks ? 'linear-gradient(135deg,' + theme['--panel-success-bg'] + ',transparent)' : theme['--panel-hover-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;" data-search-tags="自动点击任务 任务总开关 新版页面">
                                ${saved.autoClickTasks ? '<div class="badge" style="position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:' + theme['--panel-primary-color'] + ';color:#fff;font-size:10px;font-weight:700;">已启用</div>' : ''}
                                <input type="checkbox" id="auto-click-tasks-checkbox" ${saved.autoClickTasks ? 'checked' : ''}
                                    style="width:20px;height:20px;margin-top:2px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                <div style="flex:1;">
                                    <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                        <span style="font-size:16px;">⚡</span>
                                        自动点击任务
                                    </div>
                                    <div style="font-size:12px;color:${theme['--panel-text-muted']};line-height:1.8;background:${theme['--panel-bg']};padding:12px 14px;border-radius:8px;border:1px solid ${theme['--panel-border']};">
                                        <div style="margin-bottom:8px;">总开关，控制 earn 日常任务 与 dashboard 每日活动区域未完成任务的自动点击，默认关闭。</div>
                                        <div style="color:${theme['--panel-primary-color']};font-weight:500;padding:6px 8px;background:${theme['--panel-info-bg']};border-radius:6px;border-left:3px solid ${theme['--panel-primary-color']};margin-bottom:8px;">
                                            📌 任务点击仅支持新版 Microsoft Rewards 页面
                                        </div>
                                        <div style="color:${theme['--panel-warning-color']};font-weight:500;padding:6px 8px;background:${theme['--panel-warning-bg']};border-radius:6px;border-left:3px solid ${theme['--panel-warning-color']};">
                                            ⚠️ 关闭后上述自动点击将全部不再执行，仅保留搜索任务。
                                        </div>
                                    </div>
                                </div>
                            </label>
                        </div>
                        <div class="form-card" style="margin-bottom:16px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="滚动等待时间 任务滚动等待">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">⏳</span>
                                滚动后等待时间
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="滚动到任务区域后等待页面加载的时间">❓</span>
                            </label>
                            <div style="position:relative;">
                                <input type="number" id="tasks-scroll-delay-input" class="form-input" value="${saved.tasksScrollDelay}" min="1000" max="10000" step="500"
                                    style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:65px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">毫秒</span>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>默认 <strong style="color:${theme['--panel-primary-color']};">3000毫秒</strong>（3秒），滚动到任务区域后等待页面加载的时间</span>
                            </div>
                        </div>

                        <div class="form-card" style="margin-bottom:16px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="最大重试次数 任务重试">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">🔄</span>
                                最大重试次数
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="未找到任务时的最大重试次数，0表示不重试">❓</span>
                            </label>
                            <div style="position:relative;">
                                <input type="number" id="tasks-max-retries-input" class="form-input" value="${saved.tasksMaxRetries}" min="0" max="3" step="1"
                                    style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:50px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">次</span>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>默认 <strong style="color:${theme['--panel-primary-color']};">0次</strong>（不重试），未找到任务时等待页面加载后重试的次数</span>
                            </div>
                        </div>

                        <div class="form-card" style="margin-bottom:16px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="重试延迟 任务重试延迟">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">⏱️</span>
                                重试延迟
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="每次重试之间的等待时间">❓</span>
                            </label>
                            <div style="position:relative;">
                                <input type="number" id="tasks-retry-delay-input" class="form-input" value="${saved.tasksRetryDelay}" min="500" max="10000" step="500"
                                    style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:65px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">毫秒</span>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>默认 <strong style="color:${theme['--panel-primary-color']};">2000毫秒</strong>（2秒），每次重试之间的等待时间</span>
                            </div>
                        </div>

                        <div class="form-card" style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="关闭标签页延迟 任务关闭延迟">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">🚪</span>
                                完成后关闭延迟
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="任务处理完成后关闭标签页前的等待时间">❓</span>
                            </label>
                            <div style="position:relative;">
                                <input type="number" id="tasks-close-tab-delay-input" class="form-input" value="${saved.tasksCloseTabDelay}" min="1000" max="30000" step="1000"
                                    style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:65px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">毫秒</span>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>默认 <strong style="color:${theme['--panel-primary-color']};">1500毫秒</strong>（1.5秒），任务处理完成后等待一段时间再关闭标签页</span>
                            </div>
                        </div>
                        </div>
                    </div>

                    <!-- APP 端任务 -->
                    <div class="config-section" style="margin-bottom:24px;" data-section="APP端任务">
                        <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${theme['--panel-primary-color']}20;cursor:pointer;" title="点击展开/收起">
                            <div class="section-icon" style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-info-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                📱
                            </div>
                            <div style="flex:1;">
                                <h4 class="section-title" style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    APP端任务
                                </h4>
                                <p class="section-desc" style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    以移动端身份静默完成每日签到与资讯阅读，无需打开活动页面
                                </p>
                            </div>
                            <span class="section-toggle" style="font-size:14px;color:${theme['--panel-text-muted']};transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">▼</span>
                        </div>
                        <div class="section-content" style="overflow:hidden;max-height:1000px;transition:max-height 0.3s ease, opacity 0.3s ease;">
                        <div class="checkbox-cards" style="display:flex;gap:14px;margin-bottom:16px;">
                            <label class="checkbox-card" style="flex:1;display:flex;align-items:flex-start;gap:12px;padding:18px;border:2px solid ${saved.appCheckInEnabled ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:14px;background:${saved.appCheckInEnabled ? 'linear-gradient(135deg,' + theme['--panel-success-bg'] + ',transparent)' : theme['--panel-hover-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;" data-search-tags="APP签到 每日签到">
                                ${saved.appCheckInEnabled ? '<div class="badge" style="position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:' + theme['--panel-primary-color'] + ';color:#fff;font-size:10px;font-weight:700;">已启用</div>' : ''}
                                <input type="checkbox" id="app-checkin-checkbox" ${saved.appCheckInEnabled ? 'checked' : ''}
                                    style="width:20px;height:20px;margin-top:2px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                <div style="flex:1;">
                                    <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                        <span style="font-size:16px;">📱</span>
                                        APP每日签到
                                    </div>
                                    <div style="font-size:12px;color:${theme['--panel-text-muted']};line-height:1.8;background:${theme['--panel-bg']};padding:12px 14px;border-radius:8px;border:1px solid ${theme['--panel-border']};">
                                        每日自动完成 APP 端签到并累计积分，当日已签则自动跳过。
                                    </div>
                                </div>
                            </label>
                            <label class="checkbox-card" style="flex:1;display:flex;align-items:flex-start;gap:12px;padding:18px;border:2px solid ${saved.appReadEnabled ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:14px;background:${saved.appReadEnabled ? 'linear-gradient(135deg,' + theme['--panel-success-bg'] + ',transparent)' : theme['--panel-hover-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;" data-search-tags="APP阅读 资讯阅读 新闻阅读">
                                ${saved.appReadEnabled ? '<div class="badge" style="position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:' + theme['--panel-primary-color'] + ';color:#fff;font-size:10px;font-weight:700;">已启用</div>' : ''}
                                <input type="checkbox" id="app-read-checkbox" ${saved.appReadEnabled ? 'checked' : ''}
                                    style="width:20px;height:20px;margin-top:2px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                <div style="flex:1;">
                                    <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                                        <span style="font-size:16px;">📰</span>
                                        APP资讯阅读
                                    </div>
                                    <div style="font-size:12px;color:${theme['--panel-text-muted']};line-height:1.8;background:${theme['--panel-bg']};padding:12px 14px;border-radius:8px;border:1px solid ${theme['--panel-border']};">
                                        搜索执行前随机上报 0-3 篇资讯，完成每日阅读积分任务（受每日上限约束）。
                                    </div>
                                </div>
                            </label>
                        </div>
                        <div class="form-card" style="margin-bottom:16px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="阅读上限 每日阅读 APP阅读上限">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">📚</span>
                                每日阅读上限
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="每日资讯阅读上报的最大篇数，实际以任务缺口为准">❓</span>
                            </label>
                            <div style="position:relative;">
                                <input type="number" id="app-read-limit-input" class="form-input" value="${saved.appReadDailyLimit}" min="1" max="30" step="1"
                                    style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:50px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                <span class="input-unit" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">篇</span>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>默认 <strong style="color:${theme['--panel-primary-color']};">10篇</strong>，实际执行时取「任务缺口」与「此上限」中的较小值</span>
                            </div>
                        </div>
                        <div class="form-card" style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};" data-search-tags="APP授权 授权 APP端授权">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">🔐</span>
                                APP端授权
                                <span class="help-icon" style="margin-left:auto;font-size:14px;color:${theme['--panel-text-muted']};cursor:help;" title="APP 端任务需要授权一次，之后自动续期">❓</span>
                            </label>
                            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                                <span id="app-auth-status" style="font-size:13px;font-weight:600;padding:8px 14px;border-radius:10px;background:${appAuthRefreshToken ? theme['--panel-success-bg'] : theme['--panel-warning-bg']};color:${appAuthRefreshToken ? theme['--panel-success-text'] : theme['--panel-warning-text']};border:1px solid ${appAuthRefreshToken ? theme['--panel-success-text'] + '40' : theme['--panel-warning-color'] + '40'};">
                                    ${appAuthRefreshToken ? '✓ ' : '⚠️ '}${appAuthStatusText}
                                </span>
                                <button id="app-auth-start-btn" style="padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:600;color:#fff;background:${theme['--panel-primary-color']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);">
                                    开始APP授权
                                </button>
                            </div>
                            <div class="form-hint" style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>点击按钮将打开微软授权页面（需已登录微软账号），确认后授权码会被自动捕获并兑换令牌，全程无需手动复制。授权仅进行一次，之后脚本会自动续期。</span>
                            </div>
                        </div>
                        </div>
                    </div>

                    <!-- 配置管理 -->
                    <div class="config-section" style="margin-bottom:24px;" data-section="配置管理">
                        <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid ${theme['--panel-primary-color']}20;cursor:pointer;" title="点击展开/收起">
                            <div class="section-icon" style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-success-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                📦
                            </div>
                            <div style="flex:1;">
                                <h4 class="section-title" style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    配置管理
                                </h4>
                                <p class="section-desc" style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    导出/导入配置，方便备份和迁移
                                </p>
                            </div>
                            <span class="section-toggle" style="font-size:14px;color:${theme['--panel-text-muted']};transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);">▼</span>
                        </div>
                        <div class="section-content" style="overflow:hidden;max-height:1000px;transition:max-height 0.3s ease, opacity 0.3s ease;">
                        <div class="form-card" style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                            <div style="display:flex;gap:12px;">
                                <button id="export-config-btn" style="flex:1;padding:14px 20px;border:2px solid ${theme['--panel-border']};border-radius:12px;background:transparent;color:${theme['--panel-text-primary']};font-size:14px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;user-select:none;position:relative;overflow:hidden;" title="导出当前配置">
                                    <span style="font-size:16px;">📤</span>
                                    <span>导出配置</span>
                                </button>
                                <button id="import-config-btn" style="flex:1;padding:14px 20px;border:2px solid ${theme['--panel-border']};border-radius:12px;background:transparent;color:${theme['--panel-text-primary']};font-size:14px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;user-select:none;position:relative;overflow:hidden;" title="导入配置文件">
                                    <span style="font-size:16px;">📥</span>
                                    <span>导入配置</span>
                                </button>
                                <input type="file" id="config-file-input" accept=".json" style="display:none;">
                            </div>
                            <div class="form-hint" style="margin-top:12px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>导出配置可备份当前设置，导入配置可快速恢复或迁移到其他浏览器/设备。配置文件为JSON格式，包含所有用户设置项。</span>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>

                <!-- 关于页面内容 -->
                <div id="about-content" class="dialog-content" style="padding:24px 32px;overflow-y:auto;flex:1;display:none;">
                    <!-- 脚本信息卡片 -->
                    <div class="about-card" style="margin-bottom:24px;padding:28px;background:linear-gradient(135deg,${theme['--panel-info-bg']}20,transparent);border-radius:16px;border:1px solid ${theme['--panel-border']};">
                        <div style="display:flex;align-items:flex-start;gap:20px;">
                            <div style="width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,${theme['--panel-primary-color']},${theme['--panel-primary-color']}cc);display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 8px 24px ${theme['--panel-primary-color']}30;">
                                🚀
                            </div>
                            <div style="flex:1;">
                                <h2 style="margin:0;font-size:28px;color:${theme['--panel-primary-color']};font-weight:800;letter-spacing:-0.5px;">
                                    <a href="https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/" target="_blank" style="color:inherit;text-decoration:none;">Brian Tool</a>
                                </h2>
                                <p style="margin:6px 0 0;font-size:14px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    Bing Rewards 自动任务脚本
                                </p>
                                <div style="display:flex;gap:16px;margin-top:12px;">
                                    <span style="display:flex;align-items:center;gap:4px;font-size:13px;color:${theme['--panel-text-secondary']};">
                                        <span>📌</span>
                                        <span>版本: <strong style="color:${theme['--panel-primary-color']};">v${currentVersion}</strong></span>
                                    </span>
                                    <span style="display:flex;align-items:center;gap:4px;font-size:13px;color:${theme['--panel-text-secondary']};">
                                        <span>👤</span>
                                        <span>作者: <a href="https://gitee.com/idbb98" target="_blank" style="color:${theme['--panel-primary-color']};text-decoration:none;font-weight:600;">Brian</a></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 在线文档 -->
                    <div class="about-card" style="margin-bottom:24px;padding:24px;background:${theme['--panel-hover-bg']};border-radius:16px;border:1px solid ${theme['--panel-border']};">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                            <span style="font-size:20px;">📝</span>
                            <h3 style="margin:0;font-size:18px;color:${theme['--panel-primary-color']};font-weight:700;">
                                在线文档
                            </h3>
                        </div>
                        <div style="display:flex;gap:12px;flex-wrap:wrap;">
                            <a href="https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:12px 20px;background:${theme['--panel-bg']};border-radius:12px;border:1px solid ${theme['--panel-border']};color:${theme['--panel-text-primary']};text-decoration:none;font-size:14px;font-weight:600;transition:all 0.25s;">
                                <span style="font-size:18px;">📚</span>
                                <span>文档首页</span>
                            </a>
                            <a href="https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/changelog/" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:12px 20px;background:${theme['--panel-bg']};border-radius:12px;border:1px solid ${theme['--panel-border']};color:${theme['--panel-text-primary']};text-decoration:none;font-size:14px;font-weight:600;transition:all 0.25s;">
                                <span style="font-size:18px;">🗒️</span>
                                <span>更新日志</span>
                            </a>
                        </div>
                    </div>

                    <!-- 功能说明 -->
                    <div class="about-card" style="margin-bottom:24px;padding:24px;background:${theme['--panel-hover-bg']};border-radius:16px;border:1px solid ${theme['--panel-border']};">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                            <span style="font-size:20px;">✨</span>
                            <h3 style="margin:0;font-size:18px;color:${theme['--panel-primary-color']};font-weight:700;">
                                功能说明
                            </h3>
                        </div>
                        <ul style="margin:0;padding-left:24px;">
                            <li style="margin-bottom:10px;font-size:14px;color:${theme['--panel-text-primary']};line-height:1.8;">
                                <strong style="color:${theme['--panel-primary-color']};">🔍 自动搜索</strong> - 自动执行必应搜索任务，获取每日积分
                            </li>
                            <li style="margin-bottom:10px;font-size:14px;color:${theme['--panel-text-primary']};line-height:1.8;">
                                <strong style="color:${theme['--panel-success-text']};">🎯 智能优化</strong> - 支持随机加词、截词功能，模拟真实搜索行为
                            </li>
                            <li style="margin-bottom:10px;font-size:14px;color:${theme['--panel-text-primary']};line-height:1.8;">
                                <strong style="color:${theme['--panel-info-text']};">⏱️ 智能延迟</strong> - 可配置的搜索间隔和暂停时间，避免触发风控
                            </li>
                            <li style="font-size:14px;color:${theme['--panel-text-primary']};line-height:1.8;">
                                <strong style="color:${theme['--panel-warning-text']};">📊 进度追踪</strong> - 实时显示任务进度和剩余时间
                            </li>
                        </ul>
                    </div>

                    <!-- 协议与条款 -->
                    <div class="about-card" style="margin-bottom:24px;padding:24px;background:${theme['--panel-hover-bg']};border-radius:16px;border:1px solid ${theme['--panel-border']};">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                            <span style="font-size:20px;">📜</span>
                            <h3 style="margin:0;font-size:18px;color:${theme['--panel-primary-color']};font-weight:700;">
                                使用条款与协议
                            </h3>
                        </div>
                        <div style="font-size:13px;color:${theme['--panel-text-secondary']};line-height:1.8;">
                            <p style="margin:0 0 12px;">
                                本脚本仅供学习和个人使用。使用本脚本即表示您同意以下条款：
                            </p>
                            <ul style="margin:0;padding-left:20px;">
                                <li style="margin-bottom:8px;">本脚本仅用于个人学习和研究目的</li>
                                <li style="margin-bottom:8px;">请勿用于商业用途或大规模部署</li>
                                <li style="margin-bottom:8px;">使用本脚本需遵守微软必应服务条款</li>
                                <li style="margin-bottom:8px;">作者不对使用本脚本造成的任何后果负责</li>
                                <li>建议合理使用，避免过度频繁操作</li>
                            </ul>
                        </div>
                    </div>

                    <!-- 联系与支持 -->
                    <div class="about-card" style="margin-bottom:24px;padding:24px;background:${theme['--panel-hover-bg']};border-radius:16px;border:1px solid ${theme['--panel-border']};">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                            <span style="font-size:20px;">💬</span>
                            <h3 style="margin:0;font-size:18px;color:${theme['--panel-primary-color']};font-weight:700;">
                                联系与支持
                            </h3>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:12px;">
                            <a href="https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/" target="_blank" style="display:flex;align-items:center;gap:8px;padding:12px 20px;background:${theme['--panel-bg']};border-radius:12px;border:1px solid ${theme['--panel-border']};color:${theme['--panel-text-primary']};text-decoration:none;font-size:14px;font-weight:600;transition:all 0.25s;">
                                <span style="font-size:18px;">💎</span>
                                <span>项目主页</span>
                            </a>
                            <a href="https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script/issues" target="_blank" style="display:flex;align-items:center;gap:8px;padding:12px 20px;background:${theme['--panel-bg']};border-radius:12px;border:1px solid ${theme['--panel-border']};color:${theme['--panel-text-primary']};text-decoration:none;font-size:14px;font-weight:600;transition:all 0.25s;">
                                <span style="font-size:18px;">📮</span>
                                <span>反馈问题</span>
                            </a>
                            <a href="mailto:idbb98@163.com" style="display:flex;align-items:center;gap:8px;padding:12px 20px;background:${theme['--panel-bg']};border-radius:12px;border:1px solid ${theme['--panel-border']};color:${theme['--panel-text-primary']};text-decoration:none;font-size:14px;font-weight:600;transition:all 0.25s;">
                                <span style="font-size:18px;">✉️</span>
                                <span>发送邮件</span>
                            </a>
                        </div>
                        <p style="margin-top:16px;font-size:12px;color:${theme['--panel-text-muted']};">
                            如果您遇到问题或有改进建议，欢迎随时联系！
                        </p>
                    </div>

                </div>

                <!-- 固定底部按钮区 -->
                <div class="dialog-footer" style="display:flex;gap:12px;justify-content:space-between;padding:20px 32px;border-top:1px solid ${theme['--panel-border']};background:linear-gradient(135deg,${theme['--panel-hover-bg']} 0%,${theme['--panel-bg']} 100%);">
                    <button id="settings-reset-btn" style="padding:14px 24px;border:2px solid ${theme['--panel-border']};border-radius:12px;background:transparent;color:${theme['--panel-text-secondary']};font-size:14px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);font-weight:600;display:flex;align-items:center;gap:8px;user-select:none;position:relative;overflow:hidden;" title="恢复所有设置为默认值">
                        <span style="font-size:16px;">🔄</span>
                        <span>恢复默认</span>
                    </button>
                    <div class="btn-group" style="display:flex;gap:12px;">
                        <button id="settings-cancel-btn" style="padding:14px 28px;border:2px solid ${theme['--panel-border']};border-radius:12px;background:transparent;color:${theme['--panel-text-primary']};font-size:14px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);font-weight:600;user-select:none;position:relative;overflow:hidden;">
                            取消
                        </button>
                        <button id="settings-save-btn" style="padding:14px 36px;border:none;border-radius:12px;background:linear-gradient(135deg,${theme['--panel-primary-color']},${theme['--panel-primary-color']}dd);color:#ffffff;font-size:14px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);font-weight:700;box-shadow:0 6px 20px ${theme['--panel-primary-color']}50;display:flex;align-items:center;gap:8px;user-select:none;position:relative;overflow:hidden;">
                            <span style="font-size:16px;">💾</span>
                            <span>保存配置</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <style>
            @keyframes dialogSlideIn {
                from { opacity: 0; transform: translateY(-30px) scale(0.92); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes buttonRipple {
                0% { transform: scale(0); opacity: 0.5; }
                100% { transform: scale(4); opacity: 0; }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            #settings-dialog > div > div > div:nth-child(2)::-webkit-scrollbar { width: 8px; }
            #settings-dialog > div > div > div:nth-child(2)::-webkit-scrollbar-track { background: transparent; }
            #settings-dialog > div > div > div:nth-child(2)::-webkit-scrollbar-thumb { background: ${theme['--panel-border']}; border-radius: 4px; }
            #settings-dialog > div > div > div:nth-child(2)::-webkit-scrollbar-thumb:hover { background: ${theme['--panel-text-muted']}; }

            /* 紧凑多列布局 - 提升信息密度 */
            #settings-dialog .section-content {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 12px;
            }
            #settings-dialog .section-content > .form-card,
            #settings-dialog .section-content > .checkbox-cards,
            #settings-dialog .section-content > .form-hint {
                margin-bottom: 0 !important;
            }
            #settings-dialog .section-content > .checkbox-cards,
            #settings-dialog .section-content > .form-hint {
                grid-column: 1 / -1;
            }
            #settings-dialog .form-card {
                padding: 14px !important;
                border-radius: 12px !important;
            }
            #settings-dialog .form-card label,
            #settings-dialog .form-card > label {
                margin-bottom: 8px !important;
                font-size: 13px !important;
            }
            #settings-dialog .form-card .radio-cards {
                gap: 10px !important;
            }
            #settings-dialog .form-input {
                height: 40px !important;
            }
            #settings-dialog .form-hint {
                font-size: 11px !important;
                margin-top: 8px !important;
                line-height: 1.6 !important;
            }
            #settings-dialog .interval-input-card,
            #settings-dialog .factor-input-card {
                padding: 10px !important;
                border-radius: 10px !important;
            }
            #settings-dialog .config-section {
                margin-bottom: 18px !important;
            }
            #settings-dialog .section-header {
                margin-bottom: 10px !important;
                padding-bottom: 8px !important;
            }
            #settings-dialog .section-content > .factor-inputs {
                grid-column: 1 / -1;
                gap: 12px !important;
                margin-bottom: 0 !important;
            }
            #settings-dialog [data-search-tags*="面板默认显示状态"] {
                grid-column: 1 / -1;
            }

            /* 搜索框样式 */
            #search-wrapper {
                position: relative;
            }
            #settings-search-input:focus {
                border-color: ${theme['--panel-primary-color']} !important;
                box-shadow: 0 0 0 3px ${theme['--panel-primary-color']}20 !important;
            }
            .help-icon:hover {
                color: ${theme['--panel-primary-color']} !important;
            }

            /* 响应式布局 - 设置对话框 */
            @media (max-width: 768px) {
                #settings-dialog .dialog-container {
                    width: 95vw !important;
                    max-width: 95vw !important;
                    min-width: auto !important;
                    border-radius: 16px !important;
                    max-height: 92vh !important;
                }
                #settings-dialog .dialog-header {
                    padding: 20px 20px 16px !important;
                    flex-wrap: wrap !important;
                }
                #settings-dialog .dialog-header-icon {
                    width: 40px !important;
                    height: 40px !important;
                    font-size: 22px !important;
                    border-radius: 10px !important;
                }
                #settings-dialog .dialog-header h3 {
                    font-size: 20px !important;
                }
                #settings-dialog .dialog-header p {
                    font-size: 11px !important;
                }
                #settings-dialog #search-wrapper {
                    width: 100% !important;
                    max-width: none !important;
                }
                #settings-dialog .dialog-close-btn {
                    width: 36px !important;
                    height: 36px !important;
                    font-size: 18px !important;
                }
                #settings-dialog .dialog-content {
                    padding: 20px !important;
                }
                #settings-dialog .config-section {
                    margin-bottom: 20px !important;
                }
                #settings-dialog .section-header {
                    margin-bottom: 12px !important;
                    padding-bottom: 8px !important;
                }
                #settings-dialog .section-icon {
                    width: 30px !important;
                    height: 30px !important;
                    font-size: 15px !important;
                    border-radius: 8px !important;
                }
                #settings-dialog .section-title {
                    font-size: 14px !important;
                }
                #settings-dialog .section-desc {
                    font-size: 10px !important;
                }
                #settings-dialog .form-card {
                    padding: 14px !important;
                    border-radius: 12px !important;
                    margin-bottom: 12px !important;
                }
                #settings-dialog .form-card label {
                    font-size: 13px !important;
                    margin-bottom: 8px !important;
                }
                #settings-dialog .form-input {
                    height: 44px !important;
                    padding: 12px 14px !important;
                    font-size: 13px !important;
                    border-radius: 10px !important;
                }
                #settings-dialog .checkbox-cards {
                    gap: 10px !important;
                }
                #settings-dialog .checkbox-card {
                    padding: 14px !important;
                    border-radius: 12px !important;
                }
                #settings-dialog .checkbox-card input[type="checkbox"] {
                    width: 18px !important;
                    height: 18px !important;
                }
                #settings-dialog .checkbox-card .badge {
                    font-size: 9px !important;
                    padding: 2px 6px !important;
                }
                #settings-dialog .factor-inputs {
                    gap: 10px !important;
                }
                #settings-dialog .factor-input-card {
                    padding: 14px !important;
                    border-radius: 12px !important;
                }
                #settings-dialog .factor-input-card input {
                    height: 42px !important;
                    padding: 10px 12px !important;
                    font-size: 13px !important;
                    border-radius: 8px !important;
                }
                #settings-dialog .interval-inputs {
                    gap: 8px !important;
                }
                #settings-dialog .interval-input-card {
                    padding: 14px !important;
                    border-radius: 12px !important;
                }
                #settings-dialog .interval-input-card input {
                    height: 46px !important;
                    padding: 12px 14px !important;
                    padding-right: 40px !important;
                    font-size: 13px !important;
                    border-radius: 10px !important;
                }
                #settings-dialog .input-unit {
                    font-size: 11px !important;
                    right: 12px !important;
                }
                #settings-dialog .dialog-footer {
                    padding: 16px 20px !important;
                    flex-wrap: wrap !important;
                    gap: 10px !important;
                }
                #settings-dialog .dialog-footer button {
                    padding: 12px 20px !important;
                    font-size: 13px !important;
                    border-radius: 10px !important;
                }
                #settings-dialog .dialog-footer .btn-group {
                    flex-wrap: wrap !important;
                    width: 100% !important;
                    justify-content: flex-end !important;
                }
            }

            @media (max-width: 480px) {
                #settings-dialog .dialog-container {
                    width: 96vw !important;
                    max-width: 96vw !important;
                    border-radius: 12px !important;
                    max-height: 95vh !important;
                }
                #settings-dialog .dialog-header {
                    padding: 16px !important;
                }
                #settings-dialog .dialog-header-icon {
                    width: 36px !important;
                    height: 36px !important;
                    font-size: 20px !important;
                }
                #settings-dialog .dialog-header h3 {
                    font-size: 18px !important;
                }
                #settings-dialog .dialog-header p {
                    display: none !important;
                }
                #settings-dialog .nav-tabs {
                    order: 3 !important;
                    width: 100% !important;
                    justify-content: center !important;
                }
                #settings-dialog .nav-tab {
                    padding: 10px 16px !important;
                    font-size: 12px !important;
                }
                #settings-dialog .dialog-close-btn {
                    width: 32px !important;
                    height: 32px !important;
                }
                #settings-dialog .dialog-content {
                    padding: 16px !important;
                }
                #settings-dialog .config-section {
                    margin-bottom: 20px !important;
                }
                #settings-dialog .section-icon {
                    width: 28px !important;
                    height: 28px !important;
                    font-size: 14px !important;
                }
                #settings-dialog .section-title {
                    font-size: 13px !important;
                }
                #settings-dialog .form-card {
                    padding: 12px !important;
                    border-radius: 10px !important;
                    margin-bottom: 10px !important;
                }
                #settings-dialog .form-card label {
                    font-size: 12px !important;
                }
                #settings-dialog .form-input {
                    height: 40px !important;
                    padding: 10px 12px !important;
                    font-size: 12px !important;
                }
                #settings-dialog .form-hint {
                    font-size: 11px !important;
                }
                #settings-dialog .form-hint code {
                    font-size: 10px !important;
                    padding: 2px 6px !important;
                }
                #settings-dialog .checkbox-cards {
                    flex-direction: column !important;
                    gap: 8px !important;
                }
                #settings-dialog .checkbox-card {
                    padding: 12px !important;
                }
                #settings-dialog .factor-inputs,
                #settings-dialog .interval-inputs,
                #settings-dialog .delay-inputs {
                    flex-direction: column !important;
                    gap: 8px !important;
                }
                #settings-dialog .factor-input-card,
                #settings-dialog .interval-input-card {
                    width: 100% !important;
                }
                #settings-dialog .dialog-footer {
                    padding: 12px 16px !important;
                    flex-direction: column-reverse !important;
                }
                #settings-dialog .dialog-footer > button:first-child {
                    width: 100% !important;
                    margin-top: 0 !important;
                }
                #settings-dialog .dialog-footer .btn-group {
                    width: 100% !important;
                    flex-direction: column !important;
                    gap: 8px !important;
                }
                #settings-dialog .dialog-footer button {
                    width: 100% !important;
                    padding: 14px !important;
                    justify-content: center !important;
                }
            }
        </style>
    `;

    document.body.appendChild(dialog);

    // 获取所有元素
    const closeBtn = document.getElementById('settings-close-btn');
    const cancelBtn = document.getElementById('settings-cancel-btn');
    const resetBtn = document.getElementById('settings-reset-btn');
    const saveBtn = document.getElementById('settings-save-btn');
    const searchFormInput = document.getElementById('search-form-param-input');
    const maxSearchesInput = document.getElementById('max-searches-input');
    const panelStateRadios = document.getElementsByName('panel-default-state');
    const randomAddCheckbox = document.getElementById('random-add-checkbox');
    const randomCutCheckbox = document.getElementById('random-cut-checkbox');
    const clickSearchResultsCheckbox = document.getElementById('click-search-results-checkbox');
    const randomAddFactorInput = document.getElementById('random-add-factor-input');
    const randomCutFactorInput = document.getElementById('random-cut-factor-input');
    const pauseIntervalMinInput = document.getElementById('pause-interval-min-input');
    const pauseIntervalMaxInput = document.getElementById('pause-interval-max-input');
    const pauseTimeMinInput = document.getElementById('pause-time-min-input');
    const pauseTimeMaxInput = document.getElementById('pause-time-max-input');
    const minDelayInput = document.getElementById('min-delay-input');
    const maxDelayInput = document.getElementById('max-delay-input');
    const tasksScrollDelayInput = document.getElementById('tasks-scroll-delay-input');
    const tasksMaxRetriesInput = document.getElementById('tasks-max-retries-input');
    const tasksRetryDelayInput = document.getElementById('tasks-retry-delay-input');
    const tasksCloseTabDelayInput = document.getElementById('tasks-close-tab-delay-input');
    const autoClickTasksCheckbox = document.getElementById('auto-click-tasks-checkbox');
    const appCheckInCheckbox = document.getElementById('app-checkin-checkbox');
    const appReadCheckbox = document.getElementById('app-read-checkbox');
    const appReadLimitInput = document.getElementById('app-read-limit-input');
    const appAuthStartBtn = document.getElementById('app-auth-start-btn');
    const appAuthStatusEl = document.getElementById('app-auth-status');

    // APP 端授权按钮：打开授权页，落地后由脚本自动捕获授权码并兑换令牌
    if (appAuthStartBtn) {
        appAuthStartBtn.addEventListener('click', () => {
            AppAuth.openAuthorizePage();
        });
    }

    // APP 端授权状态实时刷新：轮询本地令牌，暂存授权码自动补兑换，对话框关闭后停止
    let appAuthExchangeTried = !GM_getValue('appPendingAuthCode', '');
    let appAuthTimer = null;
    const refreshAppAuthStatus = () => {
        if (!appAuthStatusEl) return;
        if (!document.getElementById('settings-dialog')) {
            if (appAuthTimer) clearInterval(appAuthTimer);
            return;
        }
        const refreshToken = GM_getValue('appRefreshToken', '');
        const issuedAt = GM_getValue('appTokenIssuedAt', 0);
        const pendingCode = GM_getValue('appPendingAuthCode', '');
        if (refreshToken) {
            const days = Math.max(0, Math.floor((Date.now() - issuedAt) / 86400000));
            appAuthStatusEl.textContent = `✓ 已授权（${days}天前）`;
            appAuthStatusEl.style.background = theme['--panel-success-bg'];
            appAuthStatusEl.style.color = theme['--panel-success-text'];
            appAuthStatusEl.style.border = `1px solid ${theme['--panel-success-text']}40`;
        } else if (pendingCode) {
            appAuthStatusEl.textContent = '⏳ 授权码待兑换…';
            appAuthStatusEl.style.background = theme['--panel-warning-bg'];
            appAuthStatusEl.style.color = theme['--panel-warning-text'];
            appAuthStatusEl.style.border = `1px solid ${theme['--panel-warning-color']}40`;
            if (!appAuthExchangeTried) {
                appAuthExchangeTried = true;
                GM_setValue('appPendingAuthCode', '');
                AppAuth.exchangeToken('authorization_code', pendingCode).then(ok => {
                    GM_log(ok ? 'APP授权：暂存授权码补兑换成功' : 'APP授权：暂存授权码补兑换失败，请重新点击「开始APP授权」');
                    refreshAppAuthStatus();
                });
            }
        } else {
            const lastError = GM_getValue('appAuthLastError', '');
            appAuthStatusEl.textContent = lastError ? `⚠️ 未授权：${lastError}` : '⚠️ 未授权';
            appAuthStatusEl.title = lastError || '点击「开始APP授权」完成授权';
            appAuthStatusEl.style.background = theme['--panel-warning-bg'];
            appAuthStatusEl.style.color = theme['--panel-warning-text'];
            appAuthStatusEl.style.border = `1px solid ${theme['--panel-warning-color']}40`;
        }
    };
    refreshAppAuthStatus();
    appAuthTimer = setInterval(refreshAppAuthStatus, 1500);

    // 搜索相关元素
    const searchInput = document.getElementById('settings-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    // 配置管理相关元素
    const exportConfigBtn = document.getElementById('export-config-btn');
    const importConfigBtn = document.getElementById('import-config-btn');
    const configFileInput = document.getElementById('config-file-input');

    const closeDialog = () => {
        if (appAuthTimer) clearInterval(appAuthTimer);
        dialog.remove();
        document.removeEventListener('keydown', handleEsc);
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);

    // 点击背景关闭
    dialog.querySelector('div').addEventListener('click', (e) => {
        if (e.target === dialog.querySelector('div')) {
            closeDialog();
        }
    });

    // 设置项搜索功能
    const performSearch = (keyword) => {
        const sections = dialog.querySelectorAll('.config-section');
        let foundCount = 0;

        sections.forEach(section => {
            const sectionTitle = section.getAttribute('data-section');
            const searchTags = section.querySelectorAll('[data-search-tags]');
            let shouldShow = false;

            // 检查section标题是否匹配
            if (sectionTitle && sectionTitle.toLowerCase().includes(keyword.toLowerCase())) {
                shouldShow = true;
            }

            // 检查各个设置项的搜索标签
            searchTags.forEach(tagElement => {
                const tags = tagElement.getAttribute('data-search-tags');
                if (tags && tags.toLowerCase().includes(keyword.toLowerCase())) {
                    shouldShow = true;
                }
            });

            // 检查section内的文本内容
            if (!shouldShow) {
                const textContent = section.textContent.toLowerCase();
                if (textContent.includes(keyword.toLowerCase())) {
                    shouldShow = true;
                }
            }

            if (shouldShow) {
                section.style.display = 'block';
                foundCount++;
                // 确保匹配的section是展开状态
                const content = section.querySelector('.section-content');
                if (content) {
                    content.style.maxHeight = '1000px';
                    content.style.opacity = '1';
                }
                const toggle = section.querySelector('.section-toggle');
                if (toggle) {
                    toggle.style.transform = 'rotate(0deg)';
                }
            } else {
                section.style.display = 'none';
            }
        });

        // 显示搜索结果提示
        const searchResultsHint = document.getElementById('search-results-hint');
        if (keyword.trim()) {
            if (!searchResultsHint) {
                const hint = document.createElement('div');
                hint.id = 'search-results-hint';
                hint.style.cssText = `
                    padding: 12px 16px;
                    background: ${theme['--panel-info-bg']};
                    border-radius: 10px;
                    margin-bottom: 16px;
                    font-size: 12px;
                    color: ${theme['--panel-text-muted']};
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                hint.innerHTML = `<span>🔍</span>找到 <strong style="color:${theme['--panel-primary-color']};">${foundCount}</strong> 个匹配的设置项`;
                dialog.querySelector('.dialog-content').insertBefore(hint, dialog.querySelector('.dialog-content').firstChild);
            } else {
                searchResultsHint.innerHTML = `<span>🔍</span>找到 <strong style="color:${theme['--panel-primary-color']};">${foundCount}</strong> 个匹配的设置项`;
            }
        } else if (searchResultsHint) {
            searchResultsHint.remove();
        }
    };

    // 导航切换逻辑
    const navSettingsBtn = document.getElementById('nav-settings-btn');
    const navAboutBtn = document.getElementById('nav-about-btn');
    const settingsContent = dialog.querySelector('.dialog-content:not(#about-content)');
    const aboutContent = document.getElementById('about-content');
    const searchWrapper = document.getElementById('search-wrapper');
    const dialogFooter = dialog.querySelector('.dialog-footer');

    const switchToSettings = () => {
        navSettingsBtn.classList.add('active');
        navSettingsBtn.style.background = theme['--panel-primary-color'];
        navSettingsBtn.style.color = '#ffffff';
        navAboutBtn.classList.remove('active');
        navAboutBtn.style.background = 'transparent';
        navAboutBtn.style.color = theme['--panel-text-secondary'];

        settingsContent.style.display = 'block';
        aboutContent.style.display = 'none';
        searchWrapper.style.display = 'block';
        dialogFooter.style.display = 'flex';

        // 清除搜索
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        performSearch('');
    };

    const switchToAbout = () => {
        navAboutBtn.classList.add('active');
        navAboutBtn.style.background = theme['--panel-primary-color'];
        navAboutBtn.style.color = '#ffffff';
        navSettingsBtn.classList.remove('active');
        navSettingsBtn.style.background = 'transparent';
        navSettingsBtn.style.color = theme['--panel-text-secondary'];

        aboutContent.style.display = 'block';
        settingsContent.style.display = 'none';
        searchWrapper.style.display = 'none';
        dialogFooter.style.display = 'none';
    };

    navSettingsBtn.addEventListener('click', switchToSettings);
    navAboutBtn.addEventListener('click', switchToAbout);

    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value;
        performSearch(keyword);

        // 显示/隐藏清除按钮
        clearSearchBtn.style.display = keyword.trim() ? 'block' : 'none';
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        performSearch('');
    });

    // 设置分组折叠/展开功能
    const sectionHeaders = dialog.querySelectorAll('.section-header');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.config-section');
            const content = section.querySelector('.section-content');
            const toggle = section.querySelector('.section-toggle');

            if (content.style.maxHeight === '0px' || !content.style.maxHeight) {
                content.style.maxHeight = '1000px';
                content.style.opacity = '1';
                toggle.style.transform = 'rotate(0deg)';
            } else {
                content.style.maxHeight = '0px';
                content.style.opacity = '0';
                toggle.style.transform = 'rotate(-90deg)';
            }
        });
    });

    // 配置导出功能
    exportConfigBtn.addEventListener('click', () => {
        // 导出全部用户可配置参数（以 CONFIG_SCHEMA 为准）
        const config = {};
        Object.keys(CONFIG_SCHEMA).forEach(name => {
            config[name] = CONFIG[name];
        });
        config.exportTime = new Date().toISOString();
        config.version = CONFIG.version;

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BingRewards_config_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        GM_notification({
            title: '配置导出成功',
            text: '配置文件已保存到本地',
            icon: '📥',
            timeout: 3000
        });
    });

    // 配置导入功能
    importConfigBtn.addEventListener('click', () => {
        configFileInput.click();
    });

    configFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);

                // 确认导入
                if (!confirm(`⚠️ 确认导入配置文件？\n\n这将覆盖当前所有设置。\n\n导入时间: ${config.exportTime || '未知'}\n版本: ${config.version || '未知'}`)) {
                    return;
                }

                // 保存配置（以 CONFIG_SCHEMA 为准，仅导入文件中存在的键）
                Object.keys(CONFIG_SCHEMA).forEach(name => {
                    if (config[name] !== undefined) CONFIG[name] = config[name];
                });

                // 向后兼容：从旧配置格式（earnTasks* / dashboardTasks*）迁移到新统一格式（tasks*）
                // 优先级：新格式 tasks* > 旧格式 earnTasks* > 旧格式 dashboardTasks*
                ['ScrollDelay', 'MaxRetries', 'RetryDelay', 'CloseTabDelay'].forEach(suffix => {
                    if (config['tasks' + suffix] === undefined) {
                        const oldVal = config['earnTasks' + suffix] !== undefined
                            ? config['earnTasks' + suffix]
                            : config['dashboardTasks' + suffix];
                        if (oldVal !== undefined) CONFIG['tasks' + suffix] = oldVal;
                    }
                });

                GM_notification({
                    title: '配置导入成功',
                    text: '配置已成功导入，页面将刷新',
                    icon: '📤',
                    timeout: 3000
                });

                closeDialog();
                setTimeout(() => window.location.reload(), 2000);

            } catch (error) {
                alert('❌ 配置文件格式错误，请确保导入的是有效的JSON配置文件');
                console.error('配置导入失败:', error);
            }
        };
        reader.readAsText(file);
    });

    // 添加关闭按钮悬停效果
    addButtonHoverEffects(closeBtn, {
        enter: { backgroundColor: theme['--panel-hover-bg'], color: theme['--panel-primary-color'], transform: 'scale(1.1) rotate(90deg)' },
        leave: { backgroundColor: 'transparent', color: theme['--panel-text-secondary'], transform: 'scale(1) rotate(0deg)' },
        down: { transform: 'scale(0.95) rotate(90deg)' },
        up: { transform: 'scale(1.1) rotate(90deg)' }
    });

    // 按钮悬停和点击效果
    const buttons = [
        { btn: resetBtn, hoverBg: theme['--panel-hover-bg'], hoverBorder: theme['--panel-primary-color'] },
        { btn: cancelBtn, hoverBg: theme['--panel-hover-bg'], hoverBorder: theme['--panel-primary-color'] },
        { btn: saveBtn, hoverShadow: `0 8px 28px ${theme['--panel-primary-color']}70` }
    ];

    buttons.forEach(({ btn, hoverBg, hoverBorder, hoverShadow }) => {
        if (!btn) return;

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            if (hoverBg) btn.style.backgroundColor = hoverBg;
            if (hoverBorder) btn.style.borderColor = hoverBorder;
            if (hoverShadow) btn.style.boxShadow = hoverShadow;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
            if (hoverBg) btn.style.backgroundColor = btn.id === 'settings-save-btn' ? '' : 'transparent';
            if (hoverBorder) btn.style.borderColor = theme['--panel-border'];
            if (hoverShadow) btn.style.boxShadow = btn.id === 'settings-save-btn' ? `0 6px 20px ${theme['--panel-primary-color']}50` : 'none';
        });

        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'translateY(1px) scale(0.98)';
        });

        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'translateY(-2px)';
        });

        // 添加点击波纹效果
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: radial-gradient(circle, ${theme['--panel-primary-color']}40 0%, transparent 70%);
                border-radius: 50%;
                transform: scale(0);
                animation: buttonRipple 0.6s ease-out;
                pointer-events: none;
            `;

            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // 输入框焦点效果
    [searchFormInput, maxSearchesInput, randomAddFactorInput, randomCutFactorInput,
     pauseIntervalMinInput, pauseIntervalMaxInput, pauseTimeMinInput, pauseTimeMaxInput,
     minDelayInput, maxDelayInput].forEach(input => {
        input.addEventListener('focus', () => {
            input.style.borderColor = theme['--panel-primary-color'];
            input.style.boxShadow = `0 0 0 3px ${theme['--panel-primary-color']}20`;
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = theme['--panel-border'];
            input.style.boxShadow = 'none';
        });
    });

    // Radio按钮样式更新
    Array.from(panelStateRadios).forEach(radio => {
        const label = radio.closest('label');

        // 初始化：为已选中的 radio 添加勾选标记
        if (radio.checked) {
            const isExpanded = radio.value === 'expanded';
            label.style.borderColor = theme['--panel-primary-color'];
            label.style.background = isExpanded ? `linear-gradient(135deg,${theme['--panel-success-bg']},${theme['--panel-hover-bg']})` : `linear-gradient(135deg,${theme['--panel-info-bg']},${theme['--panel-hover-bg']})`;

            const checkmark = document.createElement('div');
            checkmark.className = 'checkmark';
            checkmark.style.cssText = `position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:${theme['--panel-primary-color']};display:flex;align-items:center;justify-content:center;pointer-events:none;`;
            checkmark.innerHTML = '<span style="color:#fff;font-size:12px;font-weight:bold;line-height:1;">✓</span>';
            label.appendChild(checkmark);
        }

        radio.addEventListener('change', () => {
            // 遍历所有radio，更新它们的样式和勾选标记
            Array.from(panelStateRadios).forEach(r => {
                const lbl = r.closest('label');
                if (!lbl) return;

                // 先移除旧的勾选标记
                const oldCheckmark = lbl.querySelector('.checkmark');
                if (oldCheckmark) {
                    oldCheckmark.remove();
                }

                if (r.checked) {
                    // 选中状态：更新样式并添加勾选标记
                    const isExpanded = r.value === 'expanded';
                    lbl.style.borderColor = theme['--panel-primary-color'];
                    lbl.style.background = isExpanded ? `linear-gradient(135deg,${theme['--panel-success-bg']},${theme['--panel-hover-bg']})` : `linear-gradient(135deg,${theme['--panel-info-bg']},${theme['--panel-hover-bg']})`;

                    // 添加新的勾选标记
                    const checkmark = document.createElement('div');
                    checkmark.className = 'checkmark';
                    checkmark.style.cssText = `position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:${theme['--panel-primary-color']};display:flex;align-items:center;justify-content:center;pointer-events:none;`;
                    checkmark.innerHTML = '<span style="color:#fff;font-size:12px;font-weight:bold;line-height:1;">✓</span>';
                    lbl.appendChild(checkmark);
                } else {
                    // 未选中状态：恢复默认样式
                    lbl.style.borderColor = theme['--panel-border'];
                    lbl.style.background = theme['--panel-bg'];
                }
            });
        });

        // 添加悬停效果
        label.addEventListener('mouseenter', () => {
            if (!radio.checked) {
                label.style.transform = 'translateY(-2px)';
                label.style.boxShadow = `0 4px 12px ${theme['--panel-shadow']}`;
            }
        });
        label.addEventListener('mouseleave', () => {
            label.style.transform = 'translateY(0)';
            label.style.boxShadow = 'none';
        });
    });

    // Checkbox卡片样式更新
    [randomAddCheckbox, randomCutCheckbox, clickSearchResultsCheckbox, autoClickTasksCheckbox, appCheckInCheckbox, appReadCheckbox].forEach(checkbox => {
        if (!checkbox) return;
        const label = checkbox.closest('label');

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                label.style.borderColor = theme['--panel-primary-color'];
                let bgColor = theme['--panel-info-bg'];
                if (checkbox.id === 'random-cut-checkbox') {
                    bgColor = theme['--panel-success-bg'];
                } else if (checkbox.id === 'click-search-results-checkbox') {
                    bgColor = theme['--panel-success-bg'];
                } else if (checkbox.id === 'auto-click-tasks-checkbox') {
                    bgColor = theme['--panel-success-bg'];
                } else if (checkbox.id === 'app-checkin-checkbox') {
                    bgColor = theme['--panel-success-bg'];
                } else if (checkbox.id === 'app-read-checkbox') {
                    bgColor = theme['--panel-success-bg'];
                }
                label.style.background = `linear-gradient(135deg,${bgColor},transparent)`;
                // 添加已启用标记
                let badge = label.querySelector('.badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'badge';
                    badge.style.cssText = `position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:${theme['--panel-primary-color']};color:#fff;font-size:10px;font-weight:700;`;
                    badge.textContent = '已启用';
                    label.appendChild(badge);
                }
            } else {
                label.style.borderColor = theme['--panel-border'];
                label.style.background = theme['--panel-hover-bg'];
                // 移除已启用标记
                const badge = label.querySelector('.badge');
                if (badge) badge.remove();
            }
        });

        // 添加悬停效果
        label.addEventListener('mouseenter', () => {
            label.style.transform = 'translateY(-2px)';
            label.style.boxShadow = `0 4px 16px ${theme['--panel-shadow']}`;
        });
        label.addEventListener('mouseleave', () => {
            label.style.transform = 'translateY(0)';
            label.style.boxShadow = 'none';
        });
    });

    // 恢复默认按钮
    resetBtn.addEventListener('click', () => {
        // 确认恢复默认设置
        if (!confirm('⚠️ 确认恢复所有设置为默认值？\n\n此操作将清除您所有的自定义设置，请确保已备份配置。')) {
            return;
        }

        searchFormInput.value = 'QBLH';
        // 设置面板状态为展开
        Array.from(panelStateRadios).forEach(r => {
            r.checked = r.value === 'expanded';
            r.dispatchEvent(new Event('change'));
        });
        maxSearchesInput.value = 20;
        randomAddCheckbox.checked = false;
        randomAddFactorInput.value = 0.3;
        randomCutCheckbox.checked = false;
        randomCutFactorInput.value = 0.2;
        clickSearchResultsCheckbox.checked = false;
        pauseIntervalMinInput.value = 2;
        pauseIntervalMaxInput.value = 3;
        pauseTimeMinInput.value = 20;
        pauseTimeMaxInput.value = 30;
        minDelayInput.value = 15;
        maxDelayInput.value = 30;
        tasksScrollDelayInput.value = 3000;
        tasksMaxRetriesInput.value = 0;
        tasksRetryDelayInput.value = 2000;
        tasksCloseTabDelayInput.value = 1500;
        autoClickTasksCheckbox.checked = false;
        appCheckInCheckbox.checked = false;
        appReadCheckbox.checked = false;
        appReadLimitInput.value = 10;

        // 触发checkbox样式更新
        randomAddCheckbox.dispatchEvent(new Event('change'));
        randomCutCheckbox.dispatchEvent(new Event('change'));
        clickSearchResultsCheckbox.dispatchEvent(new Event('change'));
        autoClickTasksCheckbox.dispatchEvent(new Event('change'));
        appCheckInCheckbox.dispatchEvent(new Event('change'));
        appReadCheckbox.dispatchEvent(new Event('change'));
    });

    saveBtn.addEventListener('click', () => {
        const searchFormParam = searchFormInput.value.trim();
        const maxSearches = parseInt(maxSearchesInput.value);
        const panelDefaultCollapsed = Array.from(panelStateRadios).find(r => r.checked).value === 'collapsed';
        const randomAdd = randomAddCheckbox.checked;
        const randomAddFactor = parseFloat(randomAddFactorInput.value);
        const randomCut = randomCutCheckbox.checked;
        const randomCutFactor = parseFloat(randomCutFactorInput.value);
        const clickSearchResults = clickSearchResultsCheckbox.checked;
        const pauseIntervalMin = parseInt(pauseIntervalMinInput.value);
        const pauseIntervalMax = parseInt(pauseIntervalMaxInput.value);
        const pauseTimeMin = parseFloat(pauseTimeMinInput.value) * 60 * 1000; // 转换为毫秒
        const pauseTimeMax = parseFloat(pauseTimeMaxInput.value) * 60 * 1000; // 转换为毫秒
        const minDelay = parseFloat(minDelayInput.value) * 1000; // 转换为毫秒
        const maxDelay = parseFloat(maxDelayInput.value) * 1000; // 转换为毫秒
        const tasksScrollDelay = parseInt(tasksScrollDelayInput.value);
        const tasksMaxRetries = parseInt(tasksMaxRetriesInput.value);
        const tasksRetryDelay = parseInt(tasksRetryDelayInput.value);
        const tasksCloseTabDelay = parseInt(tasksCloseTabDelayInput.value);
        const autoClickTasks = autoClickTasksCheckbox.checked;
        const appCheckInEnabled = appCheckInCheckbox.checked;
        const appReadEnabled = appReadCheckbox.checked;
        const appReadDailyLimit = parseInt(appReadLimitInput.value);

        // 验证
        if (!searchFormParam) {
            alert('❌ 请输入有效的搜索表单参数!');
            return;
        }
        if (maxSearches < 1 || maxSearches > 50) {
            alert('❌ 最大搜索次数应在 1-50 之间!');
            return;
        }
        if (randomAddFactor < 0 || randomAddFactor > 1) {
            alert('❌ 加词因子应在 0-1 之间!');
            return;
        }
        if (randomCutFactor < 0 || randomCutFactor > 1) {
            alert('❌ 截词因子应在 0-1 之间!');
            return;
        }
        if (pauseIntervalMin < 1 || pauseIntervalMax < pauseIntervalMin) {
            alert('❌ 暂停间隔设置不合理!');
            return;
        }
        if (pauseTimeMin < 60000 || pauseTimeMax < pauseTimeMin) {
            alert('❌ 暂停时间设置不合理!');
            return;
        }
        if (minDelay < 5000 || maxDelay < minDelay) {
            alert('❌ 搜索延迟设置不合理!');
            return;
        }
        if (tasksScrollDelay < 1000 || tasksScrollDelay > 10000) {
            alert('❌ 任务滚动等待时间应在 1000-10000 毫秒之间!');
            return;
        }
        if (tasksMaxRetries < 0 || tasksMaxRetries > 3) {
            alert('❌ 任务最大重试次数应在 0-3 之间!');
            return;
        }
        if (tasksRetryDelay < 500 || tasksRetryDelay > 10000) {
            alert('❌ 任务重试延迟应在 500-10000 毫秒之间!');
            return;
        }
        if (tasksCloseTabDelay < 1000 || tasksCloseTabDelay > 30000) {
            alert('❌ 任务关闭延迟应在 1000-30000 毫秒之间!');
            return;
        }
        if (appReadDailyLimit < 1 || appReadDailyLimit > 30) {
            alert('❌ 每日阅读上限应在 1-30 篇之间!');
            return;
        }

        // 设置变更确认机制
        if (!confirm('⚠️ 确认保存设置变更？\n\n保存后页面将自动刷新以应用新配置。')) {
            return;
        }

        // 保存所有配置（经 CONFIG setter 写入对应的 GM 存储键）
        CONFIG.searchFormParam = searchFormParam;
        CONFIG.panelDefaultCollapsed = panelDefaultCollapsed;
        CONFIG.maxSearches = maxSearches;
        CONFIG.randomAddSearchWords = randomAdd;
        CONFIG.randomAddSearchWordsFactor = randomAddFactor;
        CONFIG.randomCutSearchWords = randomCut;
        CONFIG.randomCutSearchWordsFactor = randomCutFactor;
        CONFIG.clickSearchResults = clickSearchResults;
        CONFIG.pauseIntervalMin = pauseIntervalMin;
        CONFIG.pauseIntervalMax = pauseIntervalMax;
        CONFIG.pauseTimeMin = pauseTimeMin;
        CONFIG.pauseTimeMax = pauseTimeMax;
        CONFIG.minDelay = minDelay;
        CONFIG.maxDelay = maxDelay;
        CONFIG.tasksScrollDelay = tasksScrollDelay;
        CONFIG.tasksMaxRetries = tasksMaxRetries;
        CONFIG.tasksRetryDelay = tasksRetryDelay;
        CONFIG.tasksCloseTabDelay = tasksCloseTabDelay;
        CONFIG.autoClickTasks = autoClickTasks;
        CONFIG.appCheckInEnabled = appCheckInEnabled;
        CONFIG.appReadEnabled = appReadEnabled;
        CONFIG.appReadDailyLimit = appReadDailyLimit;

        console.log('💾 保存设置:', {
            searchFormParam,
            panelDefaultCollapsed,
            maxSearches,
            randomAdd,
            randomAddFactor,
            randomCut,
            randomCutFactor,
            clickSearchResults,
            pauseInterval: `${pauseIntervalMin}-${pauseIntervalMax}`,
            pauseTime: `${pauseTimeMin/60000}-${pauseTimeMax/60000}分钟`,
            delay: `${minDelay/1000}-${maxDelay/1000}秒`,
            tasks: {
                scrollDelay: `${tasksScrollDelay}ms`,
                maxRetries: tasksMaxRetries,
                retryDelay: `${tasksRetryDelay}ms`,
                closeTabDelay: `${tasksCloseTabDelay}ms`
            },
            autoClickTasks,
            appTasks: {
                checkInEnabled: appCheckInEnabled,
                readEnabled: appReadEnabled,
                readDailyLimit: appReadDailyLimit
            }
        });

        // 显示成功提示
        alert('✅ 配置已保存！确认后页面将在3秒后刷新以应用新配置...');

        // 关闭对话框
        closeDialog();

        // 延迟刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    });

    // ESC键关闭
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

/**
 * 生成任务状态摘要行：APP签到 / APP阅读 / 日常任务 / 每日活动 单行 4 列显示
 * 位于搜索进度上方；APP 任务状态读内存，任务点击状态直接读 GM 存储（跨标签页共享）
 */
function getTaskSummaryPanelHtml() {
    if (!CONFIG.appCheckInEnabled && !CONFIG.appReadEnabled && !CONFIG.autoClickTasks) return '';

    // 未授权：内存标记待授权，或本地既无令牌也无刷新令牌（从未授权/凭据已清除）
    const authPending = state.appTasks.authRequired ||
        (!state.appToken && !GM_getValue('appRefreshToken', ''));

    const colStyle = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;';
    const labelStyle = 'color:var(--panel-text-secondary,#666);font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;';
    const pill = (text, color, bg) =>
        `<span style="font-weight:600;font-size:11px;padding:2px 8px;border-radius:10px;color:${color};background:${bg};white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;">${text}</span>`;
    const pillWarn = () => pill('待授权', 'var(--panel-warning-text,#8a6900)', 'var(--panel-warning-bg,#fff8e6)');
    const pillMuted = () => pill('待执行', 'var(--panel-text-muted,#999)', 'var(--panel-hover-bg,#f5f5f5)');
    const pillSuccess = (text) => pill(text, 'var(--panel-success-text,#107c10)', 'var(--panel-success-bg,#f0f9f0)');

    const cols = [];

    if (CONFIG.appCheckInEnabled) {
        let value;
        if (authPending) {
            value = pillWarn();
        } else if (state.appTasks.checkInDone) {
            const points = state.appTasks.checkInPoints || GM_getValue('appCheckInPoints', 0);
            value = pillSuccess(points > 0 ? `✓ +${points}分` : '✓ 已签');
        } else {
            value = pillMuted();
        }
        cols.push(`<div style="${colStyle}"><span style="${labelStyle}">📱 APP签到</span>${value}</div>`);
    }

    if (CONFIG.appReadEnabled) {
        let value;
        if (authPending) {
            value = pillWarn();
        } else if (state.appTasks.readDone || (state.appTasks.readTotal > 0 && state.appTasks.readCurrent >= state.appTasks.readTotal)) {
            // 缓存缺失（readTotal=0）时降级为通用文案，避免出现矛盾的"✓ 0/30分"
            value = state.appTasks.readTotal > 0 && state.appTasks.readCurrent > 0
                ? pillSuccess(`✓ ${state.appTasks.readCurrent}/${state.appTasks.readTotal}分`)
                : pillSuccess('✓ 已完成');
        } else if (state.appTasks.readTotal > 0) {
            value = pill(`${state.appTasks.readCurrent}/${state.appTasks.readTotal}分`, 'var(--panel-primary-color,#0067b8)', 'var(--panel-info-bg,#f0f7ff)');
        } else {
            value = pillMuted();
        }
        cols.push(`<div style="${colStyle}"><span style="${labelStyle}">📰 APP阅读</span>${value}</div>`);
    }

    if (CONFIG.autoClickTasks) {
        const flows = [
            { label: '🖱️ 日常任务', done: isTaskFlowCompletedToday('earn') },
            { label: '📅 每日活动', done: isTaskFlowCompletedToday('dashboard') }
        ];
        flows.forEach(f => {
            cols.push(`<div style="${colStyle}"><span style="${labelStyle}">${f.label}</span>${
                f.done ? pillSuccess('✓ 完成') : pillMuted()
            }</div>`);
        });
    }

    return `
        <div style="display:flex;gap:6px;padding:10px 8px;background:var(--panel-hover-bg,#f9f9f9);border-radius:8px;">
            ${cols.join('')}
        </div>
    `;
}

/**
 * 实时刷新面板任务数据（签到状态 + APP 阅读进度）
 * 面板创建/展开时调用，确保页面刷新后面板信息实时获取
 */
async function refreshAppTaskPanelData() {
    if (!CONFIG.appCheckInEnabled && !CONFIG.appReadEnabled) return;

    // 签到状态从本地日期戳同步
    AppTaskRunner.syncCheckInState();

    // 当日阅读已完成：恢复缓存进度即可，不再实时查询（进度二次校验由兜底流程负责）
    if (CONFIG.appReadEnabled && GM_getValue('appReadDate', 0) === AppTaskRunner.getTodayNum()) {
        AppTaskRunner.restoreCachedReadProgress();
        state.appTasks.readDone = true;
        updateStatusPanel();
        return;
    }

    // 已授权且当日阅读进度未同步时，实时查询服务端进度
    if (CONFIG.appReadEnabled && !state.appTasks.readProgressSynced &&
        (state.appToken || GM_getValue('appRefreshToken', ''))) {
        try {
            if (await AppAuth.ensureToken()) {
                await AppTaskRunner.syncReadProgress();
            }
        } catch (e) {
            // 查询失败保持现有显示，不打断面板渲染
        }
    }

    updateStatusPanel();
}

/**
 * 更新状态面板
 */
function updateStatusPanel(data = {}) {
    if (!state.statusPanel) return;

    const taskStatus = getTaskStatus();
    const content = document.getElementById('panel-content');
    const pageStatus = document.getElementById('page-status');
    const countdownElement = document.getElementById('panel-countdown');
    const { currentWord = '', pauseTimeLeft = null } = data;

    // 更新页面状态指示器
    const taskRunningStatus = document.getElementById('task-running-status');

    if (utils.isPageVisible()) {
        pageStatus.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#107c10;box-shadow:0 0 6px rgba(16,124,16,0.5);animation:pulse 2s ease-in-out infinite;"></span> <span id="page-status-text">页面活跃</span>';
        pageStatus.style.color = 'var(--panel-success-text,#107c10)';
    } else {
        pageStatus.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#999;"></span> <span id="page-status-text">后台运行</span>';
        pageStatus.style.color = 'var(--panel-text-muted,#666)';
    }

    // 更新任务执行状态显示
    if (taskRunningStatus) {
        if (state.isRunning && !pauseTimeLeft && !taskStatus.isCompleted) {
            taskRunningStatus.style.display = 'flex';
        } else {
            taskRunningStatus.style.display = 'none';
        }
    }

    const progress = taskStatus.overallProgress;

    // 计算剩余时间（使用精确计时）
    const remainingTime = utils.getAccurateRemainingTime();

    // 更新收缩状态的倒计时显示
    if (countdownElement) {
        if (state.isPanelCollapsed) {
            // 面板收缩时显示倒计时
            if (taskStatus.isCompleted) {
                // 任务已完成
                countdownElement.textContent = '✅ 已完成';
                countdownElement.style.color = 'var(--panel-success-text,#107c10)';
            } else if (pauseTimeLeft !== null && pauseTimeLeft > 0) {
                // 暂停中 - 显示暂停倒计时
                const minutes = Math.floor(pauseTimeLeft / 60);
                const seconds = Math.round(pauseTimeLeft % 60);
                countdownElement.textContent = `⏸️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
                countdownElement.style.color = 'var(--panel-warning-text,#8a6900)';
            } else if (remainingTime > 0 && state.isRunning) {
                // 执行中 - 显示下次搜索倒计时
                countdownElement.textContent = `⏱️ ${remainingTime.toFixed(0)}s`;
                countdownElement.style.color = 'var(--panel-info-text,#005a9e)';
            } else if (!state.isRunning) {
                // 未运行
                countdownElement.textContent = '⏹️ 已停止';
                countdownElement.style.color = 'var(--panel-text-muted,#999)';
            } else {
                countdownElement.textContent = '';
            }
        } else {
            // 面板展开时隐藏倒计时
            countdownElement.textContent = '';
        }
    }

    content.innerHTML = `
        <div style="display:grid;gap:12px;">
            <!-- 任务状态摘要（APP签到 / APP阅读 / 日常任务 / 每日活动，单行 4 列） -->
            ${getTaskSummaryPanelHtml()}

            <!-- 进度信息行 -->
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:var(--panel-text-secondary,#666);font-size:12px;font-weight:500;">
                    📊 搜索进度
                </span>
                <span style="color:var(--panel-primary-color,#0067b8);font-weight:600;font-size:13px;background:var(--panel-info-bg,#f0f7ff);padding:3px 10px;border-radius:12px;">
                    ${taskStatus.currentCount}/${taskStatus.maxCount}
                </span>
            </div>

            <!-- 进度条 -->
            <div style="position:relative;">
                <div style="height:12px;background:var(--panel-progress-bg,#f0f0f0);border-radius:6px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,var(--panel-primary-color,#0067b8),#00bcf2);border-radius:6px;transition:width 0.3s ease;position:relative;">
                        ${progress > 10 ? '<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:#fff;font-weight:600;">' + progress + '%</span>' : ''}
                    </div>
                </div>
            </div>

            <!-- APP 端任务状态（签到 + 资讯阅读） -->
            ${state.appTasks.readRunning ? `
                <div style="padding:12px;background:var(--panel-info-bg,#f0f7ff);border-radius:8px;border-left:3px solid var(--panel-primary-color,#0067b8);display:flex;align-items:center;gap:8px;">
                    <span style="font-size:18px;">📖</span>
                    <span style="color:var(--panel-info-text,#005a9e);font-size:12px;font-weight:500;">APP阅读执行中${state.appTasks.readTotal > 0 ? ` ${state.appTasks.readCurrent}/${state.appTasks.readTotal}分` : ''}，完成后继续搜索</span>
                </div>
            ` : ''}

            ${taskStatus.isCompleted ? `
                <div style="padding:12px;background:var(--panel-success-bg,#f0f9f0);border-radius:8px;border-left:3px solid var(--panel-success-text,#107c10);display:flex;align-items:center;gap:8px;">
                    <span style="font-size:18px;">✅</span>
                    <span style="color:var(--panel-success-text,#107c10);font-size:12px;font-weight:500;">今日任务已完成</span>
                </div>
            ` : ''}

            ${pauseTimeLeft !== null ? `
                <div style="padding:12px;background:var(--panel-warning-bg,#fff8e6);border-radius:8px;border-left:3px solid var(--panel-warning-border,#ffb900);display:flex;align-items:center;gap:8px;">
                    <span style="font-size:18px;">⏸️</span>
                    <div style="flex:1;">
                        <div style="font-size:12px;color:var(--panel-warning-text,#8a6900);font-weight:500;">暂停中</div>
                        <div style="font-size:11px;color:var(--panel-warning-text,#8a6900);margin-top:2px;opacity:0.8;">${Math.floor(pauseTimeLeft/60)}分${Math.round(pauseTimeLeft%60)}秒后继续</div>
                    </div>
                </div>
            ` : ''}

            ${!pauseTimeLeft && currentWord && remainingTime > 0 ? `
                <div style="padding:12px;background:var(--panel-info-bg,#f0f7ff);border-radius:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:11px;color:var(--panel-info-text,#005a9e);font-weight:500;">🔍 下个搜索词</span>
                        <span style="font-size:10px;color:var(--panel-text-secondary,#666);background:var(--panel-hover-bg,#f5f5f5);padding:2px 8px;border-radius:10px;">${remainingTime.toFixed(0)}秒后</span>
                    </div>
                    <div style="font-size:12px;word-break:break-all;color:var(--panel-text-primary,#1a1a1a);line-height:1.5;max-height:44px;overflow-y:auto;font-weight:500;">${utils.escapeHtml(currentWord)}</div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * 获取热门搜索词
 */
async function fetchSearchKeywords() {
    const cacheKey = 'cache_search_words';
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
        overallProgress: Math.round((searchCount / CONFIG.maxSearches) * 100)
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
        // 兜底：搜索完成后若 APP 任务未全部完成，补跑确保签到与阅读完成
        if ((CONFIG.appCheckInEnabled || CONFIG.appReadEnabled) && !AppTaskRunner.isAllDone()) {
            await AppTaskRunner.runAll();
        }
        updateStatusPanel();
        GM_notification({ text: "Bing Rewards 任务已完成", title: "任务完成", timeout: 3000 });
        state.isRunning = false;
        return;
    }

    // 更新标题
    const title = document.querySelector('title');
    if (title) title.textContent = `[${taskStatus.currentCount}/${taskStatus.maxCount}] Brian Tool...`;

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

    // 使用精确计时器,不受页面可见性影响
    utils.addTimer(setTimeout(() => {
        utils.clearAllTimers();
        // 搜索执行前随机完成 0-3 次 APP 阅读上报（阅读开关开启且当日未完成时），完成后继续搜索
        AppTaskRunner.runRandomReads().finally(() => {
            performSearch(processedSearchWord, taskStatus);
        });
    }, delay));

    // 添加一个定期更新面板的定时器（每秒更新一次）
    utils.addTimer(setInterval(() => {
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
 * 页面加载完成后执行随机滚动，模拟真实用户行为
 * 随机滚动多次，方向（上滑/下滑）和次数都是随机的
 */
function randomScrollAfterPageLoad() {
    // 等待页面内容完全加载
    setTimeout(() => {
        const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const viewportHeight = window.innerHeight;
        const maxScroll = scrollHeight - viewportHeight;

        // 如果页面可以滚动
        if (maxScroll > 0) {
            // 随机生成滚动次数（2-5次）
            const scrollCount = Math.floor(Math.random() * 4) + 2;
            GM_log(`开始随机滚动，总次数: ${scrollCount}次`);

            // 执行多次随机滚动
            let currentScroll = window.scrollY;
            for (let i = 0; i < scrollCount; i++) {
                setTimeout(() => {
                    // 随机决定滚动方向：true=下滑，false=上滑
                    const scrollDown = Math.random() > 0.2;

                    // 随机生成滚动距离（100-800px）
                    const scrollDistance = Math.floor(Math.random() * 700) + 100;

                    // 计算新的滚动位置
                    let newScrollPosition;
                    if (scrollDown) {
                        // 下滑：当前位置 + 随机距离，不超过最大滚动位置
                        newScrollPosition = Math.min(currentScroll + scrollDistance, maxScroll);
                    } else {
                        // 上滑：当前位置 - 随机距离，不小于0
                        newScrollPosition = Math.max(currentScroll - scrollDistance, 0);
                    }

                    // 执行滚动
                    window.scrollTo({
                        top: newScrollPosition,
                        behavior: 'smooth'
                    });

                    // 更新当前位置
                    currentScroll = newScrollPosition;

                    const direction = scrollDown ? '下滑' : '上滑';
                    GM_log(`第${i + 1}次滚动: ${direction} ${scrollDistance}px，目标位置: ${newScrollPosition}px`);

                    // 如果是最后一次滚动，滚动结束后检查并点击链接
                    if (i === scrollCount - 1) {
                        setTimeout(() => {
                            checkAndClickSearchResult();
                        }, 1500); // 等待滚动动画完成
                    }

                }, i * 1000); // 每次滚动间隔1秒，模拟真实用户操作
            }
        } else {
            // 页面无法滚动，直接检查并点击链接
            checkAndClickSearchResult();
        }
    }, 2500); // 等待2.5秒让页面内容加载完成
}

/**
 * 检查当前页面是否为搜索结果页且包含启动参数，如果是则点击搜索结果链接
 */
function checkAndClickSearchResult() {
    try {
        // 前置检查
        if (!CONFIG.clickSearchResults) return;

        const isSearchPage = /\/search/.test(window.location.pathname) && /[?&]q=/.test(window.location.search);
        if (!isSearchPage) return;

        const startParam = utils.getRandomStartParam();
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has(startParam)) return;

        GM_log(`检测到搜索结果页，准备点击链接`);

        // 尝试从标准搜索结果中查找链接
        let targetLink = findLinkFromSearchResults();

        // 降级策略：如果未找到，查找页面全部链接
        if (!targetLink) {
            GM_log('未找到标准搜索结果，尝试查找页面全部链接');
            targetLink = findAnyValidLinkOnPage();
        }

        if (!targetLink) {
            GM_log('未找到可点击的有效链接');
            return;
        }

        GM_log(`点击链接: ${targetLink.href}`);
        simulateHumanClick(targetLink);

    } catch (error) {
        GM_log(`点击搜索结果时出错: ${error.message}`);
        console.error(error);
    }
}

/**
 * 从标准搜索结果中查找可点击的链接
 * @returns {HTMLAnchorElement|null}
 */
function findLinkFromSearchResults() {
    const searchResults = Array.from(document.querySelectorAll('li.b_algo'))
        .filter(result => isElementVisible(result));

    if (searchResults.length === 0) {
        return null;
    }

    GM_log(`找到 ${searchResults.length} 个可见的搜索结果`);

    // 最多尝试5次
    const maxAttempts = Math.min(5, searchResults.length);

    for (let i = 0; i < maxAttempts; i++) {
        const randomIndex = Math.floor(Math.random() * searchResults.length);
        const result = searchResults[randomIndex];
        const link = findClickableLink(result);

        if (link && isElementVisible(link)) {
            GM_log(`成功找到有效链接`);
            return link;
        }
    }

    return null;
}

/**
 * 检查元素是否在当前窗口可见
 * @param {Element} element - 要检查的元素
 * @returns {boolean} - 元素是否在当前窗口可见
 */
function isElementVisible(element) {
    try {
        if (!element) {
            return false;
        }

        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;

        // 检查元素是否在视口内
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= windowHeight &&
            rect.right <= windowWidth
        );
    } catch (error) {
        GM_log(`检查元素可见性时出错: ${error.message}`);
        return false;
    }
}

/**
 * 从搜索结果中查找可点击的链接
 * @param {Element} result - 搜索结果元素
 * @returns {HTMLAnchorElement|null}
 */
function findClickableLink(result) {
    if (!result) return null;

    // 策略1: h2 中的链接（优先直接子元素，其次嵌套）
    for (const h2 of result.querySelectorAll('h2')) {
        const link = h2.querySelector(':scope > a[href]') ||
                     Array.from(h2.querySelectorAll('a[href]')).find(isValidResultLink);
        if (link) return link;
    }

    // 策略2: 排除辅助链接后的第一个有效链接
    const allLinks = result.querySelectorAll('a[href]');
    for (const link of allLinks) {
        if (!link.classList.contains('tilk') &&
            !link.closest('.b_tpcn, .b_attribution, .b_meta') &&
            isValidResultLink(link)) {
            return link;
        }
    }

    // 策略3: 任意有效链接（保底）
    return Array.from(allLinks).find(isValidResultLink) || null;
}

/**
 * 验证链接是否为有效的搜索结果链接
 * @param {HTMLAnchorElement} link
 * @returns {boolean}
 */
function isValidResultLink(link) {
    if (!link || !link.href) return false;

    const href = link.href;

    // 必须是 http/https 协议
    if (!href.startsWith('http://') && !href.startsWith('https://')) {
        return false;
    }

    // 排除内部链接
    if (href.includes('bing.com') ||
        href.includes('msn.com') ||
        href.includes('microsoft.com')) {
        return false;
    }

    return true;
}

/**
 * 在页面中查找任意有效的外部链接（降级策略）
 * @returns {HTMLAnchorElement|null}
 */
function findAnyValidLinkOnPage() {
    const allLinks = Array.from(document.querySelectorAll('a[href]'));

    if (allLinks.length === 0) return null;

    // 过滤出可见的有效外部链接
    const validLinks = allLinks.filter(link => {
        if (!isValidResultLink(link)) return false;

        // 排除导航、页脚、侧边栏、广告等区域
        if (link.closest('nav, footer, header, #b_header, #b_footer, .b_nav, .b_footer, .b_sideBlade, .ads, .advertisement, #b_context')) {
            return false;
        }

        return isElementVisible(link);
    });

    // 如果没有可见链接，尝试任意有效链接
    const candidates = validLinks.length > 0 ? validLinks : allLinks.filter(isValidResultLink);

    if (candidates.length === 0) return null;

    // 随机选择一个
    return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 模拟人工操作点击链接
 * @param {HTMLAnchorElement} link - 要点击的链接元素
 */
function simulateHumanClick(link) {
    try {
        if (link.dataset.clicked === 'true') {
            GM_log('链接已被点击，跳过重复操作');
            return;
        }
        link.dataset.clicked = 'true';

        if (typeof GM_openInTab !== 'undefined') {
            const newTab = GM_openInTab(link.href, {
                active: false,
                insert: true,
                setParent: true
            });
            GM_log('已通过 GM_openInTab 打开链接');

            const closeDelay = CONFIG.tasksCloseTabDelay || 1500;
            setTimeout(() => {
                try {
                    if (newTab && typeof newTab.close === 'function') {
                        newTab.close();
                        GM_log('已通过 tab.close() 关闭搜索结果标签页');
                    } else if (typeof GM_closeTab !== 'undefined') {
                        GM_saveTab(newTab).then(savedTab => {
                            if (savedTab && typeof savedTab.close === 'function') {
                                savedTab.close();
                                GM_log('已通过 savedTab.close() 关闭搜索结果标签页');
                            }
                        }).catch(() => {});
                    }
                } catch (e) {
                    GM_log(`关闭搜索结果标签页失败: ${e.message}`);
                }
            }, closeDelay);
        } else {
            const tempLink = document.createElement('a');
            tempLink.href = link.href;
            tempLink.target = '_blank';
            tempLink.rel = 'noopener noreferrer';
            tempLink.style.display = 'none';
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            GM_log('已通过临时链接打开（GM_openInTab 不可用）');
        }

    } catch (error) {
        GM_log(`点击出错: ${error.message}`);
        console.error(error);
    }
}

/**
 * 任务点击流程配置（earn 日常任务与 dashboard 每日活动共用一套点击流程）
 * dashboard 的 label 含前导空格，用于保持日志文案与历史版本一致
 */
const TASK_FLOW_CONFIG = {
    earn: {
        logPrefix: '[EarnTasks]',
        pageUrl: 'https://rewards.bing.com/earn',
        completedKey: 'earnTasksCompleted',
        lastDateKey: 'lastEarnTasksDate',
        label: '日常任务',
        notificationTitle: 'Bing Rewards 日常任务'
    },
    dashboard: {
        logPrefix: '[DashboardTasks]',
        pageUrl: 'https://rewards.bing.com/dashboard',
        completedKey: 'dashboardTasksCompleted',
        lastDateKey: 'lastDashboardTasksDate',
        label: ' dashboard 每日活动任务',
        notificationTitle: 'Bing Rewards 每日活动'
    }
};

/**
 * 判断当前页面是否为 rewards.bing.com 下指定路径的页面
 */
function isRewardsPage(pathPrefix) {
    return window.location.hostname === 'rewards.bing.com' &&
           window.location.pathname.startsWith(pathPrefix);
}

/**
 * 查找 moreactivities 区域（earn 页面日常任务容器）
 */
function findMoreActivitiesSection() {
    return document.querySelector('#moreactivities') ||
           document.querySelector('section[id*="moreactivities"]') ||
           document.querySelector('[id*="moreActivities"]') ||
           document.querySelector('[id*="more-activities"]');
}

/**
 * 关闭当前标签页（任务页处理完成后调用）
 */
function closeCurrentTab(logPrefix) {
    if (typeof GM_closeTab !== 'undefined') {
        console.log(`${logPrefix} 关闭当前标签页`);
        GM_closeTab();
    }
}

/**
 * 标记任务点击流程当日已完成（完成标记 + 日期戳，供每日仅执行一次判断）
 */
function markTaskFlowCompleted(flowName) {
    const conf = TASK_FLOW_CONFIG[flowName];
    GM_setValue(conf.completedKey, true);
    GM_setValue(conf.lastDateKey, utils.getTodayStr());
}

/**
 * 任务点击流程当日是否已完成（每日仅执行一次）
 */
function isTaskFlowCompletedToday(flowName) {
    const conf = TASK_FLOW_CONFIG[flowName];
    return GM_getValue(conf.lastDateKey, '') === utils.getTodayStr() &&
           GM_getValue(conf.completedKey, false);
}

/**
 * 检查是否需要执行任务页点击，打开对应页面并等待处理完成（earn/dashboard 共用）
 */
async function checkAndExecuteTasksOnPage(flowName) {
    const conf = TASK_FLOW_CONFIG[flowName];
    const today = utils.getTodayStr();

    if (GM_getValue(conf.lastDateKey, '') === today && GM_getValue(conf.completedKey, false)) {
        console.log(`今日${conf.label}点击已完成，跳过`);
        return true;
    }

    console.log(`准备执行${conf.label}点击...`);

    return new Promise((resolve) => {
        const taskParam = utils.getRandomStartParam();
        const taskTab = GM_openInTab(`${conf.pageUrl}?${taskParam}=1`, {
            active: true,
            insert: true,
            setParent: true
        });

        const checkInterval = setInterval(() => {
            if (GM_getValue(conf.completedKey, false)) {
                clearInterval(checkInterval);
                GM_setValue(conf.lastDateKey, today);
                console.log(`${conf.label}点击已完成`);
                resolve(true);
            }
        }, 1000);

        // 超时兜底：防止页面卡死导致主流程阻塞
        setTimeout(() => {
            clearInterval(checkInterval);
            if (taskTab && typeof taskTab.close === 'function') {
                try {
                    taskTab.close();
                } catch (e) {
                    console.log('关闭标签页失败:', e);
                }
            }
            resolve(true);
        }, 30000);
    });
}

/**
 * 滚动到日常任务区域
 */
function scrollToDailyTasks() {
    console.log('[EarnTasks] 正在滚动到日常任务区域...');

    const moreActivitiesSection = findMoreActivitiesSection();
    
    if (moreActivitiesSection) {
        moreActivitiesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[EarnTasks] 已找到并滚动到 moreactivities 区域');
        return true;
    }

    const dailyTaskSection = document.querySelector('[data-section="dailyset"]') ||
                              document.querySelector('[id*="dailyset"]') ||
                              document.querySelector('[class*="daily"]') ||
                              document.querySelector('[class*="Daily"]') ||
                              document.querySelector('.moreActivities') ||
                              document.querySelector('[data-bi-slot*="daily"]') ||
                              document.querySelector('[data-m*="daily"]');
    
    if (dailyTaskSection) {
        dailyTaskSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[EarnTasks] 已找到并滚动到日常任务区域');
        return true;
    }

    const headings = Array.from(document.querySelectorAll('h2, h3, h4, [role="heading"]'));
    const dailyHeading = headings.find(h => 
        /日常|每日|daily|Daily|Daily\s*Set/i.test(h.textContent || h.innerText)
    );
    
    if (dailyHeading) {
        dailyHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[EarnTasks] 通过标题找到并滚动到日常任务区域');
        return true;
    }

    window.scrollTo({
        top: document.body.scrollHeight * 0.3,
        behavior: 'smooth'
    });
    console.log('[EarnTasks] 使用默认滚动位置');
    return false;
}

/**
 * 查找未完成的有积分任务卡片
 */
function findIncompleteTaskCards() {
    console.log('[EarnTasks] 正在查找未完成的任务卡片...');

    const moreActivitiesSection = findMoreActivitiesSection();
    
    if (!moreActivitiesSection) {
        console.log('[EarnTasks] 未找到 moreactivities 区域');
        return [];
    }
    
    console.log('[EarnTasks] 找到 moreactivities 区域，开始查找任务卡片');
    
    const taskCards = moreActivitiesSection.querySelectorAll('a[href][target="_blank"]');
    
    console.log(`[EarnTasks] 在 moreactivities 区域找到 ${taskCards.length} 个可能的任务链接`);
    
    const incompleteTasks = [];
    const processedHrefs = new Set();
    
    taskCards.forEach((taskLink, index) => {
        const href = taskLink.getAttribute('href');
        
        if (!href || processedHrefs.has(href)) {
            return;
        }
        
        const taskText = taskLink.textContent || taskLink.innerText || '';
        const taskHtml = taskLink.outerHTML;
        
        const isCompleted = /已完成|complete|completed|✓|✔|done|finished/i.test(taskText) ||
                           taskLink.querySelector('[class*="complete"]') ||
                           taskLink.querySelector('[class*="Complete"]') ||
                           taskLink.querySelector('[class*="done"]') ||
                           taskLink.querySelector('[class*="Done"]') ||
                           taskLink.getAttribute('aria-label')?.includes('完成');
        
        if (isCompleted) {
            console.log(`[EarnTasks] 任务已完成，跳过: ${taskText.substring(0, 30)}...`);
            return;
        }
        
        const pointsMatch = taskText.match(/\+(\d+)/) ||
                            taskHtml.match(/\+(\d+)/);
        
        if (!pointsMatch) {
            return;
        }
        
        const points = parseInt(pointsMatch[1]);
        
        if (points <= 0) {
            return;
        }
        
        processedHrefs.add(href);
        
        const taskId = href;
        
        incompleteTasks.push({
            element: taskLink,
            href: href,
            points: points,
            taskId: taskId,
            text: taskText.substring(0, 100)
        });
        
        console.log(`[EarnTasks] 找到未完成任务: ${taskText.substring(0, 50)}... (+${points}分)`);
    });
    
    console.log(`[EarnTasks] 共找到 ${incompleteTasks.length} 个未完成的有积分任务`);
    return incompleteTasks;
}

/**
 * 点击任务卡片（earn 与 dashboard 共用）
 */
async function clickTask(task, flowName) {
    const { logPrefix } = TASK_FLOW_CONFIG[flowName];
    const flowState = state.taskFlows[flowName];

    if (flowState.clicked.has(task.taskId)) {
        console.log(`${logPrefix} 任务 ${task.taskId} 已点击过，跳过`);
        return false;
    }

    console.log(`${logPrefix} 正在点击任务: ${task.text.substring(0, 50)}...${task.points > 0 ? ` (+${task.points}分)` : ''}`);

    try {
        task.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 50));

        const rect = task.element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        console.log(`${logPrefix} 模拟点击任务元素，位置: (${Math.round(x)}, ${Math.round(y)})`);

        const originalTarget = task.element.getAttribute('target');
        const windowName = 'bingTask_' + Date.now();
        task.element.setAttribute('target', windowName);

        const mouseEvents = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        for (const eventType of mouseEvents) {
            const event = new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: unsafeWindow,
                clientX: x,
                clientY: y
            });
            task.element.dispatchEvent(event);
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        flowState.clicked.add(task.taskId);
        console.log(`${logPrefix} 成功点击任务: ${task.taskId}`);

        try {
            const taskWindow = window.open('', windowName);
            if (taskWindow && !taskWindow.closed) {
                taskWindow.close();
                console.log(`${logPrefix} 已关闭任务标签页: ${task.taskId}`);
            }
        } catch (e) {
            console.log(`${logPrefix} 关闭任务标签页失败: ${e.message}`);
        }

        if (originalTarget) {
            task.element.setAttribute('target', originalTarget);
        } else {
            task.element.removeAttribute('target');
        }

        return true;
    } catch (error) {
        console.log(`${logPrefix} 模拟点击失败: ${error.message}`);

        try {
            console.log(`${logPrefix} 尝试备用方案: element.click()`);
            task.element.click();
            flowState.clicked.add(task.taskId);
            console.log(`${logPrefix} 备用方案成功: ${task.taskId}`);
            await new Promise(resolve => setTimeout(resolve, 50));
            return true;
        } catch (fallbackError) {
            console.log(`${logPrefix} 备用方案也失败: ${fallbackError.message}`);
            return false;
        }
    }
}

/**
 * 处理任务点击（earn 与 dashboard 共用流程）
 * @param {string} flowName 流程标识：'earn' 或 'dashboard'
 * @param {Function} findTasks 异步函数，返回待办任务数组；返回 null 表示任务区域缺失，直接结束
 */
async function processTasks(flowName, findTasks) {
    const conf = TASK_FLOW_CONFIG[flowName];
    const flowState = state.taskFlows[flowName];

    // 当日已完成则跳过（每日仅执行一次）
    if (isTaskFlowCompletedToday(flowName)) {
        console.log(`今日${conf.label}点击已完成，跳过`);
        await new Promise(resolve => setTimeout(resolve, 50));
        closeCurrentTab(conf.logPrefix);
        return;
    }

    if (flowState.processing) {
        console.log(`${conf.logPrefix} 正在处理中，跳过`);
        return;
    }

    flowState.processing = true;
    console.log(`${conf.logPrefix} 开始处理任务...`);

    const tasks = await findTasks();

    // 任务区域缺失（DOM 结构变化），直接标记完成并关闭页面
    if (tasks === null) {
        markTaskFlowCompleted(flowName);
        flowState.processing = false;
        await new Promise(resolve => setTimeout(resolve, 50));
        closeCurrentTab(conf.logPrefix);
        return;
    }

    if (tasks.length === 0) {
        console.log(`${conf.logPrefix} 没有找到未完成任务`);

        // 未找到任务时等待页面加载后重试
        if (flowState.retryCount < CONFIG.tasksMaxRetries) {
            flowState.retryCount++;
            console.log(`${conf.logPrefix} 等待 ${CONFIG.tasksRetryDelay}ms 后重试 (${flowState.retryCount}/${CONFIG.tasksMaxRetries})`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.tasksRetryDelay));
            flowState.processing = false;
            return processTasks(flowName, findTasks);
        }

        console.log(`${conf.logPrefix} 已达到最大重试次数，确认没有未完成任务`);
        GM_setValue(conf.completedKey, true);
        console.log(`${conf.logPrefix} 已设置完成标记`);

        flowState.processing = false;
        await new Promise(resolve => setTimeout(resolve, 50));
        closeCurrentTab(conf.logPrefix);
        return;
    }

    console.log(`${conf.logPrefix} 找到 ${tasks.length} 个任务，开始逐个处理...`);

    for (const task of tasks) {
        await clickTask(task, flowName);
    }

    markTaskFlowCompleted(flowName);
    console.log(`${conf.logPrefix} 已设置完成标记`);

    flowState.processing = false;
    console.log(`${conf.logPrefix} 任务处理完成`);

    if (typeof GM_notification !== 'undefined') {
        GM_notification({
            text: `已完成 ${flowState.clicked.size} 个${conf.label}点击`,
            title: conf.notificationTitle,
            timeout: 3000
        });
    }

    await new Promise(resolve => setTimeout(resolve, CONFIG.tasksCloseTabDelay));
    closeCurrentTab(conf.logPrefix);
}

/**
 * earn 页面任务查找：滚动定位 → 等待加载 → 查找未完成任务卡片
 */
async function findAndPrepareEarnTasks() {
    scrollToDailyTasks();
    await new Promise(resolve => setTimeout(resolve, CONFIG.tasksScrollDelay));
    return findIncompleteTaskCards();
}

/**
 * dashboard 页面任务查找：等待 #dailyset 加载 → 滚动定位 → 查找未完成任务卡片
 * 区域缺失时返回 null（与「未找到任务」区分，不重试直接结束）
 */
async function findAndPrepareDashboardTasks() {
    // 等待 #dailyset 区域加载，应对页面元素加载延迟
    const dailySetSection = await waitForDashboardDailySet();

    if (!dailySetSection) {
        console.log('[DashboardTasks] DOM 结构变化，未找到 #dailyset 区域，结束处理');
        return null;
    }

    scrollToDashboardDailySet(dailySetSection);
    await new Promise(resolve => setTimeout(resolve, CONFIG.tasksScrollDelay));
    return findIncompleteDashboardTasks(dailySetSection);
}

/**
 * 等待 #dailyset 区域加载完成（应对页面元素加载延迟）
 * 通过轮询 + MutationObserver 双重机制检测，超时后返回 null
 * 不仅等待 #dailyset 区域出现，还要等待任务卡片实际加载完成
 */
function waitForDashboardDailySet(timeout = 25000) {
    return new Promise((resolve) => {
        const selectors = [
            '#dailyset',
            'section[id="dailyset"]',
            'section[id*="dailyset"]',
            '[data-section="dailyset"]'
        ];

        const findDailySet = () => selectors.reduce((found, sel) => found || document.querySelector(sel), null);

        let dailySetSection = findDailySet();

        // 检查是否还有 loading 占位符（React 服务端渲染的骨架屏）
        const hasLoadingPlaceholders = () => {
            if (!dailySetSection) return true;
            const placeholders = dailySetSection.querySelectorAll('.animate-pulse, [class*="pulse"], [class*="skeleton"], [class*="placeholder"]');
            return placeholders.length > 0;
        };

        // 检查是否有实际的任务链接
        const hasTaskLinks = () => {
            if (!dailySetSection) return false;
            const links = dailySetSection.querySelectorAll('a[href]:not([href="/earn"])');
            return links.length > 0;
        };

        // 立即检查
        if (dailySetSection && !hasLoadingPlaceholders()) {
            console.log('[DashboardTasks] #dailyset 区域已加载完成');
            resolve(dailySetSection);
            return;
        }

        let observer = null;
        const startTime = Date.now();

        const checkAndResolve = () => {
            dailySetSection = findDailySet();
            
            if (dailySetSection) {
                // 如果没有 loading 占位符，或者有实际任务链接，说明加载完成
                if (!hasLoadingPlaceholders() || hasTaskLinks()) {
                    console.log('[DashboardTasks] #dailyset 区域及任务卡片已加载完成');
                    if (observer) observer.disconnect();
                    resolve(dailySetSection);
                    return true;
                }
            }

            // 检查超时
            if (Date.now() - startTime >= timeout) {
                console.log('[DashboardTasks] 等待 #dailyset 区域超时');
                if (observer) observer.disconnect();
                resolve(dailySetSection || findDailySet());
                return true;
            }

            return false;
        };

        // 立即检查一次
        if (checkAndResolve()) return;

        // 设置轮询检查（每 500ms 检查一次）
        const pollInterval = setInterval(() => {
            if (checkAndResolve()) {
                clearInterval(pollInterval);
            }
        }, 500);

        observer = new MutationObserver(() => {
            if (checkAndResolve()) {
                clearInterval(pollInterval);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

/**
 * 滚动到 dashboard 每日活动区域（#dailyset）
 */
function scrollToDashboardDailySet(dailySetSection) {
    console.log('[DashboardTasks] 正在滚动到每日活动区域...');

    if (!dailySetSection) {
        console.log('[DashboardTasks] 未传入 #dailyset 区域，尝试重新查找');
        return false;
    }

    try {
        dailySetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[DashboardTasks] 已滚动到 #dailyset 每日活动区域');
        return true;
    } catch (error) {
        console.log(`[DashboardTasks] 滚动失败: ${error.message}`);
        return false;
    }
}

/**
 * 查找 #dailyset 区域内未完成的任务卡片
 * 复用 earn 页面任务识别逻辑，针对 dashboard 的 DOM 结构与状态文案进行调整
 */
function findIncompleteDashboardTasks(dailySetSection) {
    console.log('[DashboardTasks] 正在查找未完成的任务卡片...');

    if (!dailySetSection) {
        console.log('[DashboardTasks] #dailyset 区域不存在');
        return [];
    }

    // 检查是否还有 loading 占位符
    const placeholders = dailySetSection.querySelectorAll('.animate-pulse, [class*="pulse"], [class*="skeleton"], [class*="placeholder"]');
    if (placeholders.length > 0) {
        console.log('[DashboardTasks] 任务卡片仍在加载中（检测到 loading 占位符），返回空数组');
        return [];
    }

    // 支持多种任务卡片选择器：a[href] 链接以及可能的其他卡片结构
    const taskCards = dailySetSection.querySelectorAll('a[href], [role="button"], .card, [class*="card"]');
    console.log(`[DashboardTasks] 在 #dailyset 区域找到 ${taskCards.length} 个可能的任务元素`);

    const incompleteTasks = [];
    const processedHrefs = new Set();
    const processedElements = new Set();

    // dashboard 的完成状态文案（来自 ActivityCard.Status 国际化资源）
    // completed=已完成, inProgress=正在进行, notStarted=未开始, activated=已激活, locked=已锁定
    const completedPattern = /已完成|complete|completed|✓|✔|done|finished/i;
    const lockedPattern = /已锁定|locked/i;
    // 通过进度条判断未完成任务（格式如 "X/Y"）；边界断言排除完整日期形态（如 8/28/2026）
    const progressPattern = /(?<![\d\/])(\d{1,3})\s*\/\s*(\d{1,4})(?![\d\/])/;

    taskCards.forEach((taskElement) => {
        // 跳过已处理的元素
        if (processedElements.has(taskElement)) return;
        processedElements.add(taskElement);

        const href = taskElement.getAttribute('href');
        
        // 如果是链接元素，检查是否需要跳过
        if (href) {
            if (href === '/earn' || href.startsWith('#') || processedHrefs.has(href)) {
                return;
            }
            processedHrefs.add(href);
        }

        const taskText = taskElement.textContent || taskElement.innerText || '';
        const taskHtml = taskElement.outerHTML;
        const ariaLabel = taskElement.getAttribute('aria-label') || '';
        const role = taskElement.getAttribute('role') || '';

        // 跳过文本内容太少的元素（可能是图标或装饰元素）
        if (taskText.trim().length < 2) return;

        // 完成状态检测：文本、子元素 class、aria-label 多重判定
        const isCompleted = completedPattern.test(taskText) ||
                           completedPattern.test(ariaLabel) ||
                           taskElement.querySelector('[class*="complete"]') ||
                           taskElement.querySelector('[class*="Complete"]') ||
                           taskElement.querySelector('[class*="done"]') ||
                           taskElement.querySelector('[class*="Done"]');

        if (isCompleted) {
            console.log(`[DashboardTasks] 任务已完成，跳过: ${taskText.substring(0, 30)}...`);
            return;
        }

        // 锁定状态任务不可点击，跳过
        const isLocked = lockedPattern.test(taskText) ||
                         lockedPattern.test(ariaLabel) ||
                         taskElement.querySelector('[class*="lock"]') ||
                         taskElement.getAttribute('aria-disabled') === 'true';

        if (isLocked) {
            console.log(`[DashboardTasks] 任务已锁定，跳过: ${taskText.substring(0, 30)}...`);
            return;
        }

        // 通过进度条判断未完成任务（格式如 "X/Y"）
        const progressMatch = taskText.match(progressPattern);
        let isIncompleteByProgress = false;
        if (progressMatch && progressMatch[1] !== progressMatch[2]) {
            isIncompleteByProgress = true;
        }

        // 积分识别：+N 形式
        const pointsMatch = taskText.match(/\+(\d+)/) || taskHtml.match(/\+(\d+)/);
        const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;

        // 只有当有积分或通过进度识别为未完成时，才视为可点击任务
        if (points > 0 || isIncompleteByProgress || (href && href.includes('task'))) {
            const taskId = href || taskElement.id || taskElement.className || Date.now().toString(36);

            incompleteTasks.push({
                element: taskElement,
                href: href,
                points: points,
                taskId: taskId,
                text: taskText.substring(0, 100)
            });

            console.log(`[DashboardTasks] 找到未完成任务: ${taskText.substring(0, 50)}...${points > 0 ? ` (+${points}分)` : ''}`);
        }
    });

    console.log(`[DashboardTasks] 共找到 ${incompleteTasks.length} 个未完成任务`);
    return incompleteTasks;
}

/**
 * 检查并启动任务
 */
async function checkAndStartTask() {
    // 使用每日生成的启动参数（earn/dashboard/搜索 保持一致）
    const startParam = utils.getRandomStartParam();
    const urlParams = new URLSearchParams(window.location.search);

    // 如果是 rewards.bing.com/earn 页面，执行日常任务点击（开关关闭时不执行）
    if (isRewardsPage('/earn')) {
        if (CONFIG.autoClickTasks && urlParams.has(startParam)) {
            console.log('[EarnTasks] 检测到自动处理标记，开始执行日常任务点击');
            await new Promise(resolve => setTimeout(resolve, 50));
            await processTasks('earn', findAndPrepareEarnTasks);
        }
        return;
    }

    // 如果是 rewards.bing.com/dashboard 页面，执行每日活动区域任务点击（开关关闭时不执行）
    if (isRewardsPage('/dashboard')) {
        if (CONFIG.autoClickTasks && urlParams.has(startParam)) {
            console.log('[DashboardTasks] 检测到自动处理标记，开始执行每日活动区域任务点击');
            await new Promise(resolve => setTimeout(resolve, 50));
            await processTasks('dashboard', findAndPrepareDashboardTasks);
        }
        return;
    }

    // 搜索页面的处理逻辑
    // 检查是否有当天的启动参数标记
    const hasStartParam = urlParams.has(startParam);

    console.log(`检查并启动任务: ${startParam}`);

    if (hasStartParam) {
        // 开关开启时，先执行 dashboard 每日活动区域任务点击（在 earn 跳转前），再执行 earn 页面日常任务点击
        if (CONFIG.autoClickTasks) {
            await checkAndExecuteTasksOnPage('dashboard');
            await checkAndExecuteTasksOnPage('earn');
        }

        // APP 端签到在搜索开始前执行；资讯阅读改为每次搜索执行前随机穿插上报（见 executeSearch）
        await AppTaskRunner.runCheckInFlow();

        // 有启动参数，准备执行搜索任务
        setTimeout(executeSearch, 2000);
        randomScrollAfterPageLoad();
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
    GM_deleteValue('cache_search_words');
    // 重置日常任务完成标记（当日已完成则跳过，每日仅执行一次）
    if (!isTaskFlowCompletedToday('earn')) {
        GM_setValue('earnTasksCompleted', false);
    }
    // 重置 dashboard 每日活动任务完成标记（当日已完成则跳过）
    if (!isTaskFlowCompletedToday('dashboard')) {
        GM_setValue('dashboardTasksCompleted', false);
    }
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

GM_registerMenuCommand('⚙️ 配置脚本参数', () => {
    alert('请配置以下参数：\n\n1. searchFormParam: 登录Bing后手动搜索几次，从地址栏获取实际的form参数值\n2. maxSearches: 设置每日最大搜索次数\n3. 其他高级参数可根据需要调整\n\n配置完成后刷新页面开始使用。');
    window.open('https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/quickstart/', '_blank');
});

GM_registerMenuCommand('👨‍💻 关于作者', () => {
    alert('作者：Brian\n版本：' + GM_info.script.version + '\n\n这是一个自动化完成微软必应每日搜索任务的脚本，帮助您轻松积累奖励积分。\n\n如果您觉得这个脚本有用，欢迎给作者点个Star！');
    window.open('https://idbb98.github.io/microsoft-bing-rewards-daily-task-script/', '_blank');
});

if (AppAuth.isAuthLandingPage()) {
    // 授权落地页：捕获授权码并立即兑换令牌，不执行主任务逻辑
    AppAuth.handleAuthLanding();
} else {
    // 每周首次提示
    showWeeklyTip();

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndStartTask);
    } else {
        checkAndStartTask();
    }
}