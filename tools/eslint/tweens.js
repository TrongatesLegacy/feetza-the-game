// effects/no-gameplay-in-tweens (docs/core-split-plan.md, stage 1): no gameplay in a Phaser tween's or animation's
// callbacks. Phaser's tweens run on a clock of their own (tweens.timeScale: not the world's hit-stop or Speed Force),
// so a hit, a kill or a state change made from one lands on the animation's time, not the game's, and the game core
// (which runs without Phaser) has no tweens at all. Gameplay that waits or moves over time goes on the game clock:
// `clockOf(scene).tween({...})` (src/core/clock.ts) takes the same config.
//
// What's checked: the callbacks (onStart, onUpdate, onYoyo, onRepeat, onLoop, onComplete, onActive, onStop) of an
// object passed to a Phaser tween maker (X.tweens.add / addCounter / chain / addMultiple / timeline), and the
// listener of a tween's or a sprite's own events (X.on / once('complete' | 'yoyo' | 'repeat' | 'loop' | 'animation…'),
// or a Phaser.Tweens.Events / Phaser.Animations.Events name), everything inside them (nested functions and timers
// too: a scene timer started from a tween's end still starts on the tween's time).
//
// "Gameplay", precisely (names are matched by spelling, as in the other rules):
// - a call of a gameplay verb (GAMEPLAY_CALLS): damage and kills, slices and pizzas, a foot's state (stun, knock,
//   setState…), the peel, spawns, lanes and the fight's flow, tips, score and the meter, and the continuations fights
//   pass down (onLand, onHit, onClear, onFail…);
// - a draw from the gameplay random stream: Math.random(), rnd(…), Phaser.Math.Between / FloatBetween / RND.*,
//   Phaser.Utils.Array.GetRandom / Shuffle (crand / cpick are the cosmetic stream, and allowed);
// - a write to a gameplay field (GAMEPLAY_FIELDS: hp, puppet, shielded, target, laneX, burnT…), to anything under a
//   foot's `brain` or the `run`, or to a foot's x / y (`f.x =`, `foot.y +=`, `boss.x =`: the receiver's name).
// A call made through a look's own object is never gameplay: anything under `fx`, `audio`, `cameras`, `add`, `make`,
// `tweens` or `textures` (a.fx.burn is a flame, not a burn).
//
// Allowed by listing: a callback that is visual-only although it uses one of these names says so in a comment right
// before it, with the reason: `// visual-only: <why>`. The rule's tests cover each case.

const CALLBACKS = new Set(['onStart', 'onUpdate', 'onYoyo', 'onRepeat', 'onLoop', 'onComplete', 'onActive', 'onStop']);
const MAKERS = new Set(['add', 'addCounter', 'chain', 'addMultiple', 'timeline']);
const EVENTS = new Set(['complete', 'yoyo', 'repeat', 'loop', 'start', 'active', 'stop', 'update', 'animationcomplete', 'animationupdate', 'animationrepeat', 'animationstart', 'animationstop', 'animationrestart']);

/** Gameplay verbs, by group. */
const GAMEPLAY_CALLS = new Set([
  // damage and kills
  'dealDamage', 'damageFoot', 'hitFoot', 'killFoot', 'hurt', 'kill', 'legendDmg', 'smack',
  // slices and pizzas
  'hitPizza', 'hitSoft', 'heal', 'healPizza', 'loseSlice', 'freezePerk', 'freezeSolid', 'ignite', 'possess',
  // a foot's state
  'stun', 'knock', 'setState', 'escape', 'die', 'revive', 'zombify', 'morphIntoLoafer', 'slow', 'dodge', 'blinkTo',
  // the peel
  'stunPeel', 'slowPeel',
  // spawns, lanes and the fight's flow
  'spawn', 'spawnExtraBoss', 'relane', 'assignLane', 'lockLane', 'retreat', 'setMinions', 'pauseSpawns', 'order',
  'hurry', 'cancelHurry', 'takeLane', 'windup', 'hitProp', 'twin', 'shield',
  // tips, score and the meter
  'giveTips', 'addScore', 'addCoins', 'chargeMeter', 'recompute',
  // the continuations a fight passes down
  'onLand', 'onLanded', 'land', 'onHit', 'onClear', 'onFail',
]);

/** Gameplay fields (a write to one is a state change). */
const GAMEPLAY_FIELDS = new Set([
  'hp', 'maxHp', 'armor', 'puppet', 'shielded', 'target', 'laneX', 'laneSide', 'laneRow', 'stunT', 'slowT', 'slowPct',
  'burnT', 'burnDps', 'burnFromAbility', 'frozen', 'vuln', 'phase', 'hurry', 'speedMul', 'held', 'pinned', 'vy',
  'hoverY', 'stateT', 'coins', 'score', 'super', 'combo', 'buyout',
]);
/** Names a foot goes by: their x and y are the foot's place on the table. */
const FOOT_NAMES = new Set(['f', 'foot', 'boss']);
/** Objects that are looks: calls through them are never gameplay. */
const LOOK_OBJECTS = new Set(['fx', 'audio', 'cameras', 'add', 'make', 'tweens', 'textures']);
const RANDOM_MEMBERS = new Set(['Between', 'FloatBetween', 'RND', 'GetRandom', 'Shuffle']);

const name = (n) => (n?.type === 'Identifier' ? n.name : n?.type === 'Literal' ? String(n.value) : null);
const unwrap = (n) => (n?.type === 'ChainExpression' ? n.expression : n);

