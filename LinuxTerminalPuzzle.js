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

(function() {
    'use strict';
    
    var parameters = PluginManager.parameters('LinuxTerminalPuzzle');
    var fontSize = Number(parameters['FontSize'] || 16);
    var textColor = String(parameters['TextColor'] || '#33ff33');
    var backgroundColor = String(parameters['BackgroundColor'] || '#000000');
    var promptSymbol = String(parameters['PromptSymbol'] || '$');
    var successSwitchId = Number(parameters['SuccessVariable'] || 10);
    var rootPasswordVarId = Number(parameters['RootPasswordVariable'] || 5);
    var guestPasswordVarId = Number(parameters['GuestPasswordVariable'] || 6);
    var fileDeletedSwitchId = Number(parameters['FileDeletedSwitch'] || 9);
    
    //==========================================================================
    // 插件命令
    //==========================================================================
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        
        if (command === 'LinuxTerminal') {
            switch (args[0]) {
                case 'start':
                    SceneManager.push(Scene_LinuxTerminal);
                    break;
            }
        }
    };
    
    //==========================================================================
    // Scene_LinuxTerminal
    //==========================================================================
    function Scene_LinuxTerminal() {
        this.initialize.apply(this, arguments);
    }
    
    Scene_LinuxTerminal.prototype = Object.create(Scene_Base.prototype);
    Scene_LinuxTerminal.prototype.constructor = Scene_LinuxTerminal;
    
    Scene_LinuxTerminal.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        this._currentInput = '';
        this._commandHistory = [];
        this._historyIndex = -1;
        this._terminalLines = [];
        this._cursorPosition = 0;
        this._loggedIn = false;
        this._loginAttempt = false;
        this._passwordMode = false;
        this._username = '';
        this._isRoot = false;
        
        // 从游戏变量中读取状态
        this._serviceRunning = !$gameSwitches.value(successSwitchId);
        
        // 读取root密码
        var savedPassword = $gameVariables.value(rootPasswordVarId);
        this._rootPassword = savedPassword ? String(savedPassword) : "dddd"; // 如果没有保存过，使用默认密码
        
        // 读取guest密码
        var savedGuestPassword = $gameVariables.value(guestPasswordVarId);
        this._guestPassword = savedGuestPassword ? String(savedGuestPassword) : ""; // 如果没有保存过，使用空密码
        
        // 读取文件删除状态
        this._filesDeleted = $gameSwitches.value(fileDeletedSwitchId);
        
        // 新增变量
        this._normalCommandMode = true;
        this._passwdState = null;
        this._newPassword = null;
        this._sudoArgs = null;
        this._suUser = null;
        this._suDashOption = false;
    };
    
    Scene_LinuxTerminal.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.createTerminalWindow();
        this.createVirtualKeyboard();
        this.addWelcomeMessage();
    };
    
    Scene_LinuxTerminal.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
        this._backgroundSprite.bitmap.fillAll(backgroundColor);
        this.addChild(this._backgroundSprite);
    };
    
    Scene_LinuxTerminal.prototype.createTerminalWindow = function() {
        this._terminalWindow = new Window_Terminal();
        this.addChild(this._terminalWindow);
    };
    
    Scene_LinuxTerminal.prototype.createVirtualKeyboard = function() {
        this._virtualKeyboard = new Window_VirtualKeyboard();
        this._virtualKeyboard.setHandler('keyInput', this.onKeyInput.bind(this));
        this.addChild(this._virtualKeyboard);
    };
    
    Scene_LinuxTerminal.prototype.addWelcomeMessage = function() {
        // ASCII艺术 - Umbrella标志（八角形红白相间标志）
        this._terminalLines.push("Umbrella Corporation Security System v3.5");
        this._terminalLines.push("RedQueen AI 核心系统 - 分支版本: Alice 9.8.2");
        this._terminalLines.push("Copyright (C) 1998-2025 Umbrella Corp.");
        this._terminalLines.push("===========================================");
        this._terminalLines.push("警告: 未经授权访问本系统属于违法行为");
        this._terminalLines.push("系统状态: " + (this._serviceRunning ? "运行中" : "已停止"));
        this._terminalLines.push("");
        this._terminalLines.push("请登录以继续:");
        this._terminalLines.push("login: ");
        this._terminalWindow.refresh(this._terminalLines, this._currentInput, this._cursorPosition, this._passwordMode);
    };

    
    Scene_LinuxTerminal.prototype.onKeyInput = function(key) {
        // 防止快速连续调用
        if (this._lastKeyTime && Date.now() - this._lastKeyTime < 100) {
            return;
        }
        this._lastKeyTime = Date.now();
        
        // 原有的按键处理逻辑
        if (key === 'Enter') {
            this.processEnter();
        } else if (key === 'Backspace') {
            this.processBackspace();
        } else if (key === 'Space') {
            this.processRegularKey(' ');
        } else if (key === 'Escape') {
            this.popScene();
        } else {
            this.processRegularKey(key);
        }
        
        this._terminalWindow.refresh(this._terminalLines, this._currentInput, this._cursorPosition, this._passwordMode);
    };
    
    // 添加缺失的 processRegularKey 方法
    Scene_LinuxTerminal.prototype.processRegularKey = function(key) {
        // 如果是普通按键，将其添加到当前输入中
        if (key.length === 1) {  // 确保只处理单个字符
            // 在光标位置插入字符
            var beforeCursor = this._currentInput.substring(0, this._cursorPosition);
            var afterCursor = this._currentInput.substring(this._cursorPosition);
            this._currentInput = beforeCursor + key + afterCursor;
            this._cursorPosition++;
        }
    };
    
    // 添加缺失的 processBackspace 方法
    Scene_LinuxTerminal.prototype.processBackspace = function() {
        if (this._cursorPosition > 0) {
            // 删除光标前的字符
            var beforeCursor = this._currentInput.substring(0, this._cursorPosition - 1);
            var afterCursor = this._currentInput.substring(this._cursorPosition);
            this._currentInput = beforeCursor + afterCursor;
            this._cursorPosition--;
        }
    };
    
    Scene_LinuxTerminal.prototype.processEnter = function() {
        if (!this._loggedIn) {
            if (!this._loginAttempt) {
                // 处理用户名输入
                this._username = this._currentInput;
                this._terminalLines[this._terminalLines.length - 1] = "login: " + this._username;
                this._terminalLines.push("Password: ");
                this._currentInput = '';
                this._cursorPosition = 0;
                this._loginAttempt = true;
                this._passwordMode = true;
            } else {
                // 处理密码输入
                var password = this._currentInput;
                this._terminalLines[this._terminalLines.length - 1] = "Password: " + '*'.repeat(password.length);
                
                // 验证用户名和密码
                if (this._username === 'root' && password === this._rootPassword) {
                    this._loggedIn = true;
                    this._isRoot = true;
                    this._terminalLines.push("登录成功！");
                    this._terminalLines.push(this.getPrompt());
                    this._passwordMode = false; // 重置密码模式
                } else if (this._username === 'guest' && password === this._guestPassword) {
                    this._loggedIn = true;
                    this._terminalLines.push("登录成功！");
                    this._terminalLines.push(this.getPrompt());
                    this._passwordMode = false; // 重置密码模式
                } else {
                    this._terminalLines.push("登录失败：用户名或密码错误");
                    this._terminalLines.push("login: ");
                    this._loginAttempt = false;
                    this._passwordMode = false;
                }
                
                this._currentInput = '';
                this._cursorPosition = 0;
            }
        } else if (this._normalCommandMode) {
            // 处理命令输入
            var fullLine = this.getPrompt() + this._currentInput;
            this._terminalLines[this._terminalLines.length - 1] = fullLine;
            
            // 保存命令到历史记录
            if (this._currentInput.trim() !== '') {
                this._commandHistory.unshift(this._currentInput);
                if (this._commandHistory.length > 20) {
                    this._commandHistory.pop();
                }
                this._historyIndex = -1;
            }
            
            // 解析命令
            var args = this._currentInput.trim().split(/\s+/);
            var command = args.shift().toLowerCase();
            
            // 执行命令
            this.executeCommand(command, args);
            
            this._currentInput = '';
            this._cursorPosition = 0;
        }
    };

    // 添加缺失的 executeCommand 方法
    Scene_LinuxTerminal.prototype.executeCommand = function(command, args) {
        switch (command) {
            case 'help':
                this.handleHelp();
                break;
            case 'ls':
                this.handleLs(args);
                break;
            case 'cd':
                this.handleCd(args);
                break;
            case 'cat':
                this.handleCat(args);
                break;
            case 'clear':
                this.handleClear();
                break;
            case 'passwd':
                this.handlePasswd(args);
                break;
            case 'sudo':
                this.handleSudo(args);
                break;
            case 'su':
                this.handleSu(args);
                break;
            case 'systemctl':
                this.handleSystemctl(args);
                break;
            case 'rm':
                this.handleRm(args);
                break;
            case 'exit':
                this.popScene();
                break;
            case '':
                // 空命令，只添加新的提示符
                this._terminalLines.push(this.getPrompt());
                break;
            default:
                this._terminalLines.push(command + ": 命令未找到");
                this._terminalLines.push(this.getPrompt());
                break;
        }
    };

    // 实现handleHelp函数 - 显示帮助信息
    Scene_LinuxTerminal.prototype.handleHelp = function() {
        this._terminalLines.push("可用命令：");
        this._terminalLines.push("  help      - 显示此帮助信息");
        this._terminalLines.push("  ls        - 列出目录内容");
        this._terminalLines.push("  cd        - 切换目录");
        this._terminalLines.push("  cat       - 查看文件内容");
        this._terminalLines.push("  clear     - 清空终端");
        this._terminalLines.push("  passwd    - 修改密码");
        this._terminalLines.push("  sudo      - 以管理员权限执行命令");
        this._terminalLines.push("  su        - 切换用户");
        this._terminalLines.push("  systemctl - 管理系统服务");
        this._terminalLines.push("  rm        - 删除文件");
        this._terminalLines.push("  exit      - 退出终端");
        this._terminalLines.push(this.getPrompt());
    };
    
    // 实现handleLs函数 - 列出目录内容
    Scene_LinuxTerminal.prototype.handleLs = function(args) {
        // 模拟文件系统
        var files = [
            "security_service.conf",
            "umbrella_logo.png",
            "readme.txt",
            "system.log"
        ];
        
        // 如果是root用户，显示更多文件
        if (this._isRoot) {
            files.push("security_override.sh");
            files.push("admin_notes.txt");
            files.push("red_queen.service");
        }
        
        // 如果文件已被删除，则不显示security_service.conf
        if (this._filesDeleted) {
            files = files.filter(function(file) {
                return file !== "security_service.conf" && file !== "system.log";
            });
        }
        
        // 显示文件列表
        var output = "";
        for (var i = 0; i < files.length; i++) {
            output += files[i] + "  ";
            // 每3个文件换行
            if ((i + 1) % 3 === 0) {
                this._terminalLines.push(output);
                output = "";
            }
        }
        
        // 输出剩余的文件
        if (output !== "") {
            this._terminalLines.push(output);
        }
        
        this._terminalLines.push(this.getPrompt());
    };
    
    // 实现handleCd函数 - 切换目录
    Scene_LinuxTerminal.prototype.handleCd = function(args) {
        // 简单模拟目录切换，实际上不做任何改变
        if (args.length === 0 || args[0] === "~" || args[0] === "/home/" + this._username) {
            this._terminalLines.push(this.getPrompt());
        } else {
            this._terminalLines.push("cd: " + args[0] + ": 没有那个文件或目录");
            this._terminalLines.push(this.getPrompt());
        }
    };
    
    // 实现handleCat函数 - 查看文件内容
    Scene_LinuxTerminal.prototype.handleCat = function(args) {
        if (args.length === 0) {
            this._terminalLines.push("用法: cat 文件名");
            this._terminalLines.push(this.getPrompt());
            return;
        }
        
        var filename = args[0];
        
        // 模拟文件内容
        switch (filename) {
            case "readme.txt":
                this._terminalLines.push("Umbrella Corporation 安全系统");
                this._terminalLines.push("------------------------");
                this._terminalLines.push("本系统用于公司安保设施的监控和管理。");
                this._terminalLines.push("访客已为您开通日志查询功能。");
                this._terminalLines.push("如需帮助，请联系IT部门。");
                break;
                
            case "security_service.conf":
                if (this._filesDeleted) {
                    this._terminalLines.push("cat: security_service.conf: 没有那个文件或目录");
                } else {
                    this._terminalLines.push("# 安全服务配置文件");
                    this._terminalLines.push("service_name=red_queen.service");
                    this._terminalLines.push("autostart=true");
                    this._terminalLines.push("priority=high");
                    this._terminalLines.push("# 仅root用户可修改此文件");
                }
                break;
                
            case "system.log":
                if (this._filesDeleted) {
                    this._terminalLines.push("cat: system.log: 没有那个文件或目录");
                } else {
                    this._terminalLines.push("[INFO] 系统启动完成");
                    this._terminalLines.push("[INFO] 安全服务已启动");
                    this._terminalLines.push("[WARN] 检测到未授权访问尝试");
                    this._terminalLines.push("[INFO] 防火墙规则已更新");
                    this._terminalLines.push("[DEBUG] 服务依赖: red_queen.service");
                }
                break;
                
            case "red_queen.service":
                if (this._isRoot) {
                    this._terminalLines.push("[Unit]");
                    this._terminalLines.push("Description=Red Queen Security System");
                    this._terminalLines.push("After=network.target");
                    this._terminalLines.push("");
                    this._terminalLines.push("[Service]");
                    this._terminalLines.push("Type=simple");
                    this._terminalLines.push("ExecStart=/usr/bin/umbrella_security");
                    this._terminalLines.push("Restart=always");
                    this._terminalLines.push("");
                    this._terminalLines.push("[Install]");
                    this._terminalLines.push("WantedBy=multi-user.target");
                } else {
                    this._terminalLines.push("cat: red_queen.service: 权限不足");
                }
                break;
                
            case "admin_notes.txt":
                if (this._isRoot) {
                    this._terminalLines.push("紧急情况下停止安全系统：");
                    this._terminalLines.push("1. 使用systemctl停止核心服务");
                    this._terminalLines.push("2. 或删使用脚本文件security_override.sh停止核心服务");
                } else {
                    this._terminalLines.push("cat: admin_notes.txt: 权限不足");
                }
                break;
                
            case "security_override.sh":
                if (this._isRoot) {
                    this._terminalLines.push("#!/bin/bash");
                    this._terminalLines.push("# 此脚本用于紧急情况下覆盖安全设置");
                    this._terminalLines.push("systemctl stop red_queen");
                    this._terminalLines.push("echo \"安全系统已停止\";");
                } else {
                    this._terminalLines.push("cat: security_override.sh: 权限不足");
                }
                break;
                
            default:
                this._terminalLines.push("cat: " + filename + ": 没有那个文件或目录");
                break;
        }
        
        this._terminalLines.push(this.getPrompt());
    };
    
    // 实现handleClear函数 - 清空终端
    Scene_LinuxTerminal.prototype.handleClear = function() {
        this._terminalLines = [];
        this._terminalLines.push(this.getPrompt());
    };
    
    // 实现handleSystemctl函数 - 管理系统服务
    Scene_LinuxTerminal.prototype.handleSystemctl = function(args) {
        if (args.length < 2) {
            this._terminalLines.push("用法: systemctl [start|stop|status|disable] 服务名");
            this._terminalLines.push(this.getPrompt());
            return;
        }
        
        var action = args[0];
        var service = args[1];
        
        // 只有root用户或通过sudo才能执行某些操作
        if ((action === "start" || action === "stop" || action === "disable") && !this._isRoot) {
            this._terminalLines.push("systemctl: 权限不足，无法执行此操作");
            this._terminalLines.push(this.getPrompt());
            return;
        }
        
        // 处理red_queen服务（核心服务）
        if (service === "red_queen.service" || service === "red_queen") {
            switch (action) {
                case "status":
                    var status = this._serviceRunning ? "active (running)" : "inactive (dead)";
                    this._terminalLines.push("● red_queen.service - Red Queen Security System");
                    this._terminalLines.push("   Loaded: loaded");
                    this._terminalLines.push("   Active: " + status);
                    this._terminalLines.push("   Description: 核心安全服务，控制整个安全系统");
                    break;
                    
                case "stop":
                    if (this._serviceRunning) {
                        this._serviceRunning = false;
                        this._terminalLines.push("red_queen.service 已停止");
                        this._terminalLines.push("警告: 核心安全服务已关闭");
                        
                        // 设置谜题完成
                        this.puzzleCompleted();
                    } else {
                        this._terminalLines.push("red_queen.service 已经是停止状态");
                    }
                    break;
                    
                case "disable":
                    if (this._serviceRunning) {
                        this._serviceRunning = false;
                        this._terminalLines.push("red_queen.service 已禁用并停止");
                        this._terminalLines.push("警告: 核心安全服务已关闭");
                        
                        // 设置谜题完成
                        this.puzzleCompleted();
                    } else {
                        this._terminalLines.push("red_queen.service 已禁用");
                    }
                    break;
                    
                case "start":
                    if (!this._serviceRunning) {
                        this._serviceRunning = true;
                        this._terminalLines.push("red_queen.service 已启动");
                    } else {
                        this._terminalLines.push("red_queen.service 已经是运行状态");
                    }
                    break;
                    
                default:
                    this._terminalLines.push("systemctl: 未知操作: " + action);
                    break;
            }
        } 
        // 处理umbrella_security服务（非核心服务）
        else if (service === "umbrella_security" || service === "umbrella_security.service") {
            switch (action) {
                case "status":
                    this._terminalLines.push("● umbrella_security.service - Umbrella Security System");
                    this._terminalLines.push("   Loaded: loaded");
                    this._terminalLines.push("   Active: active (running)");
                    this._terminalLines.push("   Description: 依赖于red_queen.service的辅助安全服务");
                    break;
                    
                case "stop":
                case "disable":
                    this._terminalLines.push("umbrella_security.service 停止失败");
                    this._terminalLines.push("错误: 无法停止服务，因为它依赖于核心服务red_queen.service");
                    this._terminalLines.push("提示: 请先停止red_queen.service");
                    break;
                    
                case "start":
                    this._terminalLines.push("umbrella_security.service 已经是运行状态");
                    break;
                    
                default:
                    this._terminalLines.push("systemctl: 未知操作: " + action);
                    break;
            }
        } else {
            this._terminalLines.push("systemctl: 服务 " + service + " 不存在");
        }
        
        this._terminalLines.push(this.getPrompt());
    };
    
    // 实现handleRm函数 - 删除文件
    Scene_LinuxTerminal.prototype.handleRm = function(args) {
        if (args.length === 0) {
            this._terminalLines.push("用法: rm [选项] 文件...");
            this._terminalLines.push(this.getPrompt());
            return;
        }
        
        // 检查是否有root权限
        if (!this._isRoot) {
            this._terminalLines.push("rm: 权限不足，无法执行此操作");
            this._terminalLines.push(this.getPrompt());
            return;
        }
        
        // 解析参数
        var options = [];
        var files = [];
        
        for (var i = 0; i < args.length; i++) {
            if (args[i].startsWith('-')) {
                options.push(args[i]);
            } else {
                files.push(args[i]);
            }
        }
        
        // 检查是否是危险的删除命令 rm -rf /*
        var isRecursive = options.some(function(opt) { 
            return opt === '-r' || opt === '-R' || opt === '-rf' || opt.includes('r'); 
        });
        var isForce = options.some(function(opt) { 
            return opt === '-f' || opt === '-rf' || opt.includes('f'); 
        });
        var isAllFiles = files.some(function(file) { 
            return file === '/*' || file === '*'; 
        });
        
        // 如果是删除系统文件的危险命令
        if (isRecursive && isForce && isAllFiles) {
            if (this._serviceRunning) {
                this._serviceRunning = false;
                this._terminalLines.push("rm: 正在删除系统文件...");
                this._terminalLines.push("系统服务已停止");
                this._filesDeleted = true;
                $gameSwitches.setValue(fileDeletedSwitchId, true);
                this.puzzleCompleted();
            } else {
                this._terminalLines.push("rm: 文件已被删除");
            }
            this._terminalLines.push(this.getPrompt());
            return;
        }
        
        // 处理单个文件删除
        if (files.length === 0) {
            this._terminalLines.push("rm: 缺少操作数");
            this._terminalLines.push(this.getPrompt());
            return;
        }
        
        var filename = files[0];
        
        // 允许删除特定文件
        if (filename === "security_service.conf") {
            if (!this._filesDeleted) {
                // 只标记文件被删除，但不停止服务
                this._terminalLines.push("已删除文件 'security_service.conf'");
                this._terminalLines.push("提示: 配置文件已删除，但服务仍在运行");
            } else {
                this._terminalLines.push("rm: 无法删除 'security_service.conf': 没有那个文件或目录");
            }
        } else if (filename === "system.log") {
            if (!this._filesDeleted) {
                // 只有删除system.log时才设置_filesDeleted为true
                this._filesDeleted = true;
                $gameSwitches.setValue(fileDeletedSwitchId, true);
                this._terminalLines.push("已删除文件 'system.log'");
                this._terminalLines.push("提示: 系统日志已删除");
            } else {
                this._terminalLines.push("rm: 无法删除 'system.log': 没有那个文件或目录");
            }
        } else if (filename === "red_queen.service" && this._isRoot) {
            // 无法通过rm命令直接删除red_queen.service
            this._terminalLines.push("rm: 无法删除 'red_queen.service': 设备或资源忙");
            this._terminalLines.push("提示: 核心服务运行中，命令无法执行");
        } else {
            this._terminalLines.push("rm: 无法删除 '" + filename + "': 操作不允许");
        }
        
        this._terminalLines.push(this.getPrompt());
    };
    
    Scene_LinuxTerminal.prototype.getPrompt = function() {
        var user = this._isRoot ? 'root' : 'guest';
        return user + "@umbrella-sec:~" + (this._isRoot ? '# ' : '$ ');
    };
    
    Scene_LinuxTerminal.prototype.processSudoEnter = function() {
        var password = this._currentInput;
        this._terminalLines[this._terminalLines.length - 1] = "[sudo] 输入" + this._username + "的密码: " + '*'.repeat(password.length);
    
        // 获取当前用户的密码（guest 或 root）
        var currentUserPassword = this._username === 'root' ? this._rootPassword : this._guestPassword;
    
        // 调试输出
        console.log("Password Check: Current User Password: ", currentUserPassword);
        console.log("Entered Password: ", password);
    
        if (password === currentUserPassword) {
            // 密码正确，执行sudo命令
            console.log("Password correct, executing command...");
            this._terminalLines.push("");
            
            // 检查是否是passwd命令
            if (this._sudoArgs[0] === 'passwd' && this._sudoArgs.length > 1 && this._sudoArgs[1] === 'root') {
                console.log("Switching to password change mode...");
                // 如果是passwd root命令，进入密码设置流程
                this._terminalLines.push("为 root 用户设置新密码");
                this._terminalLines.push("新密码: ");
                this._passwordMode = true;
                this._passwdState = 'new';
                this._passwdUser = 'root';
                
                // 保持当前的processEnter覆盖
                this.processEnter = this.processPasswdEnter;
            } else if (this._sudoArgs[0] === '-i' || (this._sudoArgs.length > 1 && this._sudoArgs[0] === '-i')) {
                // 处理sudo -i命令，切换到root用户
                this._isRoot = true;
                this._terminalLines.push("已切换到root用户环境");
                
                // 恢复正常命令模式
                this._passwordMode = false;
                this._normalCommandMode = true;
                this.processEnter = this._originalProcessEnter;
                this._currentInput = '';
                this._cursorPosition = 0;
                this._terminalLines.push(this.getPrompt());
            } else if (this._sudoArgs[0] === 'systemctl') {
                // 以root权限执行systemctl命令
                this.handleSystemctl(this._sudoArgs);
                
                // 恢复正常命令模式
                this._passwordMode = false;
                this._normalCommandMode = true;
                this.processEnter = this._originalProcessEnter;
                this._currentInput = '';
                this._cursorPosition = 0;
                this._terminalLines.push(this.getPrompt());
            } else if (this._sudoArgs[0] === 'rm') {
                // 以root权限执行rm命令
                this.handleRm(this._sudoArgs);
                
                // 恢复正常命令模式
                this._passwordMode = false;
                this._normalCommandMode = true;
                this.processEnter = this._originalProcessEnter;
                this._currentInput = '';
                this._cursorPosition = 0;
                this._terminalLines.push(this.getPrompt());
            } else {
                this._terminalLines.push("sudo: " + this._sudoArgs.join(' ') + ": 命令未找到");
                
                // 恢复正常命令模式
                this._passwordMode = false;
                this._normalCommandMode = true;
                this.processEnter = this._originalProcessEnter;
                this._currentInput = '';
                this._cursorPosition = 0;
                this._terminalLines.push(this.getPrompt());
            }
        } else {
            this._terminalLines.push("sudo: 验证失败");
            console.log("Password validation failed.");
            
            // 恢复正常命令模式
            this._passwordMode = false;
            this._normalCommandMode = true;
            this.processEnter = this._originalProcessEnter;
            this._currentInput = '';
            this._cursorPosition = 0;
            this._terminalLines.push(this.getPrompt());
        }
        
        // 清除sudo参数，防止后续命令处理出错
        this._sudoArgs = null;
    };
    
    Scene_LinuxTerminal.prototype.processPasswdEnter = function() {
        console.log("Password Mode: ", this._passwordMode);
        console.log("Passwd State: ", this._passwdState);
        console.log("Current Input: ", this._currentInput);
    
        if (this._passwdState === 'new') {
            // 保存第一次输入的密码
            this._newPassword = this._currentInput;
            this._terminalLines[this._terminalLines.length - 1] = "新密码: " + '*'.repeat(this._currentInput.length);
            this._terminalLines.push("重新输入新密码: ");
            this._currentInput = '';
            this._cursorPosition = 0;
            this._passwdState = 'confirm'; // 切换到确认密码状态
        } else if (this._passwdState === 'confirm') {
            // 验证两次密码是否一致
            var confirmPassword = this._currentInput;
            this._terminalLines[this._terminalLines.length - 1] = "重新输入新密码: " + '*'.repeat(this._currentInput.length);
    
            console.log("New Password: ", this._newPassword);
            console.log("Confirm Password: ", confirmPassword);
    
            if (confirmPassword === this._newPassword) {
                this._terminalLines.push("passwd: 已成功更新密码");
                // 如果是为root用户设置密码，则更新root密码
                if (this._passwdUser === 'root') {
                    this._rootPassword = this._newPassword; // 设置新的root密码
                    console.log("Root password updated to: ", this._newPassword);
                    
                    // 保存root密码到游戏变量
                    $gameVariables.setValue(rootPasswordVarId, this._rootPassword);
                } else if (this._passwdUser === 'guest') {
                    this._guestPassword = this._newPassword; // 设置新的guest密码
                    console.log("Guest password updated to: ", this._newPassword);
                    
                    // 保存guest密码到游戏变量
                    $gameVariables.setValue(guestPasswordVarId, this._guestPassword);
                }
            } else {
                this._terminalLines.push("passwd: 密码不匹配");
                this._terminalLines.push("passwd: 密码未更改");
                console.log("Passwords do not match, update failed.");
            }
    
            // 恢复正常命令模式
            this._passwordMode = false;
            this._normalCommandMode = true;
            this._passwdState = null;
            this._passwdUser = null;
            this.processEnter = this._originalProcessEnter;
            this._currentInput = '';
            this._cursorPosition = 0;
            this._terminalLines.push(this.getPrompt());
        }
    };
    
    // 修改handlePasswd函数
    Scene_LinuxTerminal.prototype.handlePasswd = function(args) {
        var user = args.length > 1 ? args[1] : this._username;
        
        // 如果不是root用户且尝试修改其他用户的密码
        if (!this._isRoot && user !== this._username) {
            this._terminalLines.push("passwd: 权限不足");
            return;
        }
        
        // 开始修改密码流程
        this._terminalLines.push("为 " + user + " 用户设置新密码");
        this._terminalLines.push("新密码: ");
        this._passwordMode = true;
        this._passwdState = 'new';
        this._passwdUser = user;
        
        // 暂存当前命令处理状态
        this._normalCommandMode = false;
        
        // 修改Enter键处理逻辑，临时覆盖
        this._originalProcessEnter = this.processEnter;
        this.processEnter = this.processPasswdEnter;
    };                    
                    
    
    
    Scene_LinuxTerminal.prototype.handleSudo = function(args) {
        if (args.length === 0) {
            this._terminalLines.push("用法: sudo 命令");
            this._terminalLines.push(this.getPrompt());
            return;
        }
        
        // 保存sudo参数以便验证后使用
        this._sudoArgs = args;
        
        // 提示输入密码
        this._terminalLines.push("[sudo] 输入" + this._username + "的密码: ");
        this._passwordMode = true;
        this._normalCommandMode = false;
        
        // 修改Enter键处理逻辑，临时覆盖
        this._originalProcessEnter = this.processEnter;
        this.processEnter = this.processSudoEnter;
        
        // 清空当前输入
        this._currentInput = '';
        this._cursorPosition = 0;
    };
    
    Scene_LinuxTerminal.prototype.handleSu = function(args) {
        // 检查是否使用了 su - 格式
        var dashOption = false;
        if (args.length > 1 && args[1] === '-') {
            dashOption = true;
            args.splice(1, 1); // 移除 '-' 参数
        }
        
        var user = args.length > 1 ? args[1] : 'root';
        
        // 如果已经是root用户
        if (this._isRoot && user === 'root') {
            this._terminalLines.push("已经是root用户");
            return;
        }
        
        // 需要验证密码
        if (!this._rootPassword) {
            this._terminalLines.push("su: 验证失败");
            return;
        }
        
        this._terminalLines.push("输入" + user + "的密码: ");
        this._passwordMode = true;
        this._suUser = user;
        this._suDashOption = dashOption;
        
        // 暂存当前命令处理状态
        this._normalCommandMode = false;
        
        // 修改Enter键处理逻辑，临时覆盖
        this._originalProcessEnter = this.processEnter;
        this.processEnter = this.processSuEnter;
    };
    
    Scene_LinuxTerminal.prototype.processSuEnter = function() {
        var password = this._currentInput;
        this._terminalLines[this._terminalLines.length - 1] = "密码: " + '*'.repeat(password.length);
        
        if (this._suUser === 'root') {
            // 验证密码
            if (password === this._rootPassword) {
                this._isRoot = true;
                if (this._suDashOption) {
                    this._terminalLines.push("已切换到root用户环境");
                }
            } else {
                this._terminalLines.push("su: 验证失败");
            }
        } else {
            this._terminalLines.push("su: 用户 '" + this._suUser + "' 不存在");
        }
        
        // 恢复正常命令模式
        this._passwordMode = false;
        this._normalCommandMode = true;
        this.processEnter = this._originalProcessEnter;
        this._currentInput = '';
        this._cursorPosition = 0;
        this._terminalLines.push(this.getPrompt());
    };
    
    // 此处不需要重复的handleRm函数实现，已在前面定义


