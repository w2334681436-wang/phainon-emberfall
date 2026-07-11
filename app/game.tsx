"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "menu" | "story" | "playing" | "paused" | "dead" | "won";
type Enemy = {
  x: number;
  y: number;
  vx: number;
  hp: number;
  max: number;
  kind: number;
  boss?: boolean;
  hit: number;
  facing: number;
};
type Fx = { x: number; y: number; life: number; kind: string };
type Meteor = {
  x: number;
  life: number;
  max: number;
  large: boolean;
};

const GROUND_Y = 485;
const ANIM_FRAME_TICKS = 6; // 60Hz logic -> 10fps sprite animation
const NORMAL_ANCHOR_Y: Record<number, number[]> = {
  0: [0, 0, 0, 0, 0, 8, 8, 8, 8, 8],
  2: [0, 3, 6, 3, 0, 6, 8, 11, 14, 11],
  4: [0, 1, 1, 1, 1, 1, 27, 24, 24, 0],
};
const GOD_ANCHOR_Y: Record<number, number[]> = {
  2: [0, 0, 0, 0, 12, 25, 25, 25, 25, 24],
  4: [2, 0, 9, 9, 0, 2, 7, 11, 10, 2],
  6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const CHAPTERS = ["焦土边境", "熔炉回廊", "毁灭王庭"];
const DIALOGUE = [
  ["旁白", "黑潮漫过翁法罗斯最后的边境。火种仍在呼吸。"],
  ["白厄", "我会背负万众的命运——直到新世界迎来第一缕曙光。"],
  ["焚风", "英雄？我只看见一枚尚未爆裂的火种。来，让毁灭替你加冕。"],
];

export default function Game() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const [mode, setMode] = useState<Mode>("menu"),
    [chapter, setChapter] = useState(0),
    [dialog, setDialog] = useState(0);
  const [ui, setUi] = useState({
    hp: 100,
    mp: 40,
    ult: 55,
    score: 0,
    combo: 0,
    transform: false,
    boss: 0,
  });
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false);
  const start = () => {
    setDialog(0);
    setMode("story");
  };
  const nextStory = () => {
    if (dialog < 2) setDialog(dialog + 1);
    else setMode("playing");
  };

  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (e.code === "Escape")
        setMode((m) =>
          m === "playing" ? "paused" : m === "paused" ? "playing" : m,
        );
    };
    const u = (e: KeyboardEvent) => (keys.current[e.code] = false);
    addEventListener("keydown", d);
    addEventListener("keyup", u);
    return () => {
      removeEventListener("keydown", d);
      removeEventListener("keyup", u);
    };
  }, []);

  useEffect(() => {
    if (mode !== "playing") return;
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    let raf = 0,
      last = performance.now(),
      spawn = 0,
      levelTime = 0,
      shake = 0,
      uiLast = 0;
    let p = {
      x: 170,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      hp: 100,
      mp: 40,
      ult: 55,
      face: 1,
      ground: true,
      inv: 0,
      hurt: 0,
      atk: 0,
      skill: 0,
      trans: 0,
      transforming: 0,
      skillStep: -1,
      combo: 0,
      score: 0,
    };
    let enemies: Enemy[] = [];
    let fx: Fx[] = [];
    let meteors: Meteor[] = [];
    const bg = new Image();
    bg.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/hell-battlefield.png";
    const heroNormal = new Image();
    heroNormal.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/phainon-normal-v3.png";
    const heroGod = new Image();
    heroGod.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/phainon-god-v3.png";
    const foes = new Image();
    foes.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/enemy-sprites-v2.png";
    const vfx = new Image();
    vfx.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/combat-vfx-v3.png";
    const hit = (power: number, range: number) => {
      let landed = false;
      enemies.forEach((e) => {
        if (Math.abs(e.x - p.x) < range && Math.abs(e.y - p.y) < 110) {
          e.hp -= power;
          e.hit = 8;
          e.vx = p.face * 4;
          landed = true;
          fx.push({
            x: e.x,
            y: e.y - 50,
            life: 22,
            kind: p.trans ? "sun" : "slash",
          });
        }
      });
      if (landed) {
        p.combo++;
        p.score += 50 * p.combo;
        if (!p.trans) p.ult = Math.min(100, p.ult + 14);
        p.mp = Math.min(100, p.mp + 8);
      }
    };
    const meteorHit = (x: number, power: number, radius: number) => {
      let landed = false;
      enemies.forEach((e) => {
        if (Math.abs(e.x - x) <= radius) {
          e.hp -= power;
          e.hit = 10;
          e.vx = Math.sign(e.x - x || 1) * 5;
          landed = true;
        }
      });
      if (landed) {
        p.combo++;
        p.score += power * 8;
      }
    };
    const press = (code: string) => {
      if (keys.current[code]) {
        keys.current[code] = false;
        return true;
      }
      return false;
    };
    function frame(t: number) {
      let dt = Math.min(2, (t - last) / 16.67);
      last = t;
      levelTime += dt;
      const left = keys.current.KeyA || keys.current.ArrowLeft,
        right = keys.current.KeyD || keys.current.ArrowRight;
      p.vx += (right ? 0.8 : 0) - (left ? 0.8 : 0);
      p.vx *= 0.78;
      p.vx = Math.max(-6, Math.min(6, p.vx));
      if (Math.abs(p.vx) > 0.2) p.face = Math.sign(p.vx);
      if (press("Space") && p.ground) {
        p.vy = -12;
        p.ground = false;
      }
      if (press("ShiftLeft") || press("KeyL")) {
        p.vx = p.face * 16;
        p.inv = 22;
        fx.push({ x: p.x, y: p.y, life: 12, kind: "dash" });
      }
      if (press("KeyJ") && p.atk <= 0 && p.transforming <= 0) {
        p.atk = 60;
        hit(p.trans ? 34 : 18, p.trans ? 165 : 115);
      }
      if (press("KeyK") && p.skill <= 0 && p.mp >= 20 && p.transforming <= 0) {
        p.skill = p.trans > 0 ? 150 : 60;
        p.skillStep = -1;
        p.mp -= 20;
        if (p.trans > 0) {
          setNotice("天陨劫火 · 全域轰炸");
          window.setTimeout(() => setNotice(""), 1100);
        } else hit(38, 185);
        if (!p.trans) p.ult = Math.min(100, p.ult + 24);
        shake = 8;
      }
      const wantsUlt = press("KeyI") || press("KeyU");
      if (wantsUlt && !p.trans && p.transforming <= 0) {
        if (p.ult >= 100) {
          p.ult = 100;
          p.transforming = 60;
          p.hp = Math.min(100, p.hp + 30);
          shake = 18;
          fx.push({ x: p.x, y: p.y - 80, life: 80, kind: "transform" });
          setNotice("神厄降世 · 卡厄斯兰那");
          setTimeout(() => setNotice(""), 1600);
        } else {
          setNotice(`火种未满 ${Math.floor(p.ult)} / 100`);
          setTimeout(() => setNotice(""), 900);
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.65 * dt;
      if (p.y >= GROUND_Y) {
        p.y = GROUND_Y;
        p.vy = 0;
        p.ground = true;
      }
      p.x = Math.max(55, Math.min(930, p.x));
      p.inv = Math.max(0, p.inv - dt);
      p.hurt = Math.max(0, p.hurt - dt);
      p.atk = Math.max(0, p.atk - dt);
      p.skill = Math.max(0, p.skill - dt);
      if (p.transforming > 0) {
        p.transforming = Math.max(0, p.transforming - dt);
        p.vx = 0;
        p.vy = 0;
        p.y = GROUND_Y;
        if (p.transforming === 0) p.trans = 1;
      } else if (p.trans) {
        p.ult = Math.max(0, p.ult - 0.11 * dt);
        if (p.ult === 0) {
          p.trans = 0;
          p.skill = 0;
          meteors = [];
          setNotice("火种耗尽 · 返回白厄");
          window.setTimeout(() => setNotice(""), 1000);
        }
      }
      p.mp = Math.min(100, p.mp + 0.11 * dt);
      if (!p.trans && p.transforming <= 0)
        p.ult = Math.min(100, p.ult + 0.018 * dt);

      if (p.trans && p.skill > 0) {
        const step = Math.min(13, Math.floor((150 - p.skill) / 10));
        if (step > p.skillStep) {
          p.skillStep = step;
          const large = step === 13;
          const x = large ? 500 : 70 + Math.random() * 860;
          meteors.push({ x, life: large ? 66 : 46, max: large ? 66 : 46, large });
          meteorHit(x, large ? 110 : 28, large ? 260 : 105);
          shake = large ? 24 : 7;
        }
      }
      meteors.forEach((m) => (m.life = Math.max(0, m.life - dt)));
      meteors = meteors.filter((m) => m.life > 0);
      spawn -= dt;
      if (spawn <= 0 && levelTime < 1850) {
        let boss = levelTime > 1450 && enemies.every((e) => !e.boss);
        if (enemies.length < (boss ? 1 : 5)) {
          let kind = boss ? 6 : Math.floor(Math.random() * 6);
          let hp = boss ? 720 : kind > 3 ? 120 : 45;
          enemies.push({
            x: boss ? 830 : 990,
            y: GROUND_Y,
            vx: boss ? -1 : -1.2 - Math.random(),
            hp,
            max: hp,
            kind,
            boss,
            hit: 0,
            facing: -1,
          });
          spawn = boss ? 9999 : 70;
        }
      }
      enemies.forEach((e) => {
        let dist = p.x - e.x;
        e.facing = Math.sign(dist) || e.facing;
        if (Math.abs(dist) > 70) e.vx += Math.sign(dist) * 0.04;
        e.vx *= 0.94;
        e.x += e.vx * dt;
        e.hit--;
        if (Math.abs(dist) < 72 && p.inv <= 0 && e.hit <= 0) {
          p.hp -= e.boss ? 14 : 7;
          p.inv = 48;
          p.hurt = 18;
          p.vx = Math.sign(dist) * -8;
          p.combo = 0;
          shake = 7;
          fx.push({ x: p.x, y: p.y - 40, life: 15, kind: "hurt" });
        }
      });
      enemies = enemies.filter((e) => {
        if (e.hp <= 0) {
          p.score += e.boss ? 5000 : 250;
          p.mp = Math.min(100, p.mp + 18);
          if (!p.trans) p.ult = Math.min(100, p.ult + 12);
          fx.push({ x: e.x, y: e.y - 45, life: 35, kind: "boom" });
          return false;
        }
        return true;
      });
      fx.forEach((f) => f.life--);
      fx = fx.filter((f) => f.life > 0);
      shake *= 0.85;
      if (p.hp <= 0) {
        setMode("dead");
        return;
      }
      if (levelTime > 1500 && !enemies.some((e) => e.boss) && spawn > 9000) {
        setMode("won");
        return;
      }
      draw(
        ctx,
        c!,
        p,
        enemies,
        fx,
        meteors,
        bg,
        heroNormal,
        heroGod,
        foes,
        vfx,
        shake,
        levelTime,
      );
      if (t - uiLast >= 100) {
        uiLast = t;
        setUi({
          hp: p.hp,
          mp: p.mp,
          ult: p.ult,
          score: p.score,
          combo: p.combo,
          transform: p.trans > 0 || p.transforming > 0,
          boss: enemies.find((e) => e.boss)?.hp || 0,
        });
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode, chapter]);

  const touch = (code: string, on = true) => {
    keys.current[code] = on;
    if (on && !["KeyA", "KeyD"].includes(code))
      window.setTimeout(() => {
        keys.current[code] = false;
      }, 160);
  };
  return (
    <main className="game-shell">
      <div className="topbar">
        <div className="brand">
          <span className="sunmark">✦</span>
          <div>
            <b>白厄：逐火残响</b>
            <small>PHΛINON · EMBERFALL</small>
          </div>
        </div>
        <div className="chapter">
          {CHAPTERS[chapter]} <i>·</i> 第 {chapter + 1} 幕
        </div>
        <div className="top-actions">
          <button onClick={() => setHelp(!help)}>键位</button>
          <button aria-label="声音" onClick={() => setMuted(!muted)}>
            {muted ? "◌" : "◉"}
          </button>
          <button onClick={() => setMode("paused")}>Ⅱ</button>
        </div>
      </div>
      <section className="viewport">
        <canvas ref={canvas} width="1000" height="560" />
        {mode === "menu" && (
          <div className="menu overlay">
            <div className="eyebrow">非官方同人像素游戏</div>
            <h1>
              以「负世」之火
              <br />
              <em>劈开毁灭。</em>
            </h1>
            <p>
              踏过三重焦土，积蓄火种，化身卡厄斯兰那。
              <br />
              绝灭大君·焚风，正在王庭尽头等待。
            </p>
            <button className="start" onClick={start}>
              开始远征 <span>›</span>
            </button>
            <div className="difficulty">
              <span>难度</span>
              <button>逐火者</button>
              <button className="active">救世主</button>
              <button>负世者</button>
            </div>
            <div className="legal">粉丝创作 · 角色版权归原权利方所有</div>
          </div>
        )}
        {mode === "story" && (
          <div className="story overlay" onClick={nextStory}>
            <div className="portrait">
              <span>{dialog === 2 ? "焚" : "白"}</span>
            </div>
            <div className="dialog">
              <b>{DIALOGUE[dialog][0]}</b>
              <p>{DIALOGUE[dialog][1]}</p>
              <small>点击继续　▼</small>
            </div>
          </div>
        )}
        {(mode === "playing" || mode === "paused") && (
          <>
            <div className="hud">
              <div className="avatar">白</div>
              <div className="bars">
                <div className="name">
                  <b>{ui.transform ? "卡厄斯兰那" : "白厄"}</b>
                  <span>LV.80</span>
                </div>
                <div className="bar hp">
                  <i style={{ width: `${ui.hp}%` }} />
                  <span>{Math.ceil(ui.hp)} / 100</span>
                </div>
                <div className="bar mp">
                  <i style={{ width: `${ui.mp}%` }} />
                </div>
              </div>
            </div>
            <div className="score">
              <small>SCORE</small>
              {String(ui.score).padStart(7, "0")}
              {ui.combo > 1 && <b>{ui.combo} HIT</b>}
            </div>
            <div className="ult">
              <div
                className={ui.ult >= 100 ? "ready" : ""}
                style={
                  { "--charge": `${ui.ult * 3.6}deg` } as React.CSSProperties
                }
              >
                <span>{ui.transform ? "神" : "火"}</span>
              </div>
              <b>{ui.transform ? "神厄降世" : "救世之火"}</b>
              <small>
                {ui.transform
                  ? `神厄能量 ${Math.ceil(ui.ult)}% · 持续消耗中`
                  : ui.ult >= 100
                    ? "按 I 释放"
                    : "攻击积攒火种"}
              </small>
            </div>
            <div className="skills">
              <kbd>
                J<small>普攻</small>
              </kbd>
              <kbd>
                K<small>战技</small>
              </kbd>
              <kbd className={ui.ult >= 100 ? "hot" : ""}>
                I<small>终结技</small>
              </kbd>
            </div>
          </>
        )}
        {mode === "paused" && (
          <Modal
            title="远征暂停"
            action="继续战斗"
            onAction={() => setMode("playing")}
            extra={() => setMode("menu")}
          />
        )}{" "}
        {mode === "dead" && (
          <Modal
            title="火种尚未熄灭"
            action="再次挑战"
            onAction={() => setMode("playing")}
            extra={() => setMode("menu")}
          />
        )}{" "}
        {mode === "won" && (
          <div className="result overlay">
            <div className="clear-seal">✦</div>
            <small>STAGE CLEAR · 关卡通关</small>
            <h2>黎明，终将抵达。</h2>
            <p>
              绝灭大君·焚风的投影已被击破
              <br />
              最终得分　<b>{ui.score}</b>　·　最高连击　<b>{ui.combo}</b>
            </p>
            <div className="clear-rank">S</div>
            <button
              className="start"
              onClick={() => {
                setChapter((chapter + 1) % 3);
                setMode("menu");
              }}
            >
              继续逐火远征
            </button>
          </div>
        )}
        {notice && <div className="game-notice">{notice}</div>}
        {help && (
          <div className="help">
            <b>战斗键位</b>
            <p>A/D 移动　Space 跳跃</p>
            <p>J 普攻　K 战技　I 变身</p>
            <p>Shift 闪避冲刺　Esc 暂停</p>
            <button onClick={() => setHelp(false)}>知道了</button>
          </div>
        )}
        <div className="mobile">
          <button
            onPointerDown={() => touch("KeyA", true)}
            onPointerUp={() => touch("KeyA", false)}
            onPointerCancel={() => touch("KeyA", false)}
          >
            ◀
          </button>
          <button
            onPointerDown={() => touch("KeyD", true)}
            onPointerUp={() => touch("KeyD", false)}
            onPointerCancel={() => touch("KeyD", false)}
          >
            ▶
          </button>
          <button onPointerDown={() => touch("Space")}>跃</button>
          <button onPointerDown={() => touch("ShiftLeft")}>闪</button>
          <button onPointerDown={() => touch("KeyJ")}>斩</button>
          <button onPointerDown={() => touch("KeyK")}>技</button>
          <button
            className={ui.ult >= 100 ? "ultimate-ready" : ""}
            onPointerDown={() => touch("KeyI")}
          >
            神
          </button>
        </div>
      </section>
      <footer>
        <span>◈ 火种共鸣：稳定</span>
        <span>目标：穿越焦土，击破焚风投影</span>
        <span>v1.0 FAN PROJECT</span>
      </footer>
    </main>
  );
}

function Modal({
  title,
  action,
  onAction,
  extra,
}: {
  title: string;
  action: string;
  onAction: () => void;
  extra: () => void;
}) {
  return (
    <div className="modal overlay">
      <span>✦</span>
      <h2>{title}</h2>
      <button className="start" onClick={onAction}>
        {action}
      </button>
      <button className="ghost" onClick={extra}>
        返回标题
      </button>
    </div>
  );
}

function drawAtlas(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  pair: number,
  frame: number,
  totalRows: number,
  x: number,
  y: number,
  w: number,
  h: number,
  flip = false,
) {
  if (!image.complete || !image.naturalWidth) return false;
  const f = ((Math.floor(frame) % 10) + 10) % 10;
  const sw = image.naturalWidth / 5;
  const sh = image.naturalHeight / totalRows;
  const col = f % 5;
  const row = pair + Math.floor(f / 5);
  const anchorTable = image.src.includes("phainon-normal")
    ? NORMAL_ANCHOR_Y
    : image.src.includes("phainon-god")
      ? GOD_ANCHOR_Y
      : undefined;
  const anchorOffset = (anchorTable?.[pair]?.[f] || 0) * (h / 200);
  const dx = Math.round(x);
  const dy = Math.round(y + anchorOffset);
  ctx.save();
  ctx.translate(dx + (flip ? w : 0), dy);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.drawImage(image, col * sw, row * sh, sw, sh, 0, 0, w, h);
  ctx.restore();
  return true;
}

function draw(
  ctx: CanvasRenderingContext2D,
  c: HTMLCanvasElement,
  p: any,
  enemies: Enemy[],
  fx: Fx[],
  meteors: Meteor[],
  bg: HTMLImageElement,
  heroNormal: HTMLImageElement,
  heroGod: HTMLImageElement,
  foes: HTMLImageElement,
  vfx: HTMLImageElement,
  shake: number,
  time: number,
) {
  ctx.save();
  // Deterministic camera impulse avoids random per-frame sprite jitter.
  ctx.translate(
    Math.round(Math.sin(time * 1.73) * shake * 0.42),
    Math.round(Math.cos(time * 2.11) * shake * 0.24),
  );
  ctx.fillStyle = "#12090b";
  ctx.fillRect(0, 0, c.width, c.height);
  if (bg.complete) ctx.drawImage(bg, 0, 0, c.width, c.height);
  else {
    let g = ctx.createLinearGradient(0, 0, 0, 560);
    g.addColorStop(0, "#17070b");
    g.addColorStop(0.55, "#6a1711");
    g.addColorStop(1, "#130808");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1000, 560);
  }
  ctx.fillStyle = "rgba(255,89,25,.18)";
  for (let i = 0; i < 18; i++) {
    let x = (i * 173 + time * 1.4) % 1000,
      y = 100 + ((i * 67) % 330);
    ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
  }
  ctx.fillStyle = "#180b0a";
  ctx.fillRect(0, 485, 1000, 75);
  ctx.fillStyle = "#742617";
  ctx.fillRect(0, 485, 1000, 5);
  enemies.forEach((e) => {
    const ex = Math.round(e.x);
    ctx.save();
    if (e.facing < 0) {
      ctx.translate(ex * 2, 0);
      ctx.scale(-1, 1);
    }
    if (e.hit > 0) ctx.globalCompositeOperation = "screen";
    let scale = e.boss ? 1.8 : e.kind > 3 ? 1.25 : 1;
    if (foes.complete && foes.naturalWidth) {
      let cols = 8,
        sw = foes.naturalWidth / cols,
        sh = foes.naturalHeight / 3,
        row = e.boss ? 2 : e.kind > 3 ? 1 : 0,
        col = e.hit > 0 ? 7 : Math.floor(time / (e.boss ? 12 : 8)) % 3;
      ctx.drawImage(
        foes,
        col * sw,
        row * sh,
        sw,
        sh,
        ex - 55 * scale,
        e.y - 135 * scale,
        110 * scale,
        140 * scale,
      );
    } else {
      ctx.fillStyle = e.boss ? "#f05a24" : "#351a24";
      ctx.fillRect(ex - 25 * scale, e.y - 70 * scale, 50 * scale, 70 * scale);
      ctx.fillStyle = "#ffc15b";
      ctx.fillRect(ex - 12 * scale, e.y - 55 * scale, 8, 8);
    }
    ctx.restore();
    ctx.fillStyle = "#1b0909";
    ctx.fillRect(ex - 40 * scale, e.y - 115 * scale, 80 * scale, 6);
    ctx.fillStyle = e.boss ? "#f45a24" : "#e9b45f";
    ctx.fillRect(
      ex - 40 * scale,
      e.y - 115 * scale,
      80 * scale * (e.hp / e.max),
      6,
    );
  });
  const idleFrame = Math.floor(time / ANIM_FRAME_TICKS) % 10;
  const flip = p.face < 0;
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = p.trans > 0 ? "#f2c95f" : "#080508";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 2, p.trans > 0 ? 55 : 34, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  let drawn = false;
  if (p.transforming > 0) {
    const f = Math.max(
      0,
      Math.min(9, Math.floor((60 - p.transforming) / ANIM_FRAME_TICKS)),
    );
    drawn = drawAtlas(
      ctx,
      heroGod,
      0,
      f,
      8,
      Math.round(p.x - 105),
      GROUND_Y - 220,
      220,
      220,
      flip,
    );
  } else if (p.trans > 0) {
    const pair = p.skill > 0 ? 6 : p.atk > 0 ? 4 : 2;
    const f =
      p.skill > 0
        ? Math.floor((150 - p.skill) / 15) % 10
        : p.atk > 0
          ? Math.floor((60 - p.atk) / ANIM_FRAME_TICKS)
          : idleFrame;
    drawn = drawAtlas(
      ctx,
      heroGod,
      pair,
      f,
      8,
      Math.round(p.x - 110),
      GROUND_Y - 220,
      220,
      220,
      flip,
    );
  } else {
    const pair = p.skill > 0 || p.atk > 0 ? 4 : Math.abs(p.vx) > 1 ? 2 : 0;
    const f =
      p.skill > 0
        ? Math.floor((60 - p.skill) / ANIM_FRAME_TICKS)
        : p.atk > 0
          ? Math.floor((60 - p.atk) / ANIM_FRAME_TICKS)
          : idleFrame;
    drawn = drawAtlas(
      ctx,
      heroNormal,
      pair,
      f,
      6,
      Math.round(p.x - 80),
      GROUND_Y - 160,
      160,
      160,
      flip,
    );
  }
  if (!drawn) {
    ctx.fillStyle = p.trans ? "#ffd46d" : "#e8e3df";
    ctx.fillRect(p.x - 18, p.y - 82, 36, 82);
    ctx.fillStyle = "#d9502a";
    ctx.fillRect(p.x + 10, p.y - 62, 44, 7);
  }
  if (vfx.complete && vfx.naturalWidth) {
    if (p.atk > 0) {
      const f = Math.floor((60 - p.atk) / ANIM_FRAME_TICKS);
      const pair = p.trans > 0 ? 4 : 0;
      const w = p.trans > 0 ? 360 : 260,
        h = p.trans > 0 ? 230 : 160;
      const x = p.face > 0 ? p.x - 15 : p.x - w + 15;
      drawAtlas(ctx, vfx, pair, f, 10, x, p.y - h / 2 - 55, w, h, flip);
    }
    if (p.skill > 0 && p.trans <= 0) {
      const f = Math.floor((60 - p.skill) / ANIM_FRAME_TICKS),
        w = 400,
        h = 230;
      const x = p.face > 0 ? p.x - 20 : p.x - w + 20;
      drawAtlas(ctx, vfx, 2, f, 10, x, p.y - h / 2 - 55, w, h, flip);
    }
    meteors.forEach((meteor) => {
      const progress = 1 - meteor.life / meteor.max;
      const f = Math.min(9, Math.floor(progress * 10));
      const w = meteor.large ? 620 : 300,
        h = meteor.large ? 520 : 330;
      drawAtlas(
        ctx,
        vfx,
        meteor.large ? 8 : 6,
        f,
        10,
        Math.round(meteor.x - w / 2),
        485 - h,
        w,
        h,
        false,
      );
    });
  }
  fx.forEach((f) => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life / 8);
    ctx.strokeStyle =
      f.kind === "transform"
        ? "#ffe6a0"
        : f.kind === "hurt"
          ? "#ff304f"
          : "#ff6b2e";
    ctx.lineWidth = f.kind === "transform" ? 12 : 5;
    ctx.beginPath();
    ctx.arc(
      f.x,
      f.y,
      Math.max(12, f.kind === "transform" ? 105 - f.life : 70 - f.life * 1.7),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}
