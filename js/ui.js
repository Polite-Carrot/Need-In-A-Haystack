/* Screens, HUD and shop. Reads game state at call time, never at load time. */
window.NIAH = window.NIAH || {};

NIAH.ui = (function () {
  const el = (id) => document.getElementById(id);
  const E = {};
  let shopTab = 'shovels', shopSig = '';

  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  function fmt(n) {
    n = Math.floor(n);
    if (n < 1000) return String(n);
    let tier = Math.min(Math.floor(Math.log10(Math.abs(n)) / 3), SUFFIX.length - 1);
    const s = n / Math.pow(1000, tier);
    return (s < 10 ? s.toFixed(2) : s < 100 ? s.toFixed(1) : Math.floor(s)) + SUFFIX[tier];
  }

  function init() {
    [
      'loading', 'menu', 'intro', 'hud', 'shop', 'pause', 'howto', 'stats', 'win',
      'coinBox', 'coinCount', 'hudLevel', 'senseLine', 'pileCard', 'pileName', 'pileSearched',
      'pileFill', 'shovelName', 'loadText', 'loadFill', 'prompt', 'shopBody', 'shopCoins',
      'shopDot', 'stick', 'stickKnob', 'actionBtn', 'introNumber', 'introSub', 'statsList',
      'winText', 'winStats', 'btnContinue', 'continueLabel', 'btnWipe', 'menuSound',
      'btnCamera', 'btnSound',
    ].forEach((id) => { E[id] = el(id); });

    const G = () => NIAH.game;

    el('btnPlay').addEventListener('click', () => { NIAH.audio.wake(); G().startNewGame(); });
    E.btnContinue.addEventListener('click', () => { NIAH.audio.wake(); G().continueGame(); });
    el('btnHowTo').addEventListener('click', () => screen('howto', true));
    el('closeHowto').addEventListener('click', () => screen('howto', false));
    el('btnMenuStats').addEventListener('click', () => { showStats(); });
    el('closeStats').addEventListener('click', () => screen('stats', false));
    el('btnWipe').addEventListener('click', () => G().wipeSave());
    E.menuSound.addEventListener('click', () => G().toggleSound());

    el('btnSkipIntro').addEventListener('click', () => G().skipIntro());
    el('btnShop').addEventListener('click', () => openShop());
    el('closeShop').addEventListener('click', () => closeShop());
    el('btnPause').addEventListener('click', () => G().pause(true));
    el('btnResume').addEventListener('click', () => G().pause(false));
    el('btnPauseShop').addEventListener('click', () => openShop());
    el('btnCamera').addEventListener('click', () => G().toggleCamera());
    el('btnSound').addEventListener('click', () => G().toggleSound());
    el('btnQuit').addEventListener('click', () => G().quitToMenu());
    el('btnNextBarn').addEventListener('click', () => G().nextBarn());
    el('btnWinShop').addEventListener('click', () => openShop());

    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      shopTab = t.dataset.tab;
      E.shopBody.scrollTop = 0;
      renderShop(true);
      NIAH.audio.ui();
    }));

    setInterval(() => { if (E.shop.classList.contains('open')) renderShop(); }, 400);
  }

  /* --------------------------------------------------------- screens */

  function screen(id, open) {
    const node = E[id] || el(id);
    if (!node) return;
    node.hidden = false;
    node.classList.toggle('open', !!open);
    node.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
  function hudOn(on) { E.hud.classList.toggle('on', !!on); E.hud.setAttribute('aria-hidden', on ? 'false' : 'true'); }

  function openShop() {
    E.shop.classList.add('open');
    renderShop(true);
    NIAH.audio.ui();
  }
  function closeShop() { E.shop.classList.remove('open'); }
  function shopIsOpen() { return E.shop.classList.contains('open'); }

  /* ------------------------------------------------------------- HUD */

  function bumpCoins() {
    E.coinBox.classList.add('bump');
    setTimeout(() => E.coinBox.classList.remove('bump'), 120);
  }

  function setHud(s) {
    E.coinCount.textContent = fmt(s.coins);
    E.hudLevel.textContent = s.level;
    E.shovelName.textContent = s.shovelName;
    E.loadText.textContent = fmt(s.load) + ' / ' + fmt(s.capacity);
    const pct = s.capacity ? (s.load / s.capacity) * 100 : 0;
    E.loadFill.style.width = pct.toFixed(1) + '%';
    E.loadFill.classList.toggle('full', s.load >= s.capacity);
    E.shopDot.hidden = !s.affordable;
  }

  function setPileCard(pile) {
    if (!pile) { E.pileCard.hidden = true; return; }
    E.pileCard.hidden = false;
    E.pileName.textContent = 'Pile ' + pile.name;
    const pct = pile.total ? (pile.sifted / pile.total) * 100 : 0;
    E.pileSearched.textContent = Math.floor(pct) + '% searched';
    E.pileFill.style.width = pct.toFixed(1) + '%';
  }

  function setPrompt(text) {
    if (!text) { E.prompt.hidden = true; return; }
    E.prompt.hidden = false;
    E.prompt.textContent = text;
  }

  function setAction(label, enabled) {
    E.actionBtn.textContent = label;
    E.actionBtn.disabled = !enabled;
  }

  function setSense(text) {
    E.senseLine.textContent = text || '';
    E.senseLine.classList.toggle('on', !!text);
  }

  function setIntro(level, sub) {
    E.introNumber.textContent = level;
    E.introSub.textContent = sub;
  }

  function setMenu(save) {
    E.btnContinue.hidden = !save;
    E.btnWipe.hidden = !save;
    if (save) E.continueLabel.textContent = 'Barn ' + save.level;
    E.menuSound.textContent = NIAH.audio.muted ? '🔇 Sound off' : '🔊 Sound on';
    E.btnSound.textContent = 'Sound: ' + (NIAH.audio.muted ? 'Off' : 'On');
  }

  function setCameraLabel(mode) {
    E.btnCamera.textContent = 'Camera: ' + (mode === 'first' ? 'First person' : 'Follow');
  }

  /* ------------------------------------------------------------ shop */

  function row(o) {
    const d = document.createElement('div');
    d.className = 'item ' + (o.cls || '');
    d.innerHTML = '<div class="item-emoji"></div><div class="item-info"><div class="item-name"></div><div class="item-desc"></div></div>';
    d.querySelector('.item-emoji').textContent = o.emoji;
    d.querySelector('.item-name').textContent = o.name;
    d.querySelector('.item-desc').textContent = o.desc;
    const b = document.createElement('button');
    b.className = 'btn-buy ' + (o.btnCls || '');
    b.textContent = o.label;
    b.disabled = !!o.disabled;
    if (o.onClick) b.addEventListener('click', o.onClick);
    d.appendChild(b);
    return d;
  }

  function renderShop(force) {
    const G = NIAH.game;
    if (!G || !G.state) return;
    const s = G.state;
    const sig = [
      shopTab, s.coins, s.shovel, s.owned.join(','), s.level,
      Object.keys(NIAH.data.GEAR).map((k) => s.gear[k]).join(','),
    ].join('|');
    if (!force && sig === shopSig) return;
    shopSig = sig;

    E.shopCoins.textContent = fmt(s.coins);
    const body = E.shopBody;
    const scroll = body.scrollTop;
    body.innerHTML = '';

    if (shopTab === 'shovels') {
      NIAH.data.SHOVELS.forEach((sh, i) => {
        const owned = s.owned.includes(i);
        const equipped = s.shovel === i;
        const gated = s.level < sh.unlock;
        const desc = sh.desc + '  •  holds ' + fmt(sh.cap) + '  •  digs ' + fmt(sh.dig) + ' hay/sec';
        let label, cls = '', btnCls = '', disabled = false;
        if (equipped) { label = 'In hand'; btnCls = 'tag'; disabled = true; cls = 'equipped'; }
        else if (owned) { label = 'Equip'; btnCls = 'equip'; cls = 'owned'; }
        else if (gated) { label = 'Barn ' + sh.unlock; btnCls = 'tag'; disabled = true; cls = 'locked'; }
        else { label = '🪙 ' + fmt(sh.price); disabled = s.coins < sh.price; }
        body.appendChild(row({
          emoji: sh.emoji, name: sh.name, desc, cls, label, btnCls, disabled,
          onClick: () => G.buyShovel(i),
        }));
      });
    } else {
      Object.keys(NIAH.data.GEAR).forEach((key) => {
        const g = NIAH.data.GEAR[key];
        const lvl = s.gear[key];
        const maxed = lvl >= g.max;
        const price = G.gearPrice(key);
        body.appendChild(row({
          emoji: g.emoji,
          name: g.name + (lvl ? ' — Lv ' + lvl : ''),
          desc: g.desc(lvl),
          cls: maxed ? 'owned' : '',
          label: maxed ? 'MAX' : '🪙 ' + fmt(price),
          btnCls: maxed ? 'tag' : '',
          disabled: maxed || s.coins < price,
          onClick: () => G.buyGear(key),
        }));
      });
      const info = document.createElement('div');
      info.className = 'item';
      info.innerHTML = '<div class="item-emoji">📈</div><div class="item-info"><div class="item-name">Current rates</div><div class="item-desc"></div></div>';
      info.querySelector('.item-desc').textContent =
        fmt(G.capacity()) + ' hay per load · ' + fmt(G.digRate()) + ' hay/sec · ' +
        (G.coinsPerHay() < 10 ? G.coinsPerHay().toFixed(2) : fmt(G.coinsPerHay())) + ' coins per hay';
      body.appendChild(info);
    }
    body.scrollTop = scroll;
  }

  /* ----------------------------------------------------------- misc */

  function showStats() {
    const G = NIAH.game, s = G.state;
    const mins = Math.floor((Date.now() - (s.started || Date.now())) / 60000);
    const rows = [
      ['Needles found', s.needles],
      ['Current barn', '#' + s.level],
      ['Hay sifted (all time)', fmt(s.totalHay)],
      ['Loads carried', fmt(s.totalLoads)],
      ['Coins', fmt(s.coins)],
      ['Shovel', NIAH.data.SHOVELS[s.shovel].name],
      ['Walking speed', G.moveSpeed().toFixed(1) + ' m/s'],
      ['Farmhands', s.gear.hands],
      ['Time on the farm', mins < 60 ? mins + ' min' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm'],
    ];
    E.statsList.innerHTML = rows.map((r) => '<li><span>' + r[0] + '</span><span>' + r[1] + '</span></li>').join('');
    screen('stats', true);
  }

  function showWin(data) {
    E.winText.textContent = data.text;
    E.winStats.innerHTML = data.rows.map((r) => '<div><span>' + r[0] + '</span><span>' + r[1] + '</span></div>').join('');
    screen('win', true);
  }

  return {
    init, screen, hudOn, setHud, setPileCard, setPrompt, setAction, setSense, setIntro,
    setMenu, setCameraLabel, renderShop, openShop, closeShop, shopIsOpen, showStats, showWin,
    bumpCoins, fmt,
    get stick() { return E.stick; },
    get stickKnob() { return E.stickKnob; },
    get actionBtn() { return E.actionBtn; },
  };
})();
