from cx_Freeze import setup, Executable
import os

# 定义包含的文件
include_files = [
    ('config.json', 'config.json'),
    ('about_config.json', 'about_config.json')
]

# 定义打包选项
options = {
    'build_exe': {
        'include_files': include_files,
        'packages': ['requests', 'pyautogui', 'win32api', 'win32con', 'win32gui'],
        'include_msvcr': True  # 包含Microsoft Visual C++运行时
    }
}

# 定义可执行文件
executables = [
    Executable(
        script='main.py',
        base='gui',  # 使用GUI基础，避免命令行窗口
        target_name='BingRewardsAutomation.exe',
        icon=None  # 可以指定图标文件，如果有的话
    )
]

# 执行打包
setup(
    name='BingRewardsAutomation',
    version='26.2.5.1',
    description='Bing Rewards Daily Task Automation',
    options=options,
    executables=executables
)