// 确保puzzleCompleted函数存在
Scene_LinuxTerminal.prototype.puzzleCompleted = function() {
    this._terminalLines.push("");
    this._terminalLines.push("警告！您已关闭安全系统。");
    this._terminalLines.push("按ESC键退出终端。");
    
    // 设置成功开关
    $gameSwitches.setValue(successSwitchId, true);
};
    
    //==========================================================================
    // Window_Terminal
    //==========================================================================
    function Window_Terminal() {
        this.initialize.apply(this, arguments);
    }
    
    Window_Terminal.prototype = Object.create(Window_Base.prototype);
    Window_Terminal.prototype.constructor = Window_Terminal;
    
    Window_Terminal.prototype.initialize = function() {
        var keyboardHeight = 180; // 与键盘高度保持一致
        var width = Graphics.boxWidth;
        var height = Graphics.boxHeight - keyboardHeight;
        Window_Base.prototype.initialize.call(this, 0, 0, width, height);
        this.opacity = 0;
        this.backOpacity = 0;
        this.contentsOpacity = 255;
        this._blinkTimer = 0;
        this._cursorVisible = true;
    };
    
    Window_Terminal.prototype.standardPadding = function() {
        return 12;
    };
    
    Window_Terminal.prototype.lineHeight = function() {
        return fontSize + 4;
    };
    
    Window_Terminal.prototype.refresh = function(lines, currentInput, cursorPosition, passwordMode) {
        this.contents.clear();
        this.resetFontSettings();
        this.contents.fontSize = fontSize;
        this.contents.textColor = textColor;
        
        var y = 0;
        var maxLines = Math.floor((this.contentsHeight() - this.lineHeight()) / this.lineHeight());
        
        // 如果行数超过最大显示行数，只显示最后的行
        var startLine = Math.max(0, lines.length - maxLines);
        
        for (var i = startLine; i < lines.length; i++) {
            var line = lines[i];
            this.drawText(line, 0, y, this.contentsWidth());
            y += this.lineHeight();
        }
        
        // 绘制当前输入
        var displayInput = passwordMode ? '*'.repeat(currentInput.length) : currentInput;
        
        // 计算输入位置
        var lastLine = lines[lines.length - 1];
        var inputX = 0;
        
        if (lastLine.includes(":")) {
            inputX = this.textWidth(lastLine);
        } else if (lastLine.includes("@")) {
            inputX = this.textWidth(lastLine);
        }
        
        // 直接在最后一行后面绘制当前输入
        this.drawText(displayInput, inputX, y - this.lineHeight(), this.contentsWidth() - inputX);
        
        // 计算光标位置
        var beforeCursor = passwordMode ? '*'.repeat(cursorPosition) : displayInput.substring(0, cursorPosition);
        var cursorX = inputX + this.textWidth(beforeCursor);
        
        // 绘制光标
        if (this._cursorVisible) {
            this.contents.fillRect(cursorX, y - this.lineHeight(), 2, this.lineHeight(), textColor);
        }
    };
    
    Window_Terminal.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        
        // 更新光标闪烁
        this._blinkTimer++;
        if (this._blinkTimer >= 30) {
            this._cursorVisible = !this._cursorVisible;
            this._blinkTimer = 0;
        }
    };
    
    //==========================================================================
    // Window_VirtualKeyboard
    //==========================================================================
    function Window_VirtualKeyboard() {
        this.initialize.apply(this, arguments);
    }
    
    Window_VirtualKeyboard.prototype = Object.create(Window_Selectable.prototype);
    Window_VirtualKeyboard.prototype.constructor = Window_VirtualKeyboard;
    
    Window_VirtualKeyboard.prototype.initialize = function() {
        var keyboardHeight = 180; // 减小键盘高度
        var width = Graphics.boxWidth;
        var y = Graphics.boxHeight - keyboardHeight;
        Window_Selectable.prototype.initialize.call(this, 0, y, width, keyboardHeight);
        this.opacity = 200;
        this.backOpacity = 200;
        this._handlers = {};
        this._keys = this.generateKeys();
        this._index = 0;
        this.refresh();
        this.activate();
        this.select(0);
    };
    
    Window_VirtualKeyboard.prototype.generateKeys = function() {
        var keys = [];
        
        // 第一行：数字键
        var row1 = ['1','2','3','4','5','6','7','8','9','0','-','='];
        keys = keys.concat(row1);
        
        // 第二行：字母 (q-p)
        var row2 = ['q','w','e','r','t','y','u','i','o','p','@','*'];
        keys = keys.concat(row2);
        
        // 第三行：字母 (a-l)
        var row3 = ['a','s','d','f','g','h','j','k','l',';','Enter'];
        keys = keys.concat(row3);
        
        // 第四行：字母 (z-m) 和特殊键
        var row4 = ['z','x','c','v','b','n','m',',','.','/','_'];
        keys = keys.concat(row4);
        
        // 第五行：空格和其他功能键
        var row5 = ['Backspace','Space','Escape'];
        keys = keys.concat(row5);
        
        return keys;
    };
    
    Window_VirtualKeyboard.prototype.maxCols = function() {
        return 12; // 每行最多12个按键
    };
    
    Window_VirtualKeyboard.prototype.maxItems = function() {
        return this._keys ? this._keys.length : 0;
    };
    
    Window_VirtualKeyboard.prototype.itemWidth = function() {
        return Math.floor((this.width - this.padding * 2) / this.maxCols()) - 4; // 进一步减小按键宽度
    };
    
    Window_VirtualKeyboard.prototype.itemHeight = function() {
        return 26; // 减小按键高度
    };
    
    Window_VirtualKeyboard.prototype.spacing = function() {
        return 2; // 减小按键间距
    };
    
    Window_VirtualKeyboard.prototype.drawItem = function(index) {
        var rect = this.itemRect(index);
        var key = this._keys[index];
        this.resetTextColor();
        this.contents.fontSize = Math.min(fontSize, 14); // 减小字体大小
        this.drawText(key, rect.x, rect.y, rect.width, 'center');
    };
    
    Window_VirtualKeyboard.prototype.update = function() {
        Window_Selectable.prototype.update.call(this);
        
        // 使用标志防止一次更新中多次处理输入
        if (!this._processingInput) {
            this._processingInput = true;
            this.processHandling();
            this._processingInput = false;
        }
    };
    
    Window_VirtualKeyboard.prototype.processHandling = function() {
        if (this.isOpenAndActive()) {
            // 处理键盘输入
            if (Input.isTriggered('ok')) {
                this.processOk();
                return;
            }
            
            // 处理触摸输入，但确保与键盘输入不重复
            if (TouchInput.isTriggered() && this.isTouchedInsideFrame()) {
                var lastIndex = this.index();
                var x = this.canvasToLocalX(TouchInput.x);
                var y = this.canvasToLocalY(TouchInput.y);
                var hitIndex = this.hitTest(x, y);
                
                if (hitIndex >= 0) {
                    if (hitIndex !== lastIndex) {
                        this.select(hitIndex);
                        SoundManager.playCursor();
                    } else {
                        // 只有当索引没有变化时才处理确认
                        this.processOk();
                    }
                }
                return;
            }
        }
    };
    
    Window_VirtualKeyboard.prototype.processOk = function() {
        if (this.index() >= 0) {
            var key = this._keys[this.index()];
            this.playOkSound();
            this.callHandler('keyInput', key);
        }
    };
    
    Window_VirtualKeyboard.prototype.setHandler = function(symbol, method) {
        this._handlers[symbol] = method;
    };
    
    Window_VirtualKeyboard.prototype.callHandler = function(symbol, key) {
        if (this.isHandled(symbol)) {
            this._handlers[symbol](key);
        }
    };
    
    Window_VirtualKeyboard.prototype.isHandled = function(symbol) {
        return !!this._handlers[symbol];
    };
    
    Window_VirtualKeyboard.prototype.cursorDown = function(wrap) {
        var index = this.index();
        var maxItems = this.maxItems();
        var maxCols = this.maxCols();
        if (index < maxItems - maxCols || wrap) {
            this.select((index + maxCols) % maxItems);
        }
    };
    
    Window_VirtualKeyboard.prototype.cursorUp = function(wrap) {
        var index = this.index();
        var maxItems = this.maxItems();
        var maxCols = this.maxCols();
        if (index >= maxCols || wrap) {
            this.select((index - maxCols + maxItems) % maxItems);
        }
    };
    
    Window_VirtualKeyboard.prototype.cursorRight = function(wrap) {
        var index = this.index();
        var maxItems = this.maxItems();
        var maxCols = this.maxCols();
        var col = index % maxCols;
        if (col < maxCols - 1 || wrap) {
            this.select(Math.min(index - col + ((col + 1) % maxCols), maxItems - 1));
        }
    };
    
    Window_VirtualKeyboard.prototype.cursorLeft = function(wrap) {
        var index = this.index();
        var maxCols = this.maxCols();
        var col = index % maxCols;
        if (col > 0 || wrap) {
            this.select(index - col + (col - 1 + maxCols) % maxCols);
        }
    };
    
})();

// 添加executeSudoCommand函数实现
Scene_LinuxTerminal.prototype.executeSudoCommand = function(args) {
    if (args.length === 0) return;
    
    var cmd = args[0].toLowerCase();
    
    if (cmd === '-i' || (args.length > 1 && args[0] === '-i')) {
        // 处理sudo -i命令，切换到root用户
        this._isRoot = true;
        this._terminalLines.push("已切换到root用户环境");
    } else if (cmd === 'systemctl') {
        // 以root权限执行systemctl命令
        this.handleSystemctl(args.slice(1));
    } else if (cmd === 'passwd') {
        // 以root权限执行passwd命令
        this.handlePasswd(args);
    } else if (cmd === 'rm') {
        // 以root权限执行rm命令
        this.handleRm(args);
    } else {
        this._terminalLines.push("sudo: " + args.join(' ') + ": 命令未找到");
    }
};