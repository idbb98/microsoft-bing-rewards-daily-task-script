// 扩展设置页面脚本

// 默认配置
const DEFAULT_SETTINGS = {
    randomAddSearchWords: false,
    randomAddSearchWordsFactor: 0.3,
    randomCutSearchWords: false,
    randomCutSearchWordsFactor: 0.2,
    maxWebSearches: 50,
    maxMobileSearches: 36,
    minDelay: 8,
    maxDelay: 15,
    pauseInterval: 5,
    pauseTime: 15,
    requestTimeout: 20,
    startParam: 'bingTask',
    searchWords: [
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
    ],
    pcSources: [
        {
            name: "百度热搜",
            url: "https://top.baidu.com/api/board?tab=realtime",
            parser: "data.data?.cards?.[0]?.content?.map(item => item.word) || []"
        },
        {
            name: "腾讯新闻热点",
            url: "https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=50",
            parser: "data.idlist?.[0]?.newslist?.map(item => item.title) || []"
        }
    ],
    mobileSources: [
        {
            name: "今日头条热榜",
            url: "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
            parser: "data.data?.map(item => item.Title?.trim()).filter(Boolean) || []"
        },
        {
            name: "微博实时热点",
            url: "https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot",
            parser: "if (data.data.cards && data.data.cards[0].card_group) { return data.data.cards[0].card_group.filter(item => item.desc && item.desc.length > 0).map(item => item.desc).filter(Boolean); } return []"
        }
    ]
};

// 校验规则
const VALIDATION_RULES = {
    maxWebSearches: { min: 10, max: 100, name: 'PC端搜索次数' },
    maxMobileSearches: { min: 10, max: 50, name: '移动端搜索次数' },
    minDelay: { min: 1, max: 30, name: '最小延迟' },
    maxDelay: { min: 5, max: 60, name: '最大延迟' },
    pauseInterval: { min: 1, max: 20, name: '暂停间隔' },
    pauseTime: { min: 1, max: 60, name: '暂停时间' },
    requestTimeout: { min: 5, max: 60, name: '网络请求超时' },
    randomAddSearchWordsFactor: { min: 0, max: 1, name: '加词概率' },
    randomCutSearchWordsFactor: { min: 0, max: 1, name: '截词概率' }
};

// 校验单个值
function validateValue(key, value) {
    const rule = VALIDATION_RULES[key];
    if (!rule) return { valid: true };
    
    if (isNaN(value)) {
        return { valid: false, message: `${rule.name}必须是数字` };
    }
    
    if (value < rule.min || value > rule.max) {
        return { valid: false, message: `${rule.name}必须在 ${rule.min} 到 ${rule.max} 之间` };
    }
    
    return { valid: true };
}

// 校验所有配置
function validateSettings(settings) {
    const errors = [];
    
    for (const [key, value] of Object.entries(settings)) {
        const result = validateValue(key, value);
        if (!result.valid) {
            errors.push(result.message);
        }
    }
    
    // 特殊校验：最小延迟必须小于最大延迟
    if (settings.minDelay >= settings.maxDelay) {
        errors.push('最小延迟必须小于最大延迟');
    }
    
    return errors;
}

function showValidationErrors(errors) {
    if (errors.length > 0) {
        alert('❌ ' + errors.join('\n'));
        return false;
    }
    return true;
}

function clearErrors() {
}

