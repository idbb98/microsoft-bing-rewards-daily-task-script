// 弹出页面脚本

// 发送消息到当前活动标签页的content script
async function sendMessageToActiveTab(message) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
        try {
            const response = await chrome.tabs.sendMessage(tabs[0].id, message);
            console.log('消息发送成功，响应:', response);
            return response;
        } catch (error) {
            console.error('发送消息失败:', error);
            throw error;
        }
    }
    return null;
}

// 更新状态显示
async function updateStatus() {
    // 从存储中获取状态
    const storage = await chrome.storage.local.get(['webSearchCount', 'mobileSearchCount']);
    const webCount = storage.webSearchCount || 0;
    const mobileCount = storage.mobileSearchCount || 0;
    
    // 计算总体进度
    const maxWebSearches = 50;
    const maxMobileSearches = 36;
    const totalProgress = ((webCount + mobileCount) / (maxWebSearches + maxMobileSearches)) * 100;
    
    // 更新UI
    document.getElementById('pcProgress').textContent = `${webCount}/${maxWebSearches}`;
    document.getElementById('mobileProgress').textContent = `${mobileCount}/${maxMobileSearches}`;
    document.getElementById('overallProgress').textContent = `${Math.round(totalProgress)}%`;
}

// 更新任务状态提示
async function updateTaskStatus() {
    try {
        // 检查是否有活跃标签页正在执行任务
        const tabs = await chrome.tabs.query({ url: 'https://*.bing.com/*' });
        let isTaskRunning = false;
        
        if (tabs.length > 0) {
            // 创建带超时的消息发送函数
            const sendMessageWithTimeout = (tabId, message, timeout = 300) => {
                return new Promise((resolve) => {
                    const timer = setTimeout(() => resolve(null), timeout);
                    
                    chrome.tabs.sendMessage(tabId, message)
                        .then(response => {
                            clearTimeout(timer);
                            resolve(response);
                        })
                        .catch(() => {
                            clearTimeout(timer);
                            resolve(null);
                        });
                });
            };
            
            // 并行检查任务状态
            const promises = tabs.map(tab => sendMessageWithTimeout(tab.id, { type: 'checkTaskStatus' }));
            const results = await Promise.all(promises);
            
            // 检查是否有任何任务正在运行
            for (const result of results) {
                if (result && result.isRunning) {
                    isTaskRunning = true;
                    break;
                }
            }
        }
        
        // 更新任务状态提示
        const configStatus = document.getElementById('configStatus');
        if (isTaskRunning) {
            configStatus.style.display = 'block';
        } else {
            configStatus.style.display = 'none';
        }
    } catch (error) {
        console.error('更新任务状态失败:', error);
    }
}

// 事件监听器
function setupEventListeners() {
    // 开始任务按钮
    document.getElementById('startBtn').addEventListener('click', async () => {
        // 从存储中获取启动参数
        const storage = await chrome.storage.local.get('startParam');
        const startParam = storage.startParam || 'bingTask';
        
        // 重置计数
        await chrome.storage.local.set({
            webSearchCount: 0,
            mobileSearchCount: 0,
            cache_pc: undefined,
            cache_mobile: undefined
        });
        
        // 打开Bing主页并开始任务，使用用户选择的启动参数
        chrome.tabs.create({
            url: `https://www.bing.com/?${startParam}=1`
        });
    });
    
    // 终止任务按钮
    document.getElementById('stopBtn').addEventListener('click', () => {
        sendMessageToActiveTab({ type: 'stopTask' });
        // 更新状态
        updateStatus();
    });
    
    // 查看/隐藏面板按钮
    document.getElementById('togglePanelBtn').addEventListener('click', () => {
        sendMessageToActiveTab({ type: 'togglePanel' });
    });
    
    // 扩展设置按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

// 初始化
async function init() {
    // 立即设置事件监听器，确保交互响应迅速
    setupEventListeners();
    
    // 更新状态显示
    await updateStatus();
    
    // 检查任务状态
    await updateTaskStatus();
    
    // 从manifest.json获取版本信息
    const manifest = chrome.runtime.getManifest();
    document.getElementById('versionInfo').textContent = `版本 ${manifest.version}`;
    
    // 监听存储变化，实时更新状态
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.webSearchCount || changes.mobileSearchCount) {
                updateStatus();
            }
        }
    });
    
    // 定期检查任务状态
    setInterval(updateTaskStatus, 3000);
}

// 启动初始化
init();