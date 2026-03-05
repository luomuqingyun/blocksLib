# 自定义板卡 SVG 视图规范指南 (Draft)

为了让 EmbedBlocks Studio 支持更多、更复杂的第三方（用户自定义）硬件开发板，系统支持通过外置 SVG 文件的方式，替换默认的几何矩形渲染。

通过阅读本指南，您可以作为插件开发者，提供与真实硬件 1:1 还原且完全支持交互的高质量板卡预览图像。

## 1. 核心原理

当用户选中一块板卡（例如在搭建程序或查看引脚时），系统会在界面右下角/详情页展示板卡的俯视图。
传统的做法是在代码（`ChipRenderer.tsx`）中一笔一划“硬编码”画出板卡的形状。而在使用“自定义 SVG”方案时：
*   由外部直接提供 `.svg` 矢量图文件。
*   系统将该 `<svg>` 原封不动地直接嵌入在前端 React DOM 树中。
*   系统根据 `board.json` 里的映射表，利用 DOM API（如 `getElementById`）找出 SVG 图像里那些**代表引脚的图形节点**。
*   系统会在运行时给这些节点动态添加 CSS 类，实现变色、高亮、连线提示等互动效果。

## 2. 如何制作规范的 SVG 图形

并不是随便一张网上下载的 SVG 图立刻就能和软件互动。您在 Illustrator 或 Inkscape 中制图时，**必须满足以下规范**。

### 2.1 基础图形绘制
像平时画画一样绘制板卡通体外观。PCB 板基底、排针座黑边、USB接口金属部分、按键丝印等都可以随意组合。

### 2.2 定义关键引脚节点 (Critical)
这步是使得 SVG “活起来”的关键。板卡上的金属焊盘孔或引出针脚，通常由一个个 `<rect>`（矩形）或 `<circle>`（圆圈）组成。
你必须对这些希望能够发生联动的焊盘节点赋予规范的 `id` 属性。

**命名规范**：
*   所有交互引脚必须以 `pin_` 开头。
*   后缀名称必须**严格等同于** `board.json` 中 `pinMap` 数组里元素的 `position` 或 `name`（推荐使用 `name` 作为唯一标识）。

**正确的 SVG 节点示例：**
```xml
<!-- 代表 IO0 的焊盘，以后当在 Blockly 选中 IO0 时，它会发光 -->
<circle id="pin_IO0" cx="12.5" cy="45.2" r="3.5" fill="#D4AF37" />

<!-- 代表 GND 的焊盘 -->
<rect id="pin_GND_1" x="22" y="90" width="7" height="7" fill="#D4AF37" />
<rect id="pin_GND_2" x="22" y="102" width="7" height="7" fill="#D4AF37" />
```

> [!IMPORTANT]
> 注意：引脚图形**不能**放在 `<g viewBox="..."></g>` 极其复杂的深层嵌套或者带有不可见遮罩的图层中，否则可能导致高亮特效的定位发生偏移。建议尽量放置在顶层或简单的层级内。

### 2.3 引脚详细描述与设计规范 (Pin Descriptions & Aesthetics)
为了提升用户体验，仅仅让引脚“能亮”是不够的。高质量的板卡 SVG 应当包含清晰的视觉标识和元数据描述。

**1. 视觉设计规范 (Aesthetics)**：
*   **颜色编码**：建议为不同功能的引脚使用统一的视觉暗示。
    *   **电源 (5V/3V3/VIN)**：推荐使用红色或橙色。
    -   **地线 (GND)**：推荐使用黑色或深灰色。
    -   **数字/模拟引脚**：推荐使用金属黄 (Gold) 或 蓝色。
*   **引脚编号与标签**：SVG 中应包含文字标签（`<text>` 标签），标明引脚的功能名称（如 "D13", "A0"），且文字应靠近对应的焊盘节点，方便用户识别。

