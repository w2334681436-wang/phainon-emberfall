# 游戏素材上传区

把素材包中 `public/assets/` 目录里的文件按原路径上传到这里，文件名不能修改。

```text
public/assets/
├─ asset-manifest.json
├─ backgrounds/
│  └─ hell-battlefield.png
├─ characters/
│  ├─ phainon-normal-v3.png
│  └─ phainon-god-v3.png
├─ enemies/
│  └─ enemy-sprites-v2.png
└─ effects/
   └─ combat-vfx-v3.png
```

## 新版素材规范

- 普通形态：`1000 × 1200`，5 列 × 6 行，每格 `200 × 200`。
- 神厄形态：`1000 × 1600`，5 列 × 8 行，每格 `200 × 200`。
- 战斗特效：`1000 × 2000`，5 列 × 10 行，每格 `200 × 200`。
- 黑色敌人：`1536 × 576`，8 列 × 3 行，每格 `192 × 192`。
- 背景：`1000 × 560`。
- 播放速度：20 FPS，每帧 50 ms。

新版素材已经按固定锚点重新整理：普通形态脚底基准线固定；神厄悬浮高度和身体中心固定；黑色怪物每行使用统一地面线。角色动作与黄色剑气、蓝色剑气、红色空间撕裂、陨石雨和巨大陨石均分开保存，避免角色随特效抖动。

上传完成后运行：

```bash
npm run assets:check
npm run check
npm run build
```
