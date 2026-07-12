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
  skill?: number;
  skillTime?: number;
  skillMax?: number;
  skillStep?: number;
  cooldown?: number;
};
type Fx = { x: number; y: number; life: number; kind: string };
type Meteor = {
  x: number;
  life: number;
  max: number;
  large: boolean;
};
type BossFx = {
  x: number;
  y: number;
  life: number;
  max: number;
  kind: "wave" | "blackhole" | "sword" | "whitehole" | "teleport";
  vx?: number;
  hit?: boolean;
};
type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  mp: number;
  ult: number;
  face: number;
  ground: boolean;
  inv: number;
  hurt: number;
  atk: number;
  skill: number;
  dodge: number;
  trans: number;
  transforming: number;
  skillStep: number;
  combo: number;
  score: number;
};

const GROUND_Y = 485;
const ANIM_FRAME_TICKS = 6; // 60Hz logic -> 10fps sprite animation
const NORMAL_ATTACK_RANGE = 230;
const GOD_ATTACK_RANGE = 400;
const MINIONS_TO_BOSS = 12;
const BOSS_MAX_HP = 1600;
const DEFAULT_CONTROLS = {
  opacity: 0.56,
  moveX: 0,
  moveY: 0,
  actionX: 0,
  actionY: 0,
};
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

