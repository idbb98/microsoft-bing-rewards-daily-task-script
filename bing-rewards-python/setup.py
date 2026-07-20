from cx_Freeze import setup, Executable
import json

# 定义包含的文件
include_files = [
    ('config.json', 'config.json'),
    ('about_config.json', 'about_config.json'),
    ('asset', 'asset')  # 包含asset目录及其中的所有文件（包括engineering.png）
]

# 定义打包选项
options = {
    'build_exe': {
        'include_files': include_files,
        'packages': ['requests', 'pyautogui', 'win32api', 'win32con', 'win32gui', 'encodings'],
        'includes': ['encodings'],
        'include_msvcr': True  # 包含Microsoft Visual C++运行时
    }
}

# 从 about_config.json 读取项目信息
with open('about_config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)
    project_info = config['project']

# 定义可执行文件
executables = [
    Executable(
        script='main.py',
        base='gui',  # 使用GUI基础，避免命令行窗口
        target_name=f"{project_info['name']}-{project_info['author']}Tool.exe",
        icon='asset/favicon.ico'  # 图标文件路径（注意：cx_Freeze 通常需要 .ico 格式）
    )
]

# 执行打包
setup(
    name='BingRewardsAutomation',
    version=project_info['version'],
    description=f"{project_info['name']}-{project_info['author']}",
    options=options,
    executables=executables
)