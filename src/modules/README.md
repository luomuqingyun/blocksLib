# EmbedBlocks 模块系统

此目录包含了 EmbedBlocks Studio 的积木定义和逻辑代码。模块按类别组织如下：

- **core**: 核心系统积木 (变量, 逻辑, 循环, 时间等)。
- **hardware**: 特定硬件组件的驱动 (传感器, 电机, 显示屏等)。
- **protocols**: 通信协议 (串口, 网络, MQTT 等)。
- **robots**: 特定机器人套件 (mBot, Otto 等)。
- **vendor**: 第三方厂商库。
- **arduino**: Arduino 基础生成器逻辑。

## 模块系统架构

EmbedBlocks 使用 **注册表模式 (Registry Pattern)** 来管理积木模块。相比于单体设置文件，这种方式支持模块化加载、初始化，并具有更好的扩展性。

### 如何添加新模块

1.  **创建模块文件**：在相应的子目录中创建一个新的 `.ts` 文件 (例如 `src/modules/hardware/my_sensor.ts`)。
2.  **定义模块**：
    ```typescript
    import { registerBlock, arduinoGenerator, Order } from '../../generators/arduino-base';
    import { BlockModule } from '../../registries/ModuleRegistry';
    import * as Blockly from 'blockly';

    const init = () => {
        registerBlock('my_sensor_read', {
            init: function() {
                // Blockly 积木定义
                this.appendDummyInput().appendField("读取传感器数值");
                this.setOutput(true, "Number");
                this.setColour(120);
            }
        }, (block: any) => {
            // 生成器逻辑
            // 请使用 Helper 助手方法，避免直接操作 functions_！
            arduinoGenerator.addInclude('my_sensor_lib', '#include <MySensor.h>');
            arduinoGenerator.addVariable('my_sensor_obj', 'MySensor sensor;');
            arduinoGenerator.addSetup('my_sensor_begin', 'sensor.begin();');
            
            return ['sensor.read()', Order.ATOMIC];
        });
    };

    export const MySensorModule: BlockModule = {
        id: 'hardware.my_sensor',
        name: 'My Sensor',
        init
    };
    ```
3.  **注册模块**：
    -   在 `src/modules/index.ts` 中引入你的模块。
    -   在 `initAllModules` 函数中添加 `ModuleRegistry.register(MySensorModule);`。

### 最佳实践

-   **使用生成器助手 (Generator Helpers)**：避免直接操作 `arduinoGenerator.definitions_` 或 `functions_`。请使用以下提供的助手方法：
    -   `addInclude(key, code)`: 添加头文件包含
    -   `addMacro(key, code)`: 添加宏定义
    -   `addType(key, code)`: 添加结构体/枚举定义 (自动放在变量前)
    -   `addVariable(key, code)`: 添加全局变量 (自动放在 Setup 前)
    -   `addFunction(key, code)`: 添加辅助函数 (自动放在 Loop 后)
    -   `addSetup(key, code)`: 添加 setup() 代码
    -   `addLoop(key, code)`: 添加 loop() 代码
-   **类型安全**：确保你的模块实现了 `BlockModule` 接口。
-   **国际化**：积木文本均应使用 `Blockly.Msg` 键值以支持多语言 (中/英)。
