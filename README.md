# 白厄：逐火残响

根据上传的白厄、神厄参考图与动作序列帧制作的 2D 像素横版动作同人游戏。

## v0.5 固定锚点素材结构

仓库已整理为本地素材模式，不再依赖 ChatGPT Site 图片外链。新版素材采用固定角色锚点：普通形态脚底线固定；神厄悬浮高度与身体中心固定；敌人每行使用统一地面线。角色动作和攻击特效分开保存，避免播放时人物被剑气或陨石带着抖动。

需要上传的成品文件：

```text
public/assets/backgrounds/hell-battlefield.png
public/assets/characters/phainon-normal-v3.png
public/assets/characters/phainon-god-v3.png
public/assets/enemies/enemy-sprites-v2.png
public/assets/effects/combat-vfx-v3.png
public/assets/asset-manifest.json
```

完整上传方法见：[`docs/ASSET_UPLOAD_AND_VERCEL.md`](docs/ASSET_UPLOAD_AND_VERCEL.md)。

## 动画系统

- 普通白厄：待机、移动、普攻角色动作，每组 10 帧。
- 神厄：10 帧变身过程、悬浮待机、红色空间斩角色动作、陨石引导动作。
- 所有动作固定以 20 FPS 播放。
- 黄色剑气、蓝色大范围剑气、红色空间撕裂、陨石雨和最终巨大陨石为独立透明特效图层。
- 敌人统一为黑色或炭黑色怪物，并带红色熔火纹理。
- 小怪、精英怪和 Boss 会根据玩家位置转向。
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

`npm run assets:check` 会检查素材文件名、路径和图片尺寸。第一次上传图片前提示缺少文件属于正常现象。

## Vercel

Vercel 导入本仓库后保持 Next.js 默认设置即可。仓库连接完成后，每次向 `main` 提交代码或素材都会自动重新部署。

角色与世界观名称属于原权利方。本仓库为非商业同人项目。
