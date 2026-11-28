// Feetza's lint rules for effect declarations (docs/effects-plan.md, "Lint rules"). A small local ESLint plugin:
//
//   effects/one-effect-per-line   an effect list's [ and ] on their own lines, one entry per line          (fixable)
//   effects/effect-args-per-line  an Effect.*(…) with more than one argument: one per line, ( and ) on    (fixable)
//                                 their own lines (inner calls such as Op.Add(Unit.Chance(18)) stay on one line)
//   effects/no-effect-arithmetic  no + - * / % or unary minus inside Effect.*, Op.* or Unit.* makers: a number that
//                                 needs working out goes through a named maker (Unit.Every, Unit.scale, Unit.plus…)
//   effects/op-needs-unit         no bare number passed to an Op.*: wrap it in its Unit.* maker
//   effects/no-loose-strings      no hand-typed string where a typed name exists (Stat., UnitKind., Custom., …)
//                                 (fixable for Effect.Stat's stat and Unit.of's unit)
//   effects/typed-item-names      no hand-typed rarity, kind, onPick, needsMeter or pick in an item definition (a    (fixable)
//                                 topping builder's argument, or an object with an id and a rarity) or a check on
//                                 one (u.rarity === 'epic', kindOf(u) !== 'consumable', c.kind === 'unique', case 'epic':,
//                                 p.rarity ?? 'common', RARITY_DEFS['epic']): Rarity.Epic…. Without type information it
//                                 can't see a rarity passed as an argument (rarityOpen('epic', …)) or compared through a
//                                 local (const k = kindOf(u); k === 'unique'): TypeScript accepts the string there.
//
// What counts as a declaration: an Effect.* call (Effect.Stat, Effect.OnKill…), an Op.* call or chain
// (Op.Add(…).EachLevelUp.Mul(…)), a Unit maker (Unit.Chance, Unit.Seconds… : a capital letter), and everything inside
// their arguments, nested calls and functions included. Unit's lowercase maths (Unit.scale, Unit.boost, Unit.tick…)
// is plain game code when it's used outside a declaration, so it's only checked inside one. Imports under another
// name (`import { Effect as Eff }`) and destructured makers (`const { scale } = Unit`) are followed.
//
// Allowances (each one exact, none blanket):
// - Grows(at, why): `why` is the reason's words for the STATS tab (`${n} peels owned`), so its strings and their
//   + are allowed. `at` is checked like any declaration.
// - Nth(n, flag) and { oncePerWave: flag }: the flag is the counter's own name in a pizza's saved flags (no typed
//   name exists; renaming it would break saves), so it's a string.
// - String concatenation (a + where either side is a string or a join of strings) isn't arithmetic.
// - Source.* takes free ids (Source.Topping('salt')), and a string passed to the game's own lookups inside a
//   declaration (meta('wrists'), c('coins')) isn't handed to the vocabulary, so neither is flagged.
//
// The layout fixes reflow only whitespace and commas: no fix is offered when a comment sits between the items or an
// item holds a template string over several lines (re-indenting it would change the string). Names are matched by
// spelling: a local variable that shadows Effect, Op or Unit counts as them.

const ROOTS = new Set(['Effect', 'Op', 'Unit', 'Grows', 'Nth']);
const ARITH = new Set(['+', '-', '*', '/', '%']);

/** Local name → canonical name ('Effect', 'Op', 'Unit', 'Grows', 'Nth'), following import aliases and
 *  `const { scale } = Unit` (a destructured Unit maker or helper). */