const GOD_ANCHOR_X: Record<number, number[]> = {
  // Keep the body center stable without cancelling the intended sword motion.
  2: [-6, 0, 1, -3, 8, -4, 0, 3, -2, 8],
  4: [-7, -8, 7, 7, -8, -7, 0, 7, 8, -7],
  6: [-8, 5, 8, 8, 8, 5, -8, 5, 8, 8],
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
    bossMax: BOSS_MAX_HP,
    bossActive: false,
  });
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false);
  const [controlSettings, setControlSettings] = useState(false);
  const [controls, setControls] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_CONTROLS;
    try {
      const stored = localStorage.getItem("phainon-touch-controls");
      return stored ? { ...DEFAULT_CONTROLS, ...JSON.parse(stored) } : DEFAULT_CONTROLS;
    } catch {}
    return DEFAULT_CONTROLS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("phainon-touch-controls", JSON.stringify(controls));
    } catch {}
  }, [controls]);
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
    const p: Player = {
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
      dodge: 0,
      trans: 0,
      transforming: 0,
      skillStep: -1,
      combo: 0,
      score: 0,
    };
    let enemies: Enemy[] = [];
    let fx: Fx[] = [];
    let meteors: Meteor[] = [];
    let bossFx: BossFx[] = [];
    let minionKills = 0,
      bossIntro = 0,
      bossArena = false,
      bossDefeated = false;
    const bg = new Image();
    bg.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/hell-battlefield.png";
    const heroNormal = new Image();
    heroNormal.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/phainon-normal-v3.png";
    const heroGod = new Image();
    heroGod.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/phainon-god-v3.png";
    const heroJump = new Image();
    heroJump.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/phainon-jump-v4.png";
    const heroRun = new Image();
    heroRun.src = "/assets/phainon-run-v6.png";
    const heroDodge = new Image();
    heroDodge.src = "/assets/phainon-dodge-v6.png";
    const foes = new Image();
    foes.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/enemy-sprites-v2.png";
    const vfx = new Image();
    vfx.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/combat-vfx-v3.png";
    const bossSheet = new Image();
    bossSheet.src = "/assets/fenfeng-boss-v6.png";
    const whiteHole = new Image();
    whiteHole.src = "https://phainon-emberfall.opal-mint-9707.chatgpt.site/assets/white-hole-battlefield-v4.png";
    const hit = (power: number, range: number) => {
      let landed = false;
      enemies.forEach((e) => {
        const forward = (e.x - p.x) * p.face;
        if (forward > -32 && forward < range && Math.abs(e.y - p.y) < 150) {
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
    const hurtPlayer = (damage: number, knockback = 0) => {
      if (p.inv > 0) return;
      p.hp -= damage;
      p.inv = 42;
      p.hurt = 18;
      p.vx = knockback;
      p.combo = 0;
      shake = Math.max(shake, 9);
      fx.push({ x: p.x, y: p.y - 50, life: 18, kind: "hurt" });
    };
    function frame(t: number) {
      const dt = Math.min(2, (t - last) / 16.67);
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
        p.dodge = 54;
        fx.push({ x: p.x, y: p.y, life: 12, kind: "dash" });
      }
      if (press("KeyJ") && p.atk <= 0 && p.transforming <= 0) {
        p.atk = 60;
        hit(
          p.trans ? 34 : 18,
          p.trans ? GOD_ATTACK_RANGE : NORMAL_ATTACK_RANGE,
        );
      }
      if (press("KeyK") && p.skill <= 0 && p.mp >= 20 && p.transforming <= 0) {
        p.skill = p.trans > 0 ? 150 : 60;
        p.skillStep = -1;
        p.mp -= 20;
        if (p.trans > 0) {
          setNotice("天陨劫火 · 全域轰炸");
          window.setTimeout(() => setNotice(""), 1100);
        } else hit(38, 320);
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
      p.dodge = Math.max(0, p.dodge - dt);
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
      if (!bossArena && minionKills < MINIONS_TO_BOSS && spawn <= 0) {
        if (enemies.length < 4) {
          const kind = Math.floor(Math.random() * 6);
          const hp = kind > 3 ? 120 : 45;
          enemies.push({
            x: Math.random() > 0.5 ? 990 : 10,
            y: GROUND_Y,
            vx: 0,
            hp,
            max: hp,
            kind,
            hit: 0,
            facing: -1,
          });
          spawn = 58;
        }
      }
      if (!bossArena && minionKills >= MINIONS_TO_BOSS && enemies.length === 0) {
        bossArena = true;
        bossIntro = 100;
        p.vx = 0;
        setNotice("绝灭大君 · 焚风");
        window.setTimeout(() => setNotice(""), 2200);
      }
      if (bossIntro > 0) {
        bossIntro = Math.max(0, bossIntro - dt);
        p.vx *= 0.5;
        if (bossIntro < 48 && !enemies.some((e) => e.boss)) {
          enemies.push({
            x: 790,
            y: 390,
            vx: 0,
            hp: BOSS_MAX_HP,
            max: BOSS_MAX_HP,
            kind: 7,
            boss: true,
            hit: 0,
            facing: -1,
            skill: -1,
            skillTime: 0,
            skillMax: 0,
            skillStep: -1,
            cooldown: 55,
          });
        }
      }
      enemies.forEach((e) => {
        const dist = p.x - e.x;
        e.facing = Math.sign(dist) || e.facing;
        e.hit = Math.max(0, e.hit - dt);
        if (!e.boss) {
          if (Math.abs(dist) > 62) e.vx += Math.sign(dist) * 0.045;
          e.vx *= 0.93;
          e.x += e.vx * dt;
          if (Math.abs(dist) < 66 && e.hit <= 0) hurtPlayer(7, -Math.sign(dist) * 7);
          return;
        }

        e.vx = 0;
        e.cooldown = Math.max(0, (e.cooldown || 0) - dt);
        if ((e.skillTime || 0) <= 0 && (e.cooldown || 0) <= 0) {
          e.skill = Math.floor(Math.random() * 5);
          const durations = [78, 96, 112, 112, 150];
          const skillNames = ["无距瞬斩", "白焰断空", "深渊引力", "棱镜剑雨", "终末白洞"];
          e.skillMax = durations[e.skill];
          e.skillTime = e.skillMax;
          e.skillStep = -1;
          setNotice(`焚风 · ${skillNames[e.skill]}`);
          window.setTimeout(() => setNotice(""), 900);
        }
        if ((e.skillTime || 0) > 0) {
          e.skillTime = Math.max(0, (e.skillTime || 0) - dt);
          const elapsed = (e.skillMax || 0) - (e.skillTime || 0);
          const step = Math.floor(elapsed / 12);
          if (step > (e.skillStep ?? -1)) {
            e.skillStep = step;
            if (e.skill === 0 && step === 1) {
              bossFx.push({ x: e.x, y: e.y, life: 30, max: 30, kind: "teleport" });
              e.x = Math.max(80, Math.min(920, p.x - p.face * 105));
              e.facing = Math.sign(p.x - e.x) || -1;
            }
            if (e.skill === 0 && step === 3 && Math.abs(e.x - p.x) < 175)
              hurtPlayer(18, e.facing * 11);
            if (e.skill === 1 && step === 2)
              bossFx.push({ x: e.x, y: 425, life: 86, max: 86, kind: "wave", vx: e.facing * 11 });
            if (e.skill === 2 && step === 2)
              bossFx.push({ x: p.x, y: 280, life: 100, max: 100, kind: "blackhole" });
            if (e.skill === 3 && step >= 1 && step <= 7)
              bossFx.push({ x: 70 + Math.random() * 860, y: 35, life: 58, max: 58, kind: "sword" });
            if (e.skill === 4 && step === 4)
              bossFx.push({ x: 500, y: 230, life: 105, max: 105, kind: "whitehole" });
          }
          if (e.skillTime === 0) {
            e.skill = -1;
            e.cooldown = 38 + Math.random() * 26;
          }
        } else {
          e.x += Math.sign(dist) * Math.min(1.3, Math.abs(dist) * 0.008) * dt;
        }
      });

      bossFx.forEach((b) => {
        b.life = Math.max(0, b.life - dt);
        if (b.kind === "wave") {
          b.x += (b.vx || 0) * dt;
          if (!b.hit && Math.abs(b.x - p.x) < 58 && Math.abs(p.y - GROUND_Y) < 100) {
            b.hit = true;
            hurtPlayer(16, Math.sign(b.vx || 1) * 9);
          }
        }
        if (b.kind === "blackhole") {
          p.vx += Math.sign(b.x - p.x) * 0.18 * dt;
          if (Math.abs(b.x - p.x) < 90 && Math.floor(b.life) % 28 < 2)
            hurtPlayer(9, Math.sign(p.x - b.x) * 5);
        }
        if (b.kind === "sword") {
          b.y += 8.5 * dt;
          if (!b.hit && b.y > 390 && Math.abs(b.x - p.x) < 48) {
            b.hit = true;
            hurtPlayer(12, Math.sign(p.x - b.x) * 6);
          }
        }
        if (b.kind === "whitehole" && b.life < 52 && !b.hit) {
          b.hit = true;
          hurtPlayer(26, Math.sign(p.x - 500) * 13);
          shake = 28;
        }
      });
      bossFx = bossFx.filter((b) => b.life > 0 && b.x > -180 && b.x < 1180);
      enemies = enemies.filter((e) => {
        if (e.hp <= 0) {
          p.score += e.boss ? 5000 : 250;
          p.mp = Math.min(100, p.mp + 18);
          if (!p.trans) p.ult = Math.min(100, p.ult + 12);
          fx.push({ x: e.x, y: e.y - 45, life: 35, kind: "boom" });
          if (e.boss) bossDefeated = true;
          else minionKills++;
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
      if (bossDefeated && !enemies.some((e) => e.boss)) {
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
        bossFx,
        bg,
        whiteHole,
        heroNormal,
        heroGod,
        heroJump,
        heroRun,
        heroDodge,
        foes,
        bossSheet,
        vfx,
        shake,
        levelTime,
        bossArena,
        bossIntro,
      );
      if (t - uiLast >= 34) {
        uiLast = t;
        setUi({
          hp: Math.max(0, Math.min(100, p.hp)),
          mp: Math.max(0, Math.min(100, p.mp)),
          ult: Math.max(0, Math.min(100, p.ult)),
          score: p.score,
          combo: p.combo,
          transform: p.trans > 0 || p.transforming > 0,
          boss: enemies.find((e) => e.boss)?.hp || 0,
          bossMax: BOSS_MAX_HP,
          bossActive: enemies.some((e) => e.boss),
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
  const setControl = (key: keyof typeof controls, value: number) =>
    setControls((current) => ({ ...current, [key]: value }));
  const energy = Math.max(0, Math.min(100, ui.ult));
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
          <button
            className="touch-settings-trigger"
            aria-label="触控设置"
            onClick={() => setControlSettings(!controlSettings)}
          >
            ⚙
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
            {ui.bossActive && (
              <div className="boss-hud">
                <small>绝灭大君 · LORD RAVAGER</small>
                <b>焚风</b>
                <div>
                  <i style={{ width: `${(ui.boss / ui.bossMax) * 100}%` }} />
                </div>
                <em>{Math.ceil(ui.boss)} / {ui.bossMax}</em>
              </div>
            )}
            <div className="ult">
              <div
                className={ui.ult >= 100 ? "ready" : ""}
                style={
                  { "--charge": `${energy * 3.6}deg` } as React.CSSProperties
                }
              >
                <span>
                  {ui.transform ? "神" : "火"}
                  <em>{Math.round(energy)}%</em>
                </span>
              </div>
              <b>{ui.transform ? "神厄降世" : "救世之火"}</b>
              <small>
                {ui.transform
                  ? `神厄能量 ${Math.round(energy)}% · 持续消耗中`
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
        <div
          className="mobile-controls"
          style={
            {
              "--controls-opacity": controls.opacity,
              "--move-x": `${controls.moveX}px`,
              "--move-y": `${controls.moveY}px`,
              "--action-x": `${controls.actionX}px`,
              "--action-y": `${controls.actionY}px`,
            } as React.CSSProperties
          }
        >
          <div className="move-pad">
            <button
              aria-label="向左移动"
              onPointerDown={() => touch("KeyA", true)}
              onPointerUp={() => touch("KeyA", false)}
              onPointerLeave={() => touch("KeyA", false)}
              onPointerCancel={() => touch("KeyA", false)}
            >
              ◀
            </button>
            <button
              aria-label="向右移动"
              onPointerDown={() => touch("KeyD", true)}
              onPointerUp={() => touch("KeyD", false)}
              onPointerLeave={() => touch("KeyD", false)}
              onPointerCancel={() => touch("KeyD", false)}
            >
              ▶
            </button>
          </div>
          <div className="action-fan">
            <button className="jump" onPointerDown={() => touch("Space")}>跃</button>
            <button className="dodge" onPointerDown={() => touch("ShiftLeft")}>闪</button>
            <button className="attack" onPointerDown={() => touch("KeyJ")}>斩</button>
            <button className="skill" onPointerDown={() => touch("KeyK")}>技</button>
            <button
              className={`ultimate ${ui.ult >= 100 ? "ultimate-ready" : ""}`}
              onPointerDown={() => touch("KeyI")}
            >
              神
            </button>
          </div>
        </div>
        {controlSettings && (
          <div className="control-settings" role="dialog" aria-label="触控按键设置">
            <div className="control-settings-head">
              <b>触控布局</b>
              <button onClick={() => setControlSettings(false)}>×</button>
            </div>
            <label>
              按键透明度 <output>{Math.round(controls.opacity * 100)}%</output>
              <input type="range" min="0.25" max="0.9" step="0.01" value={controls.opacity} onChange={(e) => setControl("opacity", Number(e.target.value))} />
            </label>
            <label>
              左侧移动键 · 横向
              <input type="range" min="-80" max="120" value={controls.moveX} onChange={(e) => setControl("moveX", Number(e.target.value))} />
            </label>
            <label>
              左侧移动键 · 纵向
              <input type="range" min="-120" max="40" value={controls.moveY} onChange={(e) => setControl("moveY", Number(e.target.value))} />
            </label>
            <label>
              右侧技能键 · 横向
              <input type="range" min="-140" max="60" value={controls.actionX} onChange={(e) => setControl("actionX", Number(e.target.value))} />
            </label>
            <label>
              右侧技能键 · 纵向
              <input type="range" min="-120" max="40" value={controls.actionY} onChange={(e) => setControl("actionY", Number(e.target.value))} />
            </label>
            <button
              className="reset-controls"
              onClick={() => setControls(DEFAULT_CONTROLS)}
            >
              恢复默认布局
            </button>
          </div>
        )}
      </section>
      <footer>
        <span>◈ 火种共鸣：稳定</span>
        <span>目标：穿越焦土，击破焚风投影</span>
        <span>v1.2 MOTION & CONTROL UPDATE</span>
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
  const yAnchorTable = image.src.includes("phainon-normal")
    ? NORMAL_ANCHOR_Y
    : image.src.includes("phainon-god")
      ? GOD_ANCHOR_Y
      : undefined;
  const xAnchorTable = image.src.includes("phainon-god")
    ? GOD_ANCHOR_X
    : undefined;
  const anchorX = (xAnchorTable?.[pair]?.[f] || 0) * (w / 200);
  const anchorY = (yAnchorTable?.[pair]?.[f] || 0) * (h / 200);
  const dx = Math.round(x + (flip ? -anchorX : anchorX));
  const dy = Math.round(y + anchorY);
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
  p: Player,
  enemies: Enemy[],
  fx: Fx[],
  meteors: Meteor[],
  bossFx: BossFx[],
  bg: HTMLImageElement,
  whiteHole: HTMLImageElement,
  heroNormal: HTMLImageElement,
  heroGod: HTMLImageElement,
  heroJump: HTMLImageElement,
  heroRun: HTMLImageElement,
  heroDodge: HTMLImageElement,
  foes: HTMLImageElement,
  bossSheet: HTMLImageElement,
  vfx: HTMLImageElement,
  shake: number,
  time: number,
  bossArena: boolean,
  bossIntro: number,
) {
  ctx.save();
  // Deterministic camera impulse avoids random per-frame sprite jitter.
  ctx.translate(
    Math.round(Math.sin(time * 1.73) * shake * 0.42),
    Math.round(Math.cos(time * 2.11) * shake * 0.24),
  );
  ctx.fillStyle = "#12090b";
  ctx.fillRect(0, 0, c.width, c.height);
  const arenaBg = bossArena ? whiteHole : bg;
  if (arenaBg.complete) drawImageCover(ctx, arenaBg, c.width, c.height);
  else {
    const g = ctx.createLinearGradient(0, 0, 0, 560);
    g.addColorStop(0, "#17070b");
    g.addColorStop(0.55, "#6a1711");
    g.addColorStop(1, "#130808");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1000, 560);
  }
  ctx.fillStyle = bossArena ? "rgba(255,255,255,.16)" : "rgba(255,89,25,.18)";
  for (let i = 0; i < 18; i++) {
    const x = (i * 173 + time * 1.4) % 1000,
      y = 100 + ((i * 67) % 330);
    ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 3));
  }
  ctx.fillStyle = bossArena ? "#090a0d" : "#180b0a";
  ctx.fillRect(0, 485, 1000, 75);
  ctx.fillStyle = bossArena ? "#dedbd2" : "#742617";
  ctx.fillRect(0, 485, 1000, 5);
  enemies.forEach((e) => {
    const ex = Math.round(e.x);
    ctx.save();
    if (e.hit > 0) ctx.globalCompositeOperation = "screen";
    const scale = e.boss ? 1.8 : e.kind > 3 ? 1.25 : 1;
    if (e.boss && bossSheet.complete && bossSheet.naturalWidth) {
      const elapsed = (e.skillMax || 0) - (e.skillTime || 0);
      let pair = 0;
      if (e.skill === 0) pair = elapsed < 24 ? 2 : 4;
      if (e.skill === 1) pair = 6;
      if (e.skill === 2) pair = 8;
      if (e.skill === 3) pair = 10;
      if (e.skill === 4) pair = 12;
      const frame = e.skill === -1
        ? Math.floor(time / ANIM_FRAME_TICKS) % 10
        : Math.min(9, Math.floor((elapsed / Math.max(1, e.skillMax || 1)) * 10));
      drawAtlas(
        ctx,
        bossSheet,
        pair,
        frame,
        14,
        ex - 145,
        e.y - 235,
        290,
        270,
        e.facing < 0,
      );
    } else if (foes.complete && foes.naturalWidth) {
      if (e.facing < 0) {
        ctx.translate(ex * 2, 0);
        ctx.scale(-1, 1);
      }
      ctx.filter = "grayscale(1) brightness(.18) contrast(1.8)";
      const cols = 8,
        sw = foes.naturalWidth / cols,
        sh = foes.naturalHeight / 3,
        row = e.kind > 3 ? 1 : 0,
        col = e.hit > 0 ? 7 : Math.floor(time / 8) % 3;
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
      ctx.fillStyle = "#08090d";
      ctx.fillRect(ex - 25 * scale, e.y - 70 * scale, 50 * scale, 70 * scale);
      ctx.fillStyle = "#ffc15b";
      ctx.fillRect(ex - 12 * scale, e.y - 55 * scale, 8, 8);
    }
    ctx.restore();
    if (e.boss) return;
    ctx.fillStyle = "#1b0909";
    ctx.fillRect(ex - 40 * scale, e.y - 115 * scale, 80 * scale, 6);
    ctx.fillStyle = "#b7a98b";
    ctx.fillRect(
      ex - 40 * scale,
      e.y - 115 * scale,
      80 * scale * (e.hp / e.max),
      6,
    );
  });
  bossFx.forEach((b) => {
    const progress = 1 - b.life / b.max;
    ctx.save();
    if (b.kind === "teleport") {
      ctx.globalAlpha = Math.sin(progress * Math.PI);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(b.x, b.y - 75, 22 + i * 18, 70 - i * 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (b.kind === "wave") {
      const grad = ctx.createLinearGradient(b.x - 90, b.y, b.x + 90, b.y);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.45, "#ffffff");
      grad.addColorStop(0.62, "#8af7ff");
      grad.addColorStop(1, "transparent");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(b.x - 100, b.y + 20);
      ctx.quadraticCurveTo(b.x, b.y - 85, b.x + 105, b.y + 5);
      ctx.stroke();
    }
    if (b.kind === "blackhole") {
      const r = 35 + Math.sin(progress * Math.PI) * 75;
      const grad = ctx.createRadialGradient(b.x, b.y, 5, b.x, b.y, r);
      grad.addColorStop(0, "#fff");
      grad.addColorStop(0.12, "#09090e");
      grad.addColorStop(0.6, "#44386e");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#eef4ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, r * 1.45, r * 0.35, -0.25, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (b.kind === "sword") {
      ctx.translate(Math.round(b.x), Math.round(b.y));
      ctx.rotate(0.16);
      ctx.fillStyle = "#f9fbff";
      ctx.fillRect(-4, -55, 8, 90);
      ctx.fillStyle = "#15131d";
      ctx.fillRect(-10, 28, 20, 7);
    }
    if (b.kind === "whitehole") {
      const r = 70 + progress * 430;
      const grad = ctx.createRadialGradient(b.x, b.y, 12, b.x, b.y, r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.25, "rgba(255,255,255,.95)");
      grad.addColorStop(0.55, "rgba(173,205,255,.5)");
      grad.addColorStop(1, "transparent");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1000, 560);
    }
    ctx.restore();
  });
  const idleFrame = Math.floor(time / ANIM_FRAME_TICKS) % 10;
  const normalFlip = p.face < 0;
  const godMoveFlip = p.face > 0;
  // Both combat atlases follow the same visual direction as their VFX.
  // The god-form movement row has the opposite native facing and stays separate.
  const godCombatFlip = normalFlip;
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = p.trans > 0 ? "#f2c95f" : "#080508";
  ctx.beginPath();
  ctx.ellipse(p.x, GROUND_Y + 2, p.trans > 0 ? 55 : 34, 9, 0, 0, Math.PI * 2);
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
      Math.round(p.y - 220),
      220,
      220,
      godMoveFlip,
    );
  } else if (p.dodge > 0 && p.atk <= 0 && p.skill <= 0) {
    const f = Math.min(9, Math.floor((54 - p.dodge) / ANIM_FRAME_TICKS));
    drawn = drawAtlas(
      ctx,
      heroDodge,
      p.trans > 0 ? 2 : 0,
      f,
      4,
      Math.round(p.x - (p.trans ? 110 : 85)),
      Math.round(p.y - (p.trans ? 220 : 175)),
      p.trans ? 220 : 170,
      p.trans ? 220 : 175,
      normalFlip,
    );
  } else if (!p.ground && p.atk <= 0 && p.skill <= 0) {
    const jumpProgress = Math.max(0, Math.min(1, (GROUND_Y - p.y) / 120));
    const jumpFrame = p.vy < 0
      ? Math.min(4, Math.floor(jumpProgress * 5))
      : 5 + Math.min(4, Math.floor((1 - jumpProgress) * 5));
    drawn = drawAtlas(
      ctx,
      heroJump,
      p.trans > 0 ? 2 : 0,
      jumpFrame,
      4,
      Math.round(p.x - (p.trans ? 110 : 85)),
      Math.round(p.y - (p.trans ? 220 : 175)),
      p.trans ? 220 : 170,
      p.trans ? 220 : 175,
      p.trans ? godMoveFlip : normalFlip,
    );
  } else if (p.trans > 0) {
    const pair = p.skill > 0 ? 6 : p.atk > 0 ? 4 : 2;
    const moving = Math.abs(p.vx) > 1 && p.skill <= 0 && p.atk <= 0;
    const f =
      p.skill > 0
        ? Math.floor((150 - p.skill) / 15) % 10
        : p.atk > 0
          ? Math.floor((60 - p.atk) / ANIM_FRAME_TICKS)
          : idleFrame;
    drawn = moving
      ? drawAtlas(
          ctx,
          heroRun,
          2,
          idleFrame,
          4,
          Math.round(p.x - 110),
          Math.round(p.y - 220),
          220,
          220,
          normalFlip,
        )
      : drawAtlas(
          ctx,
          heroGod,
          pair,
          f,
          8,
          Math.round(p.x - 110),
          Math.round(p.y - 220),
          220,
          220,
          p.skill > 0 || p.atk > 0 ? godCombatFlip : godMoveFlip,
        );
  } else {
    const moving = Math.abs(p.vx) > 1;
    const pair = p.skill > 0 || p.atk > 0 ? 4 : 0;
    const f =
      p.skill > 0
        ? Math.floor((60 - p.skill) / ANIM_FRAME_TICKS)
        : p.atk > 0
          ? Math.floor((60 - p.atk) / ANIM_FRAME_TICKS)
          : idleFrame;
    drawn = moving && p.skill <= 0 && p.atk <= 0
      ? drawAtlas(
          ctx,
          heroRun,
          0,
          idleFrame,
          4,
          Math.round(p.x - 85),
          Math.round(p.y - 175),
          170,
          175,
          normalFlip,
        )
      : drawAtlas(
          ctx,
          heroNormal,
          pair,
          f,
          6,
          Math.round(p.x - 80),
          Math.round(p.y - 160),
          160,
          160,
          normalFlip,
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
      const w = p.trans > 0 ? GOD_ATTACK_RANGE : NORMAL_ATTACK_RANGE,
        h = p.trans > 0 ? 230 : 145;
      const x = p.face > 0 ? p.x - 15 : p.x - w + 15;
      drawAtlas(ctx, vfx, pair, f, 10, x, p.y - h / 2 - 55, w, h, normalFlip);
    }
    if (p.skill > 0 && p.trans <= 0) {
      const f = Math.floor((60 - p.skill) / ANIM_FRAME_TICKS),
        w = 360,
        h = 230;
      const x = p.face > 0 ? p.x - 20 : p.x - w + 20;
      drawAtlas(ctx, vfx, 2, f, 10, x, p.y - h / 2 - 55, w, h, normalFlip);
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
  if (bossIntro > 0) {
    ctx.fillStyle = `rgba(0,0,0,${bossIntro > 55 ? 1 : bossIntro / 55})`;
    ctx.fillRect(-40, -40, 1080, 640);
  }
  ctx.restore();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (imageRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio;
    sx = (image.naturalWidth - sw) / 2;
  } else if (imageRatio < targetRatio) {
    sh = image.naturalWidth / targetRatio;
    sy = (image.naturalHeight - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
}
