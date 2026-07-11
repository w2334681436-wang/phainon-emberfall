# 白厄：逐火残响（Phainon: Emberfall）

原创像素同人横版动作游戏原型。角色与世界观名称属于原权利方；本仓库不包含官方图片、音频或游戏文件，全部图形、粒子、序列动画与音效均由代码程序化生成。

## 当前首版已实现

- 三段普通攻击、空中攻击、闪避无敌帧、跳跃与组合连招
- 战技与能量消耗
- 终结技：限时变身“神厄”，替换普攻和战技
- 小怪、远程怪、冲锋怪、精英怪、最终 Boss「绝灭大君·焚风」
- 三个连续关卡、道具掉落、生命/能量/终结技量表
- GAL 式剧情字幕与角色像素立绘
- 程序化透明像素序列动画、粒子特效和 WebAudio 音效
- 键鼠与手机触屏操作、自适应横竖屏
- localStorage 关卡进度存档

## 本地运行

```bash
npm install
npm run dev
```

## Vercel 部署

1. 登录 Vercel，点击 **Add New → Project**。
2. 导入 `w2334681436-wang/phainon-emberfall`。
3. Framework Preset 选择 **Vite**（通常会自动识别）。
4. Build Command 使用 `npm run build`。
5. Output Directory 使用 `dist`。
6. 点击 **Deploy**。

以后每次 main 分支有新提交，Vercel 都会自动重新部署。

## 操作

- `A / D` 或方向键：移动
- `W / Space / ↑`：跳跃
- `Shift`：闪避
- `J`：普通攻击，连续按可三段连击
- `K`：战技
- `L`：终结技 / 神厄变身
- `Esc / P`：暂停

## 免责声明

本项目是非商业学习与同人原型，不代表、也未获 HoYoverse/米哈游官方授权。请勿将本项目用于商业用途。