// 实时校验输入
function setupRealTimeValidation() {
    const inputs = [
        { id: 'maxWebSearches', key: 'maxWebSearches' },
        { id: 'maxMobileSearches', key: 'maxMobileSearches' },
        { id: 'minDelay', key: 'minDelay' },
        { id: 'maxDelay', key: 'maxDelay' },
        { id: 'pauseInterval', key: 'pauseInterval' },
        { id: 'pauseTime', key: 'pauseTime' },
        { id: 'requestTimeout', key: 'requestTimeout' }
    ];
    
    inputs.forEach(({ id, key }) => {
        const input = document.getElementById(id);
        input.addEventListener('input', () => {
            const value = parseInt(input.value);
            const result = validateValue(key, value);
            
            if (!result.valid) {
                input.classList.add('error');
                input.title = result.message;
            } else {
                input.classList.remove('error');
                input.title = '';
            }
        });
        
        input.addEventListener('blur', () => {
            const value = parseInt(input.value);
            const result = validateValue(key, value);
            
            if (!result.valid) {
                input.value = DEFAULT_SETTINGS[key];
                input.classList.remove('error');
                input.title = '';
            }
        });
    });
}

// 更新滑块背景
function updateSliderBackground(sliderId, value) {
    const slider = document.getElementById(sliderId);
    const percentage = value * 100;
    slider.style.background = `linear-gradient(to right, #4285f4 0%, #4285f4 ${percentage}%, #e0e0e0 ${percentage}%, #e0e0e0 100%)`;
}

// 渲染热词源列表
function renderSources(containerId, sources) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const template = document.getElementById('sourceItemTemplate');
    
    sources.forEach((source, index) => {
        const clone = template.content.cloneNode(true);
        const sourceItem = clone.querySelector('.source-item');
        
        sourceItem.dataset.index = index;
        sourceItem.dataset.containerId = containerId;
        
        const nameElement = sourceItem.querySelector('.source-item-name');
        nameElement.textContent = source.name;
        
        const nameInput = sourceItem.querySelector('input[data-field="name"]');
        nameInput.value = source.name;
        
        const urlInput = sourceItem.querySelector('input[data-field="url"]');
        urlInput.value = source.url;
        
        const parserTextarea = sourceItem.querySelector('textarea[data-field="parser"]');
        parserTextarea.value = source.parser;
        
        const editBtn = sourceItem.querySelector('button[data-action="edit"]');
        const deleteBtn = sourceItem.querySelector('button[data-action="delete"]');
        const cancelBtn = sourceItem.querySelector('button[data-action="cancel"]');
        const saveBtn = sourceItem.querySelector('button[data-action="save"]');
        
        editBtn.addEventListener('click', () => editSource(containerId, index, sourceItem));
        deleteBtn.addEventListener('click', () => deleteSource(containerId, index));
        cancelBtn.addEventListener('click', () => cancelEdit(containerId, index, sourceItem));
        saveBtn.addEventListener('click', () => saveSource(containerId, index, sourceItem));
        
        container.appendChild(sourceItem);
    });
}

// 转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 编辑热词源
function editSource(containerId, index, sourceItem) {
    const body = sourceItem.querySelector('.source-item-body');
    body.classList.add('active');
}

// 取消编辑
function cancelEdit(containerId, index, sourceItem) {
    const body = sourceItem.querySelector('.source-item-body');
    body.classList.remove('active');
    
    const sources = containerId === 'pcSourcesContainer' ? currentPcSources : currentMobileSources;
    
    const nameInput = sourceItem.querySelector('input[data-field="name"]');
    const urlInput = sourceItem.querySelector('input[data-field="url"]');
    const parserTextarea = sourceItem.querySelector('textarea[data-field="parser"]');
    
    nameInput.value = sources[index].name;
    urlInput.value = sources[index].url;
    parserTextarea.value = sources[index].parser;
}

// 保存热词源
function saveSource(containerId, index, sourceItem) {
    const nameInput = sourceItem.querySelector('input[data-field="name"]');
    const urlInput = sourceItem.querySelector('input[data-field="url"]');
    const parserTextarea = sourceItem.querySelector('textarea[data-field="parser"]');
    
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const parser = parserTextarea.value.trim();
    
    if (!name) {
        alert('请填写热词源名称');
        return;
    }
    
    if (!url) {
        alert('请填写热词源URL');
        return;
    }
    
    if (!parser) {
        alert('请填写解析器表达式');
        return;
    }
    
    try {
        const sources = containerId === 'pcSourcesContainer' ? currentPcSources : currentMobileSources;
        sources[index] = { name, url, parser };
        
        const nameElement = sourceItem.querySelector('.source-item-name');
        nameElement.textContent = name;
        
        const body = sourceItem.querySelector('.source-item-body');
        body.classList.remove('active');
        
    } catch (error) {
        alert('保存热词源失败：' + error.message);
    }
}

