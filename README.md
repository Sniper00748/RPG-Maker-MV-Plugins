# RPG-Maker-MV-Plugins
something funny plugins for RPG Maker MV

//=============================================================================
//CyberHackingPuzzle
//=============================================================================
/*:
 * @plugindesc 赛博朋克风格黑客入侵谜题 - 进阶优化版
 * @author LeonZhang
 *
 * @param GridSize
 * @desc 代码矩阵的大小 (例如: 6 表示6x6矩阵)
 * @default 6
 *
 * @param TimeLimit
 * @desc 解谜时间限制(秒)
 * @default 30
 * 
 * @param BufferSize
 * @desc 玩家可用的缓存位置数量
 * @default 10
 *
 * @help
 * 这个插件实现了赛博朋克风格的黑客入侵谜题，遵循以下规则：
 * 1. 玩家必须交替选择行和列
 * 2. 每次选择后，只能在当前行/列中选择
 * 3. 匹配序列时，必须按顺序匹配，错误会导致序列重置
 * 4. 每次选择使用一格缓存，缓存用完则失败
 * 5. 只有选择第一个数值后才开始倒计时
 * 
 * 插件命令:
 *   CyberHack start           # 开始黑客入侵谜题
 *   CyberHack setDifficulty 1 # 设置难度(1-3)

 */






 //=============================================================================
// LinuxTerminalPuzzle.js
//=============================================================================

/*:
 * @plugindesc 模拟Linux终端界面的谜题插件
 * @author LeonZhang
 *
 * @param FontSize
 * @desc 终端文字大小
 * @default 16
 *
 * @param TextColor
 * @desc 终端文字颜色（CSS格式）
 * @default #33ff33
 *
 * @param BackgroundColor
 * @desc 终端背景颜色（CSS格式）
 * @default #000000
 *
 * @param PromptSymbol
 * @desc 命令提示符符号
 * @default $
 *
 * @param SuccessVariable
 * @desc 完成谜题后设置为ON的开关ID
 * @type switch
 * @default 10
 *
 * @param RootPasswordVariable
 * @desc 存储root密码的变量ID
 * @type variable
 * @default 5
 *
 * @param GuestPasswordVariable
 * @desc 存储guest密码的变量ID
 * @type variable
 * @default 6
 *
 * @param FileDeletedSwitch
 * @desc 记录文件是否被删除的开关ID
 * @type switch
 * @default 9

 */


//=============================================================================
// TeamManagement.js
//=============================================================================

/*:
 * @plugindesc 允许玩家通过按键切换控制的角色
 * @author LeonZhang
 *
 * @param SwitchKey
 * @desc 用于切换角色的按键组合
 * @default t
 *
 * @help
 * ============================================================================
 * 【简介】
 * ============================================================================
 * 
 * 这个插件允许玩家通过按下T+方向键来切换控制的角色。
 * 
 * ============================================================================
 * 【使用方法】
 * ============================================================================
 * 
 * 1. 确保你的队伍中有多个角色
 * 2. 使用插件命令启用角色切换功能
 * 3. 按下T+方向键切换到对应角色：
 *    - T+左方向键：切换到第一个角色
 *    - T+上方向键：切换到第二个角色
 *    - T+右方向键：切换到第三个角色
 * 
 * ============================================================================
 * 【插件命令】
 * ============================================================================
 * 
 * EnableCharacterSwitch
 * - 启用持续角色切换功能（可多次切换）
 * - 允许切换到任何角色
 * 
 * EnableOneTimeSwitch
 * - 启用一次性角色切换功能（切换一次后自动禁用）
 * - 允许切换到任何角色
 * 
 * DisableCharacterSwitch
 * - 禁用角色切换功能
 * 
 * SuggestCharacterSwitch 角色索引 [提示消息]
 * - 提示玩家切换到指定角色并启用一次性切换功能
 * - 角色索引：0=第一个角色，1=第二个角色，2=第三个角色
 * - 提示消息：可选参数，自定义提示文本
 * 
 * SetCharacterPosition 角色索引 地图ID X坐标 Y坐标 [朝向]
 * - 设置指定角色的位置信息
 * - 角色索引：0=第一个角色，1=第二个角色，2=第三个角色
 * - 朝向：2=下，4=左，6=右，8=上（可选参数，默认为2）
 * 
 * LimitSwitchToCharacter 角色索引
 * - 限制只能切换到指定角色
 * - 角色索引：0=第一个角色，1=第二个角色，2=第三个角色
 * 
 * AllowAllCharacterSwitch
 * - 允许切换到任何角色
 * 
 * ShowCharacterSwitchUI
 * - 显示角色切换UI
 * 
 * HideCharacterSwitchUI
 * - 隐藏角色切换UI
 * 
 * ============================================================================
 * 【系统变量和开关】
 * ============================================================================
 * 
 * 本插件使用以下系统变量和开关：
 * 
 * 开关11：角色切换功能（ON=启用，OFF=禁用）
 * 开关12：一次性切换模式（ON=只允许切换一次，OFF=允许多次切换）
 * 
 * 变量10-12：各角色所在地图ID
 * 变量20-22：各角色X坐标
 * 变量30-32：各角色Y坐标
 * 变量40-42：各角色朝向
 * 变量50：允许切换的角色索引（-1=任何角色，0/1/2=特定角色）
 * 
 * ============================================================================
 * 【注意事项】
 * ============================================================================
 * 
 * - 角色切换只在地图场景有效
 * - 切换后会保持各角色的位置
 * - 需要先通过插件命令启用切换功能
 * - 默认情况下，角色切换功能是禁用的
 * - 请确保在数据库中设置好各个开关和变量的名称，以便于管理
 */
