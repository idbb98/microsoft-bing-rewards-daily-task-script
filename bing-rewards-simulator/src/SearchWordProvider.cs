using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json;
using NLog;

namespace BingSearchAutomation
{
    public interface ISearchWordProvider
    {
        Task<string[]> GetSearchWordsAsync(int count = 10);
    }

    public class SearchWordApiProvider : ISearchWordProvider
    {
        private static readonly Logger logger = LogManager.GetCurrentClassLogger();
        private readonly HttpClient _httpClient;
        private readonly SearchWordLocalProvider _localProvider;

        public SearchWordApiProvider()
        {
            _httpClient = new HttpClient {
                Timeout = TimeSpan.FromSeconds(20)
            };
            _localProvider = new SearchWordLocalProvider();
        }

        public async Task<string[]> GetSearchWordsAsync(int count = 10)
        {
            try
            {
                logger.Info("开始从API获取搜索词...");
                
                // 定义热词API源
                var sources = new List<SearchWordSource>
                {
                    new SearchWordSource
                    {
                        Name = "今日头条热榜",
                        Url = "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc",
                        Parser = ParseToutiaoHotBoard
                    },
                    new SearchWordSource
                    {
                        Name = "百度热搜",
                        Url = "https://top.baidu.com/api/board?tab=realtime",
                        Parser = ParseBaiduHotSearch
                    },
                    new SearchWordSource
                    {
                        Name = "腾讯新闻热点",
                        Url = "https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=50",
                        Parser = ParseTencentNewsHot
                    }
                };

                var allWords = new HashSet<string>();

                // 并行请求所有API
                var tasks = sources.Select(async source =>
                {
                    try
                    {
                        var response = await _httpClient.GetAsync(source.Url);
                        if (response.IsSuccessStatusCode)
                        {
                            var content = await response.Content.ReadAsStringAsync();
                            var words = source.Parser(content);
                            logger.Info($"从 {source.Name} 获取到 {words.Length} 个热词");
                            return words;
                        }
                        else
                        {
                            logger.Error($"{source.Name} 请求失败: HTTP {response.StatusCode}");
                            return new string[0];
                        }
                    }
                    catch (Exception ex)
                    {
                        logger.Error($"{source.Name} 请求出错: {ex.Message}");
                        return new string[0];
                    }
                });

                // 等待所有API请求完成
                var results = await Task.WhenAll(tasks);

                // 合并所有结果并去重
                foreach (var words in results)
                {
                    foreach (var word in words)
                    {
                        if (!string.IsNullOrEmpty(word) && word.Length >= 2 && word.Length <= 30 && !IsPureNumber(word))
                        {
                            allWords.Add(word);
                        }
                    }
                }

                var allWordsArray = allWords.ToArray();
                logger.Info($"总共获取到 {allWordsArray.Length} 个不重复的热词");

                // 如果从API获取的词不够，补充本地词库
                if (allWordsArray.Length < count)
                {
                    logger.Info("API获取的热词不足，补充本地词库...");
                    var localWords = _localProvider.GetSearchWordsAsync(count).Result;
                    var remainingCount = count - allWordsArray.Length;
                    
                    foreach (var word in localWords)
                    {
                        if (!allWords.Contains(word))
                        {
                            allWords.Add(word);
                            remainingCount--;
                            if (remainingCount <= 0)
                                break;
                        }
                    }
                }

                var finalWords = allWords.ToArray();
                logger.Info($"最终获取到 {finalWords.Length} 个搜索词");
                
                // 打乱顺序
                ShuffleArray(finalWords);
                
                return finalWords;
            }
            catch (Exception ex)
            {
                logger.Error($"从API获取搜索词失败: {ex.Message}，使用本地词库");
                return await _localProvider.GetSearchWordsAsync(count);
            }
        }

        private string[] ParseToutiaoHotBoard(string content)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(content);
                if (data.ContainsKey("data"))
                {
                    var dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(data["data"].ToString());
                    var words = new List<string>();
                    foreach (var item in dataList)
                    {
                        if (item.ContainsKey("Title"))
                        {
                            var title = item["Title"].ToString().Trim();
                            if (!string.IsNullOrEmpty(title))
                                words.Add(title);
                        }
                    }
                    return words.ToArray();
                }
            }
            catch (Exception ex)
            {
                logger.Error($"解析今日头条热榜失败: {ex.Message}");
            }
            return new string[0];
        }

        private string[] ParseBaiduHotSearch(string content)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(content);
                if (data.ContainsKey("data"))
                {
                    var dataObj = JsonConvert.DeserializeObject<Dictionary<string, object>>(data["data"].ToString());
                    if (dataObj.ContainsKey("cards"))
                    {
                        var cards = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(dataObj["cards"].ToString());
                        if (cards.Count > 0 && cards[0].ContainsKey("content"))
                        {
                            var contentList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(cards[0]["content"].ToString());
                            var words = new List<string>();
                            foreach (var item in contentList)
                            {
                                if (item.ContainsKey("word"))
                                {
                                    var word = item["word"].ToString().Trim();
                                    if (!string.IsNullOrEmpty(word))
                                        words.Add(word);
                                }
                            }
                            return words.ToArray();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logger.Error($"解析百度热搜失败: {ex.Message}");
            }
            return new string[0];
        }

        private string[] ParseTencentNewsHot(string content)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(content);
                if (data.ContainsKey("idlist"))
                {
                    var idlist = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(data["idlist"].ToString());
                    if (idlist.Count > 0 && idlist[0].ContainsKey("newslist"))
                    {
                        var newslist = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(idlist[0]["newslist"].ToString());
                        var words = new List<string>();
                        foreach (var item in newslist)
                        {
                            if (item.ContainsKey("title"))
                            {
                                var title = item["title"].ToString().Trim();
                                if (!string.IsNullOrEmpty(title))
                                    words.Add(title);
                            }
                        }
                        return words.ToArray();
                    }
                }
            }
            catch (Exception ex)
            {
                logger.Error($"解析腾讯新闻热点失败: {ex.Message}");
            }
            return new string[0];
        }

        private bool IsPureNumber(string str)
        {
            foreach (char c in str)
            {
                if (!char.IsDigit(c))
                    return false;
            }
            return true;
        }

        private void ShuffleArray(string[] array)
        {
            var random = new Random();
            for (int i = array.Length - 1; i > 0; i--)
            {
                int j = random.Next(i + 1);
                string temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
        }
    }

    public class SearchWordLocalProvider : ISearchWordProvider
    {
        private static readonly Logger logger = LogManager.GetCurrentClassLogger();

        public Task<string[]> GetSearchWordsAsync(int count = 50)
        {
            logger.Info("使用本地搜索词库...");
            
            var searchWords = new string[] {
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
            };

            // 打乱顺序
            var random = new Random();
            var shuffled = new string[Math.Min(count, searchWords.Length)];
            var used = new HashSet<int>();
            
            for (int i = 0; i < shuffled.Length; i++)
            {
                int index;
                do
                {
                    index = random.Next(searchWords.Length);
                } while (used.Contains(index));
                
                used.Add(index);
                shuffled[i] = searchWords[index];
            }

            return Task.FromResult(shuffled);
        }
    }

    public class SearchWordProviderFactory
    {
        public static ISearchWordProvider Create(bool useApi)
        {
            if (useApi)
            {
                return new SearchWordApiProvider();
            }
            else
            {
                return new SearchWordLocalProvider();
            }
        }
    }

    public class SearchWordSource
    {
        public string Name { get; set; }
        public string Url { get; set; }
        public Func<string, string[]> Parser { get; set; }
    }
}