function names(context) {
  const map = new Map();
  for (const r of ROOTS) map.set(r, r);
  // the effect vocabulary's names in this file: whatever it imports from src/effects (Action, Cond, Status, Pay…)
  const vocab = new Map();
  const program = context.sourceCode.ast;
  for (const st of program.body) {
    if (st.type !== 'ImportDeclaration') continue;
    const fromEffects = /(^|\/)effects(\/[\w.]+)?$/.test(st.source.value);
    for (const sp of st.specifiers) {
      if (sp.type !== 'ImportSpecifier' || sp.importKind === 'type') continue;
      const imported = sp.imported.type === 'Identifier' ? sp.imported.name : sp.imported.value;
      if (ROOTS.has(imported)) map.set(sp.local.name, imported);
      if (fromEffects) vocab.set(sp.local.name, imported);
    }
  }
  // `const { scale } = Unit`, anywhere in the file
  const destructured = new Map();
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'VariableDeclarator' && node.id.type === 'ObjectPattern' && node.init?.type === 'Identifier' && map.get(node.init.name) === 'Unit') {
      for (const p of node.id.properties) {
        if (p.type === 'Property' && p.key.type === 'Identifier' && p.value.type === 'Identifier') destructured.set(p.value.name, p.key.name);
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === 'string') visit(v);
    }
  };
  visit(program);
  return { canon: (n) => map.get(n), unitHelper: (n) => destructured.get(n), vocab: (n) => vocab.get(n) ?? (ROOTS.has(n) ? n : undefined) };
}

/** The identifier a member chain starts at: Op for Op.Add(…).EachLevelUp.Mul(…), through `!` and `?.`. */
function chainRoot(node) {
  let o = node;
  while (o) {
    if (o.type === 'MemberExpression') o = o.object;
    else if (o.type === 'CallExpression') o = o.callee;
    else if (o.type === 'TSNonNullExpression' || o.type === 'ChainExpression') o = o.expression;
    else break;
  }
  return o?.type === 'Identifier' ? o : null;
}

/** What a call is: { root: 'Effect' | 'Op' | 'Unit' | 'Grows' | 'Nth', member } or null. */
function classify(call, N) {
  const c = call.callee;
  if (c.type === 'Identifier') {
    const canon = N.canon(c.name);
    if (canon === 'Grows' || canon === 'Nth') return { root: canon, member: null };
    const helper = N.unitHelper(c.name);
    if (helper) return { root: 'Unit', member: helper };
    return null;
  }
  if (c.type !== 'MemberExpression' || c.computed || c.property.type !== 'Identifier') return null;
  const member = c.property.name;
  // Effect.X(…): directly on Effect
  if (c.object.type === 'Identifier') {
    const canon = N.canon(c.object.name);
    if (canon === 'Effect' || canon === 'Op' || canon === 'Unit') return { root: canon, member };
    return null;
  }
  // Op.Add(…).EachLevelUp.Mul(…): any chain that starts at Op
  const o = chainRoot(c.object);
  if (o && N.canon(o.name) === 'Op') return { root: 'Op', member };
  return null;
}

/** Is this call a declaration on its own (not just inside one)? */
const declares = (k) => k && (k.root === 'Effect' || k.root === 'Op' || (k.root === 'Unit' && /^[A-Z]/.test(k.member)));

const inArgs = (call, node) => call.arguments.some((a) => a.range[0] <= node.range[0] && node.range[1] <= a.range[1]);

/** Walks up from a node: the outermost declaration whose arguments hold it, and whether an allowance covers it. */
function whereIs(node, N) {
  let decl = null;
  let allowStrings = false;
  let allowArith = false;
  let child = node;
  for (let p = node.parent; p; child = p, p = p.parent) {
    if (p.type === 'CallExpression') {
      const k = classify(p, N);
      if (k && inArgs(p, node)) {
        if (k.root === 'Grows' && p.arguments[1] && within(p.arguments[1], node)) allowStrings = allowArith = true;
        if (k.root === 'Nth' && p.arguments[1] && within(p.arguments[1], node)) allowStrings = true;
        if (declares(k)) decl = p;
      }
    }
    if (p.type === 'Property' && p.value === child && keyName(p) === 'oncePerWave') allowStrings = true;
    if (p.type === 'Property' && p.key === child && !p.computed) return { decl: null };
    // inside a type (a literal type, a type argument) there's nothing to check; expression wrappers pass through
    if (p.type.startsWith('TS') && !TS_EXPR.has(p.type)) return { decl: null };
  }
  // (a lowercase Unit helper counts only inside a declaration: `decl` is only ever set by a call that declares)
  return { decl, allowStrings, allowArith };
}

const TS_EXPR = new Set(['TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression', 'TSTypeAssertion', 'TSInstantiationExpression']);

