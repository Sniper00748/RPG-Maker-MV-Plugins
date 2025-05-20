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

(function() {
    
    var parameters = PluginManager.parameters('CyberHackingPuzzle');
    var gridSize = Number(parameters['GridSize'] || 6);
    var timeLimit = Number(parameters['TimeLimit'] || 30);
    var bufferSize = Number(parameters['BufferSize'] || 8);
    
    //===========================================================================
    // * 黑客入侵谜题场景
    //===========================================================================
    
    function Scene_CyberHacking() {
        this.initialize.apply(this, arguments);
    }
    
    Scene_CyberHacking.prototype = Object.create(Scene_Base.prototype);
    Scene_CyberHacking.prototype.constructor = Scene_CyberHacking;
    
    Scene_CyberHacking.prototype.initialize = function() {
        Scene_Base.prototype.initialize.call(this);
        this.createVariables();
    };
    
    Scene_CyberHacking.prototype.createVariables = function() {
        this.codeMatrix = [];        // 代码矩阵
        this.targetSequences = [];   // 目标序列数组，每个元素是一个序列
        this.matchStatus = [];       // 每个序列当前匹配的位置
        this.currentAxis = null;     // 当前选择轴(row/column)
        this.currentPosition = null; // 当前选择位置{x, y}
        this.timeRemaining = timeLimit; // 剩余时间
        this.timerStarted = false;   // 计时器是否已开始
        this.cellWidth = 80;         // 单元格宽度
        this.cellHeight = 80;        // 单元格高度
        this.success = false;        // 是否成功
        this.bufferUsed = 0;         // 已使用的缓存
        this.playerSelections = [];  // 玩家已选择的位置
        this.possibleCodes = [];     // 可用代码，将动态生成
        this.optimalPath = [];       // 最优路径
        this._puzzleEnded = false;   // 新增：标记谜题是否已结束（成功或失败）
    };
    
    Scene_CyberHacking.prototype.create = function() {
        Scene_Base.prototype.create.call(this);
        this.createBackground();
        this.generatePossibleCodes();
        this.initializeMatrix();
        this.ensureOptimalSolution();
        this.createMatrixSprites();
        this.createTargetDisplay();
        this.createTimerDisplay();
        this.createBufferDisplay();
        this.createInstructions();
        
        // 播放背景音效
        AudioManager.playBgs({name: 'BreachProtocol', pan: 0, pitch: 100, volume: 100});
    };
    
    Scene_CyberHacking.prototype.generatePossibleCodes = function() {
        // 生成6-8个可能的代码
        var codeCount = 6 + Math.floor(Math.random() * 3);
        var codeTypes = ['1C', 'BD', '55', 'E9', '7A', 'FF', 'A1', 'C3', 'D4', 'E2', 'F7', '0B'];
        
        // 随机选择不重复的代码
        this.possibleCodes = [];
        while(this.possibleCodes.length < codeCount) {
            var code = codeTypes[Math.floor(Math.random() * codeTypes.length)];
            if (this.possibleCodes.indexOf(code) === -1) {
                this.possibleCodes.push(code);
            }
        }
    };
    
    Scene_CyberHacking.prototype.createBackground = function() {
        this._backgroundSprite = new Sprite();
        this._backgroundSprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
        this._backgroundSprite.bitmap.fillAll('#1A1A1A');
        this.addChild(this._backgroundSprite);
        
        // 添加标题
        var titleSprite = new Sprite();
        titleSprite.bitmap = new Bitmap(Graphics.width, 60);
        titleSprite.bitmap.fontSize = 24;
        titleSprite.bitmap.textColor = '#FFCC00';
        titleSprite.bitmap.drawText('网络安全入侵系统', 0, 0, Graphics.width, 60, 'center');
        titleSprite.y = 10;
        this.addChild(titleSprite);
    };
    
    Scene_CyberHacking.prototype.initializeMatrix = function() {
        // 生成随机代码矩阵
        for (var i = 0; i < gridSize; i++) {
            this.codeMatrix[i] = [];
            for (var j = 0; j < gridSize; j++) {
                this.codeMatrix[i][j] = this.possibleCodes[Math.floor(Math.random() * this.possibleCodes.length)];
            }
        }
        
        // 先不生成目标序列，等确保有最优解后再生成
    };
    
    // 确保存在6步完成的最优解
    Scene_CyberHacking.prototype.ensureOptimalSolution = function() {
        // 设计一条6步的最优路径
        this.designOptimalPath();
        
        // 基于最优路径生成目标序列
        this.generateTargetSequences();
    };
    
    Scene_CyberHacking.prototype.designOptimalPath = function() {
        // 步骤1：选择起点(必须在第一行)
        var startX = Math.floor(Math.random() * gridSize);
        this.optimalPath = [{x: startX, y: 0}];
        
        // 步骤2-6：交替行列生成路径
        var currentX = startX;
        var currentY = 0;
        var currentAxis = 'row'; // 从行开始
        
        for (var step = 1; step < 6; step++) {
            // 交替轴
            currentAxis = (currentAxis === 'row') ? 'column' : 'row';
            
            if (currentAxis === 'column') {
                // 在同一列选择不同行
                var newY;
                do {
                    newY = Math.floor(Math.random() * gridSize);
                } while (newY === currentY);
                
                currentY = newY;
                this.optimalPath.push({x: currentX, y: currentY});
            } else {
                // 在同一行选择不同列
                var newX;
                do {
                    newX = Math.floor(Math.random() * gridSize);
                } while (newX === currentX);
                
                currentX = newX;
                this.optimalPath.push({x: currentX, y: currentY});
            }
        }
        
        // 确保路径上的代码是有用的
        for (var i = 0; i < this.optimalPath.length; i++) {
            var pos = this.optimalPath[i];
            // 为路径上的每个位置设置一个固定代码
            this.codeMatrix[pos.y][pos.x] = this.possibleCodes[i % this.possibleCodes.length];
        }
    };
    
    Scene_CyberHacking.prototype.generateTargetSequences = function() {
        // 从最优路径生成目标序列
        // 我们会创建几个重叠的序列，确保按顺序完成它们可以走完最优路径
        
        this.targetSequences = [];
        this.matchStatus = [];
        
        // 例如，对于6步路径，我们可以创建3个2步序列或2个3步序列
        var sequenceScheme;
        var rand = Math.random();
        if (rand < 0.33) {
            sequenceScheme = [2, 2, 2]; // 3个2步序列
        } else if (rand < 0.66) {
            sequenceScheme = [3, 3];    // 2个3步序列
        } else {
            sequenceScheme = [2, 4];    // 1个2步和1个4步序列
        }
        
        var pathIndex = 0;
        for (var i = 0; i < sequenceScheme.length; i++) {
            var seqLength = sequenceScheme[i];
            var sequence = [];
            
            for (var j = 0; j < seqLength; j++) {
                if (pathIndex < this.optimalPath.length) {
                    var pos = this.optimalPath[pathIndex];
                    sequence.push(this.codeMatrix[pos.y][pos.x]);
                    pathIndex++;
                }
            }
            
            this.targetSequences.push(sequence);
            this.matchStatus.push(0);
        }
    };
    
    Scene_CyberHacking.prototype.createMatrixSprites = function() {
        this._matrixContainer = new Sprite();
        this._matrixContainer.x = 50;
        this._matrixContainer.y = 150;
        this.addChild(this._matrixContainer);
        
        // 添加矩阵标题
        var matrixTitle = new Sprite();
        matrixTitle.bitmap = new Bitmap(gridSize * this.cellWidth, 30);
        matrixTitle.bitmap.fontSize = 24;
        matrixTitle.bitmap.textColor = '#FFCC00';
        matrixTitle.bitmap.drawText('数位板矩阵', 0, 0, gridSize * this.cellWidth, 30, 'center');
        matrixTitle.y = -40;
        this._matrixContainer.addChild(matrixTitle);
        
        // 创建矩阵单元格
        this._matrixSprites = [];
        for (var i = 0; i < gridSize; i++) {
            this._matrixSprites[i] = [];
            for (var j = 0; j < gridSize; j++) {
                var sprite = new Sprite();
                sprite.bitmap = new Bitmap(this.cellWidth - 10, this.cellHeight - 10);
                sprite.bitmap.fillAll('#003322'); // 改为绿色系
                sprite.bitmap.textColor = '#FFFFFF';
                sprite.bitmap.drawText(this.codeMatrix[i][j], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
                sprite.x = j * this.cellWidth;
                sprite.y = i * this.cellHeight;
                sprite.data = {x: j, y: i};
                this._matrixContainer.addChild(sprite);
                this._matrixSprites[i][j] = sprite;
            }
        }
        
        // 第一行特别高亮，但不添加"从第一行开始"的提示文字
        for (var j = 0; j < gridSize; j++) {
            var firstRowSprite = this._matrixSprites[0][j];
            firstRowSprite.bitmap.clear();
            firstRowSprite.bitmap.fillAll('#004422'); // 改为绿色系
            firstRowSprite.bitmap.textColor = '#AAFFAA'; // 改为绿色系
            firstRowSprite.bitmap.drawText(this.codeMatrix[0][j], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
        }
    };
    
    Scene_CyberHacking.prototype.createTargetDisplay = function() {
        this._targetContainer = new Sprite();
        this._targetContainer.x = Graphics.width - 250;
        this._targetContainer.y = 150;
        this.addChild(this._targetContainer);
        
        // 添加目标标题
        var title = new Sprite();
        title.bitmap = new Bitmap(250, 40);
        title.bitmap.fontSize = 24;
        title.bitmap.textColor = '#FFCC00';
        title.bitmap.drawText('上传所需序列', 0, 0, 250, 40, 'left'); // 改为左对齐
        this._targetContainer.addChild(title);
        
        // 创建序列显示
        this._targetSprites = [];
        this._progressSprites = [];
        
        for (var i = 0; i < this.targetSequences.length; i++) {
            // 序列容器
            var seqContainer = new Sprite();
            seqContainer.y = 50 + i * 60;
            this._targetContainer.addChild(seqContainer);
            
            // 序列内容 - 直接从左侧开始显示，与标题左对齐
            var sequenceSprite = new Sprite();
            sequenceSprite.bitmap = new Bitmap(200, 30);
            sequenceSprite.x = 0; // 从左侧开始
            
            // 绘制序列代码，每个代码用不同颜色
            for (var j = 0; j < this.targetSequences[i].length; j++) {
                var code = this.targetSequences[i][j];
                sequenceSprite.bitmap.textColor = j === 0 ? '#FFFF00' : '#888888';
                sequenceSprite.bitmap.drawText(code, j * 40, 0, 40, 30, 'center');
            }
            
            seqContainer.addChild(sequenceSprite);
            this._targetSprites.push(sequenceSprite);
            
            // 进度指示器 - 同样从左侧开始
            var progressSprite = new Sprite();
            progressSprite.bitmap = new Bitmap(this.targetSequences[i].length * 40, 5);
            progressSprite.bitmap.fillRect(0, 0, 40, 5, '#00FF00');
            progressSprite.x = 0; // 从左侧开始，与序列内容对齐
            progressSprite.y = 25;
            seqContainer.addChild(progressSprite);
            this._progressSprites.push(progressSprite);
        }
    };
    
    Scene_CyberHacking.prototype.createTimerDisplay = function() {
        this._timerSprite = new Sprite();
        this._timerSprite.bitmap = new Bitmap(200, 40);
        this._timerSprite.x = 50;
        this._timerSprite.y = 80;
        this.addChild(this._timerSprite);
        this.updateTimerDisplay();
    };
    
    Scene_CyberHacking.prototype.updateTimerDisplay = function() {
        this._timerSprite.bitmap.clear();
        
        // 无论是否已开始，都只显示时间
        var timeColor = '#FFFFFF';
        if (this.timeRemaining < 10) timeColor = '#FF5555';
        if (this.timeRemaining < 5) timeColor = '#FF0000';
        
        this._timerSprite.bitmap.textColor = timeColor;
        this._timerSprite.bitmap.fontSize = 24; 
        this._timerSprite.bitmap.drawText('时间: ' + Math.max(0, this.timeRemaining).toFixed(1) + '秒', 0, 0, 200, 40, 'left');
    };
    
    Scene_CyberHacking.prototype.createBufferDisplay = function() {
        // 将缓存空间放到上传所需序列下面
        this._bufferContainer = new Sprite();
        this._bufferContainer.x = Graphics.width - 250; // 与上传所需序列相同的x坐标
        
        // 计算y坐标，放在上传所需序列下面
        // 上传所需序列的y坐标是150，每个序列高度约60，根据序列数量计算
        var sequencesHeight = 50 + (this.targetSequences.length * 60);
        this._bufferContainer.y = 150 + sequencesHeight + 20; // 额外加20作为间距
        
        this.addChild(this._bufferContainer);
        
        // 缓存标题
        var bufferTitle = new Sprite();
        bufferTitle.bitmap = new Bitmap(150, 40);
        bufferTitle.bitmap.fontSize = 24; 
        bufferTitle.bitmap.textColor = '#FFCC00';
        bufferTitle.bitmap.drawText('缓存空间:', 0, 0, 150, 40, 'left');
        this._bufferContainer.addChild(bufferTitle);
        
        // 缓存槽 - 支持换行显示
        this._bufferSlots = [];
        var slotWidth = 20;
        var slotHeight = 20;
        var slotSpacing = 5;
        var maxSlotsPerRow = 8; // 每行最多显示的槽数
        var containerWidth = 200; // 容器宽度
        
        for (var i = 0; i < bufferSize; i++) {
            var slot = new Sprite();
            slot.bitmap = new Bitmap(slotWidth, slotHeight);
            slot.bitmap.fillAll('#00AA00');
            
            // 计算行和列位置
            var row = Math.floor(i / maxSlotsPerRow);
            var col = i % maxSlotsPerRow;
            
            slot.x = col * (slotWidth + slotSpacing);
            slot.y = 40 + row * (slotHeight + slotSpacing); // 从标题下方40像素开始
            
            this._bufferContainer.addChild(slot);
            this._bufferSlots.push(slot);
        }
    };
    
    Scene_CyberHacking.prototype.updateBufferDisplay = function() {
        for (var i = 0; i < bufferSize; i++) {
            this._bufferSlots[i].bitmap.clear();
            if (i < this.bufferUsed) {
                this._bufferSlots[i].bitmap.fillAll('#555555');
            } else {
                this._bufferSlots[i].bitmap.fillAll('#00AA00');
            }
        }
    };
    
    Scene_CyberHacking.prototype.createInstructions = function() {
        // 不创建任何说明文字
    };
    
    Scene_CyberHacking.prototype.update = function() {
        Scene_Base.prototype.update.call(this);
        
        // 只有在开始选择后才计时
        if (this.timerStarted && this.timeRemaining > 0) {
            this.timeRemaining -= 1/60;
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.puzzleFailed("时间用尽");
            }
        }
        
        this.updateTimerDisplay();
        
        // 处理输入 - 添加失败或成功状态检查，防止继续交互
        if (TouchInput.isTriggered() && !this.success && this.timeRemaining > 0 && !this._puzzleEnded) {
            var localX = TouchInput.x - this._matrixContainer.x;
            var localY = TouchInput.y - this._matrixContainer.y;
            
            var gridX = Math.floor(localX / this.cellWidth);
            var gridY = Math.floor(localY / this.cellHeight);
            
            // 检查是否在矩阵内
            if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
                this.processSelection(gridX, gridY);
            }
        }
        
        // ESC键退出
        if (Input.isTriggered('cancel') && !this._puzzleEnded) {
            // 立即停止倒计时
            this.timerStarted = false;
            this.puzzleFailed("用户取消");
        }
    };
    
    Scene_CyberHacking.prototype.processSelection = function(x, y) {
        // 检查是否需要使用新的缓存
        if (this.bufferUsed >= bufferSize) {
            this.puzzleFailed("缓存已用完");
            return;
        }
        
        // 检查是否已经选择过该位置
        if (this.isPositionSelected(x, y)) {
            // 已选择过的位置不能再次选择
            return;
        }
        
        // 如果是第一次选择或没有当前位置
        if (!this.currentPosition) {
            // 第一次选择必须在第一行
            if (y !== 0) {
                this.flashInvalidSelection(x, y);
                return;
            }
            
            // 第一次选择，开始计时
            this.timerStarted = true;
            
            this.currentPosition = {x: x, y: y};
            this.currentAxis = 'row';
            this.selectCode(x, y);
            this.highlightValidSelections();
            return;
        }
        
        // 验证行/列交替规则
        var isValid = false;
        if (this.currentAxis === 'row') {
            // 当前在行，下一个必须在同一列但不同行
            isValid = (x === this.currentPosition.x && y !== this.currentPosition.y);
        } else {
            // 当前在列，下一个必须在同一行但不同列
            isValid = (y === this.currentPosition.y && x !== this.currentPosition.x);
        }
        
        if (!isValid) {
            this.flashInvalidSelection(x, y);
            return;
        }
        
        // 选择有效
        this.currentPosition = {x: x, y: y};
        this.currentAxis = (this.currentAxis === 'row') ? 'column' : 'row';
        this.selectCode(x, y);
        this.highlightValidSelections();
    };
    
    // 添加新函数：检查位置是否已被选择
    Scene_CyberHacking.prototype.isPositionSelected = function(x, y) {
        for (var i = 0; i < this.playerSelections.length; i++) {
            var selection = this.playerSelections[i];
            if (selection.x === x && selection.y === y) {
                return true;
            }
        }
        return false;
    };
    
    Scene_CyberHacking.prototype.selectCode = function(x, y) {
        var selectedCode = this.codeMatrix[y][x];
        
        // 使用缓存
        this.bufferUsed++;
        this.updateBufferDisplay();
        
        // 记录选择
        this.playerSelections.push({x: x, y: y, code: selectedCode});
        
        // 高亮显示选中的代码
        this.highlightSelected(x, y);
        AudioManager.playSe({name: 'Press', pan: 0, pitch: 100, volume: 90});
        
        // 检查是否匹配目标序列
        this.checkSequenceMatches(selectedCode);
    };
    
    Scene_CyberHacking.prototype.highlightSelected = function(x, y) {
        // 高亮显示选中的单元格
        var sprite = this._matrixSprites[y][x];
        sprite.bitmap.clear();
        sprite.bitmap.fillAll('#00AA00'); // 选中的显示为亮绿色
        sprite.bitmap.textColor = '#FFFFFF';
        sprite.bitmap.drawText(this.codeMatrix[y][x], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
        
        // 标记为已选择（变暗/变灰）
        setTimeout(function() {
            sprite.bitmap.clear();
            sprite.bitmap.fillAll('#333333'); // 变暗/变灰
            sprite.bitmap.textColor = '#777777'; // 文字也变灰
            sprite.bitmap.drawText(this.codeMatrix[y][x], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
        }.bind(this), 300); // 短暂显示选中效果后变灰
    };
    
    Scene_CyberHacking.prototype.checkSequenceMatches = function(selectedCode) {
        var allCompleted = true;
        
        for (var i = 0; i < this.targetSequences.length; i++) {
            // 跳过已完成的序列
            if (this.matchStatus[i] === -1) continue;
            
            var sequence = this.targetSequences[i];
            var currentPosition = this.matchStatus[i];
            
            if (currentPosition < sequence.length) {
                allCompleted = false;
                
                // 检查当前代码是否匹配当前位置
                if (selectedCode === sequence[currentPosition]) {
                    // 匹配成功，更新进度
                    this.matchStatus[i]++;
                    this.updateSequenceDisplay(i);
                    
                    // 检查序列是否完成
                    if (this.matchStatus[i] >= sequence.length) {
                        this.completeSequence(i);
                    }
                } 
                // 特殊情况2: 选择的等于第一个位置的代码
                else if (selectedCode === sequence[0]) {
                    // 重置到第一位之后
                    this.matchStatus[i] = 1;
                    this.updateSequenceDisplay(i);
                }
                // 特殊情况: 选择的等于上一个位置的代码
                else if (currentPosition > 0 && selectedCode === sequence[currentPosition - 1]) {
                    // 保持当前状态
                }
                // 不匹配，重置该序列
                else {
                    this.matchStatus[i] = 0;
                    this.updateSequenceDisplay(i);
                }
            }
        }
        
        // 检查是否所有序列都已完成
        var allSequencesCompleted = true;
        for (var i = 0; i < this.matchStatus.length; i++) {
            if (this.matchStatus[i] !== -1) {
                allSequencesCompleted = false;
                break;
            }
        }
        
        if (allSequencesCompleted) {
            this.puzzleComplete();
            return; // 确保完成后不再检查缓存
        }
        
        // 检查缓存是否用完
        if (this.bufferUsed >= bufferSize && !allSequencesCompleted) {
            this.timerStarted = false; // 立即停止倒计时
            this.puzzleFailed("缓存已用完");
        }
    };
    
    Scene_CyberHacking.prototype.updateSequenceDisplay = function(index) {
        var sequence = this.targetSequences[index];
        var progress = this.matchStatus[index];
        
        // 更新序列的颜色显示
        var sequenceSprite = this._targetSprites[index];
        sequenceSprite.bitmap.clear();
        
        for (var j = 0; j < sequence.length; j++) {
            var code = sequence[j];
            
            // 已匹配的显示绿色，当前位置显示黄色，未匹配显示灰色
            if (j < progress) {
                sequenceSprite.bitmap.textColor = '#00FF00'; // 已匹配
            } else if (j === progress) {
                sequenceSprite.bitmap.textColor = '#FFFF00'; // 当前位置
            } else {
                sequenceSprite.bitmap.textColor = '#888888'; // 未匹配
            }
            
            sequenceSprite.bitmap.drawText(code, j * 40, 0, 40, 30, 'center');
        }
        
        // 更新进度条
        var progressSprite = this._progressSprites[index];
        progressSprite.bitmap.clear();
        for (var j = 0; j < sequence.length; j++) {
            var color = j < progress ? '#00FF00' : '#333333';
            progressSprite.bitmap.fillRect(j * 40, 0, 40, 5, color);
        }
    };
    
    Scene_CyberHacking.prototype.completeSequence = function(index) {
        // 标记序列为已完成
        this.matchStatus[index] = -1;
        
        // 播放完成音效
        AudioManager.playSe({name: 'Pass', pan: 0, pitch: 100, volume: 90});
        
        // 高亮显示完成的序列
        var sequenceSprite = this._targetSprites[index];
        sequenceSprite.bitmap.clear();
        
        for (var j = 0; j < this.targetSequences[index].length; j++) {
            var code = this.targetSequences[index][j];
            sequenceSprite.bitmap.textColor = '#00FF00'; // 全部显示为绿色
            sequenceSprite.bitmap.drawText(code, j * 40, 0, 40, 30, 'center');
        }
        
        // 进度条全部填充
        var progressSprite = this._progressSprites[index];
        progressSprite.bitmap.clear();
        progressSprite.bitmap.fillRect(0, 0, this.targetSequences[index].length * 40, 5, '#00FF00');
    };
    
    Scene_CyberHacking.prototype.puzzleComplete = function() {
        this.success = true;
        this.timerStarted = false; // 停止计时器
        this._puzzleEnded = true;  // 标记谜题已结束
        
        // 停止背景音效
        AudioManager.stopBgs();
        
        // 播放成功音效（使用已知存在的音效）
        AudioManager.playSe({name: 'Pass', pan: 0, pitch: 100, volume: 90});
        
        // 添加半透明绿色底纹
        var backgroundSprite = new Sprite();
        backgroundSprite.bitmap = new Bitmap(Graphics.width, 80); // 高度比文字大一些
        backgroundSprite.bitmap.fillRect(0, 0, Graphics.width, 80, 'rgba(0, 128, 0, 0.3)'); // 半透明绿色
        backgroundSprite.y = Graphics.height / 2 - 40; // 位置调整，使文字居中
        this.addChild(backgroundSprite);
        
        // 显示成功消息
        var successSprite = new Sprite();
        successSprite.bitmap = new Bitmap(Graphics.width, 60);
        successSprite.bitmap.fontSize = 30;
        successSprite.bitmap.textColor = '#00FF00';
        successSprite.bitmap.drawText('入侵成功！', 0, 0, Graphics.width, 60, 'center');
        successSprite.y = Graphics.height / 2 - 30;
        this.addChild(successSprite);
        
        // 设置游戏开关，表示成功
        $gameSwitches.setValue(4, true);
        
        // 延迟返回地图
        setTimeout(function() {
            SceneManager.pop();
        }, 2000);
    };
    
    Scene_CyberHacking.prototype.puzzleFailed = function(reason) {
        // 如果已经成功，则不执行失败逻辑
        if (this.success) return;
        
        this._puzzleEnded = true;  // 标记谜题已结束
        
        // 停止背景音效
        AudioManager.stopBgs();
        
        // 播放失败音效
        AudioManager.playSe({name: 'Buzzer1', pan: 0, pitch: 100, volume: 90});
        
        // 添加半透明红色底纹
        var backgroundSprite = new Sprite();
        backgroundSprite.bitmap = new Bitmap(Graphics.width, 80); // 高度与成功消息底纹一致
        backgroundSprite.bitmap.fillRect(0, 0, Graphics.width, 80, 'rgba(128, 0, 0, 0.3)'); // 半透明红色
        backgroundSprite.y = Graphics.height / 2 - 40; // 位置调整，使文字居中
        this.addChild(backgroundSprite);
        
        // 显示失败消息
        var failSprite = new Sprite();
        failSprite.bitmap = new Bitmap(Graphics.width, 60);
        failSprite.bitmap.fontSize = 30;
        failSprite.bitmap.textColor = '#FF0000';
        failSprite.bitmap.drawText('入侵失败: ' + reason, 0, 0, Graphics.width, 60, 'center');
        failSprite.y = Graphics.height / 2 - 30;
        this.addChild(failSprite);
        
        // 设置游戏开关，表示失败
        $gameSwitches.setValue(4, false);
        
        // 延迟返回地图
        setTimeout(function() {
            SceneManager.pop();
        }, 2000);
    };
    
    Scene_CyberHacking.prototype.highlightValidSelections = function() {
        // 重置所有单元格（除了已选择的）
        for (var i = 0; i < gridSize; i++) {
            for (var j = 0; j < gridSize; j++) {
                // 跳过已选择的位置
                if (this.isPositionSelected(j, i)) continue;
                
                // 修改这里：只有在没有当前位置时才特殊高亮第一行
                // 如果已经选择了第一个位置，则第一行应该恢复正常颜色
                if (i === 0 && !this.currentPosition) {
                    // 第一行特殊高亮（仅在游戏开始时）
                    var firstRowSprite = this._matrixSprites[0][j];
                    firstRowSprite.bitmap.clear();
                    firstRowSprite.bitmap.fillAll('#004422');
                    firstRowSprite.bitmap.textColor = '#AAFFAA';
                    firstRowSprite.bitmap.drawText(this.codeMatrix[0][j], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
                } else {
                    var sprite = this._matrixSprites[i][j];
                    sprite.bitmap.clear();
                    sprite.bitmap.fillAll('#003322');
                    sprite.bitmap.textColor = '#FFFFFF';
                    sprite.bitmap.drawText(this.codeMatrix[i][j], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
                }
            }
        }
        
        // 如果有当前位置，高亮有效的下一步选择
        if (this.currentPosition) {
            if (this.currentAxis === 'row') {
                // 当前在行，高亮同一列的其他行
                var x = this.currentPosition.x;
                for (var i = 0; i < gridSize; i++) {
                    // 跳过已选择的位置和当前位置
                    if (i === this.currentPosition.y || this.isPositionSelected(x, i)) continue;
                    
                    var sprite = this._matrixSprites[i][x];
                    sprite.bitmap.clear();
                    sprite.bitmap.fillAll('#005544');
                    sprite.bitmap.textColor = '#AAFFAA';
                    sprite.bitmap.drawText(this.codeMatrix[i][x], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
                }
            } else {
                // 当前在列，高亮同一行的其他列
                var y = this.currentPosition.y;
                for (var j = 0; j < gridSize; j++) {
                    // 跳过已选择的位置和当前位置
                    if (j === this.currentPosition.x || this.isPositionSelected(j, y)) continue;
                    
                    var sprite = this._matrixSprites[y][j];
                    sprite.bitmap.clear();
                    sprite.bitmap.fillAll('#005544');
                    sprite.bitmap.textColor = '#AAFFAA';
                    sprite.bitmap.drawText(this.codeMatrix[y][j], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
                }
            }
        }
    };
    
    Scene_CyberHacking.prototype.flashInvalidSelection = function(x, y) {
        // 闪烁显示无效选择
        var sprite = this._matrixSprites[y][x];
        
        // 保存原始颜色
        var originalFillColor = '#003322';
        if (y === 0) {
            originalFillColor = '#004422';
        } else if (this.currentPosition) {
            if (this.currentAxis === 'row' && x === this.currentPosition.x) {
                originalFillColor = '#005544';
            } else if (this.currentAxis === 'column' && y === this.currentPosition.y) {
                originalFillColor = '#005544';
            }
        }
        
        // 闪烁效果
        sprite.bitmap.clear();
        sprite.bitmap.fillAll('#FF0000');
        sprite.bitmap.textColor = '#FFFFFF';
        sprite.bitmap.drawText(this.codeMatrix[y][x], 0, 0, this.cellWidth - 10, this.cellHeight - 10, 'center');
        
        // 播放错误音效
        AudioManager.playSe({name: 'Buzzer1', pan: 0, pitch: 150, volume: 70});
        
        // 恢复原样
        var self = this;
        setTimeout(function() {
            sprite.bitmap.clear();
            sprite.bitmap.fillAll(originalFillColor);
            sprite.bitmap.textColor = '#FFFFFF';
            if (y === 0) sprite.bitmap.textColor = '#AAFFAA';
            sprite.bitmap.drawText(self.codeMatrix[y][x], 0, 0, self.cellWidth - 10, self.cellHeight - 10, 'center');
        }, 200);
    };
    
    //===========================================================================
    // * 插件命令
    //===========================================================================
    
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        
        if (command === 'CyberHack') {
            switch (args[0]) {
                case 'start':
                    SceneManager.push(Scene_CyberHacking);
                    break;
                case 'setDifficulty':
                    var difficulty = Number(args[1]) || 1;
                    // 根据难度调整参数
                    switch(difficulty) {
                        case 1: // 简单
                            timeLimit = 60;
                            bufferSize = 15;
                            break;
                        case 2: // 中等
                            timeLimit = 45;
                            bufferSize = 12;
                            break;
                        case 3: // 困难
                            timeLimit = 30;
                            bufferSize = 10;
                            break;
                    }
                    break;
            }
        }
    };
    
    // 确保插件结束的闭合括号
})();