// @ts-ignore
import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerGeneratorOnly, cleanName } from '../../generators/arduino-base';

import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // --- Logic ---
    registerGeneratorOnly('controls_if', function (block: any) {
        let n = 0;
        let code = '';
        let conditionCode = arduinoGenerator.valueToCode(block, 'IF0', Order.NONE) || 'false';
        let branchCode = arduinoGenerator.statementToCode(block, 'DO0');
        code += `if (${conditionCode}) {\n${branchCode}}`;
        if (block.elseifCount_) {
            for (let i = 1; i <= block.elseifCount_; i++) {
                conditionCode = arduinoGenerator.valueToCode(block, 'IF' + i, Order.NONE) || 'false';
                branchCode = arduinoGenerator.statementToCode(block, 'DO' + i);
                code += ` else if (${conditionCode}) {\n${branchCode}}`;
            }
        }
        if (block.elseCount_) {
            branchCode = arduinoGenerator.statementToCode(block, 'ELSE');
            code += ` else {\n${branchCode}}`;
        }
        return code + '\n';
    });

    registerGeneratorOnly('logic_compare', function (block: any) {
        const OPERATORS: any = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
        const op = OPERATORS[block.getFieldValue('OP')];
        const a = arduinoGenerator.valueToCode(block, 'A', Order.EQUALITY) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', Order.EQUALITY) || '0';
        return [`${a} ${op} ${b}`, Order.RELATIONAL];
    });

    registerGeneratorOnly('logic_operation', function (block: any) {
        const op = (block.getFieldValue('OP') === 'AND') ? '&&' : '||';
        const order = (op === '&&') ? Order.LOGICAL_AND : Order.LOGICAL_OR;
        let a = arduinoGenerator.valueToCode(block, 'A', order);
        let b = arduinoGenerator.valueToCode(block, 'B', order);
        if (!a && !b) { a = 'false'; b = 'false'; } else { a = a || 'false'; b = b || 'false'; }
        return [`${a} ${op} ${b}`, order];
    });

    registerGeneratorOnly('logic_negate', function (block: any) {
        const arg = arduinoGenerator.valueToCode(block, 'BOOL', Order.UNARY_PREFIX) || 'true';
        return [`!${arg}`, Order.UNARY_PREFIX];
    });

    registerGeneratorOnly('logic_boolean', function (block: any) {
        return [(block.getFieldValue('BOOL') === 'TRUE') ? 'true' : 'false', Order.ATOMIC];
    });

    // --- Loops ---
    registerGeneratorOnly('controls_repeat_ext', function (block: any) {
        arduinoGenerator.loopDepth_++;
        const repeats = arduinoGenerator.valueToCode(block, 'TIMES', Order.ATOMIC) || '0';
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        let loopVar = 'i';
        if (arduinoGenerator.loopDepth_ > 1) loopVar = 'i' + arduinoGenerator.loopDepth_;
        const code = `for (int ${loopVar} = 0; ${loopVar} < ${repeats}; ${loopVar}++) {\n${branch}}\n`;
        arduinoGenerator.loopDepth_--;
        return code;
    });

    registerGeneratorOnly('controls_whileUntil', function (block: any) {
        const mode = block.getFieldValue('MODE');
        const until = mode === 'UNTIL';
        let argument0 = arduinoGenerator.valueToCode(block, 'BOOL', until ? Order.UNARY_PREFIX : Order.NONE) || 'false';
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        if (until) {
            if (argument0.match(/^\w+$/)) argument0 = '!' + argument0;
            else argument0 = '!(' + argument0 + ')';
        }
        return `while (${argument0}) {\n${branch}}\n`;
    });

    registerGeneratorOnly('controls_for', function (block: any) {
        const variable0 = cleanName(block.getField('VAR').getText());
        const from = arduinoGenerator.valueToCode(block, 'FROM', Order.ASSIGNMENT) || '0';
        const to = arduinoGenerator.valueToCode(block, 'TO', Order.ASSIGNMENT) || '0';
        const by = arduinoGenerator.valueToCode(block, 'BY', Order.ASSIGNMENT) || '1';
        const branch = arduinoGenerator.statementToCode(block, 'DO');
        return `for (int ${variable0} = ${from}; ${variable0} <= ${to}; ${variable0} += ${by}) {\n${branch}}\n`;
    });

    // --- Math ---
    registerGeneratorOnly('math_number', function (block: any) {
        return [parseFloat(block.getFieldValue('NUM')), Order.ATOMIC];
    });

    registerGeneratorOnly('math_arithmetic', function (block: any) {
        const OP: any = { 'ADD': ['+', Order.ADDITIVE], 'MINUS': ['-', Order.ADDITIVE], 'MULTIPLY': ['*', Order.MULTIPLICATIVE], 'DIVIDE': ['/', Order.MULTIPLICATIVE] };
        const tuple = OP[block.getFieldValue('OP')];
        const operator = tuple ? tuple[0] : '+';
        const order = tuple ? tuple[1] : Order.ADDITIVE;
        const a = arduinoGenerator.valueToCode(block, 'A', order) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', order) || '0';
        return [`${a} ${operator} ${b}`, order];
    });

    registerGeneratorOnly('math_single', function (block: any) {
        const operator = block.getFieldValue('OP');
        let code;
        let arg;
        if (operator === 'NEG') {
            arg = arduinoGenerator.valueToCode(block, 'NUM', Order.UNARY_PREFIX) || '0';
            if (arg[0] === '-') arg = ' ' + arg;
            return ['-' + arg, Order.UNARY_PREFIX];
        }
        arg = arduinoGenerator.valueToCode(block, 'NUM', Order.NONE) || '0';
        switch (operator) {
            case 'ABS': code = 'abs(' + arg + ')'; break;
            case 'ROOT': code = 'sqrt(' + arg + ')'; break;
            case 'LN': code = 'log(' + arg + ')'; break;
            case 'EXP': code = 'exp(' + arg + ')'; break;
            case 'POW10': code = 'pow(10, ' + arg + ')'; break;
            case 'ROUND': code = 'round(' + arg + ')'; break;
            case 'ROUNDUP': code = 'ceil(' + arg + ')'; break;
            case 'ROUNDDOWN': code = 'floor(' + arg + ')'; break;
            default: code = '0'; break;
        }
        return [code, Order.UNARY_POSTFIX];
    });

    registerGeneratorOnly('math_map', function (block: any) {
        const value = arduinoGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';
        const fromLow = arduinoGenerator.valueToCode(block, 'FROM_LOW', Order.NONE) || '0';
        const fromHigh = arduinoGenerator.valueToCode(block, 'FROM_HIGH', Order.NONE) || '1024';
        const toLow = arduinoGenerator.valueToCode(block, 'TO_LOW', Order.NONE) || '0';
        const toHigh = arduinoGenerator.valueToCode(block, 'TO_HIGH', Order.NONE) || '255';
        return [`map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`, Order.ATOMIC];
    });

    registerGeneratorOnly('math_constrain', function (block: any) {
        const value = arduinoGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';
        const low = arduinoGenerator.valueToCode(block, 'LOW', Order.NONE) || '0';
        const high = arduinoGenerator.valueToCode(block, 'HIGH', Order.NONE) || '255';
        return [`constrain(${value}, ${low}, ${high})`, Order.ATOMIC];
    });

    registerGeneratorOnly('math_random', function (block: any) {
        const min = arduinoGenerator.valueToCode(block, 'MIN', Order.NONE) || '0';
        const max = arduinoGenerator.valueToCode(block, 'MAX', Order.NONE) || '100';
        return [`random(${min}, ${max})`, Order.ATOMIC];
    });

    registerGeneratorOnly('math_bitwise', function (block: any) {
        // OPS: &, |, ^, ~, <<, >>
        const OPS: any = {
            'AND': ['&', Order.BITWISE_AND],
            'OR': ['|', Order.BITWISE_OR],
            'XOR': ['^', Order.BITWISE_XOR],
            'NOT': ['~', Order.UNARY_PREFIX],
            'SHL': ['<<', Order.SHIFT],
            'SHR': ['>>', Order.SHIFT]
        };
        const opStr = block.getFieldValue('OP');
        const tuple = OPS[opStr];
        const operator = tuple ? tuple[0] : '&';
        const order = tuple ? tuple[1] : Order.BITWISE_AND;

        // Unary NOT
        if (opStr === 'NOT') {
            const val = arduinoGenerator.valueToCode(block, 'A', Order.UNARY_PREFIX) || '0';
            return [`~${val}`, Order.UNARY_PREFIX];
        }

        const a = arduinoGenerator.valueToCode(block, 'A', order) || '0';
        const b = arduinoGenerator.valueToCode(block, 'B', order) || '0';
        return [`${a} ${operator} ${b}`, order];
    });

    // --- Text (新增) ---
    registerGeneratorOnly('text', function (block: any) {
        // 生成带引号的字符串 (Arduino String 或 const char*)
        const code = arduinoGenerator.quote_(block.getFieldValue('TEXT'));
        return [code, Order.ATOMIC];
    });

    registerGeneratorOnly('text_print', function (block: any) {
        const msg = arduinoGenerator.valueToCode(block, 'TEXT', Order.NONE) || '""';
        return `Serial.println(${msg});\n`;
    });
};

export const StandardModule: BlockModule = {
    id: 'core.standard',
    name: 'Standard Generators',
    init
};