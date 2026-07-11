# 白厄：逐火残响

根据上传的白厄、神厄参考图与动作序列帧制作的 2D 像素横版动作同人游戏。

## v0.4 本地素材目录

仓库已整理为本地素材模式，不再依赖 ChatGPT Site 外链。游戏启动时会把旧素材地址自动映射到 `public/assets/`，图片缺失时也不会因为 Canvas 绘制失败而直接崩溃。

需要上传的成品文件：

```text
public/assets/backgrounds/hell-battlefield.png
public/assets/characters/phainon-normal-v3.png
public/assets/characters/phainon-god-v3.png
public/assets/enemies/enemy-sprites-v2.png
public/assets/effects/combat-vfx-v3.png
```

完整上传方法见：[`docs/ASSET_UPLOAD_AND_VERCEL.md`](docs/ASSET_UPLOAD_AND_VERCEL.md)。

## 动画系统

- 普通白厄：待机、移动、普攻，每组 10 帧。
- 神厄：10 帧变身过程、悬浮待机、红色空间斩、陨石引导动作。
- 所有动作固定以 20 FPS 播放。
- 普通白厄使用统一脚底基准线，与地面稳定对齐。
- 神厄保持固定悬浮高度，并绘制地面投影。
- 黄色剑气、蓝色剑气、红色空间撕裂、陨石雨、最终巨型陨石为独立特效图层。
- 陨石角色施法动作与陨石特效已经拆分。
- 怪物和 Boss 根据玩家位置实时转向。
- 支持键盘和安卓横屏触控按键。

## 操作

- A / D：移动
- Space：跳跃
- Shift：闪避
- J：普通攻击
- K：战技
- I / U：终结技变身
- Esc：暂停

## 开发与检查

```bash
npm install
npm run assets:check
npm run check
npm run build
npm run dev
```

`npm run assets:check` 会检查素材文件名、路径和图片尺寸。第一次上传图片前该命令会提示缺少文件，这是正常现象。

## Vercel

Vercel 导入本仓库后保持 Next.js 默认设置即可。仓库连接完成后，每次向 `main` 提交代码或素材都会自动重新部署。

角色与世界观名称属于原权利方。本仓库为非商业同人项目。