**2. 元数据描述 (Metadata)**：
*   **`<title>` 与 `<desc>` 标签**：建议在每个 `id="pin_XXX"` 的图形节点内部增加 `<title>` 或 `<desc>`。
*   **作用**：这些信息在悬停时可以作为原生 Tooltip 显示，或者在后端被提取用于辅助说明。
  
**示例代码：**
```xml
<circle id="pin_D13" cx="30" cy="50" r="5" fill="#FFD700">
    <title>Digital Pin 13 (LED_BUILTIN)</title>
    <desc>支持 PWM 输出和 SPI SCK 功能</desc>
</circle>
```

**3. 物理一致性**：
*   SVG 中的引脚排列顺序和相对位置应尽可能与真实硬件保持一致，这能极大降低用户接错线的概率。

## 3. board.json 的配置要求与目录放置规范

系统现在支持 **零配置自动发现 (Zero-Config Auto-Discovery)** 机制，极大地降低了板卡适配的门槛。

### 3.1 零配置自动加载 (Auto-Discovery)
从 v1.3.1 版本开始，系统在加载板卡定义时会执行以下逻辑：
1. **自动探测**：扫描与 `board.json` 处于同一目录下的所有文件。
2. **名称匹配**：如果发现一个名为 `{boardId}.svg` 的文件（例如 `uno.svg`），系统将自动将其识别为该板卡的视图模板。
3. **优先级提权**：即使 `board.json` 中没有声明 `package: "CUSTOM_SVG"`，只要同目录下存在匹配的 SVG，系统会自动将板卡提权为 `CUSTOM_SVG` 模式，并自动加载内容。

**这意味着：** 对于大多数新板卡，您只需要将制作好的 SVG 放入文件夹，无需修改任何 JSON 配置即可看到效果。

### 3.2 存放目录与显式配置

#### 情况 A：系统内置板卡 (如 Arduino Mega 2560)
对于原生支持的标准板卡，SVG 文件**必须放置在与对应的 `board.json` 相同的目录下**，或者在同级新建一个名为 `assets` 或 `images` 的资源文件夹中。

*   **推荐路径**：`src/data/boards/standard/arduino/megaatmega2560.svg` (与 `.json` 放在一起)
*   **或者归纳路径**：`src/data/boards/standard/arduino/assets/megaatmega2560.svg`

**命名规范**：强烈建议 SVG 文件名与它所支持的 `board.json` 文件名**保持完全一致**（除去后缀）。这样非常便于后期维护和脚手架工具脚本的批量处理。

#### 情况 B：第三方插件板卡 (用户自定义)

针对广大社区用户自己设计并导出的 ZIP 插件包或测试目录（如 `blocksLib/` 下的开发板），系统需要一套严格的规则来防止潜在的混乱与恶意代码：

1. **唯一且扁平的资源结构**：
   插件作者必须将 `.svg` 文件放入其插件的根目录。
   * **标准路径**：`blocksLib/my-awesome-board/board.svg`
   
2. **强制命名规范 (Security & Consistency)**：
   为了防止用户乱起名导致的解析错误或注入风险，系统**建议但不强制**约定文件名为 `board.svg`。如果用户使用了其他名称（如 `custom_v2.svg`），则必须在 `board.json` 中明确声明 `"svgPath": "./custom_v2.svg"`，且**仅支持相对路径，严禁使用绝对路径（如 `C:/...`）或网络 URL（如 `http://...`）**。

3. **视图尺寸约束**：
   为了防止用户上传的矢量图过大撑破前端界面（特别是 Blockly 的侧边栏预览框），用户导出 SVG 时，其画布尺寸（Width/Height）推荐建立在 **400x400 ~ 800x800** 的坐标系内。软件在吸纳 SVG 时将强制为其附加类似 `max-width: 100%; height: auto;` 的 CSS 缩放约束。

