// ==UserScript==
// @name         Microsoft Bing Rewards Daily Task Script (微软必应奖励每日任务脚本)
// @version      26.4.13.1
// @description  自动完成微软必应每日搜索任务，智能积累奖励积分。支持实时进度追踪、热搜关键词、随机行为模拟，安全高效获取 Bing Rewards 积分。
// @author       Brian
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
 * V26.4.13.1
 * • UI全面重构：采用现代化设计语言，渐变图标容器、分层阴影、圆角优化，视觉体验全面升级
 * • 交互动画增强：展开/收起面板添加平滑旋转动画，按钮悬停/点击具备三态反馈（默认/悬停/按下）
 * • 布局智能适配：收起模式极致紧凑（200px），仅保留倒计时与控制按钮；展开模式信息完整（380px）
 * • 状态栏优化：底部三栏布局（页面状态 | 任务执行 | 版本号），信息层次清晰，实时反映运行状态
 * • 设置页面升级：三段式布局（固定头部+可滚动内容+固定底部），卡片式表单，动态勾选标记，交互更直观
 * • 图标系统优化：全面采用 Emoji 图标，展开/收起使用 CSS rotate 实现 180° 平滑翻转，无闪烁
 * • 搜索行为优化：随机加词/截词功能可视化配置，示例代码等宽字体高亮显示，参数调整更便捷
 * • 性能提升：CSS 变量主题系统，支持系统级暗色模式自动切换，动画采用 GPU 加速
 *
 * V26.2.13.1
 * • 搜索URL优化：调整搜索URL参数构建，增强脚本行为真实性
 * • 菜单优化：调整菜单顺序，提升用户体验
 *
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
    // ==================== 用户可配置参数 (通过设置页面/GM_value持久化) ====================
    
    // 搜索form参数，⚠️ 手动进入https://cn.bing.com，确保登录后执行几次搜索，根据实际地址栏的form=xxx修改
    get searchFormParam() {
        return GM_getValue('customSearchFormParam', 'QBLH');
    },
    set searchFormParam(value) {
        GM_setValue('customSearchFormParam', value);
    },

    // 面板默认是否收缩 (true=收缩, false=展开)
    get panelDefaultCollapsed() {
        return GM_getValue('customPanelDefaultCollapsed', false);
    },
    set panelDefaultCollapsed(value) {
        GM_setValue('customPanelDefaultCollapsed', value);
    },

    // 最大搜索次数
    get maxSearches() {
        return GM_getValue('customMaxSearches', 20);
    },
    set maxSearches(value) {
        GM_setValue('customMaxSearches', value);
    },

    // 是否随机加词，如：人工智能发展  -->  人工1智能发z展
    get randomAddSearchWords() {
        return GM_getValue('customRandomAddSearchWords', false);
    },
    set randomAddSearchWords(value) {
        GM_setValue('customRandomAddSearchWords', value);
    },
    
    // 随机加词因子，控制加词的概率（0-1之间的小数），默认为0.3即30%概率添加字符
    get randomAddSearchWordsFactor() {
        return GM_getValue('customRandomAddSearchWordsFactor', 0.3);
    },
    set randomAddSearchWordsFactor(value) {
        GM_setValue('customRandomAddSearchWordsFactor', value);
    },

    // 是否随机截词，如：人工1智能发z展  --> 人工1智
    get randomCutSearchWords() {
        return GM_getValue('customRandomCutSearchWords', false);
    },
    set randomCutSearchWords(value) {
        GM_setValue('customRandomCutSearchWords', value);
    },
    
    // 随机截词因子，控制截取的概率（0-1之间的小数），默认为0.2即20%概率截取字符
    get randomCutSearchWordsFactor() {
        return GM_getValue('customRandomCutSearchWordsFactor', 0.2);
    },
    set randomCutSearchWordsFactor(value) {
        GM_setValue('customRandomCutSearchWordsFactor', value);
    },

    // 暂停间隔范围：每执行多少次搜索后暂停一次的区间
    get pauseIntervalMin() {
        return GM_getValue('customPauseIntervalMin', 3);
    },
    set pauseIntervalMin(value) {
        GM_setValue('customPauseIntervalMin', value);
    },
    get pauseIntervalMax() {
        return GM_getValue('customPauseIntervalMax', 5);
    },
    set pauseIntervalMax(value) {
        GM_setValue('customPauseIntervalMax', value);
    },

    // 暂停时间范围（毫秒）：每次暂停的持续时间区间
    get pauseTimeMin() {
        return GM_getValue('customPauseTimeMin', 10 * 60 * 1000);
    },
    set pauseTimeMin(value) {
        GM_setValue('customPauseTimeMin', value);
    },
    get pauseTimeMax() {
        return GM_getValue('customPauseTimeMax', 30 * 60 * 1000);
    },
    set pauseTimeMax(value) {
        GM_setValue('customPauseTimeMax', value);
    },

    // 搜索延迟相关配置
    get minDelay() {
        return GM_getValue('customMinDelay', 15 * 1000);
    },
    set minDelay(value) {
        GM_setValue('customMinDelay', value);
    },
    get maxDelay() {
        return GM_getValue('customMaxDelay', 30 * 1000);
    },
    set maxDelay(value) {
        GM_setValue('customMaxDelay', value);
    },

    // ==================== 内部固定参数 (不建议修改) ====================
    
    // 小数部分延迟（随机延迟的基础值）
    decimalDelay: 3 * 1000,
    
    // 网络请求超时时间（毫秒）：获取热门搜索词的最大等待时间
    requestTimeout: 20 * 1000,

    // 启动参数标记数组
    startParams: ['bingTask', 'runSearch', 'initiateSearch', 'bingSearchMode', 'autoSearch', 'startTask', 'executeSearch', 'launchSearch', 'beginSearch', 'processSearch'],
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
        <div id="panel-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${defaultCollapsed ? '0' : '0'};padding:${defaultCollapsed ? '0' : '0 0 16px 0'};">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                <div id="panel-title-container" style="flex:1;min-width:0;${defaultCollapsed ? 'display:none;' : ''}">
                    <h3 style="margin:0;font-size:16px;color:var(--panel-primary-color,#0067b8);white-space:nowrap;font-weight:700;letter-spacing:-0.3px;">
                        Bing Rewards
                    </h3>
                    <div style="font-size:11px;color:var(--panel-text-muted,#999);margin-top:2px;font-weight:500;">
                        自动化搜索任务助手
                    </div>
                </div>
                <div id="panel-countdown" style="font-size:12px;color:var(--panel-text-secondary,#666);white-space:nowrap;font-weight:600;margin-left:12px;padding:6px 12px;background:linear-gradient(135deg,var(--panel-hover-bg,#f5f5f5),var(--panel-bg,#fff));border-radius:8px;border:1px solid var(--panel-border,#eee);${defaultCollapsed ? '' : 'display:none;'};box-shadow:0 2px 6px rgba(0,0,0,0.05);"></div>
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
        <div id="panel-body" style="${defaultCollapsed ? 'display:none;' : ''}animation:slideDown 0.3s cubic-bezier(0.4,0,0.2,1);">
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
            '--panel-hover-bg': '#f5f5f5'
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
            '--panel-hover-bg': '#2a2a2a'
        }
    };

    const theme = isDarkMode ? themeVariables.dark : themeVariables.light;

    Object.assign(panel.style, {
        position: 'fixed',
        bottom: '50px',
        right: '20px',
        background: theme['--panel-bg'],
        border: `1px solid ${theme['--panel-border']}`,
        borderRadius: '20px',
        padding: defaultCollapsed ? '16px 20px' : '24px',
        boxShadow: defaultCollapsed 
            ? `0 8px 24px ${theme['--panel-shadow']}, 0 0 0 1px ${theme['--panel-border']}30`
            : `0 16px 48px ${theme['--panel-shadow']}, 0 0 0 1px ${theme['--panel-border']}40, 0 0 80px ${theme['--panel-primary-color']}10`,
        zIndex: '10000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '13px',
        minWidth: defaultCollapsed ? '200px' : '380px',
        maxWidth: '420px',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        color: theme['--panel-text-primary'],
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
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

            if (state.isPanelCollapsed) {
                // 收缩状态 - 更紧凑的布局
                panelBody.style.display = 'none';
                if (countdownElement) countdownElement.style.display = '';
                const toggleIcon = document.getElementById('toggle-icon');
                if (toggleIcon) {
                    toggleIcon.style.transform = 'rotate(0deg)';
                }
                const titleContainer = document.getElementById('panel-title-container');
                if (titleContainer) {
                    titleContainer.style.display = 'none';
                }
                toggleBtn.title = '展开面板';
                panelHeader.style.paddingBottom = '0';
                panel.style.padding = '16px 20px';
                panel.style.minWidth = '200px';
                panel.style.boxShadow = `0 8px 24px ${theme['--panel-shadow']}, 0 0 0 1px ${theme['--panel-border']}30`;
            } else {
                // 展开状态 - 更宽松的布局
                panelBody.style.display = 'block';
                if (countdownElement) countdownElement.style.display = 'none';
                const toggleIcon = document.getElementById('toggle-icon');
                if (toggleIcon) {
                    toggleIcon.style.transform = 'rotate(180deg)';
                }
                const titleContainer = document.getElementById('panel-title-container');
                if (titleContainer) {
                    titleContainer.style.display = '';
                }
                toggleBtn.title = '收起面板';
                panelHeader.style.paddingBottom = '16px';
                panel.style.padding = '24px';
                panel.style.minWidth = '380px';
                panel.style.boxShadow = `0 16px 48px ${theme['--panel-shadow']}, 0 0 0 1px ${theme['--panel-border']}40, 0 0 80px ${theme['--panel-primary-color']}10`;
            }

            // 立即更新面板内容以刷新倒计时显示
            updateStatusPanel();
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
        settingsBtn.addEventListener('mouseenter', () => {
            settingsBtn.style.backgroundColor = theme['--panel-hover-bg'];
            settingsBtn.style.transform = 'scale(1.1) rotate(30deg)';
            settingsBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        });

        settingsBtn.addEventListener('mouseleave', () => {
            settingsBtn.style.backgroundColor = 'transparent';
            settingsBtn.style.transform = 'scale(1) rotate(0deg)';
            settingsBtn.style.boxShadow = 'none';
        });

        settingsBtn.addEventListener('mousedown', () => {
            settingsBtn.style.transform = 'scale(0.95) rotate(30deg)';
        });

        settingsBtn.addEventListener('mouseup', () => {
            settingsBtn.style.transform = 'scale(1.1) rotate(30deg)';
        });
    }

    // 为关闭按钮添加事件监听器
    const closeBtn = document.getElementById('panel-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // 添加悬停效果
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = '#ffebee';
            closeBtn.style.color = '#f44336';
            closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
            closeBtn.style.boxShadow = '0 2px 8px rgba(244,67,54,0.2)';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
            closeBtn.style.color = theme['--panel-text-secondary'];
            closeBtn.style.transform = 'scale(1) rotate(0deg)';
            closeBtn.style.boxShadow = 'none';
        });

        closeBtn.addEventListener('mousedown', () => {
            closeBtn.style.transform = 'scale(0.95) rotate(90deg)';
        });

        closeBtn.addEventListener('mouseup', () => {
            closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
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
            panel.style.boxShadow = `0 12px 32px ${newTheme['--panel-shadow']}, 0 0 0 1px ${newTheme['--panel-border']}40`;
            panel.style.color = newTheme['--panel-text-primary'];

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

    // 每次打开对话框时重新获取最新配置值
    // ⚠️ 重要: 直接使用 GM_getValue 读取最新值,而不是依赖 CONFIG 对象(可能缓存旧值)
    // 这样可以确保用户看到的就是当前存储的实际配置,避免显示过期数据
    const savedSearchFormParam = GM_getValue('customSearchFormParam', 'QBLH');
    const savedPanelCollapsed = GM_getValue('customPanelDefaultCollapsed', false);
    const savedMaxSearches = GM_getValue('customMaxSearches', 20);
    const savedRandomAdd = GM_getValue('customRandomAddSearchWords', false);
    const savedRandomAddFactor = GM_getValue('customRandomAddSearchWordsFactor', 0.3);
    const savedRandomCut = GM_getValue('customRandomCutSearchWords', false);
    const savedRandomCutFactor = GM_getValue('customRandomCutSearchWordsFactor', 0.2);
    const savedPauseIntervalMin = GM_getValue('customPauseIntervalMin', 3);
    const savedPauseIntervalMax = GM_getValue('customPauseIntervalMax', 5);
    const savedPauseTimeMin = GM_getValue('customPauseTimeMin', 10 * 60 * 1000) / 60000; // 转换为分钟
    const savedPauseTimeMax = GM_getValue('customPauseTimeMax', 30 * 60 * 1000) / 60000; // 转换为分钟
    const savedMinDelay = GM_getValue('customMinDelay', 15 * 1000) / 1000; // 转换为秒
    const savedMaxDelay = GM_getValue('customMaxDelay', 30 * 1000) / 1000; // 转换为秒

    console.log('📋 加载最新设置:', {
        searchFormParam: savedSearchFormParam,
        panelCollapsed: savedPanelCollapsed,
        maxSearches: savedMaxSearches,
        randomAdd: savedRandomAdd,
        randomAddFactor: savedRandomAddFactor,
        randomCut: savedRandomCut,
        randomCutFactor: savedRandomCutFactor,
        pauseInterval: `${savedPauseIntervalMin}-${savedPauseIntervalMax}`,
        pauseTime: `${savedPauseTimeMin}-${savedPauseTimeMax}分钟`,
        delay: `${savedMinDelay}-${savedMaxDelay}秒`
    });

    // 创建设置对话框
    const dialog = document.createElement('div');
    dialog.id = 'settings-dialog';
    dialog.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);animation:fadeIn 0.2s ease;">
            <div style="background:${theme['--panel-bg']};border:1px solid ${theme['--panel-border']};border-radius:24px;padding:0;min-width:600px;max-width:720px;max-height:90vh;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,0.6),0 0 0 1px ${theme['--panel-border']}40;animation:dialogSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1);display:flex;flex-direction:column;">
                <!-- 固定头部 -->
                <div style="display:flex;justify-content:space-between;align-items:center;padding:28px 32px 24px;background:linear-gradient(135deg,${theme['--panel-bg']} 0%,${theme['--panel-hover-bg']} 100%);">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,${theme['--panel-primary-color']},${theme['--panel-primary-color']}cc);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 4px 12px ${theme['--panel-primary-color']}40;">
                            ⚙️
                        </div>
                        <div>
                            <h3 style="margin:0;font-size:24px;color:${theme['--panel-primary-color']};font-weight:800;letter-spacing:-0.5px;">
                                脚本设置
                            </h3>
                            <p style="margin:4px 0 0;font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">
                                自定义搜索行为，优化任务执行策略
                            </p>
                        </div>
                    </div>
                    <div id="settings-close-btn" style="cursor:pointer;font-size:20px;color:${theme['--panel-text-secondary']};width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:12px;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);background:transparent;user-select:none;" title="关闭设置">
                        ✕
                    </div>
                </div>

                <!-- 可滚动内容区 -->
                <div style="padding:32px;overflow-y:auto;flex:1;">
                    <!-- 基础配置 -->
                    <div style="margin-bottom:36px;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid ${theme['--panel-primary-color']}20;">
                            <div style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-info-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                🔧
                            </div>
                            <div>
                                <h4 style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    基础配置
                                </h4>
                                <p style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    设置脚本运行的基本参数
                                </p>
                            </div>
                        </div>

                        <div style="margin-bottom:24px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">🔍</span>
                                搜索表单参数
                                <span style="color:#f44336;">*</span>
                            </label>
                            <input type="text" id="search-form-param-input" value="${savedSearchFormParam}"
                                style="width:100%;box-sizing:border-box;padding:14px 16px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:48px;font-weight:500;letter-spacing:0.5px;"
                                placeholder="例如: QBLH">
                            <div style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>登录必应后手动搜索几次，从地址栏获取 <code style="background:${theme['--panel-bg']};padding:3px 8px;border-radius:6px;font-family:'Courier New',monospace;font-size:11px;font-weight:600;border:1px solid ${theme['--panel-border']};">form=xxx</code> 参数值</span>
                            </div>
                        </div>

                        <div style="margin-bottom:24px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">📊</span>
                                每日最大搜索次数
                            </label>
                            <input type="number" id="max-searches-input" value="${savedMaxSearches}" min="1" max="50"
                                style="width:100%;box-sizing:border-box;padding:14px 16px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:48px;font-weight:500;"
                                placeholder="建议 10-20 次">
                            <div style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">⚠️</span>
                                <span>建议设置为 <strong style="color:${theme['--panel-warning-text']};">10-20次</strong>，过高可能触发微软风控机制，增加账号风险</span>
                            </div>
                        </div>

                        <div style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">📱</span>
                                面板默认显示状态
                            </label>
                            <div style="display:flex;gap:12px;">
                                <label style="flex:1;display:flex;align-items:center;gap:12px;padding:16px;border:2px solid ${!savedPanelCollapsed ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:12px;background:${!savedPanelCollapsed ? 'linear-gradient(135deg,' + theme['--panel-success-bg'] + ',' + theme['--panel-hover-bg'] + ')' : theme['--panel-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;">
                                    <input type="radio" name="panel-default-state" value="expanded" ${!savedPanelCollapsed ? 'checked' : ''}
                                        style="width:20px;height:20px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                    <div style="flex:1;">
                                        <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:2px;">✨ 展开状态</div>
                                        <div style="font-size:11px;color:${theme['--panel-text-muted']};">显示完整面板信息</div>
                                    </div>
                                </label>
                                <label style="flex:1;display:flex;align-items:center;gap:12px;padding:16px;border:2px solid ${savedPanelCollapsed ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:12px;background:${savedPanelCollapsed ? 'linear-gradient(135deg,' + theme['--panel-info-bg'] + ',' + theme['--panel-hover-bg'] + ')' : theme['--panel-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;">
                                    <input type="radio" name="panel-default-state" value="collapsed" ${savedPanelCollapsed ? 'checked' : ''}
                                        style="width:20px;height:20px;accent-color:${theme['--panel-primary-color']};cursor:pointer;flex-shrink:0;">
                                    <div style="flex:1;">
                                        <div style="font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;margin-bottom:2px;">🔽 收缩状态</div>
                                        <div style="font-size:11px;color:${theme['--panel-text-muted']};">仅显示标题栏</div>
                                    </div>
                                </label>
                            </div>
                            <div style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>选择脚本加载时面板的默认显示状态，可随时手动切换</span>
                            </div>
                        </div>
                    </div>

                    <!-- 搜索行为配置 -->
                    <div style="margin-bottom:36px;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid ${theme['--panel-primary-color']}20;">
                            <div style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-success-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                🎲
                            </div>
                            <div>
                                <h4 style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    搜索行为优化
                                </h4>
                                <p style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    模拟真实用户搜索习惯，降低检测风险
                                </p>
                            </div>
                        </div>

                        <div style="display:flex;gap:14px;margin-bottom:18px;">
                            <label style="flex:1;display:flex;align-items:flex-start;gap:12px;padding:18px;border:2px solid ${savedRandomAdd ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:14px;background:${savedRandomAdd ? 'linear-gradient(135deg,' + theme['--panel-info-bg'] + ',transparent)' : theme['--panel-hover-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;">
                                ${savedRandomAdd ? '<div style="position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:' + theme['--panel-primary-color'] + ';color:#fff;font-size:10px;font-weight:700;">已启用</div>' : ''}
                                <input type="checkbox" id="random-add-checkbox" ${savedRandomAdd ? 'checked' : ''}
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
                            <label style="flex:1;display:flex;align-items:flex-start;gap:12px;padding:18px;border:2px solid ${savedRandomCut ? theme['--panel-primary-color'] : theme['--panel-border']};border-radius:14px;background:${savedRandomCut ? 'linear-gradient(135deg,' + theme['--panel-success-bg'] + ',transparent)' : theme['--panel-hover-bg']};cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);position:relative;">
                                ${savedRandomCut ? '<div style="position:absolute;top:10px;right:10px;padding:3px 8px;border-radius:6px;background:' + theme['--panel-primary-color'] + ';color:#fff;font-size:10px;font-weight:700;">已启用</div>' : ''}
                                <input type="checkbox" id="random-cut-checkbox" ${savedRandomCut ? 'checked' : ''}
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

                        <div style="display:flex;gap:14px;margin-bottom:16px;">
                            <div style="flex:1;padding:18px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                                <label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;color:${theme['--panel-text-primary']};font-weight:600;">
                                    加词触发概率
                                </label>
                                <input type="number" id="random-add-factor-input" value="${savedRandomAddFactor}" min="0" max="1" step="0.1"
                                    style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid ${theme['--panel-border']};border-radius:10px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:46px;font-weight:600;">
                                <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:11px;color:${theme['--panel-text-muted']};">范围：0-1</span>
                                    <span style="font-size:11px;color:${theme['--panel-primary-color']};font-weight:600;background:${theme['--panel-info-bg']};padding:3px 8px;border-radius:6px;">默认 0.3 (30%)</span>
                                </div>
                            </div>
                            <div style="flex:1;padding:18px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                                <label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;color:${theme['--panel-text-primary']};font-weight:600;">
                                    截词触发概率
                                </label>
                                <input type="number" id="random-cut-factor-input" value="${savedRandomCutFactor}" min="0" max="1" step="0.1"
                                    style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid ${theme['--panel-border']};border-radius:10px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:46px;font-weight:600;">
                                <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:11px;color:${theme['--panel-text-muted']};">范围：0-1</span>
                                    <span style="font-size:11px;color:${theme['--panel-primary-color']};font-weight:600;background:${theme['--panel-info-bg']};padding:3px 8px;border-radius:6px;">默认 0.2 (20%)</span>
                                </div>
                            </div>
                        </div>
                        <div style="font-size:12px;color:${theme['--panel-text-muted']};line-height:1.8;padding:14px 16px;background:linear-gradient(135deg,${theme['--panel-warning-bg']},${theme['--panel-hover-bg']});border-radius:10px;display:flex;align-items:flex-start;gap:8px;border-left:3px solid ${theme['--panel-warning-border']};">
                            <span style="flex-shrink:0;font-size:16px;">💡</span>
                            <div>
                                <strong style="color:${theme['--panel-text-primary']};">使用建议：</strong>开启后可有效混淆搜索行为，模拟真人输入习惯。因子值越高，触发概率越大。建议保持默认值，既能保证真实性，又不会影响搜索效果。
                            </div>
                        </div>
                    </div>

                    <!-- 暂停配置 -->
                    <div style="margin-bottom:36px;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid ${theme['--panel-primary-color']}20;">
                            <div style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-warning-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                ⏸️
                            </div>
                            <div>
                                <h4 style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    智能暂停策略
                                </h4>
                                <p style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    模拟人类休息节奏，大幅降低检测风险
                                </p>
                            </div>
                        </div>

                        <div style="margin-bottom:20px;padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">🔄</span>
                                暂停间隔设置
                            </label>
                            <div style="display:flex;gap:12px;align-items:center;">
                                <div style="flex:1;position:relative;">
                                    <input type="number" id="pause-interval-min-input" value="${savedPauseIntervalMin}" min="1" max="20"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:50px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">次</span>
                                </div>
                                <span style="color:${theme['--panel-text-muted']};font-size:14px;font-weight:600;padding:0 4px;">至</span>
                                <div style="flex:1;position:relative;">
                                    <input type="number" id="pause-interval-max-input" value="${savedPauseIntervalMax}" min="1" max="20"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:50px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">次</span>
                                </div>
                            </div>
                            <div style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">📝</span>
                                <span>每完成 <strong style="color:${theme['--panel-primary-color']};">3-5次</strong> 搜索后随机暂停一次，模拟人类工作节奏</span>
                            </div>
                        </div>

                        <div style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">⏱️</span>
                                暂停时长设置
                            </label>
                            <div style="display:flex;gap:12px;align-items:center;">
                                <div style="flex:1;position:relative;">
                                    <input type="number" id="pause-time-min-input" value="${savedPauseTimeMin}" min="1" max="60" step="1"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:65px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">分钟</span>
                                </div>
                                <span style="color:${theme['--panel-text-muted']};font-size:14px;font-weight:600;padding:0 4px;">至</span>
                                <div style="flex:1;position:relative;">
                                    <input type="number" id="pause-time-max-input" value="${savedPauseTimeMax}" min="1" max="120" step="1"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:65px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">分钟</span>
                                </div>
                            </div>
                            <div style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">⚠️</span>
                                <span>建议设置为 <strong style="color:${theme['--panel-warning-text']};">10-30分钟</strong>，有效模拟人类休息间隔，显著降低账号被封风险</span>
                            </div>
                        </div>
                    </div>

                    <!-- 延迟配置 -->
                    <div style="margin-bottom:36px;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid ${theme['--panel-primary-color']}20;">
                            <div style="width:36px;height:36px;border-radius:10px;background:${theme['--panel-info-bg']};display:flex;align-items:center;justify-content:center;font-size:18px;">
                                ⏱️
                            </div>
                            <div>
                                <h4 style="margin:0;font-size:16px;color:${theme['--panel-primary-color']};font-weight:700;letter-spacing:-0.3px;">
                                    搜索延迟控制
                                </h4>
                                <p style="margin:2px 0 0;font-size:11px;color:${theme['--panel-text-muted']};font-weight:500;">
                                    控制搜索间隔时间，避免过于频繁
                                </p>
                            </div>
                        </div>

                        <div style="padding:20px;background:${theme['--panel-hover-bg']};border-radius:14px;border:1px solid ${theme['--panel-border']};">
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px;color:${theme['--panel-text-primary']};font-weight:600;">
                                <span style="font-size:16px;">⏳</span>
                                两次搜索之间的间隔时间
                            </label>
                            <div style="display:flex;gap:12px;align-items:center;">
                                <div style="flex:1;position:relative;">
                                    <input type="number" id="min-delay-input" value="${savedMinDelay}" min="5" max="60" step="1"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:45px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">秒</span>
                                </div>
                                <span style="color:${theme['--panel-text-muted']};font-size:14px;font-weight:600;padding:0 4px;">至</span>
                                <div style="flex:1;position:relative;">
                                    <input type="number" id="max-delay-input" value="${savedMaxDelay}" min="10" max="120" step="1"
                                        style="width:100%;box-sizing:border-box;padding:14px 16px;padding-right:45px;border:2px solid ${theme['--panel-border']};border-radius:12px;font-size:14px;background:${theme['--panel-bg']};color:${theme['--panel-text-primary']};outline:none;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);height:50px;font-weight:600;">
                                    <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:12px;color:${theme['--panel-text-muted']};font-weight:500;">秒</span>
                                </div>
                            </div>
                            <div style="margin-top:10px;font-size:12px;color:${theme['--panel-text-muted']};line-height:1.7;display:flex;align-items:flex-start;gap:6px;">
                                <span style="flex-shrink:0;">💡</span>
                                <span>建议设置为 <strong style="color:${theme['--panel-primary-color']};">15-30秒</strong>，模拟真人浏览搜索结果页的自然节奏</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 固定底部按钮区 -->
                <div style="display:flex;gap:12px;justify-content:space-between;padding:24px 32px;border-top:1px solid ${theme['--panel-border']};background:linear-gradient(135deg,${theme['--panel-hover-bg']} 0%,${theme['--panel-bg']} 100%);">
                    <button id="settings-reset-btn" style="padding:14px 28px;border:2px solid ${theme['--panel-border']};border-radius:12px;background:transparent;color:${theme['--panel-text-secondary']};font-size:14px;cursor:pointer;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);font-weight:600;display:flex;align-items:center;gap:8px;user-select:none;position:relative;overflow:hidden;">
                        <span style="font-size:16px;">🔄</span>
                        <span>恢复默认</span>
                    </button>
                    <div style="display:flex;gap:12px;">
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
            #settings-dialog > div > div > div:nth-child(2)::-webkit-scrollbar { width: 10px; }
            #settings-dialog > div > div > div:nth-child(2)::-webkit-scrollbar-track { background: transparent; }
            #settings-dialog > div > div > div:nth-child(2)::-webkit-scrollbar-thumb { background: ${theme['--panel-border']}; border-radius: 5px; }
            #settings-dialog > div > div > div:nth-child(2)::-webkit-scrollbar-thumb:hover { background: ${theme['--panel-text-muted']}; }
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
    const randomAddFactorInput = document.getElementById('random-add-factor-input');
    const randomCutFactorInput = document.getElementById('random-cut-factor-input');
    const pauseIntervalMinInput = document.getElementById('pause-interval-min-input');
    const pauseIntervalMaxInput = document.getElementById('pause-interval-max-input');
    const pauseTimeMinInput = document.getElementById('pause-time-min-input');
    const pauseTimeMaxInput = document.getElementById('pause-time-max-input');
    const minDelayInput = document.getElementById('min-delay-input');
    const maxDelayInput = document.getElementById('max-delay-input');

    const closeDialog = () => {
        dialog.remove();
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);

    // 点击背景关闭
    dialog.querySelector('div').addEventListener('click', (e) => {
        if (e.target === dialog.querySelector('div')) {
            closeDialog();
        }
    });

    // 添加关闭按钮悬停效果
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = theme['--panel-hover-bg'];
        closeBtn.style.color = theme['--panel-primary-color'];
        closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.backgroundColor = 'transparent';
        closeBtn.style.color = theme['--panel-text-secondary'];
        closeBtn.style.transform = 'scale(1) rotate(0deg)';
    });
    closeBtn.addEventListener('mousedown', () => {
        closeBtn.style.transform = 'scale(0.95) rotate(90deg)';
    });
    closeBtn.addEventListener('mouseup', () => {
        closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
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
    [randomAddCheckbox, randomCutCheckbox].forEach(checkbox => {
        if (!checkbox) return;
        const label = checkbox.closest('label');

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                label.style.borderColor = theme['--panel-primary-color'];
                label.style.background = `linear-gradient(135deg,${checkbox.id === 'random-add-checkbox' ? theme['--panel-info-bg'] : theme['--panel-success-bg']},transparent)`;
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
        pauseIntervalMinInput.value = 3;
        pauseIntervalMaxInput.value = 5;
        pauseTimeMinInput.value = 10;
        pauseTimeMaxInput.value = 30;
        minDelayInput.value = 15;
        maxDelayInput.value = 30;

        // 触发checkbox样式更新
        randomAddCheckbox.dispatchEvent(new Event('change'));
        randomCutCheckbox.dispatchEvent(new Event('change'));
    });

    // 保存按钮事件
    saveBtn.addEventListener('click', () => {
        const searchFormParam = searchFormInput.value.trim();
        const maxSearches = parseInt(maxSearchesInput.value);
        const panelDefaultCollapsed = Array.from(panelStateRadios).find(r => r.checked).value === 'collapsed';
        const randomAdd = randomAddCheckbox.checked;
        const randomAddFactor = parseFloat(randomAddFactorInput.value);
        const randomCut = randomCutCheckbox.checked;
        const randomCutFactor = parseFloat(randomCutFactorInput.value);
        const pauseIntervalMin = parseInt(pauseIntervalMinInput.value);
        const pauseIntervalMax = parseInt(pauseIntervalMaxInput.value);
        const pauseTimeMin = parseFloat(pauseTimeMinInput.value) * 60 * 1000; // 转换为毫秒
        const pauseTimeMax = parseFloat(pauseTimeMaxInput.value) * 60 * 1000; // 转换为毫秒
        const minDelay = parseFloat(minDelayInput.value) * 1000; // 转换为毫秒
        const maxDelay = parseFloat(maxDelayInput.value) * 1000; // 转换为毫秒

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

        // 保存所有配置
        GM_setValue('customSearchFormParam', searchFormParam);
        GM_setValue('customPanelDefaultCollapsed', panelDefaultCollapsed);
        GM_setValue('customMaxSearches', maxSearches);
        GM_setValue('customRandomAddSearchWords', randomAdd);
        GM_setValue('customRandomAddSearchWordsFactor', randomAddFactor);
        GM_setValue('customRandomCutSearchWords', randomCut);
        GM_setValue('customRandomCutSearchWordsFactor', randomCutFactor);
        GM_setValue('customPauseIntervalMin', pauseIntervalMin);
        GM_setValue('customPauseIntervalMax', pauseIntervalMax);
        GM_setValue('customPauseTimeMin', pauseTimeMin);
        GM_setValue('customPauseTimeMax', pauseTimeMax);
        GM_setValue('customMinDelay', minDelay);
        GM_setValue('customMaxDelay', maxDelay);

        console.log('💾 保存设置:', {
            searchFormParam,
            panelDefaultCollapsed,
            maxSearches,
            randomAdd,
            randomAddFactor,
            randomCut,
            randomCutFactor,
            pauseInterval: `${pauseIntervalMin}-${pauseIntervalMax}`,
            pauseTime: `${pauseTimeMin/60000}-${pauseTimeMax/60000}分钟`,
            delay: `${minDelay/1000}-${maxDelay/1000}秒`
        });

        // 显示成功提示
        alert('✅ 配置已保存!页面将在3秒后刷新以应用新配置...');

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
    const pageStatusText = document.getElementById('page-status-text');
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
                    <div style="font-size:12px;word-break:break-all;color:var(--panel-text-primary,#1a1a1a);line-height:1.5;max-height:44px;overflow-y:auto;font-weight:500;">${currentWord}</div>
                </div>
            ` : ''}
        </div>
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
    if (title) title.textContent = `[${taskStatus.currentCount}/${taskStatus.maxCount}] Bing Rewards...`;

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

GM_registerMenuCommand('⚙️ 配置脚本参数', () => {
    alert('请配置以下参数：\n\n1. searchFormParam: 登录Bing后手动搜索几次，从地址栏获取实际的form参数值\n2. maxSearches: 设置每日最大搜索次数\n3. 其他高级参数可根据需要调整\n\n配置完成后刷新页面开始使用。');
    window.open('https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script#-%e5%ae%89%e8%a3%85%e4%b8%8e%e4%bd%bf%e7%94%a8', '_blank');
});

GM_registerMenuCommand('👨‍💻 关于作者', () => {
    alert('作者：Brian\n版本：' + GM_info.script.version + '\n\n这是一个自动化完成微软必应每日搜索任务的脚本，帮助您轻松积累奖励积分。\n\n如果您觉得这个脚本有用，欢迎给作者点个Star！');
    window.open('https://gitee.com/idbb98/microsoft-bing-rewards-daily-task-script', '_blank');
});

// 启动脚本
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndStartTask);
} else {
    checkAndStartTask();
}