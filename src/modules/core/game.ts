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


const init = () => {

    registerBlock('game_init', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_INIT);
            this.appendValueInput("MAX_SPRITES")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_GAME_MAX_SPRITES);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200); // Pink/Game
            this.setTooltip(Blockly.Msg.ARD_GAME_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const max = arduinoGenerator.valueToCode(block, 'MAX_SPRITES', Order.ATOMIC) || '10';

        arduinoGenerator.addType('game_struct', `
struct GameState {
  int score = 0;
  int lives = 3;
  bool gameOver = false;
};`);
        arduinoGenerator.addVariable('game_var', `GameState game;`);

        arduinoGenerator.addType('sprite_struct', `
struct Sprite {
  float x, y;
  float dx, dy;
  int w, h;
  bool active;
};`);
        arduinoGenerator.addVariable('sprite_vars', `
Sprite sprites[${max}];  // dynamic size would require new/delete, static is safer for blocks
int sprite_count = ${max};
`);
        // Helper to update physics
        arduinoGenerator.addFunction('game_update', `
void game_update_physics() {
  for(int i=0; i<sprite_count; i++) {
     if(sprites[i].active) {
        sprites[i].x += sprites[i].dx;
        sprites[i].y += sprites[i].dy;
     }
  }
}`);

        arduinoGenerator.addSetup('game_reset', `
  for(int i=0; i<${max}; i++) { sprites[i].active = false; }
`);
        return '';
    });

    registerBlock('game_create_sprite', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_CREATE_SPRITE);
            this.appendValueInput("ID")
                .setCheck("Number")
                .appendField(Blockly.Msg.ARD_GAME_ID);
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

    registerBlock('game_set_velocity', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_SET_VELOCITY);
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

    registerBlock('game_update_all', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_UPDATE);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
        }
    }, (block: any) => {
        return `game_update_physics();\n`;
    });

    registerBlock('game_check_collision', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_COLLISION);
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
bool ${funcName}(int i, int j) {
  if (i < 0 || i >= sprite_count || j < 0 || j >= sprite_count) return false;
  if (!sprites[i].active || !sprites[j].active) return false;
  
  // AABB Collision
  return (sprites[i].x < sprites[j].x + sprites[j].w &&
          sprites[i].x + sprites[i].w > sprites[j].x &&
          sprites[i].y < sprites[j].y + sprites[j].h &&
          sprites[i].y + sprites[i].h > sprites[j].y);
}`);
        return [`${funcName}(${id1}, ${id2})`, Order.ATOMIC];
    });

    registerBlock('game_get_prop', {
        init: function () {
            this.appendDummyInput()
                .appendField(Blockly.Msg.ARD_GAME_GET_PROP);
            this.appendValueInput("ID").setCheck("Number").appendField(Blockly.Msg.ARD_GAME_SPRITE_ID);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["X", "x"],
                    ["Y", "y"],
                    [Blockly.Msg.ARD_OLED_WIDTH || "Width", "w"],
                    [Blockly.Msg.ARD_OLED_HEIGHT || "Height", "h"],
                    ["DX", "dx"],
                    ["DY", "dy"]
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

export const GameModule: BlockModule = {
    id: 'core.game',
    name: 'Game Engine',
    category: 'Logic',
    init
};