const within = (outer, node) => outer.range[0] <= node.range[0] && node.range[1] <= outer.range[1];
const keyName = (p) => (p.key.type === 'Identifier' ? p.key.name : p.key.type === 'Literal' ? String(p.key.value) : null);

// ——— layout ———

const lineIndent = (sourceCode, line) => /^[ \t]*/.exec(sourceCode.lines[line - 1])[0];

/** An item's whole extent, its own wrapping parentheses included: [first token, last token]. */
function span(sourceCode, open, item, close) {
  let first = sourceCode.getFirstToken(item);
  let last = sourceCode.getLastToken(item);
  for (;;) {
    const b = sourceCode.getTokenBefore(first);
    const a = sourceCode.getTokenAfter(last);
    if (b === open || a === close || b.value !== '(' || a.value !== ')') break;
    first = b;
    last = a;
  }
  return [first, last];
}

/** An item's text moved to a new indent: its continuation lines shift with it. */
function moved(sourceCode, [first, last], indent) {
  const text = sourceCode.text.slice(first.range[0], last.range[1]);
  const lines = text.split('\n');
  if (lines.length === 1) return indent + text;
  const old = lineIndent(sourceCode, first.loc.start.line);
  return lines
    .map((l, i) => {
      if (i === 0) return indent + l;
      return l.startsWith(old) ? indent + l.slice(old.length) : l;
    })
    .join('\n');
}

/** Can the items be reflowed without changing anything but whitespace? Not when a comment sits between them (not
 *  inside one), or an item holds a template string over several lines (re-indenting would change the string). */
function reflowable(sourceCode, open, spans, close) {
  const comments = sourceCode.getCommentsInside({ range: [open.range[0], close.range[1]] });
  if (comments.some((cm) => !spans.some(([f, l]) => f.range[0] <= cm.range[0] && cm.range[1] <= l.range[1]))) return false;
  return spans.every(([f, l]) => {
    const tokens = sourceCode.getTokensBetween(sourceCode.getTokenBefore(f), sourceCode.getTokenAfter(l));
    return !tokens.some((t) => t.type === 'Template' && t.loc.start.line !== t.loc.end.line);
  });
}

/** Are the items laid out one per line, with the opening token last on its line and the closing one first on its? */
function onePerLine(sourceCode, open, spans, close) {
  for (const [first] of spans) {
    // the token before an item is `(`, `[` or the comma after the last one: it must end on an earlier line
    const before = sourceCode.getTokenBefore(first);
    if (before.loc.end.line >= first.loc.start.line) return false;
  }
  const beforeClose = sourceCode.getTokenBefore(close);
  return beforeClose.loc.end.line < close.loc.start.line;
}

/** One item a line, one level in from the line the list starts on, each with its comma. */
function reflow(sourceCode, fixer, openTok, spans, closeTok, indent) {
  const inner = indent + '  ';
  const body = spans.map((sp) => moved(sourceCode, sp, inner)).join(',\n');
  return fixer.replaceTextRange([openTok.range[0], closeTok.range[1]], `${openTok.value}\n${body},\n${indent}${closeTok.value}`);
}

/** An entry of an effect list: an Effect.* call (or a choice between them, or a spread). */
function isEffectEntry(el, N) {
  if (!el) return false;
  if (el.type === 'CallExpression') return classify(el, N)?.root === 'Effect';
  if (el.type === 'ConditionalExpression') return isEffectEntry(el.consequent, N) || isEffectEntry(el.alternate, N);
  if (TS_EXPR.has(el.type)) return isEffectEntry(el.expression, N);
  return false;
}

const oneEffectPerLine = {
  meta: {
    type: 'layout',
    fixable: 'code',
    docs: { description: 'An effect list has [ and ] on their own lines and one entry per line, even with one entry.' },
    messages: { layout: 'Effect list: put [ and ] on their own lines and each effect on its own line.' },
    schema: [],
  },
  create(context) {
    const N = names(context);
    const sc = context.sourceCode;
    return {
      ArrayExpression(node) {
        if (node.elements.length === 0) return;
        const prop = node.parent.type === 'Property' && node.parent.value === node && keyName(node.parent) === 'effects';
        if (!prop && !node.elements.some((el) => isEffectEntry(el, N))) return;
        const open = sc.getFirstToken(node);
        const close = sc.getLastToken(node);
        if (node.elements.includes(null)) return context.report({ node, messageId: 'layout' });
        const spans = node.elements.map((el) => span(sc, open, el, close));
        if (onePerLine(sc, open, spans, close)) return;
        const fixable = reflowable(sc, open, spans, close);
        context.report({
          node,
          messageId: 'layout',
          fix: fixable ? (fixer) => reflow(sc, fixer, open, spans, close, lineIndent(sc, node.loc.start.line)) : null,
        });
      },
    };
  },
};

