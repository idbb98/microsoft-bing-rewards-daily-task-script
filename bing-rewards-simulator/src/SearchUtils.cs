using System;
using System.Collections.Generic;

namespace BingSearchAutomation
{
    public class SearchUtils
    {
        // 随机对搜索词加词，例如：人工智能发展  -->  人工1智能发z展
        public static string AddRandomCharsToSearchWord(string word, double factor = 0.3)
        {
            if (string.IsNullOrEmpty(word) || factor <= 0 || factor > 1 || new Random().NextDouble() > factor)
                return word;

            // 控制添加字符的数量，避免过度添加导致词无意义
            int maxAdditions = Math.Min(3, word.Length / 3); // 最多添加原词长度1/3的随机字符
            if (maxAdditions <= 0) return word;

            string result = word;
            Random random = new Random();

            for (int i = 0; i < random.Next(maxAdditions + 1); i++)
            {
                // 随机选择插入位置（避开开头和结尾）
                int insertPos = random.Next(1, result.Length);
                // 随机选择要插入的字符
                char randomChar = random.NextDouble() > 0.5 ? 
                    (char)('0' + random.Next(10)) : // 数字 0-9
                    (char)('a' + random.Next(26));  // 小写字母 a-z
                
                result = result.Substring(0, insertPos) + randomChar + result.Substring(insertPos);
            }

            return result;
        }

        // 随机对搜索词进行截取，例如：人工1智能发z展  --> 人工1智
        public static string CutSearchWordRandomly(string word, double factor = 0.2)
        {
            if (string.IsNullOrEmpty(word) || factor <= 0 || factor > 1 || new Random().NextDouble() > factor)
                return word;

            // 控制截取长度，保留至少一半的字符
            int minLength = Math.Max(2, word.Length / 2); // 至少保留2个字符或一半字符
            int maxLength = word.Length; // 最大不超过原词长度
            
            if (minLength >= maxLength)
                return word;

            // 随机选择截取长度
            int cutLength = new Random().Next(minLength, maxLength);
            return word.Substring(0, cutLength);
        }

        // 依次应用加词和截取
        public static string ProcessSearchWord(string word, bool randomAdd, double addFactor, bool randomCut, double cutFactor)
        {
            string result = word;
            if (randomAdd)
                result = AddRandomCharsToSearchWord(result, addFactor);
            if (randomCut)
                result = CutSearchWordRandomly(result, cutFactor);
            return result;
        }

        // 生成随机延迟
        public static int GetRandomDelay(int minDelay, int maxDelay)
        {
            return new Random().Next(minDelay, maxDelay);
        }

        // 从区间内随机取暂停间隔
        public static int GetRandomPauseInterval(int minInterval, int maxInterval)
        {
            return new Random().Next(minInterval, maxInterval + 1);
        }

        // 从区间内随机取暂停时间
        public static int GetRandomPauseTime(int minTime, int maxTime)
        {
            return new Random().Next(minTime, maxTime + 1);
        }

        // 打乱搜索词数组
        public static void ShuffleSearchTerms(string[] terms)
        {
            Random random = new Random();
            for (int i = terms.Length - 1; i > 0; i--)
            {
                int j = random.Next(i + 1);
                string temp = terms[i];
                terms[i] = terms[j];
                terms[j] = temp;
            }
        }
    }
}