// 删除热词源
function deleteSource(containerId, index) {
    const sources = containerId === 'pcSourcesContainer' ? currentPcSources : currentMobileSources;
    const sourceName = sources[index].name;
    
    if (!confirm(`确定要删除热词源"${sourceName}"吗？`)) {
        return;
    }
    
    try {
        sources.splice(index, 1);
        
        renderSources(containerId, sources);
        
    } catch (error) {
        alert('删除热词源失败：' + error.message);
    }
}

// 添加热词源
function addSource(containerId) {
    try {
        const sources = containerId === 'pcSourcesContainer' ? currentPcSources : currentMobileSources;
        const newSource = {
            name: '新热词源',
            url: '',
            parser: 'data.items?.map(item => item.title) || []'
        };
        
        sources.push(newSource);
        renderSources(containerId, sources);
        
        const container = document.getElementById(containerId);
        const sourceItems = container.querySelectorAll('.source-item');
        const index = sourceItems.length - 1;
        const sourceItem = sourceItems[index];
        
        editSource(containerId, index, sourceItem);
    } catch (error) {
        alert('添加热词源失败：' + error.message);
    }
}

// 全局变量存储当前热词源
let currentPcSources = [];
let currentMobileSources = [];
let currentSearchWords = [];

// 更新搜索词库计数
function updateSearchWordsCount() {
    const textarea = document.getElementById('searchWords');
    const words = textarea.value.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    document.getElementById('searchWordsCount').textContent = `共 ${words.length} 个词`;
}

// 恢复默认搜索词库
function resetSearchWords() {
    if (!confirm('确定要恢复默认搜索词库吗？当前的自定义词库将被覆盖。')) {
        return;
    }
    
    const textarea = document.getElementById('searchWords');
    textarea.value = DEFAULT_SETTINGS.searchWords.join('\n');
    currentSearchWords = [...DEFAULT_SETTINGS.searchWords];
    updateSearchWordsCount();
}

// 检查扩展上下文是否有效
function isExtensionContextValid() {
    try {
        return chrome && chrome.runtime && chrome.runtime.id;
    } catch (e) {
        return false;
    }
}

