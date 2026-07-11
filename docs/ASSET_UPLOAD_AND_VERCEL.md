# 新版素材上传与 Vercel 部署

## 一、解压素材包

下载并解压 `白厄游戏完整素材包_v2_固定锚点版.zip`。真正需要上传到仓库的是压缩包中的 `public/assets/` 目录。

必须得到以下路径：

```text
public/assets/backgrounds/hell-battlefield.png
public/assets/characters/phainon-normal-v3.png
public/assets/characters/phainon-god-v3.png
public/assets/enemies/enemy-sprites-v2.png
public/assets/effects/combat-vfx-v3.png
public/assets/asset-manifest.json
```

文件名、目录名和大小写不能改变。

## 二、新版素材解决的问题

- 普通形态所有落地帧使用相同脚底基准线。
- 神厄悬浮待机、攻击和施法保持固定身体中心与悬浮高度。
- 开大变身为独立 10 帧动画。
- 普通角色、神厄角色和攻击特效分别保存，防止特效改变角色位置。
- 敌人全部替换为黑色或炭黑色怪物，并带红色熔火纹理。
- 小怪、精英和 Boss 每行都使用统一地面锚点。

## 三、GitHub 网页上传

1. 打开仓库 `w2334681436-wang/phainon-emberfall`。
2. 进入 `public/assets/backgrounds`。
3. 点击 **Add file → Upload files**。
4. 上传 `hell-battlefield.png`，点击 **Commit changes**。
5. 进入 `public/assets/characters`，上传两个角色 PNG。
6. 进入 `public/assets/enemies`，上传敌人 PNG。
7. 进入 `public/assets/effects`，上传特效 PNG。
8. 进入 `public/assets`，上传新版 `asset-manifest.json`。

不要把 ZIP 文件直接放进仓库。必须先解压，再上传其中的 PNG 和 JSON。

## 四、检查文件尺寸

```text
hell-battlefield.png       1000 × 560
phainon-normal-v3.png      1000 × 1200
phainon-god-v3.png         1000 × 1600
enemy-sprites-v2.png       1536 × 576
combat-vfx-v3.png          1000 × 2000
```

有 Node.js 时，在仓库根目录运行：

```bash
npm install
npm run assets:check
npm run check
npm run build
```

`assets:check` 应当全部显示通过。

## 五、Vercel 首次部署

1. 在 Vercel 点击 **Add New → Project**。
2. 导入 GitHub 仓库 `w2334681436-wang/phainon-emberfall`。
3. Framework Preset 保持 **Next.js**。
4. Root Directory 保持仓库根目录。
5. Build Command 保持 `npm run build`。
6. 点击 **Deploy**。

## 六、已经连接过 Vercel 的情况

你的仓库提交到 `main` 后，Vercel 会自动重新部署。进入 Vercel 的 **Deployments** 页面，等待最新部署显示绿色 `Ready`。随后打开游戏地址并强制刷新：

```text
Windows / Linux：Ctrl + Shift + R
macOS：Command + Shift + R
```

手机端关闭旧页面再重新打开；仍显示旧素材时，清理该站点缓存。

## 七、图集布局

- 普通角色：5 列 × 6 行，待机、移动、普攻角色动作各 10 帧。
- 神厄角色：5 列 × 8 行，变身、悬浮、红斩角色动作、陨石施法动作各 10 帧。
- 特效：5 列 × 10 行，黄色剑气、蓝色剑气、红色空间斩、陨石雨、巨大陨石各 10 帧。
- 敌人：8 列 × 3 行，黑色小怪、黑色精英、黑色 Boss。
- 播放速度：20 FPS，每帧 50 ms。
