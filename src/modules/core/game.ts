/**
 * ============================================================
 * 游戏引擎模块 (Game Engine Module)
 * ============================================================
 * 
 * 提供简易游戏开发积木:
 * - game_init: 初始化游戏状态
 * - game_create_sprite: 创建精灵
 * - game_set_velocity: 设置速度
 * - game_update_all: 更新物理
 * - game_check_collision: 碰撞检测
 * 
 * @file src/modules/core/game.ts
 * @module EmbedBlocks/Frontend/Modules/Core
 */

// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';


/**
 * 模块初始化函数
 * 注册与简易 2D 游戏引擎相关的积木块。
 * 设计思路：在 Arduino 端注入一套轻量级的精灵管理系统。
 */
const init = () => {

    // =========================================================================
    // 1. 游戏引擎初始化 (Game Init)
    // 定义核心数据结构，并为精灵分配静态内存空间。
    // =========================================================================
    registerBlock('game_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_INIT); // 初始化游戏引擎
            this.appendValueInput("MAX_SPRITES")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_GAME_MAX_SPRITES); // 最大精灵数量
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200); // 游戏类积木使用粉红/玫瑰色，以示区别
            this.setTooltip(Blockly.Msg.ARD_GAME_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const max = arduinoGenerator.valueToCode(block, 'MAX_SPRITES', Order.ATOMIC) || '10';

        // 【生成的 C++ 数据结构】
        // 1. 全局游戏状态 (分值、生命值等)
        arduinoGenerator.addType('game_struct', `
struct GameState {
  int score = 0;
  int lives = 3;
  bool gameOver = false;
};`);
        arduinoGenerator.addVariable('game_var', `GameState game;`);

        // 2. 精灵定义 (位置、速度、尺寸、状态)
        arduinoGenerator.addType('sprite_struct', `
struct Sprite {
  float x, y;
  float dx, dy;
  int w, h;
  bool active;
};`);
        // 【注意】使用静态数组而非动态内存分配 (new/malloc)，这在嵌入式开发中更为安全稳定。
        arduinoGenerator.addVariable('sprite_vars', `
Sprite sprites[${max}]; 
int sprite_count = ${max};
`);

        // 3. 物理更新函数：遍历所有活动的精灵并应用速度位移
        arduinoGenerator.addFunction('game_update', `
void game_update_physics() {
  for(int i=0; i<sprite_count; i++) {
     if(sprites[i].active) {
        sprites[i].x += sprites[i].dx;
        sprites[i].y += sprites[i].dy;
     }
  }
}`);

        // 在 setup() 中清空所有精灵的状态
        arduinoGenerator.addSetup('game_reset', `
  for(int i=0; i<${max}; i++) { sprites[i].active = false; }
`);
        return '';
    });

    // =========================================================================
    // 2. 创建精灵 (Create Sprite)
    // 激活指定 ID 的精灵并设置其初始位置和大小。
    // =========================================================================
    registerBlock('game_create_sprite', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_CREATE_SPRITE); // 创建精灵
            this.appendValueInput("ID")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_GAME_ID); // 精灵 ID
            this.appendValueInput("X").setCheck("Number").appendField("X");
            this.appendValueInput("Y").setCheck("Number").appendField("Y");
            this.appendValueInput("W").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_WIDTH);
            this.appendValueInput("H").setCheck("Number").appendField(Blockly.Msg.ARD_OLED_HEIGHT);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        const id = arduinoGenerator.valueToCode(block, 'ID', Order.ATOMIC) || '0';
        const x = arduinoGenerator.valueToCode(block, 'X', Order.ATOMIC) || '0';
        const y = arduinoGenerator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
        const w = arduinoGenerator.valueToCode(block, 'W', Order.ATOMIC) || '10';
        const h = arduinoGenerator.valueToCode(block, 'H', Order.ATOMIC) || '10';

        return `
  if(${id} >= 0 && ${id} < sprite_count) {
    sprites[${id}].active = true;
    sprites[${id}].x = ${x};
    sprites[${id}].y = ${y};
    sprites[${id}].w = ${w};
    sprites[${id}].h = ${h};
    sprites[${id}].dx = 0;
    sprites[${id}].dy = 0;
  }
`;
    });

    // =========================================================================
    // 3. 设置速度 (Set Velocity)
    // 改变精灵的运动向量。
    // =========================================================================
    registerBlock('game_set_velocity', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_SET_VELOCITY); // 设置精灵速度
            this.appendValueInput("ID")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_GAME_SPRITE_ID);
            this.appendValueInput("DX").setCheck("Number").appendField(Blockly.Msg.ARD_GAME_DX);
            this.appendValueInput("DY").setCheck("Number").appendField(Blockly.Msg.ARD_GAME_DY);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        const id = arduinoGenerator.valueToCode(block, 'ID', Order.ATOMIC) || '0';
        const dx = arduinoGenerator.valueToCode(block, 'DX', Order.ATOMIC) || '0';
        const dy = arduinoGenerator.valueToCode(block, 'DY', Order.ATOMIC) || '0';
        return `if(${id} >= 0 && ${id} < sprite_count) { sprites[${id}].dx = ${dx}; sprites[${id}].dy = ${dy}; }\n`;
    });

    // =========================================================================
    // 4. 更新物理世界 (Update All)
    // 执行一帧的物理位移计算。
    // =========================================================================
    registerBlock('game_update_all', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_UPDATE); // 移动所有精灵
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        return `game_update_physics();\n`;
    });

    // =========================================================================
    // 5. 碰撞检测 (Check Collision)
    // 实现 AABB (轴对齐包围盒) 碰撞检测算法。
    // =========================================================================
    registerBlock('game_check_collision', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_COLLISION); // 发生碰撞？
            this.appendValueInput("ID1").setCheck("Number").appendField(Blockly.Msg.ARD_GAME_SPRITE_A);
            this.appendValueInput("ID2").setCheck("Number").appendField(Blockly.Msg.ARD_GAME_SPRITE_B);
            this.setOutput(true, "Boolean");
            this.setColour(200);
        }
    }, (block: any) => {
        const id1 = arduinoGenerator.valueToCode(block, 'ID1', Order.ATOMIC) || '0';
        const id2 = arduinoGenerator.valueToCode(block, 'ID2', Order.ATOMIC) || '1';

        const funcName = 'checkCollision';
        arduinoGenerator.addFunction(funcName, `
/** 检测两个精灵是否重叠 */
bool ${funcName}(int i, int j) {
  if (i < 0 || i >= sprite_count || j < 0 || j >= sprite_count) return false;
  if (!sprites[i].active || !sprites[j].active) return false;
  
  // AABB 算法核心逻辑
  return (sprites[i].x < sprites[j].x + sprites[j].w &&
          sprites[i].x + sprites[i].w > sprites[j].x &&
          sprites[i].y < sprites[j].y + sprites[j].h &&
          sprites[i].y + sprites[i].h > sprites[j].y);
}`);
        return [`${funcName}(${id1}, ${id2})`, Order.ATOMIC];
    });

    // =========================================================================
    // 6. 获取精灵属性 (Get Property)
    // =========================================================================
    registerBlock('game_get_prop', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_GET_PROP); // 获取精灵属性
            this.appendValueInput("ID").setCheck("Number").appendField(Blockly.Msg.ARD_GAME_SPRITE_ID);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["坐标 X", "x"],
                    ["坐标 Y", "y"],
                    ["宽度", "w"],
                    ["高度", "h"],
                    ["速度 DX", "dx"],
                    ["速度 DY", "dy"]
                ]), "PROP");
            this.setOutput(true, "Number");
            this.setColour(200);
        }
    }, (block: any) => {
        const id = arduinoGenerator.valueToCode(block, 'ID', Order.ATOMIC) || '0';
        const prop = block.getFieldValue('PROP');
        return [`sprites[${id}].${prop}`, Order.ATOMIC];
    });

};

/**
 * 游戏引擎模块定义
 * 提供了基础的精灵系统，适用于 OLED 屏幕显示的小型游戏（如贪吃蛇、打地砖）。
 */
export const GameModule: BlockModule = {
    id: 'core.game',
    name: 'Game Engine',
    init
};