4. **安全过滤 (Security Sanitize)**：
   这是针对第三方插件**最重要**的规范：用户提供的 SVG 本质上是一段嵌入网页的 XML/HTML 代码。
   * 用户提供的 SVG **严禁包含 `<script>` 标签**。
   * 用户提供的 SVG **严禁包含任何 `onload=` 或 `onclick=` 等内联 JS 交互事件**。
   * 前端渲染层（`ChipRenderer`）在将读取到的用户 SVG 字符串 `dangerouslySetInnerHTML` 注入 DOM 树之前，**必须经过如 `DOMPurify` 等库的深度消毒**，剔除所有危险标签，只保留 `<rect>`, `<circle>`, `<path>`, `<g>` 及 `id`、`fill`、`stroke` 等纯视觉和基础骨架属性。
---

### 3.2 board.json 内部修改示范

当您的 SVG 制作完毕并放在对应位置后，需要修改该板卡对应 `board.json` 以通知系统加载。

```json
{
    "id": "arduino_mega_2560",
    "name": "Arduino Mega",
    // 关键 1：package 声明开启独立 SVG 模式
    "package": "CUSTOM_SVG", 
    
    // 关键 2：指定 SVG 文件相对于本 json 文件的相对路径
    "visuals": {
        "svgPath": "./megaatmega2560.svg"
    },

    "pinMap": [
        {
            "name": "D13",
            // 此时 position 不再强制代表顺位，只要与 SVG 中的 pin_D13 对应即可
            "position": "1" 
        }
    ]
}
```

### 3.3 最佳实践与避坑指南 (Common Pitfalls)

在制作高质量板卡视图时，请务必关注以下几点：

1.  **画布内缩距离 (Padding)**：
    *   **现象**：引脚标签靠近边缘，在预览窗口中可能被遮挡。
    *   **对策**：给 SVG 画布留出至少 **20px ~ 40px** 的内边距。不要让 PCB 的物理边缘撑满整个 `viewBox`。

2.  **避免文本重叠**：
    *   **案例 (Mega 2560)**：底部数字引脚非常密集。直接横排会导致文字粘连。
    *   **技巧**：采用交错排列、文字旋转或使用辅助线（Leader Lines）指向焊盘。确保每个引脚名称都具备独立的可读空间。

3.  **坐标原点一致性**：
    *   确保 `pin_XXX` 的交互节点与视觉上看到的排针位置完全重合。

## 4. 经典案例研究：Arduino Mega 2560

Mega 2560 是目前系统中最复杂的 `CUSTOM_SVG` 案例。通过它我们积累了以下经验：
*   **分层设计**：底层是 PCB 形状，中层是标注文字，顶层是透明的 `pin_` 交互热区。
*   **物理准确性**：所有 100+ 个引脚点位均根据官方规格书进行像素级校验，确保了视觉引导的权威性。

---

## 5. 前端渲染层的对接说明 (开发者备忘)


**这段写给负责修改 `ChipRenderer.tsx` 的前端研发工程师。**

后续要在代码中支持此功能，您需要：

1.  如果在 `board.json` 中检测到 `packageType === 'CUSTOM_SVG'`：
    *   取消目前的常规 SVG `rect` 绘制逻辑。
    *   读取 `board.json` 所属的本地绝对路径或借助 Electron API `fs.readFile` 去异步加载 `svgPath` 的内容字符串。
    *   将该 SVG 字符串利用 `<div dangerouslySetInnerHTML={{ __html: svgString }} />`（或更安全的 `SVG DOM parser` 库）灌入界面。
2.  建立 `useEffect` 进行状态同步：
    *   建立一个 `useEffect` 侦听当前的 `pins: string[]`（即有哪些引脚正在被代码积木使用）。
    *   遍历前文中提取到的所有类似 `document.getElementById('pin_' + pinName)` 的 DOM 节点。
    *   使用 `node.classList.add('animate-pulse', 'stroke-blue-500')` 等框架自带的 Tailwind Classes 向其附加动画和着色；若没有使用，则 `classList.remove`。

以此，您就能实现“千板千面”、美观度无上限的插件生态了！