// 加载配置
async function loadSettings() {
    if (!isExtensionContextValid()) {
        console.warn('扩展上下文已失效，请刷新页面');
        return;
    }
    
    try {
        const settings = await chrome.storage.local.get([
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
            'startParam',
            'searchWords',
            'pcSources',
            'mobileSources'
        ]);
    
        const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
        
        // 更新热词源全局变量
        currentPcSources = mergedSettings.pcSources || [...DEFAULT_SETTINGS.pcSources];
        currentMobileSources = mergedSettings.mobileSources || [...DEFAULT_SETTINGS.mobileSources];
        currentSearchWords = mergedSettings.searchWords || [...DEFAULT_SETTINGS.searchWords];
        
        // 渲染热词源列表
        renderSources('pcSourcesContainer', currentPcSources);
        renderSources('mobileSourcesContainer', currentMobileSources);
        
        // 更新搜索词库
        document.getElementById('searchWords').value = currentSearchWords.join('\n');
        updateSearchWordsCount();
        
        // 更新UI
        document.getElementById('randomAddWords').checked = mergedSettings.randomAddSearchWords;
        document.getElementById('addWordsFactor').value = mergedSettings.randomAddSearchWordsFactor;
        const addWordsValueElement = document.getElementById('addWordsFactorValue');
        addWordsValueElement.textContent = (mergedSettings.randomAddSearchWordsFactor * 100).toFixed(0) + '%';
        updateSliderBackground('addWordsFactor', mergedSettings.randomAddSearchWordsFactor);
        if (mergedSettings.randomAddSearchWordsFactor > 0.5) {
            addWordsValueElement.classList.remove('bg-primary');
            addWordsValueElement.classList.add('bg-danger');
        } else {
            addWordsValueElement.classList.remove('bg-danger');
            addWordsValueElement.classList.add('bg-primary');
        }
        
        document.getElementById('randomCutWords').checked = mergedSettings.randomCutSearchWords;
        document.getElementById('cutWordsFactor').value = mergedSettings.randomCutSearchWordsFactor;
        const cutWordsValueElement = document.getElementById('cutWordsFactorValue');
        cutWordsValueElement.textContent = (mergedSettings.randomCutSearchWordsFactor * 100).toFixed(0) + '%';
        updateSliderBackground('cutWordsFactor', mergedSettings.randomCutSearchWordsFactor);
        if (mergedSettings.randomCutSearchWordsFactor > 0.5) {
            cutWordsValueElement.classList.remove('bg-primary');
            cutWordsValueElement.classList.add('bg-danger');
        } else {
            cutWordsValueElement.classList.remove('bg-danger');
            cutWordsValueElement.classList.add('bg-primary');
        }
        
        document.getElementById('maxWebSearches').value = mergedSettings.maxWebSearches;
        document.getElementById('maxMobileSearches').value = mergedSettings.maxMobileSearches;
        
        document.getElementById('minDelay').value = mergedSettings.minDelay;
        document.getElementById('maxDelay').value = mergedSettings.maxDelay;
        
        document.getElementById('pauseInterval').value = mergedSettings.pauseInterval;
        document.getElementById('pauseTime').value = mergedSettings.pauseTime;
        
        document.getElementById('requestTimeout').value = mergedSettings.requestTimeout;
        
        document.getElementById('startParam').value = mergedSettings.startParam;
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

// 保存配置
async function saveSettings() {
    if (!isExtensionContextValid()) {
        alert('⚠️ 扩展已更新，请刷新页面');
        return;
    }
    
    const settings = {
        randomAddSearchWords: document.getElementById('randomAddWords').checked,
        randomAddSearchWordsFactor: parseFloat(document.getElementById('addWordsFactor').value),
        randomCutSearchWords: document.getElementById('randomCutWords').checked,
        randomCutSearchWordsFactor: parseFloat(document.getElementById('cutWordsFactor').value),
        maxWebSearches: parseInt(document.getElementById('maxWebSearches').value),
        maxMobileSearches: parseInt(document.getElementById('maxMobileSearches').value),
        minDelay: parseInt(document.getElementById('minDelay').value),
        maxDelay: parseInt(document.getElementById('maxDelay').value),
        pauseInterval: parseInt(document.getElementById('pauseInterval').value),
        pauseTime: parseInt(document.getElementById('pauseTime').value),
        requestTimeout: parseInt(document.getElementById('requestTimeout').value),
        startParam: document.getElementById('startParam').value,
        searchWords: currentSearchWords,
        pcSources: currentPcSources,
        mobileSources: currentMobileSources
    };
    
    // 校验配置
    const errors = validateSettings(settings);
    if (errors.length > 0) {
        showValidationErrors(errors);
        return;
    }
    
    try {
        await chrome.storage.local.set(settings);
        
        console.log('配置已保存:', settings);
        
        alert('✅ 配置已保存');
        
        const tabs = await chrome.tabs.query({ url: 'https://*.bing.com/*' });
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'configUpdated' }).catch(() => {});
        });
        
    } catch (error) {
        console.error('保存配置失败:', error);
        if (error.message.includes('Extension context invalidated')) {
            alert('⚠️ 扩展已更新，请刷新页面');
        } else {
            alert('❌ 保存失败：' + error.message);
        }
    }
}

