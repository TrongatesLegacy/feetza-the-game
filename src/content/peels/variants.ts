// Hero variants: upgraded hero peels, each earned by beating a boss with its base hero equipped. Every variant sits
// beside its base peel in the locker (`after`), counts towards the God Peel like any hero, keeps its base's passive
// and gets a stronger move with a twist. Their moves are in src/game/acts/variants.ts. The Dark Kneader, the first
// of them, is in ./nemesis.ts. Parody names and looks of our own.
//
// - Kratos, Ghost of Sparta: beat Zeus 3 times with the Kratos Peel (Zeus only turns up with Kratos equipped).

import type { Ability } from '../../game/abilities';
import { registerTrackers, type HeroGoal } from '../../game/heroGoals';
import { kratosLook } from '../../art/godHeads';
import { PEEL_HEAD } from '../../art/peelArt';
import type { PeelLook } from '../../art/peelArt';
import { rgba, type Ctx } from '../../art/util';
import type { HeroPeel } from '../heroPeels';

const S = '{slam}';

/** Beat a boss n times with a hero equipped, on any heat (the nemesis bosses only turn up with their hero). */
function beatWith(key: string, boss: string, bossName: string, hero: string, heroName: string, need: number): HeroGoal {
  registerTrackers({
    [key]: [`Beat ${bossName} with ${heroName} equipped`, { bossDown: (e, c) => e.foot.type.id === boss && c.run.peel === hero }],
  });
  return { kind: 'track', key, need, minHeat: 'mild' };
}

// ——— Kratos, Ghost of Sparta ———

/** The Kratos helm, darkened with ash, red war paint, white-hot eyes and a wreath of embers behind it. */
function ghostSpartaLook(): PeelLook {
  const base = kratosLook();
  const { x: HX, y: HY } = PEEL_HEAD;
  return {
    ...base,
    handle: ['#2a1410', '#140806'],
    trail: '#ff3a1a',
    seed: 'hero:ghostofsparta',
    custom: (ctx: Ctx) => {
      base.custom!(ctx);
      // ash over the bronze: everything drawn so far goes darker and colder
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const ash = ctx.createLinearGradient(0, HY - 140, 0, HY + 200);
      ash.addColorStop(0, 'rgba(40,30,30,0.5)');
      ash.addColorStop(1, 'rgba(10,6,6,0.55)');
      ctx.fillStyle = ash;
      ctx.fillRect(0, 0, 220, 360);
      ctx.restore();
      // a burst of flame behind the helm, licking out round the cheek guards and down the handle
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      for (const [r, col, n] of [[92, '#ffb040', 9], [104, '#ff6a1a', 11], [112, '#c8201a', 13]] as const) {
        ctx.beginPath();
        for (let i = 0; i <= n * 2; i++) {
          const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2;
          const low = Math.max(0, Math.sin(a));
          const rr = i % 2 ? r * 0.6 : r * (0.85 + low * 0.45);
          const x = HX + Math.cos(a) * rr * 0.92;
          const y = HY + 34 + Math.sin(a) * rr;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = '#2a1810';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
      // the red war paint: a stripe down the helm and a swirl over the left eye
      ctx.save();
      ctx.strokeStyle = '#d8201a';
      ctx.lineCap = 'round';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(HX - 2, HY - 74);
      ctx.lineTo(HX - 2, HY - 26);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(HX - 34, HY - 2, 16, Math.PI * 0.9, Math.PI * 2.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(HX - 46, HY + 14);
      ctx.lineTo(HX - 60, HY + 62);
      ctx.stroke();
      ctx.restore();
      // white-hot eyes in the dark of the helm
      ctx.save();
      ctx.shadowColor = '#ff3a1a';
      ctx.shadowBlur = 18;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(HX + sx * 18, HY + 2, 10, 4.5, sx * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#fff4d0';
        ctx.fill();
      }
      ctx.restore();
      // ash flecks
      ctx.fillStyle = rgba('#e8e0d8', 0.6);
      for (const [x, y] of [[HX - 60, HY - 40], [HX + 44, HY - 56], [HX + 64, HY + 30], [HX - 20, HY + 64], [HX + 18, HY - 66]]) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}

const ghostSparta: Ability = {
  name: 'Ghost of Sparta',
  trigger: { t: 'active' },
  fx: [{ e: 'move', id: 'ghostSparta' }],
  charge: 0.7,
  color: 0xff3a1a,
  vfx: 'burst',
  custom: true,
  desc: `Signature (${S}): “THIS IS SPARTAAA!”, then 30 s of rage, as the Kratos Peel’s: +100% damage, every smack hits all feet within 160 px, burns them and knocks them back. The twist: the rage leaves a trail of fire across the table wherever your peel goes, and every foot that touches it burns (1×/s for 2 s). Passive, Spinning Blades: three chained blades orbit your peel from the start (one more each new act, up to 5), and an ember aura burns round it all the time.`,
};

export const peels: HeroPeel[] = [
  {
    id: 'hero:ghostofsparta',
    name: 'Kratos, Ghost of Sparta',
    sub: 'greek',
    pantheon: 'greek',
    after: 'hero:kratos',
    goal: beatWith('zeusKratos', 'zeus', 'Zeus', 'hero:kratos', 'the Kratos Peel', 3),
    how: 'Kill the king of the gods: beat Zeus 3 times with the Kratos Peel equipped. He only turns up at wave 90, in Tartarus, when the Kratos Peel is your peel. Any heat counts.',
    look: ghostSpartaLook,
    ability: ghostSparta,
  },
];
