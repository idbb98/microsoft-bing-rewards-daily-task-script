using System;
using System.IO;
using Newtonsoft.Json;
using NLog;

namespace BingSearchAutomation
{
    public class AppConfig
    {
        public string BrowserPath { get; set; } = "";
        public int SearchCount { get; set; } = 8;
        
        // 是否使用API获取搜索词
        public bool UseApiSearchWords { get; set; } = true;
        
        // 是否随机加词，如：人工智能发展  -->  人工1智能发z展 
        public bool RandomAddSearchWords { get; set; } = false;
        // 随机加词因子，控制加词的概率（0-1之间的小数）
        public double RandomAddSearchWordsFactor { get; set; } = 0.3;

        // 是否随机截词，如：人工1智能发z展  --> 人工1智
        public bool RandomCutSearchWords { get; set; } = false;
        // 随机截词因子，控制截取的概率（0-1之间的小数）
        public double RandomCutSearchWordsFactor { get; set; } = 0.2;

        // 暂停间隔范围：每执行多少次搜索后暂停一次的区间
        public int PauseIntervalMin { get; set; } = 3;
        public int PauseIntervalMax { get; set; } = 8;

        // 暂停时间范围（毫秒）：每次暂停的持续时间区间
        public int PauseTimeMin { get; set; } = 10 * 60 * 1000;  // 10分钟
        public int PauseTimeMax { get; set; } = 30 * 60 * 1000;  // 30分钟

        // 搜索延迟相关配置
        public int MinDelay { get; set; } = 8000;       // 最小延迟（毫秒）
        public int MaxDelay { get; set; } = 15000;      // 最大延迟（毫秒）
    }

    public static class ConfigLoader
    {
        private static readonly Logger logger = LogManager.GetCurrentClassLogger();

        public static AppConfig LoadConfig()
        {
            string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "appsettings.json");

            if (File.Exists(configPath))
            {
                try
                {
                    string jsonContent = File.ReadAllText(configPath);
                    return JsonConvert.DeserializeObject<AppConfig>(jsonContent);
                }
                catch (Exception ex)
                {
                    logger.Error($"读取配置文件失败: {ex.Message}");
                    logger.Info("使用默认配置...");
                    return new AppConfig();
                }
            }
            else
            {
                logger.Info("配置文件不存在，使用默认配置...");
                return new AppConfig();
            }
        }
    }
}