const effectArgsPerLine = {
  meta: {
    type: 'layout',
    fixable: 'code',
    docs: { description: 'An Effect.*(…) with more than one argument has one argument per line, ( and ) on their own lines.' },
    messages: { layout: '{{name}}: put each argument on its own line, with ( and ) on their own lines.' },
    schema: [],
  },
  create(context) {
    const N = names(context);
    const sc = context.sourceCode;
    return {
      CallExpression(node) {
        const k = classify(node, N);
        if (k?.root !== 'Effect' || node.arguments.length < 2) return;
        const open = sc.getTokenAfter(node.typeArguments ?? node.callee, (t) => t.value === '(');
        const close = sc.getLastToken(node);
        const spans = node.arguments.map((a) => span(sc, open, a, close));
        if (onePerLine(sc, open, spans, close)) return;
        const fixable = close.value === ')' && reflowable(sc, open, spans, close);
        context.report({
          node,
          messageId: 'layout',
          data: { name: `Effect.${k.member}` },
          fix: fixable ? (fixer) => reflow(sc, fixer, open, spans, close, lineIndent(sc, node.loc.start.line)) : null,
        });
      },
    };
  },
};

/** A string, or a join of strings ('a' + n + m: the outer + has a join on its left). */
const isStringy = (n) =>
  (n.type === 'Literal' && typeof n.value === 'string') ||
  n.type === 'TemplateLiteral' ||
  (n.type === 'BinaryExpression' && n.operator === '+' && (isStringy(n.left) || isStringy(n.right)));

const noEffectArithmetic = {
  meta: {
    type: 'problem',
    docs: { description: 'No arithmetic inside Effect.*, Op.* or Unit.* declarations: use a named maker.' },
    messages: {
      arith:
        'Arithmetic ({{op}}) inside an effect declaration: work the number out with a named maker (Unit.Every, Unit.Percent, Unit.scale, Unit.plus, Unit.groups…).',
    },
    schema: [],
  },
  create(context) {
    const N = names(context);
    const check = (node, op) => {
      const c = whereIs(node, N);
      if (!c.decl || c.allowArith) return;
      context.report({ node, messageId: 'arith', data: { op } });
    };
    return {
      BinaryExpression(node) {
        if (!ARITH.has(node.operator)) return;
        if (node.operator === '+' && (isStringy(node.left) || isStringy(node.right))) return;
        check(node, node.operator);
      },
      UnaryExpression(node) {
        if (node.operator === '-') check(node, 'unary -');
      },
    };
  },
};

const isNumber = (n) =>
  (n.type === 'Literal' && typeof n.value === 'number') || (n.type === 'UnaryExpression' && (n.operator === '-' || n.operator === '+') && isNumber(n.argument));

const opNeedsUnit = {
  meta: {
    type: 'problem',
    docs: { description: 'No bare number passed to an Op.*: wrap it in its Unit.* maker.' },
    messages: { bare: 'Bare number {{n}} passed to Op.{{name}}: wrap it in its Unit.* maker (Unit.Percent, Unit.Count, Unit.Px…).' },
    schema: [],
  },
  create(context) {
    const N = names(context);
    const sc = context.sourceCode;
    return {
      CallExpression(node) {
        const k = classify(node, N);
        if (k?.root !== 'Op') return;
        for (const a of node.arguments) if (isNumber(a)) context.report({ node: a, messageId: 'bare', data: { n: sc.getText(a), name: k.member } });
      },
    };
  },
};

