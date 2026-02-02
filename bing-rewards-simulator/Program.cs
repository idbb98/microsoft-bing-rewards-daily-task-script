using System;
using System.Threading;
using System.Threading.Tasks;
using NLog;

namespace BingSearchAutomation
{
    class Program
    {
        private static readonly Logger logger = LogManager.GetCurrentClassLogger();

        static async Task Main(string[] args)
        {
            try
            {
                logger.Info("开始执行模拟键鼠操作...");

                // 读取配置文件
                AppConfig config = ConfigLoader.LoadConfig();
  
                // 获取搜索词
                string[] searchTerms;
                if (config.UseApiSearchWords)
                {
                    var provider = SearchWordProviderFactory.Create(true);
                    searchTerms = await provider.GetSearchWordsAsync(config.SearchCount * 2); // 获取足够多的搜索词
                }
                else
                {
                    // 使用默认搜索词
                    var provider = SearchWordProviderFactory.Create(false);
                    searchTerms = await provider.GetSearchWordsAsync(config.SearchCount * 2);
                }
                
                logger.Info($"浏览器路径: {config.BrowserPath}");
                logger.Info($"搜索次数: {config.SearchCount}");
                logger.Info($"获取的搜索词数量: {searchTerms.Length}");
                logger.Info($"是否使用API搜索词: {config.UseApiSearchWords}");
                logger.Info($"随机加词: {config.RandomAddSearchWords}");
                logger.Info($"随机截词: {config.RandomCutSearchWords}");
                logger.Info($"暂停间隔: {config.PauseIntervalMin}-{config.PauseIntervalMax}");
                logger.Info($"暂停时间: {config.PauseTimeMin/1000/60}-{config.PauseTimeMax/1000/60}分钟");
                logger.Info($"搜索延迟: {config.MinDelay/1000}-{config.MaxDelay/1000}秒");
                
                var searchAutomator = new SearchAutomator();
                
                // 1. 打开浏览器
                searchAutomator.OpenBrowser(config.BrowserPath);
                
                // 打乱搜索词顺序
                SearchUtils.ShuffleSearchTerms(searchTerms);
                
                // 2. 连续执行多次搜索，每次使用不同的搜索词
                int pauseInterval = SearchUtils.GetRandomPauseInterval(config.PauseIntervalMin, config.PauseIntervalMax);
                logger.Info($"设置暂停间隔: 每{pauseInterval}次搜索后暂停一次");
                
                for (int i = 0; i < config.SearchCount; i++)
                {
                    // 检查是否需要暂停
                    if (i > 0 && i % pauseInterval == 0)
                    {
                        int pauseTime = SearchUtils.GetRandomPauseTime(config.PauseTimeMin, config.PauseTimeMax);
                        logger.Info($"执行{pauseInterval}次搜索后，暂停{Math.Round(pauseTime/1000.0/60.0, 1)}分钟...");
                        Thread.Sleep(pauseTime);
                        // 暂停后确保浏览器仍处于活动状态
                        searchAutomator.EnsureBrowserActive();
                    }
                    
                    // 循环使用搜索词数组中的词
                    string originalTerm = searchTerms[i % searchTerms.Length];
                    // 处理搜索词
                    string searchTerm = SearchUtils.ProcessSearchWord(
                        originalTerm, 
                        config.RandomAddSearchWords, 
                        config.RandomAddSearchWordsFactor, 
                        config.RandomCutSearchWords, 
                        config.RandomCutSearchWordsFactor
                    );
                    
                    logger.Info($"第{i + 1}次搜索，搜索词: {searchTerm} (原词: {originalTerm})");
                    
                    // 执行单次搜索
                    searchAutomator.PerformSingleSearch(searchTerm);
                    
                    // 搜索后添加随机延迟
                    if (i < config.SearchCount - 1)
                    {
                        int delay = SearchUtils.GetRandomDelay(config.MinDelay, config.MaxDelay);
                        logger.Info($"搜索完成，等待{Math.Round(delay/1000.0, 1)}秒...");
                        Thread.Sleep(delay);
                    }
                }

                logger.Info("操作完成！");
            }
            catch (Exception ex)
            {
                logger.Error($"错误: {ex.Message}");
            }
            finally
            {
                // 关闭NLog
                LogManager.Shutdown();
            }
        }
    }
}