/** The names along a member chain, outermost last: a.sc.fx.burn → ['a', 'sc', 'fx', 'burn']. */
function chain(n) {
  n = unwrap(n);
  const out = [];
  while (n && n.type === 'MemberExpression') {
    out.unshift(n.computed ? '[]' : name(n.property));
    n = unwrap(n.object);
  }
  if (n?.type === 'Identifier') out.unshift(n.name);
  else if (n?.type === 'ThisExpression') out.unshift('this');
  else if (n?.type === 'CallExpression') out.unshift('()');
  return out;
}

/** Is this call a Phaser tween maker? (X.tweens.add(…), this.tweens.addCounter(…)) */
function isTweenMaker(call) {
  const c = chain(call.callee);
  return c.length >= 2 && c[c.length - 2] === 'tweens' && MAKERS.has(c[c.length - 1]);
}

/** Is this call a tween's or a sprite's own event listener? (tw.on('complete', fn), s.once(Phaser.Animations.Events.X, fn)) */
function isEventListener(call) {
  const c = chain(call.callee);
  const verb = c[c.length - 1];
  if (verb !== 'on' && verb !== 'once') return false;
  const owner = c[c.length - 2];
  // (a scene's, a loader's or an input's events are not an animation's)
  if (['events', 'load', 'input', 'keyboard', 'sys', 'game', 'scale', 'sound'].includes(owner)) return false;
  const ev = call.arguments[0];
  if (!ev) return false;
  if (ev.type === 'Literal' && typeof ev.value === 'string') return EVENTS.has(ev.value);
  const e = chain(ev);
  return e[0] === 'Phaser' && (e[1] === 'Tweens' || e[1] === 'Animations') && e[2] === 'Events';
}

function precededByVisualOnly(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node);
  return comments.some((c) => /^\s*visual-only:\s*\S/.test(c.value));
}

const noGameplayInTweens = {
  meta: {
    type: 'problem',
    docs: { description: "No gameplay in a Phaser tween's or animation's callbacks: put it on the game clock (clockOf(scene).tween, src/core/clock.ts)." },
    messages: {
      call: "Gameplay ({{what}}) in a tween's or animation's callback: it lands on the animation's time. Run it on the game clock (clockOf(scene).tween({...}) takes the same config), or, if it's only a look, say so: // visual-only: <why>.",
      random: "A gameplay random draw ({{what}}) in a tween's or animation's callback: looks draw from crand() / cpick(); a gameplay roll belongs on the game clock.",
      write: "A gameplay state change ({{what}}) in a tween's or animation's callback: it lands on the animation's time. Run it on the game clock (clockOf(scene).tween({...})).",
      reason: 'A visual-only callback says why: // visual-only: <why>.',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const check = (fn) => {
      const visit = (n) => {
        if (!n || typeof n.type !== 'string') return;
        if (n.type === 'CallExpression') {
          const c = chain(n.callee);
          const last = c[c.length - 1];
          const looks = c.slice(0, -1).some((x) => LOOK_OBJECTS.has(x));
          if (c[0] === 'Math' && last === 'random') context.report({ node: n, messageId: 'random', data: { what: 'Math.random()' } });
          else if (c.length === 1 && last === 'rnd') context.report({ node: n, messageId: 'random', data: { what: 'rnd()' } });
          else if (c[0] === 'Phaser' && c.some((x) => RANDOM_MEMBERS.has(x))) context.report({ node: n, messageId: 'random', data: { what: c.join('.') } });
          else if (!looks && GAMEPLAY_CALLS.has(last)) context.report({ node: n, messageId: 'call', data: { what: `${last}()` } });
        }
        if (n.type === 'AssignmentExpression' || n.type === 'UpdateExpression') {
          const target = unwrap(n.type === 'AssignmentExpression' ? n.left : n.argument);
          if (target.type === 'MemberExpression') {
            const c = chain(target);
            const field = c[c.length - 1];
            const what = c.join('.');
            if (GAMEPLAY_FIELDS.has(field) || c.slice(0, -1).includes('brain') || c.slice(0, -1).includes('run')) context.report({ node: n, messageId: 'write', data: { what } });
            else if ((field === 'x' || field === 'y') && c.length === 2 && FOOT_NAMES.has(c[0])) context.report({ node: n, messageId: 'write', data: { what } });
          }
        }
        for (const k of Object.keys(n)) {
          if (k === 'parent') continue;
          const v = n[k];
          if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === 'string' && visit(x));
          else if (v && typeof v.type === 'string') visit(v);
        }
      };
      visit(fn.body ?? fn);
    };
    const callback = (prop) => {
      const comments = sourceCode.getCommentsBefore(prop);
      const marked = comments.find((c) => /^\s*visual-only\b/.test(c.value));
      if (marked) {
        if (!precededByVisualOnly(sourceCode, prop)) context.report({ node: prop, messageId: 'reason' });
        return;
      }
      const v = prop.type === 'Property' ? prop.value : null;
      if (v && (v.type === 'ArrowFunctionExpression' || v.type === 'FunctionExpression')) check(v);
    };
    return {
      CallExpression(node) {
        if (isTweenMaker(node)) {
          for (const arg of node.arguments) {
            const objs = arg.type === 'ArrayExpression' ? arg.elements : [arg];
            for (const o of objs) {
              if (o?.type !== 'ObjectExpression') continue;
              for (const p of o.properties) if (p.type === 'Property' && CALLBACKS.has(name(p.key))) callback(p);
            }
          }
        } else if (isEventListener(node)) {
          const fn = node.arguments[1];
          if (fn && (fn.type === 'ArrowFunctionExpression' || fn.type === 'FunctionExpression')) {
            const marked = sourceCode.getCommentsBefore(fn).find((c) => /^\s*visual-only\b/.test(c.value));
            if (marked) {
              if (!/^\s*visual-only:\s*\S/.test(marked.value)) context.report({ node: fn, messageId: 'reason' });
            } else check(fn);
          }
        }
      },
    };
  },
};

export default noGameplayInTweens;
