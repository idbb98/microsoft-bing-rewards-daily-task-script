using System.Threading;
using WindowsInput;

namespace BingSearchAutomation
{
    public class KeyboardSimulator
    {
        private readonly InputSimulator _simulator;

        public KeyboardSimulator()
        {
            _simulator = new InputSimulator();
        }

        public void UseDefaultSearch()
        {
            // 模拟Ctrl+K使用默认bing搜索
            _simulator.Keyboard.ModifiedKeyStroke(WindowsInput.Native.VirtualKeyCode.CONTROL, WindowsInput.Native.VirtualKeyCode.VK_K);
            Thread.Sleep(500); // 等待操作完成
        }

        public void TypeText(string text)
        {
            // 输入文本
            _simulator.Keyboard.TextEntry(text);
            Thread.Sleep(1000); // 等待输入完成
        }

        public void PressEnter()
        {
            // 按Enter键
            _simulator.Keyboard.KeyPress(WindowsInput.Native.VirtualKeyCode.RETURN);
        }

        public void PressSpace()
        {
            // 按空格键
            _simulator.Keyboard.KeyPress(WindowsInput.Native.VirtualKeyCode.SPACE);
        }

        public void PressTab()
        {
            // 按Tab键
            _simulator.Keyboard.KeyPress(WindowsInput.Native.VirtualKeyCode.TAB);
        }

        public void ClearText()
        {
            // 按Ctrl+A选择所有文本，然后按Backspace删除
            _simulator.Keyboard.ModifiedKeyStroke(WindowsInput.Native.VirtualKeyCode.CONTROL, WindowsInput.Native.VirtualKeyCode.VK_A);
            Thread.Sleep(500);
            _simulator.Keyboard.KeyPress(WindowsInput.Native.VirtualKeyCode.BACK);
            Thread.Sleep(500);
        }

        public void Wait(int milliseconds)
        {
            Thread.Sleep(milliseconds);
        }

        public void OpenNewTab()
        {
            // 模拟Ctrl+T打开新标签页
            _simulator.Keyboard.ModifiedKeyStroke(WindowsInput.Native.VirtualKeyCode.CONTROL, WindowsInput.Native.VirtualKeyCode.VK_T);
            Thread.Sleep(1000); // 等待新标签页打开
        }

        public void CloseTab()
        {
            // 模拟Ctrl+W关闭标签页
            _simulator.Keyboard.ModifiedKeyStroke(WindowsInput.Native.VirtualKeyCode.CONTROL, WindowsInput.Native.VirtualKeyCode.VK_W);
            Thread.Sleep(1000); // 等待标签页关闭
        }

        public void ScrollPage(int times = 3)
        {
            // 模拟按Page Down键滚动页面
            for (int i = 0; i < times; i++)
            {
                _simulator.Keyboard.KeyPress(WindowsInput.Native.VirtualKeyCode.NEXT);
                Thread.Sleep(1000); // 等待滚动完成
            }
        }
    }
}