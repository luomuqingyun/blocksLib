# 积木开发新手教程 (New Block Development Tutorial)

本文档旨在为初学者提供详细的、手把手的指导，演示如何从零开始在 EmbedBlocks Studio 源码中添加一组自定义积木。

> [!IMPORTANT]
> **开发准则**: 严禁硬编码文本！所有显示的文字必须通过国际化 (I18n) 机制实现。

---

## 1. 准备工作 (Preparation)

1.  **运行环境**: 确保您能通过终端运行 `npm run dev` 正常启动项目。
2.  **代码位置**: 所有的工作都在 `src/modules/extensions/` 目录下进行。

---

## 2. 第一步：创建模块文件夹 (Step 2: Create Folder)

假设我们要创建一个名为 "My First Block" 的扩展。

1.  在 `src/modules/extensions/` 下新建文件夹 `my_first_block`。
2.  创建以下文件结构：
    ```text
    my_first_block/
    ├── index.ts             # 模块入口
    ├── blocks.ts            # 积木定义
    └── generator.ts         # 代码生成
    ```

---

## 3. 第二步：定义翻译词条 (Step 3: Define Translations)

在编写积木代码前，先定义好中英文标签。

1.  打开 `src/locales/zh.json`，在合适位置添加：
    ```json
    "B_MY_LOG_MSG": "我的日志 %1",
    "B_MY_LOG_TOOLTIP": "向串口打印一条日志"
    ```
2.  打开 `src/locales/en.json`，添加对应英文：
    ```json
    "B_MY_LOG_MSG": "My Log %1",
    "B_MY_LOG_TOOLTIP": "Print a message to serial"
    ```

---

## 4. 第三步：定义积木外观 (Step 4: Blocks Definition)

打开 `src/modules/extensions/my_first_block/blocks.ts`。注意我们使用 `Blockly.Msg` 来引用刚才定义的翻译词条。

```typescript
import * as Blockly from 'blockly/core';

export const initBlocks = () => {
    // 'my_log' 是积木的唯一ID
    Blockly.Blocks['my_log'] = {
        init: function () {
            // 使用 Blockly.Msg['KEY'] 引用翻译词条
            this.appendValueInput("MESSAGE")
                .setCheck("String")
                .appendField(Blockly.Msg['B_MY_LOG_MSG']); 

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(Blockly.Msg['B_MY_LOG_TOOLTIP']);
        }
    };
};
```

---

## 5. 第四步：实现代码生成 (Step 5: Code Generator)

打开 `src/modules/extensions/my_first_block/generator.ts`：

```typescript
import { arduinoGenerator } from '../../../generators/arduino-base';
import { Order } from '../../../generators/utils/generator_constants';

export const initGenerator = () => {
    arduinoGenerator['my_log'] = (block: any) => {
        const message = arduinoGenerator.valueToCode(block, 'MESSAGE', Order.ATOMIC) || '""';
        
        // 自动注入 Serial 初始化
        arduinoGenerator.addSetup('serial_begin', 'Serial.begin(115200);');

        return `Serial.println("Log: " + String(${message}));\n`;
    };
};
```

---

## 6. 第五步：导出与注册 (Step 6: Registration)

1.  **在 `index.ts` 中封装模块**:
```typescript
import { BlockModule } from '../../../registries/ModuleRegistry';
import { initBlocks } from './blocks';
import { initGenerator } from './generator';

export const MyFirstBlockModule: BlockModule = {
    id: 'my_first_block',
    name: 'My First Block',
    init: () => {
        initBlocks();
        initGenerator();
    }
};
```

2.  **在 `src/modules/index.ts` 中注册**:
```typescript
import { MyFirstBlockModule } from './extensions/my_first_block';

export const initAllModules = () => {
    // ...
    ModuleRegistry.register(MyFirstBlockModule);
};
```

---

## 7. 高级：针对特定开发板显示 (Advanced)

如果您希望积木只在特定板子（如 ESP32）下出现，请在 `init` 函数中使用 `BoardRegistry` 进行作用域注册：

```typescript
init: () => {
    initBlocks();
    initGenerator();

    BoardRegistry.registerExtensionCategory('my_block_cat', {
        kind: 'category',
        name: 'My Extension',
        contents: [{ kind: 'block', type: 'my_log' }]
    }, {
        families: ['esp32'] // 兼容性选项
    });
}
```

---

## 8. 测试验证 (Verification)

1. 启动项目，切换中英文语言，检查积木标签是否随之改变。
2. 拖入积木，检查代码预览是否生成正确的 C++ 代码。