/** The vocabulary name a call is made on: Action for Action.Custom(…), Enh for Enh(…), Op for Op.Add(…).EachLevelUp.Mul(…). */
function vocabOf(call, N) {
  const o = chainRoot(call.callee);
  return o ? (N.vocab(o.name) ?? (N.unitHelper(o.name) ? 'Unit' : undefined)) : undefined;
}

/** Vocabulary whose strings are free ids, not names with a typed constant: Source.Topping(id). */
const FREE_IDS = new Set(['Source']);

/** Is the string handed straight to the effect vocabulary: an argument of one of its calls, or a field of an options
 *  object given to one? (A string passed to the game's own lookups, such as meta('wrists') or c('coins'), isn't:
 *  those ids have no typed name.) */
function handedToVocab(node, N) {
  let at = node;
  let p = node.parent;
  // through a choice between strings (c ? 'a' : 'b', a ?? 'b') and type wrappers
  while ((p.type === 'ConditionalExpression' && p.test !== at) || p.type === 'LogicalExpression' || TS_EXPR.has(p.type)) {
    at = p;
    p = p.parent;
  }
  if (p.type === 'Property' && p.value === at && p.parent.type === 'ObjectExpression') {
    at = p.parent;
    p = at.parent;
  }
  if (p.type !== 'CallExpression' || !p.arguments.includes(at)) return false;
  const v = vocabOf(p, N);
  return !!v && !FREE_IDS.has(v);
}

const pascal = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Is `name` a value in scope here (not only a type: `import type { Stat }` can't be swapped in)? */
function inScope(sc, node, name) {
  for (let s = sc.getScope(node); s; s = s.upper) {
    const v = s.set.get(name);
    if (v) return v.defs.some((d) => !(d.type === 'ImportBinding' && (d.parent?.importKind === 'type' || d.node?.importKind === 'type')));
  }
  return false;
}

const noLooseStrings = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: { description: 'No hand-typed strings in effect declarations where a typed name exists.' },
    messages: {
      loose: "Hand-typed {{text}} in an effect declaration: use its typed name (Stat., UnitKind., Custom., Look., Tag., When., Source., Section.…).",
      typed: 'Hand-typed {{text}} in an effect declaration: use {{fix}}.',
    },
    schema: [],
  },
  create(context) {
    const N = names(context);
    const sc = context.sourceCode;
    const check = (node) => {
      const c = whereIs(node, N);
      if (!c.decl || c.allowStrings || !handedToVocab(node, N)) return;
      // the stat of Effect.Stat and the unit of Unit.of have a typed name to swap in
      const call = node.parent;
      if (node.type === 'Literal' && call.type === 'CallExpression' && call.arguments[0] === node && /^[a-z][A-Za-z0-9]*$/.test(node.value)) {
        const k = classify(call, N);
        const holder = k?.root === 'Effect' && k.member === 'Stat' ? 'Stat' : k?.root === 'Unit' && k.member === 'of' ? 'UnitKind' : null;
        if (holder) {
          const fix = `${holder}.${pascal(node.value)}`;
          return context.report({
            node,
            messageId: 'typed',
            data: { text: sc.getText(node), fix },
            fix: inScope(sc, node, holder) ? (fixer) => fixer.replaceText(node, fix) : null,
          });
        }
      }
      context.report({ node, messageId: 'loose', data: { text: sc.getText(node).slice(0, 40) } });
    };
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node);
      },
      TemplateLiteral(node) {
        if (node.parent.type !== 'TaggedTemplateExpression') check(node);
      },
    };
  },
};

// ——— typed item names: rarity, kind, onPick, needsMeter, pick ———

/** The typed names an item's small fields take (src/data/rarity.ts, src/data/itemKinds.ts): field → its holder and
 *  the names it takes. */
const ITEM_NAMES = {
  rarity: { holder: 'Rarity', names: ['common', 'rare', 'epic', 'legendary'] },
  pick: { holder: 'Rarity', names: ['common', 'rare', 'epic', 'legendary'] },
  kind: { holder: 'UpgradeKind', names: ['permanent', 'unique', 'consumable'] },
  onPick: { holder: 'OnPick', names: ['healAll2', 'extraPizza', 'fridge', 'arm', 'pick', 'roulette', 'crispy', 'bogo'] },
  needsMeter: { holder: 'NeedsMeter', names: ['meter', 'tank'] },
};
/** The topping families' builders (src/data/toppingDefs.ts): their argument is an item definition. */
const BUILDERS = new Set(['Topping', 'KitTopping', 'ProcTopping', 'PickTopping', 'FreshTradeoff']);

