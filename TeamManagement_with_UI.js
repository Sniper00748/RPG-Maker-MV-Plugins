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

(function() {
    'use strict';
    
    // 常量定义，便于维护
    const SWITCH_ENABLE = 11;        // 角色切换功能开关
    const SWITCH_ONE_TIME = 12;      // 一次性切换模式开关
    const VAR_ALLOWED_INDEX = 50;    // 允许切换的角色索引变量
    const MAX_CHARACTERS = 3;        // 最大支持的角色数量
    
    var parameters = PluginManager.parameters('TeamManagement');
    var switchKey = String(parameters['SwitchKey'] || 't');
    
    // 保存原始的Game_Player.prototype.initMembers方法
    var _Game_Player_initMembers = Game_Player.prototype.initMembers;
    
    // 扩展Game_Player.prototype.initMembers方法
    // 初始化角色位置存储
    Game_Player.prototype.initMembers = function() {
        _Game_Player_initMembers.call(this);
        this._currentActorIndex = 0;
        this._actorPositions = {}; // 用于存储各角色位置
        
        // 在游戏启动时添加一个延迟刷新，确保角色图像正确加载
        this._needsRefresh = true;
    };
    
    // 扩展Game_Player.prototype.update方法，确保角色图像正确刷新
    var _Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function(sceneActive) {
        _Game_Player_update.call(this, sceneActive);
        
        // 如果需要刷新，执行刷新
        if (this._needsRefresh) {
            this._needsRefresh = false;
            this.refresh();
        }
    };
    
    // 重写角色刷新方法，根据当前角色索引更新角色外观
    var _Game_Player_refresh = Game_Player.prototype.refresh;
    Game_Player.prototype.refresh = function() {
        _Game_Player_refresh.call(this);
        
        // 获取当前角色索引
        var actorIndex = this._currentActorIndex || 0;
        
        // 获取对应的角色
        var actor = $gameParty.members()[actorIndex];
        
        // 如果角色存在，更新角色外观
        if (actor) {
            // 保存旧值用于比较
            var oldName = this._characterName;
            var oldIndex = this._characterIndex;
            
            // 使用角色数据库中设置的图像
            this._characterName = actor.characterName();
            this._characterIndex = actor.characterIndex();
            
            // 只在图像实际变化时输出日志
            if (oldName !== this._characterName || oldIndex !== this._characterIndex) {
                console.log('更新角色外观为:', this._characterName, this._characterIndex);
            }
        }
    };
    
    // 注册T键作为输入键
    Input.keyMapper[84] = 't'; // 84是T键的键码
    
    // 初始化Scene_Map
    var _Scene_Map_initialize = Scene_Map.prototype.initialize;
    Scene_Map.prototype.initialize = function() {
        _Scene_Map_initialize.call(this);
        this._characterSwitchUIVisible = false;
        this._characterSwitchUITimer = 0;
        this._suggestedCharacterIndex = -1;
        this._suggestBlinkTimer = 0;
    };
    
    // 开始场景时
    var _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        
        // 确保UI被创建
        if (!this._characterSwitchUIContainer) {
            this.createCharacterSwitchUI();
        }
        
        // 从全局变量中恢复建议的角色索引
        if ($gameSystem && $gameSystem._suggestedCharacterIndex !== undefined) {
            this._suggestedCharacterIndex = $gameSystem._suggestedCharacterIndex;
        } else {
            this._suggestedCharacterIndex = -1;
        }
        
        // 确保角色图像正确显示
        $gamePlayer.refresh();
    };
    
    // 创建窗口
    var _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this.createCharacterSwitchUI();
    };
    
    // 处理角色切换
    Scene_Map.prototype.updateCharacterSwitch = function() {
        // 检查是否允许角色切换
        if (!$gameSwitches.value(SWITCH_ENABLE)) {
            return;
        }
        
        // 检查T键是否被按下 - 同时检查两种可能的按键表示
        if (Input.isPressed(switchKey) || Input.isPressed('t')) {
            // 检测方向键
            var targetActorId = -1;
            var allowedIndex = $gameVariables.value(VAR_ALLOWED_INDEX);
            
            // 使用isTriggered检测方向键的单次触发
            if (Input.isTriggered('left') && (allowedIndex === 0 || allowedIndex === -1)) {
                targetActorId = 1; // 柯南
                console.log('检测到左方向键，目标角色ID:', targetActorId);
            } else if (Input.isTriggered('up') && (allowedIndex === 1 || allowedIndex === -1)) {
                targetActorId = 2; // 灰原哀
                console.log('检测到上方向键，目标角色ID:', targetActorId);
            } else if (Input.isTriggered('right') && (allowedIndex === 2 || allowedIndex === -1)) {
                targetActorId = 3; // 毛利小五郎
                console.log('检测到右方向键，目标角色ID:', targetActorId);
            }
            
            // 如果检测到有效的目标角色ID
            if (targetActorId !== -1) {
                // 检查该角色是否在队伍中
                var targetIndex = -1;
                var partyMembers = $gameParty.members();
                
                for (var i = 0; i < partyMembers.length; i++) {
                    if (partyMembers[i] && partyMembers[i].actorId() === targetActorId) {
                        targetIndex = i;
                        break;
                    }
                }
                
                // 如果角色在队伍中
                if (targetIndex !== -1) {
                    console.log('执行角色切换，到队伍索引', targetIndex, '(角色ID:', targetActorId, ')');
                    this.executeCharacterSwitch(targetIndex);
                    
                    // 如果是一次性切换模式，禁用角色切换功能
                    if ($gameSwitches.value(SWITCH_ONE_TIME)) {
                        $gameSwitches.setValue(SWITCH_ENABLE, false);
                        $gameSwitches.setValue(SWITCH_ONE_TIME, false);
                        
                        // 清除建议的角色索引
                        this._suggestedCharacterIndex = -1;
                        if ($gameSystem) {
                            $gameSystem._suggestedCharacterIndex = -1;
                        }
                        
                        console.log('一次性切换模式，禁用角色切换功能');
                    }
                } else {
                    // 角色不在队伍中，显示提示
                    console.log('目标角色不在队伍中，无法切换');
                    $gameMessage.add('\\c[1]该角色不在队伍中，无法切换\\c[0]');
                }
            }
        }
    };
    
    // 创建角色切换UI
    Scene_Map.prototype.createCharacterSwitchUI = function() {
        // 创建容器
        this._characterSwitchUIContainer = new Sprite();
        this._characterSwitchUIContainer.x = 20;
        this._characterSwitchUIContainer.y = Graphics.height - 120;
        this._characterSwitchUIContainer.opacity = 0; // 初始不可见
        this.addChild(this._characterSwitchUIContainer);
        
        // 创建背景
        this._characterSwitchUIBackground = new Sprite();
        this._characterSwitchUIBackground.bitmap = new Bitmap(300, 100);
        this._characterSwitchUIBackground.bitmap.fillAll('rgba(0, 0, 0, 0.7)');
        this._characterSwitchUIContainer.addChild(this._characterSwitchUIBackground);
        
        // 创建三个角色头像区域
        this._characterSwitchUIIcons = [];
        
        // 获取队伍中的角色（用于判断角色是否在队伍中）
        var partyMembers = $gameParty.members();
        
        // 定义固定的角色ID映射到位置
        var characterPositions = [
            { id: 1, direction: "←" }, // 柯南 - 左
            { id: 2, direction: "↑" }, // 灰原哀 - 上
            { id: 3, direction: "→" }  // 毛利小五郎 - 右
        ];
        
        // 创建角色图标
        for (var i = 0; i < MAX_CHARACTERS; i++) {
            var icon = new Sprite();
            icon.bitmap = new Bitmap(100, 100);
            icon.x = i * 100;
            
            // 使用简单的矩形背景
            icon.bitmap.fillRect(10, 10, 80, 80, 'rgba(50, 50, 50, 0.8)');
            
            // 绘制边框
            icon.bitmap.fillRect(10, 10, 80, 2, 'rgba(255, 255, 255, 0.8)');
            icon.bitmap.fillRect(88, 10, 2, 80, 'rgba(255, 255, 255, 0.8)');
            icon.bitmap.fillRect(10, 88, 80, 2, 'rgba(255, 255, 255, 0.8)');
            icon.bitmap.fillRect(10, 10, 2, 80, 'rgba(255, 255, 255, 0.8)');
            
            // 添加方向提示
            var dirText = characterPositions[i].direction;
            
            icon.bitmap.fontSize = 24;
            icon.bitmap.textColor = 'rgba(255, 255, 255, 1)';
            icon.bitmap.drawText(dirText, 0, 10, 100, 30, 'center');
            
            // 获取对应的角色（根据固定ID）
            var actorId = characterPositions[i].id;
            var actor = $gameActors.actor(actorId);
            
            // 检查角色是否在队伍中
            var inParty = false;
            for (var j = 0; j < partyMembers.length; j++) {
                if (partyMembers[j] && partyMembers[j].actorId() === actorId) {
                    inParty = true;
                    break;
                }
            }
            
            // 如果有对应角色，添加角色头像
            if (actor) {
                // 创建头像精灵
                var faceSprite = new Sprite();
                
                // 使用角色数据库中设置的头像
                var faceName = actor.faceName();
                var faceIndex = actor.faceIndex();
                
                // 加载头像
                var bitmap = ImageManager.loadFace(faceName);
                faceSprite.bitmap = bitmap;
                
                // 设置头像位置和大小
                faceSprite.x = 30;
                faceSprite.y = 25;
                faceSprite.scale.x = 0.3;
                faceSprite.scale.y = 0.3;
                
                // 设置头像显示区域（根据faceIndex计算）
                var pw = Window_Base._faceWidth;
                var ph = Window_Base._faceHeight;
                var sx = faceIndex % 4 * pw;
                var sy = Math.floor(faceIndex / 4) * ph;
                faceSprite.setFrame(sx, sy, pw, ph);
                
                // 添加头像精灵到图标
                icon.addChild(faceSprite);
                
                // 添加角色名称
                icon.bitmap.fontSize = 16;
                icon.bitmap.drawText(actor.name(), 0, 70, 100, 30, 'center');
                
                // 如果角色不在队伍中，添加灰色遮罩
                if (!inParty) {
                    var mask = new Sprite();
                    mask.bitmap = new Bitmap(80, 80);
                    mask.bitmap.fillAll('rgba(0, 0, 0, 0.5)');
                    mask.x = 10;
                    mask.y = 10;
                    icon.addChild(mask);
                }
            }
            
            this._characterSwitchUIIcons.push(icon);
            this._characterSwitchUIContainer.addChild(icon);
        }
        
        // 添加标题
        var titleSprite = new Sprite();
        titleSprite.bitmap = new Bitmap(300, 20);
        titleSprite.bitmap.fontSize = 16;
        titleSprite.bitmap.textColor = '#FFCC00';
        titleSprite.bitmap.drawText('角色切换 (T+方向键)', 0, 0, 300, 20, 'center');
        titleSprite.y = -20;
        this._characterSwitchUIContainer.addChild(titleSprite);
    };
    
    // 更新场景
    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        
        // 更新角色切换功能
        this.updateCharacterSwitch();
        
        // 更新UI
        if (this._characterSwitchUIContainer) {
            this.updateCharacterSwitchUI();
        } else {
            this.createCharacterSwitchUI();
        }
    };
    
    // 更新角色切换UI
    Scene_Map.prototype.updateCharacterSwitchUI = function() {
        // 检查T键是否被按下 - 同时检查两种可能的按键表示
        if (Input.isPressed(switchKey) || Input.isPressed('t')) {
            // 显示UI
            if (!this._characterSwitchUIVisible) {
                this._characterSwitchUIVisible = true;
                this._characterSwitchUIContainer.opacity = 255;
                console.log('显示角色切换UI - T键被按下');
            }
            
            // 更新高亮状态
            this.updateCharacterHighlight();
        } else {
            // 如果T键释放，隐藏UI（除非有建议的角色）
            if (this._characterSwitchUIVisible && this._suggestedCharacterIndex === -1) {
                this._characterSwitchUIVisible = false;
                this._characterSwitchUIContainer.opacity = 0;
            }
        }
        
        // 如果有建议的角色，保持UI可见并闪烁该角色
        if (this._suggestedCharacterIndex !== -1) {
            if (!this._characterSwitchUIVisible) {
                this._characterSwitchUIVisible = true;
                this._characterSwitchUIContainer.opacity = 255;
            }
            
            // 闪烁效果
            this._suggestBlinkTimer = (this._suggestBlinkTimer + 1) % 30;
            
            // 更新所有图标的透明度
            for (var i = 0; i < this._characterSwitchUIIcons.length; i++) {
                if (i === this._suggestedCharacterIndex) {
                    // 建议的角色闪烁
                    this._characterSwitchUIIcons[i].opacity = this._suggestBlinkTimer < 15 ? 255 : 128;
                } else {
                    // 其他角色淡色显示
                    this._characterSwitchUIIcons[i].opacity = 128;
                }
            }
        }
    };
    
    // 添加角色高亮显示函数
    Scene_Map.prototype.updateCharacterHighlight = function() {
        // 获取当前角色索引
        var currentIndex = $gamePlayer._currentActorIndex || 0;
        
        // 检测方向键
        var highlightIndex = currentIndex;
        var allowedIndex = $gameVariables.value(VAR_ALLOWED_INDEX);
        
        // 检查方向键是否被按下，更新高亮索引
        if (Input.isPressed('left') && (allowedIndex === 0 || allowedIndex === -1)) {
            highlightIndex = 0;
        } else if (Input.isPressed('up') && (allowedIndex === 1 || allowedIndex === -1)) {
            highlightIndex = 1;
        } else if (Input.isPressed('right') && (allowedIndex === 2 || allowedIndex === -1)) {
            highlightIndex = 2;
        }
        
        // 更新所有图标的透明度
        for (var i = 0; i < this._characterSwitchUIIcons.length; i++) {
            if (i === highlightIndex) {
                // 高亮显示当前选中的角色
                this._characterSwitchUIIcons[i].opacity = 255;
            } else {
                // 其他角色淡色显示
                this._characterSwitchUIIcons[i].opacity = 128;
            }
        }
    };
    
    // 处理角色切换
    Scene_Map.prototype.updateCharacterSwitch = function() {
        // 检查是否允许角色切换
        if (!$gameSwitches.value(SWITCH_ENABLE)) {
            return;
        }
        
        // 检查T键是否被按下 - 同时检查两种可能的按键表示
        if (Input.isPressed(switchKey) || Input.isPressed('t')) {
            // 检测方向键
            var targetIndex = -1;
            var currentIndex = $gamePlayer._currentActorIndex || 0;
            var allowedIndex = $gameVariables.value(VAR_ALLOWED_INDEX);
            
            // 使用isTriggered检测方向键的单次触发
            if (Input.isTriggered('left') && (allowedIndex === 0 || allowedIndex === -1)) {
                targetIndex = 0;
                console.log('检测到左方向键，目标角色索引:', targetIndex);
            } else if (Input.isTriggered('up') && (allowedIndex === 1 || allowedIndex === -1)) {
                targetIndex = 1;
                console.log('检测到上方向键，目标角色索引:', targetIndex);
            } else if (Input.isTriggered('right') && (allowedIndex === 2 || allowedIndex === -1)) {
                targetIndex = 2;
                console.log('检测到右方向键，目标角色索引:', targetIndex);
            }
            
            // 如果检测到有效的目标角色，并且不是当前角色
            if (targetIndex !== -1 && targetIndex !== currentIndex && targetIndex < $gameParty.members().length) {
                console.log('执行角色切换，从', currentIndex, '到', targetIndex);
                this.executeCharacterSwitch(targetIndex);
                
                // 如果是一次性切换模式，禁用角色切换功能
                if ($gameSwitches.value(SWITCH_ONE_TIME)) {
                    $gameSwitches.setValue(SWITCH_ENABLE, false);
                    $gameSwitches.setValue(SWITCH_ONE_TIME, false);
                    
                    // 清除建议的角色索引
                    this._suggestedCharacterIndex = -1;
                    if ($gameSystem) {
                        $gameSystem._suggestedCharacterIndex = -1;
                    }
                    
                    console.log('一次性切换模式，禁用角色切换功能');
                }
            }
        }
    };
    
    // 执行角色切换
    Scene_Map.prototype.executeCharacterSwitch = function(targetIndex) {
        // 检查目标角色是否存在
        if (targetIndex < 0 || targetIndex >= $gameParty.members().length) {
            console.error('无效的角色索引:', targetIndex);
            return;
        }
        
        // 检查是否是当前角色
        var currentIndex = $gamePlayer._currentActorIndex || 0;
        if (targetIndex === currentIndex) {
            return;
        }
        
        console.log('开始执行角色切换，从', currentIndex, '到', targetIndex);
        
        try {
            // 保存当前角色的位置
            this.saveCurrentCharacterPosition(currentIndex);
            
            // 更新当前角色索引
            $gamePlayer._currentActorIndex = targetIndex;
            
            // 获取目标角色的位置信息
            var targetPos = this.getTargetCharacterPosition(targetIndex);
            
            // 如果目标角色有保存的位置信息
            if (targetPos && targetPos.mapId > 0) {
                this.applyCharacterPosition(targetPos);
                
                // 播放切换音效
                AudioManager.playSe({name: 'Switch2', pan: 0, pitch: 100, volume: 90});
                
                // 显示切换消息
                var actorName = $gameParty.members()[targetIndex].name();
                $gameMessage.add('\\c[4]已切换到角色: ' + actorName + '\\c[0]');
                
                // 添加切换特效
                $gameScreen.startFlash([255, 255, 255, 128], 30);
            }
        } catch (e) {
            console.error('角色切换过程中出错:', e);
        }
    };
    
    // 保存当前角色位置 - 提取为单独方法以提高可维护性
    Scene_Map.prototype.saveCurrentCharacterPosition = function(currentIndex) {
        var currentMapId = $gameMap.mapId();
        var currentX = $gamePlayer.x;
        var currentY = $gamePlayer.y;
        var currentDirection = $gamePlayer.direction();
        
        // 保存当前场景的设置
        var currentTone = $gameScreen._tone ? $gameScreen._tone.slice() : [0, 0, 0, 0];
        var currentWeather = {
            type: $gameScreen._weatherType || 'none',
            power: $gameScreen._weatherPower || 0,
            duration: 0
        };
        var currentFlash = {
            color: $gameScreen._flashColor ? $gameScreen._flashColor.slice() : [0, 0, 0, 0],
            duration: 0
        };
        var currentShake = {
            power: $gameScreen._shakePower || 0,
            speed: $gameScreen._shakeSpeed || 5,
            duration: 0
        };
        
        // 确保_actorPositions存在
        if (!$gamePlayer._actorPositions) {
            $gamePlayer._actorPositions = {};
            console.log('初始化_actorPositions对象');
            this.initializeDefaultPositions();
        }
        
        // 更新当前角色的位置信息
        $gamePlayer._actorPositions[currentIndex] = {
            mapId: currentMapId,
            x: currentX,
            y: currentY,
            direction: currentDirection,
            tone: currentTone,
            weather: currentWeather,
            flash: currentFlash,
            shake: currentShake
        };
        
        console.log('保存当前角色位置:', currentMapId, currentX, currentY, currentDirection);
        
        // 同时保存到变量中
        $gameVariables.setValue(10 + currentIndex, currentMapId);
        $gameVariables.setValue(20 + currentIndex, currentX);
        $gameVariables.setValue(30 + currentIndex, currentY);
        $gameVariables.setValue(40 + currentIndex, currentDirection);
    };
    
    // 初始化默认位置
    Scene_Map.prototype.initializeDefaultPositions = function() {
        // 预设位置
        var initialPositions = [
            {
                mapId: 3, 
                x: 7, 
                y: 4, 
                direction: 2,
                tone: [0, 0, 0, 0],
                weather: {type: 'none', power: 0, duration: 0},
                flash: {color: [0, 0, 0, 0], duration: 0},
                shake: {power: 0, speed: 5, duration: 0}
            },
            {
                mapId: 6, 
                x: 10, 
                y: 19, 
                direction: 8,
                tone: [0, 0, 0, 0],
                weather: {type: 'none', power: 0, duration: 0},
                flash: {color: [0, 0, 0, 0], duration: 0},
                shake: {power: 0, speed: 5, duration: 0}
            },
            {
                mapId: 5, 
                x: 6, 
                y: 5, 
                direction: 4,
                tone: [0, 0, 0, 0],
                weather: {type: 'none', power: 0, duration: 0},
                flash: {color: [0, 0, 0, 0], duration: 0},
                shake: {power: 0, speed: 5, duration: 0}
            }
        ];
        
        // 将初始位置保存到对象中
        for (var i = 0; i < initialPositions.length; i++) {
            $gamePlayer._actorPositions[i] = JSON.parse(JSON.stringify(initialPositions[i])); // 深拷贝
        }
    };
    
    // 获取目标角色位置
    Scene_Map.prototype.getTargetCharacterPosition = function(targetIndex) {
        var targetPos = $gamePlayer._actorPositions[targetIndex];
        
        // 如果目标位置不存在或mapId为0，则使用预设位置
        if (!targetPos || targetPos.mapId <= 0) {
            console.log('目标角色没有保存的位置信息，使用预设位置');
            
            // 预设位置
            var presetPositions = [
                {mapId: 3, x: 7, y: 4, direction: 2},
                {mapId: 6, x: 10, y: 19, direction: 8},
                {mapId: 5, x: 6, y: 5, direction: 4}
            ];
            
            if (targetIndex < presetPositions.length) {
                targetPos = presetPositions[targetIndex];
                
                // 保存到_actorPositions中
                $gamePlayer._actorPositions[targetIndex] = {
                    mapId: targetPos.mapId,
                    x: targetPos.x,
                    y: targetPos.y,
                    direction: targetPos.direction,
                    tone: [0, 0, 0, 0],
                    weather: {type: 'none', power: 0, duration: 0},
                    flash: {color: [0, 0, 0, 0], duration: 0},
                    shake: {power: 0, speed: 5, duration: 0}
                };
                
                // 同时保存到变量中
                $gameVariables.setValue(10 + targetIndex, targetPos.mapId);
                $gameVariables.setValue(20 + targetIndex, targetPos.x);
                $gameVariables.setValue(30 + targetIndex, targetPos.y);
                $gameVariables.setValue(40 + targetIndex, targetPos.direction);
            }
        }
        
        console.log('目标角色位置信息:', targetPos);
        return targetPos;
    };
    
    // 应用角色位置
    Scene_Map.prototype.applyCharacterPosition = function(targetPos) {
        var currentMapId = $gameMap.mapId();
        
        // 如果目标角色在不同的地图上，执行地图转移
        if (targetPos.mapId !== currentMapId) {
            try {
                // 保存目标场景的设置到临时变量，以便在地图加载后应用
                $gameTemp._pendingTone = targetPos.tone ? targetPos.tone.slice() : [0, 0, 0, 0];
                $gameTemp._pendingWeather = targetPos.weather ? JSON.parse(JSON.stringify(targetPos.weather)) : {type: 'none', power: 0, duration: 0};
                $gameTemp._pendingFlash = targetPos.flash ? JSON.parse(JSON.stringify(targetPos.flash)) : {color: [0, 0, 0, 0], duration: 0};
                $gameTemp._pendingShake = targetPos.shake ? JSON.parse(JSON.stringify(targetPos.shake)) : {power: 0, speed: 5, duration: 0};
                
                // 执行地图转移
                $gamePlayer.reserveTransfer(targetPos.mapId, targetPos.x, targetPos.y, targetPos.direction, 0);
            } catch (e) {
                console.error('执行地图转移时出错:', e);
            }
        } else {
            // 如果在同一地图上，直接设置位置
            $gamePlayer.setPosition(targetPos.x, targetPos.y);
            $gamePlayer.setDirection(targetPos.direction);
            
            // 应用场景设置
            this.applySceneEffects(targetPos);
            
            // 更新角色图像
            $gamePlayer.refresh();
        }
    };
    
    // 应用场景效果
    Scene_Map.prototype.applySceneEffects = function(targetPos) {
        if (!targetPos) return;
        
        // 应用色调
        if (targetPos.tone) {
            $gameScreen.startTint(targetPos.tone, 0);
        }
        
        // 应用天气效果
        if (targetPos.weather) {
            $gameScreen.changeWeather(targetPos.weather.type || 'none', targetPos.weather.power || 0, 0);
        }
        
        // 应用闪烁效果
        if (targetPos.flash && targetPos.flash.color && targetPos.flash.color[3] > 0) {
            $gameScreen._flashColor = targetPos.flash.color.slice();
        }
        
        // 应用震动效果
        if (targetPos.shake && targetPos.shake.power > 0) {
            $gameScreen.startShake(targetPos.shake.power, targetPos.shake.speed || 5, 0);
        }
    };
    
    // 地图转移完成后处理
    var _Scene_Map_onTransferEnd = Scene_Map.prototype.onTransferEnd;
    Scene_Map.prototype.onTransferEnd = function() {
        _Scene_Map_onTransferEnd.call(this);
        
        // 在地图转移完成后更新角色图像
        $gamePlayer.refresh();
        
        // 应用保存的场景设置
        try {
            if ($gameTemp._pendingTone) {
                $gameScreen.startTint($gameTemp._pendingTone, 0);
                $gameTemp._pendingTone = null;
            }
            
            if ($gameTemp._pendingWeather) {
                $gameScreen.changeWeather(
                    $gameTemp._pendingWeather.type || 'none', 
                    $gameTemp._pendingWeather.power || 0, 
                    0
                );
                $gameTemp._pendingWeather = null;
            }
            
            if ($gameTemp._pendingFlash) {
                if ($gameTemp._pendingFlash.color && $gameTemp._pendingFlash.color[3] > 0) {
                    $gameScreen._flashColor = $gameTemp._pendingFlash.color.slice();
                }
                $gameTemp._pendingFlash = null;
            }
            
            if ($gameTemp._pendingShake) {
                if ($gameTemp._pendingShake.power > 0) {
                    $gameScreen.startShake(
                        $gameTemp._pendingShake.power, 
                        $gameTemp._pendingShake.speed || 5, 
                        0
                    );
                }
                $gameTemp._pendingShake = null;
            }
        } catch (e) {
            console.error('应用场景效果时出错:', e);
        }
    };
    
    // 处理插件命令
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        
        // 处理角色切换相关命令
        this.processCharacterSwitchCommands(command, args);
    };
    
    // 处理角色切换相关的插件命令
    Game_Interpreter.prototype.processCharacterSwitchCommands = function(command, args) {
        // 定义常量
        const SWITCH_ENABLE = 11;
        const SWITCH_ONE_TIME = 12;
        const VAR_ALLOWED_INDEX = 50;
        
        // 处理基本角色切换命令
        if (command === 'EnableCharacterSwitch') {
            // 启用持续角色切换功能
            $gameSwitches.setValue(SWITCH_ENABLE, true);
            $gameSwitches.setValue(SWITCH_ONE_TIME, false);
            $gameVariables.setValue(VAR_ALLOWED_INDEX, -1); // 允许切换到任何角色
            console.log('启用持续角色切换功能');
        } else if (command === 'EnableOneTimeSwitch') {
            // 启用一次性角色切换功能
            $gameSwitches.setValue(SWITCH_ENABLE, true);
            $gameSwitches.setValue(SWITCH_ONE_TIME, true);
            $gameVariables.setValue(VAR_ALLOWED_INDEX, -1); // 允许切换到任何角色
            console.log('启用一次性角色切换功能');
        } else if (command === 'DisableCharacterSwitch') {
            // 禁用角色切换功能
            $gameSwitches.setValue(SWITCH_ENABLE, false);
            console.log('禁用角色切换功能');
        } else if (command === 'SetCharacterPosition') {
            this.processSetCharacterPosition(args);
        } else if (command === 'LimitSwitchToCharacter') {
            // 限制只能切换到指定角色
            var targetIndex = Number(args[0]);
            $gameVariables.setValue(VAR_ALLOWED_INDEX, targetIndex);
            console.log('限制只能切换到角色', targetIndex);
        } else if (command === 'AllowAllCharacterSwitch') {
            // 允许切换到任何角色
            $gameVariables.setValue(VAR_ALLOWED_INDEX, -1);
            console.log('允许切换到任何角色');
        } else if (command === 'SuggestCharacterSwitch') {
            this.processSuggestCharacterSwitch(args);
        } else if (command === 'ShowCharacterSwitchUI') {
            this.processShowCharacterSwitchUI();
        } else if (command === 'HideCharacterSwitchUI') {
            this.processHideCharacterSwitchUI();
        }
    };
    
    // 处理设置角色位置命令
    Game_Interpreter.prototype.processSetCharacterPosition = function(args) {
        var actorIndex = Number(args[0]);
        var mapId = Number(args[1]);
        var x = Number(args[2]);
        var y = Number(args[3]);
        var direction = Number(args[4]) || 2; // 默认朝下
        
        // 确保_actorPositions存在
        if (!$gamePlayer._actorPositions) {
            $gamePlayer._actorPositions = {};
        }
        
        // 设置角色位置
        $gamePlayer._actorPositions[actorIndex] = {
            mapId: mapId,
            x: x,
            y: y,
            direction: direction,
            tone: $gameScreen._tone ? $gameScreen._tone.slice() : [0, 0, 0, 0],
            weather: {
                type: $gameScreen._weatherType || 'none',
                power: $gameScreen._weatherPower || 0,
                duration: 0
            },
            flash: {
                color: $gameScreen._flashColor ? $gameScreen._flashColor.slice() : [0, 0, 0, 0],
                duration: 0
            },
            shake: {
                power: $gameScreen._shakePower || 0,
                speed: $gameScreen._shakeSpeed || 5,
                duration: 0
            }
        };
        
        // 同时保存到变量中
        $gameVariables.setValue(10 + actorIndex, mapId);
        $gameVariables.setValue(20 + actorIndex, x);
        $gameVariables.setValue(30 + actorIndex, y);
        $gameVariables.setValue(40 + actorIndex, direction);
        
        console.log('设置角色', actorIndex, '的位置为:', mapId, x, y, direction);
    };
    
    // 处理建议角色切换命令
    Game_Interpreter.prototype.processSuggestCharacterSwitch = function(args) {
        var targetIndex = Number(args[0]);
        var message = args[1] || "";
        
        // 只有当消息不为空时才显示
        if (message && message.trim() !== "") {
            $gameMessage.add('\\c[3]' + message + '\\c[0]');
        }
        
        // 打开允许切换角色的开关
        $gameSwitches.setValue(11, true);
        // 设置开关12为true，表示只允许切换一次
        $gameSwitches.setValue(12, true);
        // 设置变量50为目标角色索引，表示只允许切换到该角色
        $gameVariables.setValue(50, targetIndex);
        
        // 设置建议的角色索引
        var scene = SceneManager._scene;
        if (scene instanceof Scene_Map) {
            scene._suggestedCharacterIndex = targetIndex;
        }
        if ($gameSystem) {
            $gameSystem._suggestedCharacterIndex = targetIndex;
        }
        
        console.log('启用一次性角色切换功能，只允许切换到角色', targetIndex);
    };
    
    // 处理显示角色切换UI命令
    Game_Interpreter.prototype.processShowCharacterSwitchUI = function() {
        var scene = SceneManager._scene;
        if (scene instanceof Scene_Map && scene._characterSwitchUIContainer) {
            scene._characterSwitchUIVisible = true;
            scene._characterSwitchUIContainer.opacity = 255;
            console.log('显示角色切换UI');
        }
    };
    
    // 处理隐藏角色切换UI命令
    Game_Interpreter.prototype.processHideCharacterSwitchUI = function() {
        var scene = SceneManager._scene;
        if (scene instanceof Scene_Map && scene._characterSwitchUIContainer) {
            scene._characterSwitchUIVisible = false;
            scene._characterSwitchUIContainer.opacity = 0;
            console.log('隐藏角色切换UI');
        }
    };
    
    // 修复DataManager.extractSaveContents的引用错误
    var _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        // 如果没有特别设置过开关11，则默认关闭
        if ($gameSwitches.value(11) === undefined) {
            $gameSwitches.setValue(11, false);
        }
    };
    
    // 添加错误处理和日志记录功能
    var TeamManagement = TeamManagement || {};
    
    // 日志记录函数
    TeamManagement.log = function(message) {
        if (Utils.isOptionValid('test')) {
            console.log('[TeamManagement] ' + message);
        }
    };
    
    // 错误记录函数
    TeamManagement.error = function(message, error) {
        console.error('[TeamManagement] ' + message, error);
    };
    
    // 初始化函数
    TeamManagement.initialize = function() {
        this.log('插件初始化完成');
    };
    
    // 在插件加载完成后执行初始化
    TeamManagement.initialize();
})();