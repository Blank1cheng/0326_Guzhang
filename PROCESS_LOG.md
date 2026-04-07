# 故障注入平台过程记录

持续记录当前静态工作台版本的每次修改，后续继续直接追加。

## 2026-03-27

### 历史整理

- 以 `Sample.html / TEST.html` 为基准，保留页签式工作台布局，重做本地可运行版本。
- 完成蓝白配色统一、顶部状态栏同步、右上角导入/保存工具区整理。
- 支持左侧组件拖入画布、节点拖动、画布缩放和平移、状态栏悬浮不跟随画布缩放。
- 系统建模组件收敛为信号源、流程块、仿真块；故障注入组件保留物理层故障块；连线支持普通连接线和 CAN 总线。
- 支持节点属性编辑、保存设置、删除模块、连线单独选中和删除。
- 建立物理层与电气层两条故障注入路径：
  - 物理层通过故障块拖入画布并叠加连线。
  - 电气层通过选中流程块或仿真块，在属性面板导入故障并注入。

### 本次新增

- 新增 `CAN` 协议层故障注入，只作用于 `CAN 总线` 连线。
- 协议层模板限定为 `丢包 / 延迟 / 位翻转 / 重放` 四类，并与顶部“导入故障模型”链路打通。
- 选中 `CAN` 连线后，右侧属性栏新增“导入协议故障”；注入后连线变为红色虚线并显示故障状态。
- 简化左侧“系统建模组件”项的样式，去掉额外说明文字，与其他组件项保持同一视觉层级。

### 本次继续完善

- 建立轻量仿真运行时，支持 `信号源 -> 连线 -> 流程块 / 仿真块 / 故障块 -> 示波器` 的逐步传播。
- 接入 `初始化 / 运行 / 步进 / 暂停 / 终止` 全流程控制，运行状态与顶部状态栏同步。
- 连线新增单输入端口约束，禁止多个上游同时接入同一输入端口，避免信号耦合。
- 示波器改为真实数据绘制，不再使用随机示意线；弹窗显示当前示波器名、连接来源、时间轴与频谱。
- 支持双击示波器模块直接打开示波器弹窗，并保留属性面板中的“查看波形”入口。
- 协议层故障新增稳定的内部执行键 `faultCode`，保证 `丢包 / 延迟 / 位翻转 / 重放` 能真实作用于数值传输。

### 本次逻辑梳理

- 仿真初始化不再把“故障注入”当成前置条件，只要系统链路完整可运行，就允许直接初始化和步进。
- 若用户尚未手动保存系统模型，点击“初始化”时会自动保存系统模型，再继续进入仿真。
- 状态栏文案改为明确提示“故障注入为可选”，避免误以为必须先导入故障模型才能开始仿真。
- 支持 `信号源 -> 示波器` 的无故障基线链路直接出波形，适合先做正常工况验证。

### 优化点

- 连线故障与模块故障分离建模，避免协议层故障错误地挂在模块节点上。
- 协议层注入复用了现有故障模型导入能力，同时保留模板直注，减少重复操作。
- 过程记录文件已建立，后续每次变更继续增量追加。

## 2026-04-03

### Simulation block interface refactor

- Refactored `simulation_block` from a fixed single-input single-output block into three editable interface groups: `inputs`, `outputs`, `middleVars`.
- Added dynamic simulation-block sizing so the node height expands with port count instead of staying fixed.
- Added structured editing in the property panel:
  - editable counts for inputs / outputs / middle variables
  - editable name and type for every interface item
  - interface count sync action before final save
- Implemented scheme A port exposure:
  - inputs on the left
  - outputs on the right
  - middle variables exposed as auxiliary right-side ports
- Added edge pruning after interface shrink so removed ports cannot leave invalid dangling connections.
- Upgraded simulation runtime from single-value propagation to indexed port propagation:
  - edges now consume `sourcePortIndex` and `targetPortIndex` meaningfully
  - simulation blocks can read multiple input ports
  - scopes can observe both main outputs and middle-variable ports
- Improved scope source labeling so the scope modal can show which upstream output or middle variable is being observed.

### Simulation block layout polish

- Moved `middleVars` ports from the right side to the top edge of the simulation block to separate them visually from main outputs.
- Updated simulation-block geometry rules so width grows with top-side middle-variable ports, while height continues to grow with left/right interface density.
- Adjusted edge bezier control points to respect port side direction, so connections from top ports no longer look like right-side outputs.
- Optimized the right property panel layout for the simulation block:
  - widened the desktop property sidebar slightly
  - changed interface-count controls from 3 cramped columns to a 2-column layout with the third field spanning full width
  - improved interface-group card styling for clearer visual separation
