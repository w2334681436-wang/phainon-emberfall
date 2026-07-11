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

所有角色和技能动画均按 20 FPS 播放。角色与特效已分开：神厄释放陨石时，角色动作位于 `phainon-god-v3.png`，陨石雨和最终巨型陨石位于 `combat-vfx-v3.png`。

上传完成后运行：

```bash
npm run assets:check
npm run check
npm run build
```
