# 素材上传与 Vercel 部署

## 一、上传素材

解压素材包，只需要把包内 `public/assets/` 中的内容上传到仓库同名目录。

必须得到以下路径：

```text
public/assets/backgrounds/hell-battlefield.png
public/assets/characters/phainon-normal-v3.png
public/assets/characters/phainon-god-v3.png
public/assets/enemies/enemy-sprites-v2.png
public/assets/effects/combat-vfx-v3.png
public/assets/asset-manifest.json
```

文件名和目录不能改变，否则游戏会使用占位绘制。

### GitHub 网页上传

1. 打开仓库 `w2334681436-wang/phainon-emberfall`。
2. 进入对应目录，例如 `public/assets/characters`。
3. 点击 **Add file → Upload files**。
4. 拖入该目录需要的 PNG 文件。
5. 在页面底部选择直接提交到 `main`，点击 **Commit changes**。
6. 对背景、角色、敌人、特效目录分别重复。

不要把整个 ZIP 直接上传到仓库；必须先解压，再上传 PNG。

## 二、本地检查（可选但推荐）

```bash
npm install
npm run assets:check
npm run check
npm run build
npm run dev
```

`assets:check` 会检查文件是否存在以及尺寸是否正确。

## 三、Vercel 首次部署

1. 在 Vercel 点击 **Add New → Project**。
2. 选择 GitHub 仓库 `w2334681436-wang/phainon-emberfall`。
3. Framework Preset 保持 **Next.js**。
4. Root Directory 保持仓库根目录，不要选择 `public` 或 `app`。
5. Build Command 保持 `next build` / `npm run build`。
6. 点击 **Deploy**。

## 四、以后更新

Vercel 与 GitHub 仓库连接后，每次向 `main` 提交素材或代码，都会触发新的 Production Deployment。部署完成后刷新网站即可看到最新素材；如果浏览器仍显示旧图，进行一次强制刷新或清理站点缓存。

## 图集布局

- 普通角色图集：5 列 × 6 行，三组 10 帧动作。
- 神厄角色图集：5 列 × 8 行，四组 10 帧动作。
- 特效图集：5 列 × 10 行，五组 10 帧特效。
- 敌人图集：8 列 × 3 行。
- 播放速度：20 FPS，每帧约 50 ms。