// 重置配置到默认值
async function resetSettings() {
    if (!isExtensionContextValid()) {
        alert('⚠️ 扩展已更新，请刷新页面');
        return;
    }
    
    if (!confirm('确定要将所有配置重置为默认值吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await chrome.storage.local.set(DEFAULT_SETTINGS);
        
        await loadSettings();
        
        const tabs = await chrome.tabs.query({ url: 'https://*.bing.com/*' });
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'configUpdated' }).catch(() => {});
        });
        
    } catch (error) {
        console.error('重置配置失败:', error);
        if (error.message.includes('Extension context invalidated')) {
            alert('⚠️ 扩展已更新，请刷新页面');
        } else {
            alert('❌ 重置失败：' + error.message);
        }
    }
}

// 事件监听器
function setupEventListeners() {
    // 滑块事件
    document.getElementById('addWordsFactor').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const valueElement = document.getElementById('addWordsFactorValue');
        valueElement.textContent = (value * 100).toFixed(0) + '%';
        updateSliderBackground('addWordsFactor', value);
        
        if (value > 0.5) {
            valueElement.classList.remove('bg-primary');
            valueElement.classList.add('bg-danger');
        } else {
            valueElement.classList.remove('bg-danger');
            valueElement.classList.add('bg-primary');
        }
    });
    
    document.getElementById('cutWordsFactor').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const valueElement = document.getElementById('cutWordsFactorValue');
        valueElement.textContent = (value * 100).toFixed(0) + '%';
        updateSliderBackground('cutWordsFactor', value);
        
        if (value > 0.5) {
            valueElement.classList.remove('bg-primary');
            valueElement.classList.add('bg-danger');
        } else {
            valueElement.classList.remove('bg-danger');
            valueElement.classList.add('bg-primary');
        }
    });
    
    // 保存按钮
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // 重置按钮
    document.getElementById('resetSettings').addEventListener('click', resetSettings);
    
    // 添加热词源按钮
    document.getElementById('addPcSource').addEventListener('click', () => addSource('pcSourcesContainer'));
    document.getElementById('addMobileSource').addEventListener('click', () => addSource('mobileSourcesContainer'));
    
    // 搜索词库事件
    document.getElementById('searchWords').addEventListener('input', (e) => {
        currentSearchWords = e.target.value.split('\n').map(w => w.trim()).filter(w => w.length > 0);
        updateSearchWordsCount();
    });
    
    document.getElementById('resetSearchWords').addEventListener('click', resetSearchWords);
    
    // 设置实时校验
    setupRealTimeValidation();
}

// 初始化
async function init() {
    setupEventListeners();
    
    if (!isExtensionContextValid()) {
        alert('⚠️ 扩展已更新，请刷新页面');
        return;
    }
    
    await loadSettings();
    
    try {
        const manifest = chrome.runtime.getManifest();
        document.getElementById('versionInfo').textContent = `版本 ${manifest.version}`;
    } catch (error) {
        console.error('获取版本信息失败:', error);
    }
    
    try {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                const configKeys = ['randomAddSearchWords', 'randomAddSearchWordsFactor', 'randomCutSearchWords', 'randomCutSearchWordsFactor', 'maxWebSearches', 'maxMobileSearches', 'minDelay', 'maxDelay', 'pauseInterval', 'pauseTime', 'requestTimeout', 'startParam', 'pcSources', 'mobileSources'];
                if (Object.keys(changes).some(key => configKeys.includes(key))) {
                    loadSettings();
                }
            }
        });
    } catch (error) {
        console.error('监听存储变化失败:', error);
    }
}

// 将函数挂载到全局作用域
window.renderSources = renderSources;
window.escapeHtml = escapeHtml;
window.editSource = editSource;
window.cancelEdit = cancelEdit;
window.saveSource = saveSource;
window.deleteSource = deleteSource;
window.addSource = addSource;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