const propName = (p) => (p.type === 'Property' && !p.computed ? (p.key.type === 'Identifier' ? p.key.name : typeof p.key.value === 'string' ? p.key.value : null) : null);

/** An item definition: a builder's argument, or an object literal with an `id` and a `rarity` (a pizza, a topping). */
function isItem(obj) {
  if (obj.type !== 'ObjectExpression') return false;
  const p = obj.parent;
  if (p?.type === 'CallExpression' && p.arguments[0] === obj && p.callee.type === 'Identifier' && BUILDERS.has(p.callee.name)) return true;
  const keys = new Set(obj.properties.map(propName));
  return keys.has('id') && keys.has('rarity');
}

/** What a compared value is: `x.rarity`, `x.onPick`, `x.needsMeter`, `x.pick` or kindOf(x) → its field. */
function comparedField(n) {
  if (n.type === 'ChainExpression') n = n.expression;
  // (x.kind: only its own names are flagged, so a shop offer's kind 'special' isn't)
  if (n.type === 'MemberExpression' && !n.computed && ['rarity', 'onPick', 'needsMeter', 'pick', 'kind'].includes(n.property.name)) return n.property.name;
  if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'kindOf') return 'kind';
  return null;
}

const typedItemNames = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: { description: 'No hand-typed rarity, kind, onPick, needsMeter or pick in item definitions and checks: use the typed names (Rarity.Epic, UpgradeKind.Consumable…).' },
    messages: { typed: 'Hand-typed {{text}}: use {{fix}}.' },
    schema: [],
  },
  create(context) {
    const sc = context.sourceCode;
    const isStr = (n) => n.type === 'Literal' && typeof n.value === 'string';
    const report = (lit, field) => {
      const t = ITEM_NAMES[field];
      if (!t.names.includes(lit.value)) return;
      const fix = `${t.holder}.${pascal(lit.value)}`;
      context.report({ node: lit, messageId: 'typed', data: { text: sc.getText(lit), fix }, fix: inScope(sc, lit, t.holder) ? (fixer) => fixer.replaceText(lit, fix) : null });
    };
    return {
      Property(node) {
        const field = propName(node);
        if (!field || !ITEM_NAMES[field] || !isStr(node.value)) return;
        // a rarity anywhere; the other fields only in an item definition (other objects have kinds and picks of their own)
        if (field !== 'rarity' && !isItem(node.parent)) return;
        report(node.value, field);
      },
      BinaryExpression(node) {
        if (!['===', '!==', '==', '!='].includes(node.operator)) return;
        for (const [a, b] of [
          [node.left, node.right],
          [node.right, node.left],
        ]) {
          const field = isStr(b) ? comparedField(a) : null;
          if (field) report(b, field);
        }
      },
      // a switch on one: case 'epic':
      SwitchCase(node) {
        const field = node.test && isStr(node.test) ? comparedField(node.parent.discriminant) : null;
        if (field) report(node.test, field);
      },
      // a fallback for one: p.rarity ?? 'common'
      LogicalExpression(node) {
        const field = node.operator === '??' && isStr(node.right) ? comparedField(node.left) : null;
        if (field) report(node.right, field);
      },
      // a rarity's definition by hand: RARITY_DEFS['epic']
      MemberExpression(node) {
        if (node.computed && node.object.type === 'Identifier' && node.object.name === 'RARITY_DEFS' && isStr(node.property)) report(node.property, 'rarity');
      },
    };
  },
};

export default {
  meta: { name: 'feetza-effects' },
  rules: {
    'one-effect-per-line': oneEffectPerLine,
    'effect-args-per-line': effectArgsPerLine,
    'no-effect-arithmetic': noEffectArithmetic,
    'op-needs-unit': opNeedsUnit,
    'no-loose-strings': noLooseStrings,
    'typed-item-names': typedItemNames,
  },
};
