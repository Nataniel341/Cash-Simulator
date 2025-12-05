/* === CASH SIMULATOR: ULTIMATE ENGINE === */

// --- DANE GRY ---

const PETS_DATA = [
    // Eventowe
    { id: 'p_event1', name: '🧝 Elf Pomocnik', cost: 10000, mps: 250, mult: 0.05, icon: '🧝', desc: '[EVENT] Mały ale pracowity!' },
    { id: 'p_event2', name: '🛷 Sanie Mikołaja', cost: 2500000, mps: 25000, mult: 0.8, icon: '🛷', desc: '[EVENT] Roznosi prezenty i gotówkę.' },
    // Zwykłe
    { id: 'p1', name: 'Nano Dron', cost: 50000, mps: 500, mult: 0.15, icon: '🚁', desc: 'Standardowy dron.' },
    { id: 'p2', name: 'Robo-Koparka', cost: 500000, mps: 3000, mult: 0.5, icon: '🐕‍🦺', desc: 'Maszyna do kasy.' },
    { id: 'p3', name: 'Kwantowy Haker', cost: 5000000, mps: 20000, mult: 1.0, icon: '💻', desc: 'Podwaja bazowy mnożnik.' },
];

const SKINS_BTN_DATA = [
    { id: 'default', name: 'Klasyk', cost: 0, mult: 0, class: '' },
    { id: 'neon', name: 'Neon Pink', cost: 5, mult: 0.05, class: 'skin-neon' }, 
    { id: 'gold', name: 'Rich Gold', cost: 20, mult: 0.15, class: 'skin-gold' }, 
    { id: 'matrix', name: 'The Matrix', cost: 50, mult: 0.3, class: 'skin-matrix' }, 
    { id: 'fire', name: 'Hellfire', cost: 100, mult: 0.5, class: 'skin-fire' },
    // Event Skin ($) - NAPRAWIONE
    { id: 'winter', name: '🎅 Winter Santa', cost: 2000000, mult: 0.30, class: 'skin-winter', currency: 'money' } 
];

const RC_UPGRADES = [
    { id: 'rc_click', name: '🚀 Super Klik', cost: 5, current: 0, max: 10, icon: '✨', effect: (lvl) => lvl * 0.1, desc: 'Moc kliknięcia +10%' },
    { id: 'rc_mps', name: '⚡ Hiper Pasyw', cost: 10, current: 0, max: 5, icon: '🔥', effect: (lvl) => lvl * 0.25, desc: 'MPS +25%' },
    { id: 'rc_mult_base', name: '🌟 Bonus Rebirth', cost: 25, current: 0, max: 1, icon: '⭐', effect: (lvl) => lvl * 1.0, desc: 'Podwaja bonus Rebirth.' }
];

// --- STAN ---
let game = {
    money: 0,
    rebirthCoins: 0,
    rebirthCount: 0,
    
    // Upgrades Levels
    clickLevel: 1, 
    comboLevel: 1, 
    globalMultLevel: 0,
    mpsSpeedLevel: 0,
    bonusChanceLevel: 0,
    
    // Inventory
    pets: {}, 
    ownedSkinsBtn: ['default'],
    equippedSkinBtn: 'default',
    rcUpgrades: { rc_click: 0, rc_mps: 0, rc_mult_base: 0 },
    autoClicker: false
};

// --- ZMIENNE TYMCZASOWE ---
let comboHeat = 0;
let comboMaxBase = 100;
let isComboActive = false;
let autoClickerInterval = null;

// Init
function init() {
    loadGame();
    // Inicjalizacja petów i RC
    PETS_DATA.forEach(p => { if(game.pets[p.id] === undefined) game.pets[p.id] = 0; });
    RC_UPGRADES.forEach(u => u.current = game.rcUpgrades[u.id] || 0);

    // Pętle
    setInterval(gameLoop, 100);
    setInterval(updateEventTimer, 1000); // Licznik Eventu
    
    if(game.autoClicker) startAutoClicker();

    window.addEventListener('beforeunload', saveGame);
    
    applySkin(game.equippedSkinBtn);
    renderAll();
    updateUI();
}

// --- CORE GAME LOGIC ---

function handleClick(e) {
    let amount = calculateClickValue();
    let crit = Math.random() < (game.bonusChanceLevel * 0.01);
    if(crit) amount *= 10;

    game.money += amount;
    
    // Combo
    comboHeat += 15;
    let maxC = comboMaxBase + (game.comboLevel * 20);
    if(comboHeat > maxC) comboHeat = maxC;

    // FX (Particles)
    if(e) {
        let color = crit ? 'var(--neon-gold)' : 'var(--neon-green)';
        let text = crit ? `CRIT! +${formatNumber(amount, 0)}` : `+${formatNumber(amount, 0)}`;
        spawnParticles(e.clientX, e.clientY, text, color);
    }
    
    updateUI();
    saveGame();
}

function gameLoop() {
    // 1. Oblicz MPS
    let mps = calculateMPS();
    let speedMult = 1 + (game.mpsSpeedLevel * 0.1);
    let rcMps = 1 + RC_UPGRADES[1].effect(game.rcUpgrades.rc_mps);
    let totalMult = calculateTotalMultiplier();
    
    let finalMPS = mps * speedMult * rcMps * totalMult;
    
    if(finalMPS > 0) game.money += finalMPS / 10;

    // 2. Combo Decay
    let maxC = comboMaxBase + (game.comboLevel * 20);
    if(comboHeat > 0) comboHeat -= (1.5 / game.comboLevel); else comboHeat = 0;
    
    const fill = document.getElementById('combo-fill');
    if(comboHeat >= maxC * 0.9) { isComboActive = true; fill.style.background = 'var(--neon-red)'; }
    if(comboHeat < maxC * 0.3) { isComboActive = false; fill.style.background = 'linear-gradient(90deg, var(--neon-blue), var(--neon-pink))'; }
    
    fill.style.width = (comboHeat / maxC * 100) + '%';
    document.getElementById('combo-text').innerText = isComboActive ? "MAX COMBO x2" : "COMBO x1";

    updateUI();
}

function startAutoClicker() {
    if(autoClickerInterval) clearInterval(autoClickerInterval);
    autoClickerInterval = setInterval(() => {
        handleClick(null); // click bez efektu cząsteczek
    }, 1000);
}

// --- CALCULATIONS ---

function calculateClickValue() {
    let rcBonus = RC_UPGRADES[0].effect(game.rcUpgrades.rc_click);
    let base = 1 + game.clickLevel + rcBonus;
    
    let totalMult = calculateTotalMultiplier();
    let comboMult = isComboActive ? 2 : 1;
    
    return base * totalMult * comboMult;
}

function calculateMPS() {
    let mps = 0;
    PETS_DATA.forEach(p => { if(game.pets[p.id] > 0) mps += p.mps; });
    return mps;
}

function calculateTotalMultiplier() {
    let mult = 1.0;
    
    // Mnożnik bazowy od Rebirth
    mult += (game.rebirthCount * 0.5); 

    // Pets mult
    PETS_DATA.forEach(p => { if(game.pets[p.id] > 0) mult += p.mult; });
    
    // Skins mult
    game.ownedSkinsBtn.forEach(id => {
        let s = SKINS_BTN_DATA.find(x => x.id === id);
        if(s) mult += s.mult;
    });
    
    // Global UPG
    mult += (game.globalMultLevel * 0.05);

    // RC Rebirth Bonus (mnożnik na wszystko)
    let rcBase = 1 + RC_UPGRADES[2].effect(game.rcUpgrades.rc_mult_base);
    mult *= rcBase;
    
    return mult;
}

// --- BUY & UPGRADE LOGIC ---

function buyUpgrade(type) {
    let cost = 0;
    let lvl = 0;
    
    if(type === 'click') { lvl = game.clickLevel; cost = 50 * Math.pow(1.5, lvl-1); }
    if(type === 'combo') { lvl = game.comboLevel; cost = 300 * Math.pow(1.8, lvl-1); }
    if(type === 'global') { lvl = game.globalMultLevel; cost = 1000 * Math.pow(2, lvl); }
    if(type === 'mps') { lvl = game.mpsSpeedLevel; cost = 5000 * Math.pow(2.5, lvl); }
    if(type === 'bonus') { lvl = game.bonusChanceLevel; cost = 15000 * Math.pow(3, lvl); }
    
    cost = Math.floor(cost);
    
    if(game.money >= cost) {
        game.money -= cost;
        if(type === 'click') game.clickLevel++;
        if(type === 'combo') game.comboLevel++;
        if(type === 'global') game.globalMultLevel++;
        if(type === 'mps') game.mpsSpeedLevel++;
        if(type === 'bonus') game.bonusChanceLevel++;
        renderAll(); updateUI(); saveGame();
    }
}
// Aliasy dla HTML
function buyClickUpgrade() { buyUpgrade('click'); }
function buyComboUpgrade() { buyUpgrade('combo'); }
function buyGlobalMultiplier() { buyUpgrade('global'); }
function buyMpsSpeed() { buyUpgrade('mps'); }
function buyBonusChance() { buyUpgrade('bonus'); }

function buyPet(id) {
    let p = PETS_DATA.find(x => x.id === id);
    if(game.pets[id] > 0) return;
    if(game.money >= p.cost) {
        game.money -= p.cost;
        game.pets[id] = 1;
        renderAll(); updateUI(); saveGame();
    }
}

function buySkin(id) {
    let s = SKINS_BTN_DATA.find(x => x.id === id);
    let currency = s.currency === 'money' ? game.money : game.rebirthCoins;
    
    if(currency >= s.cost && !game.ownedSkinsBtn.includes(id)) {
        if(s.currency === 'money') game.money -= s.cost;
        else game.rebirthCoins -= s.cost;
        
        game.ownedSkinsBtn.push(id);
        renderAll(); updateUI(); saveGame();
    }
}

function buyAutoClicker() {
    let cost = 1000000; // 1 milion $
    if(!game.autoClicker && game.money >= cost) {
        game.money -= cost;
        game.autoClicker = true;
        startAutoClicker();
        renderAll(); updateUI(); saveGame();
    }
}

function equipSkin(id) {
    game.equippedSkinBtn = id;
    applySkin(id);
    renderAll(); saveGame();
}

function applySkin(id) {
    let btn = document.getElementById('main-btn');
    let s = SKINS_BTN_DATA.find(x => x.id === id);
    if(!s) return;
    btn.className = '';
    if(s.class) btn.classList.add(s.class);
}

function buyRCUpgrade(id) {
    let u = RC_UPGRADES.find(x => x.id === id);
    let cost = u.cost * (u.current + 1);
    if(u.current < u.max && game.rebirthCoins >= cost) {
        game.rebirthCoins -= cost;
        u.current++;
        game.rcUpgrades[id] = u.current;
        renderAll(); updateUI(); saveGame();
    }
}

// --- CASINO ---
function spinCasino() {
    let cost = Math.floor(game.money * 0.05);
    if(cost < 100) cost = 100;
    
    if(game.money >= cost) {
        game.money -= cost;
        
        let slots = ['🍒','🍋','💎','7️⃣'];
        let resEl = document.getElementById('casino-result');
        resEl.innerText = "Losowanie...";
        
        let spins = 0;
        let anim = setInterval(() => {
            document.getElementById('slot1').innerText = slots[Math.floor(Math.random()*4)];
            document.getElementById('slot2').innerText = slots[Math.floor(Math.random()*4)];
            document.getElementById('slot3').innerText = slots[Math.floor(Math.random()*4)];
            spins++;
            if(spins > 15) {
                clearInterval(anim);
                finalizeSpin(cost, slots);
            }
        }, 100);
    }
}

function finalizeSpin(cost, slots) {
    let r1 = slots[Math.floor(Math.random()*4)];
    let r2 = slots[Math.floor(Math.random()*4)];
    let r3 = slots[Math.floor(Math.random()*4)];
    
    if(Math.random() > 0.6) r2 = r1; // Cheat na większą szansę
    
    document.getElementById('slot1').innerText = r1;
    document.getElementById('slot2').innerText = r2;
    document.getElementById('slot3').innerText = r3;
    
    let resEl = document.getElementById('casino-result');
    
    if(r1===r2 && r2===r3) {
        if(r1 === '7️⃣') { game.money += cost * 20; resEl.innerText = "JACKPOT! x20 KASY!"; }
        else if(r1 === '💎') { game.rebirthCoins += 10; resEl.innerText = "+10 RC!"; }
        else { game.money += cost * 5; resEl.innerText = "BIG WIN! x5 KASY!"; }
        spawnParticles(window.innerWidth/2, window.innerHeight/2, "JACKPOT!", "var(--neon-gold)");
    } else if(r1===r2 || r2===r3 || r1===r3) {
        game.money += cost * 1.5;
        resEl.innerText = "Zwrot 150%!";
    } else {
        resEl.innerText = "Spróbuj ponownie...";
    }
    updateUI(); saveGame();
}

// --- REBIRTH (BULK) ---
function getRebirthCost(currentCount) {
    return Math.floor(100000 * Math.pow(1.5, currentCount));
}

function doRebirth(mode) {
    let cost = getRebirthCost(game.rebirthCount);
    
    if(mode === 1) { // Pojedynczy
        if(game.money >= cost) {
            if(confirm("Odrodzić się? Zyskasz 5 RC.")) {
                performRebirth(1, cost);
            }
        }
    } else { // Max (Bulk)
        let count = 0;
        let tempMoney = game.money;
        let tempRebirths = game.rebirthCount;
        let totalCost = 0;
        let tempCost = getRebirthCost(tempRebirths);
        
        while(tempMoney >= tempCost && count < 1000) { // Limit 1000
            tempMoney -= tempCost;
            totalCost += tempCost;
            count++;
            tempRebirths++;
            tempCost = getRebirthCost(tempRebirths);
        }
        
        if(count > 0) {
            if(confirm(`Kupić ${count} Odrodzeń za ${formatNumber(totalCost)}$? Zyskasz ${5*count} RC.`)) {
                performRebirth(count, totalCost);
            }
        }
    }
}

function performRebirth(amount, cost) {
    game.money -= cost;
    if(game.money < 0) game.money = 0; 
    
    game.rebirthCount += amount;
    game.rebirthCoins += (5 * amount);
    
    // Reset zwykłych ulepszeń
    game.money = 0;
    game.clickLevel = 1;
    game.comboLevel = 1;
    game.globalMultLevel = 0;
    game.mpsSpeedLevel = 0;
    game.bonusChanceLevel = 0;
    
    // Reset zwykłych petów (Eventowe zostają)
    if(game.pets['p1']) game.pets['p1'] = 0;
    if(game.pets['p2']) game.pets['p2'] = 0;
    if(game.pets['p3']) game.pets['p3'] = 0;
    
    saveGame();
    location.reload();
}

// --- RENDER & UI ---

function renderAll() {
    renderEvent();
    renderPets();
    renderSkins();
    renderRC();
    renderActivePets();
    updateUpgLevels();
}

function updateUpgLevels() {
    document.getElementById('lvl-click').innerText = game.clickLevel;
    document.getElementById('lvl-combo').innerText = game.comboLevel;
    document.getElementById('lvl-global-mult').innerText = game.globalMultLevel;
    document.getElementById('lvl-mps-speed').innerText = game.mpsSpeedLevel;
    document.getElementById('lvl-bonus-chance').innerText = game.bonusChanceLevel;
}

function renderEvent() {
    const list = document.getElementById('event-list');
    list.innerHTML = '';
    
    // Auto Clicker
    let acHtml = game.autoClicker 
        ? `<button class="btn-buy purchased" disabled>POSIADANY</button>`
        : `<button class="btn-buy ${game.money>=1000000?'can-afford':''}" onclick="buyAutoClicker()">$1M</button>`;
    list.innerHTML += `<div class="upgrade-card"><div class="upgrade-info"><h3>🤖 Auto-Clicker</h3><p>Klika co 1s.</p></div>${acHtml}</div>`;
    
    // Winter Skin (2 miliony $)
    let s = SKINS_BTN_DATA.find(x => x.id === 'winter');
    let owned = game.ownedSkinsBtn.includes('winter');
    let sHtml = owned 
        ? `<button class="btn-buy purchased" disabled>UBIERZ/POSIADASZ</button>` 
        : `<button class="btn-buy ${game.money>=s.cost?'can-afford':''}" onclick="buySkin('winter')">$${formatNumber(s.cost)}</button>`;
    list.innerHTML += `<div class="upgrade-card" style="border:1px solid cyan"><div class="upgrade-info"><h3>🎅 Winter Skin (+30%)</h3><p>Koszt: $2,000,000</p></div>${sHtml}</div>`;
    
    // Event Pets
    PETS_DATA.forEach(p => {
        if(p.id.includes('event')) {
            let owned = game.pets[p.id] > 0;
            let btn = owned 
                ? `<button class="btn-buy purchased" disabled>POSIADANY</button>`
                : `<button class="btn-buy ${game.money>=p.cost?'can-afford':''}" onclick="buyPet('${p.id}')">$${formatNumber(p.cost)}</button>`;
            list.innerHTML += `<div class="upgrade-card"><div class="upgrade-info"><h3>${p.icon} ${p.name}</h3><p>MPS: ${formatNumber(p.mps)}</p></div>${btn}</div>`;
        }
    });
}

function renderPets() {
    const list = document.getElementById('pets-list');
    list.innerHTML = '';
    PETS_DATA.forEach(p => {
        if(!p.id.includes('event')) {
            let owned = game.pets[p.id] > 0;
            let btn = owned 
                ? `<button class="btn-buy purchased" disabled>POSIADANY</button>`
                : `<button class="btn-buy ${game.money>=p.cost?'can-afford':''}" onclick="buyPet('${p.id}')">$${formatNumber(p.cost)}</button>`;
            list.innerHTML += `<div class="upgrade-card"><div class="upgrade-info"><h3>${p.icon} ${p.name}</h3><p>MPS: ${formatNumber(p.mps)}</p></div>${btn}</div>`;
        }
    });
}

function renderSkins() {
    const list = document.getElementById('skins-btn-list');
    list.innerHTML = '';
    SKINS_BTN_DATA.forEach(s => {
        let owned = game.ownedSkinsBtn.includes(s.id);
        let equipped = game.equippedSkinBtn === s.id;
        
        // Pomiń niekupione eventowe skiny w normalnym sklepie
        if(s.id === 'winter' && !owned) return;
        
        let btn = '';
        if(equipped) btn = `<button class="btn-buy" disabled>UBRANE</button>`;
        else if(owned) btn = `<button class="btn-buy can-afford-rc" onclick="equipSkin('${s.id}')">UBIERZ</button>`;
        else {
            let curr = s.currency === 'money' ? game.money : game.rebirthCoins;
            let cls = s.currency === 'money' ? 'can-afford' : 'can-afford-rc';
            let txt = s.currency === 'money' ? '$' : ' RC';
            btn = `<button class="btn-buy ${curr>=s.cost?cls:''}" onclick="buySkin('${s.id}')">${formatNumber(s.cost)}${txt}</button>`;
        }
        
        list.innerHTML += `<div class="upgrade-card"><div class="upgrade-info"><h3>${s.name}</h3><p>Bonus: ${s.mult*100}%</p></div>${btn}</div>`;
    });
}

function renderRC() {
    const list = document.getElementById('rc-shop-list');
    list.innerHTML = '';
    RC_UPGRADES.forEach(u => {
        let max = u.current >= u.max;
        let cost = u.cost * (u.current + 1);
        let btn = max 
            ? `<button class="btn-buy" disabled>MAX</button>`
            : `<button class="btn-buy ${game.rebirthCoins>=cost?'can-afford-rc':''}" onclick="buyRCUpgrade('${u.id}')">${cost} RC</button>`;
        list.innerHTML += `<div class="upgrade-card"><div class="upgrade-info"><h3>${u.icon} ${u.name} (Lvl ${u.current}/${u.max})</h3><p>${u.desc}</p></div>${btn}</div>`;
    });
}

function renderActivePets() {
    const d = document.getElementById('active-pets-display');
    d.innerHTML = '';
    PETS_DATA.forEach(p => {
        if(game.pets[p.id] > 0) {
            d.innerHTML += `<span class="pet-icon">${p.icon}</span>`;
        }
    });
}

function updateUI() {
    document.getElementById('ui-money').innerText = formatNumber(Math.floor(game.money));
    document.getElementById('ui-rc').innerText = game.rebirthCoins;
    document.getElementById('ui-rebirth-count').innerText = game.rebirthCount;
    
    let rawMps = calculateMPS();
    let speedMult = 1 + (game.mpsSpeedLevel * 0.1);
    let rcMps = 1 + RC_UPGRADES[1].effect(game.rcUpgrades.rc_mps);
    let totalMult = calculateTotalMultiplier();
    let realMps = rawMps * speedMult * rcMps * totalMult;
    
    document.getElementById('ui-mps').innerText = formatNumber(Math.floor(realMps));
    document.getElementById('ui-mps-boost').innerText = `(+${((speedMult-1)*100).toFixed(0)}%)`;
    document.getElementById('ui-total-mult').innerText = totalMult.toFixed(2);
    
    // Rebirth next cost & max count
    const nextCost = getRebirthCost(game.rebirthCount);
    document.getElementById('rebirth-req-display').innerText = formatNumber(nextCost);
    document.getElementById('rebirth-gain').innerText = (game.money >= nextCost) ? 5 : 0;
    
    // Oblicz Max Rebirth (dla UI)
    let maxBuy = 0;
    let tempMoney = game.money;
    let tempRebirths = game.rebirthCount;
    let tempCost = nextCost;
    while(tempMoney >= tempCost && maxBuy < 1000) {
        tempMoney -= tempCost;
        maxBuy++;
        tempRebirths++;
        tempCost = getRebirthCost(tempRebirths);
    }
    document.getElementById('rebirth-max-count').innerText = maxBuy;
    
    // Aktualizacja cen i kolorów przycisków
    updateUpgradePrice('click', 50 * Math.pow(1.5, game.clickLevel-1), game.clickLevel);
    updateUpgradePrice('combo', 300 * Math.pow(1.8, game.comboLevel-1), game.comboLevel);
    updateUpgradePrice('global-mult', 1000 * Math.pow(2, game.globalMultLevel), game.globalMultLevel);
    updateUpgradePrice('mps-speed', 5000 * Math.pow(2.5, game.mpsSpeedLevel), game.mpsSpeedLevel);
    updateUpgradePrice('bonus-chance', 15000 * Math.pow(3, game.bonusChanceLevel), game.bonusChanceLevel);
}

function updateUpgradePrice(id, cost, lvl) {
    let btn = document.getElementById(`btn-upg-${id}`);
    if(btn) {
        btn.innerText = `$${formatNumber(Math.floor(cost))}`;
        if(game.money >= Math.floor(cost)) btn.classList.add('can-afford');
        else btn.classList.remove('can-afford');
    }
}

// --- Event Timer (NAPRAWIONY) ---
function updateEventTimer() {
    // Ustawienie cyklu na 48 godzin (172800 sekund)
    const cycleDuration = 48 * 60 * 60 * 1000;
    const now = Date.now();
    
    // Obliczenie, ile czasu minęło od ostatniego pełnego cyklu (modulo)
    const elapsedInCycle = now % cycleDuration;
    
    // Czas pozostały do końca cyklu
    const remainingTime = cycleDuration - elapsedInCycle;

    let h = Math.floor(remainingTime / (1000 * 60 * 60));
    let m = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    let s = Math.floor((remainingTime % (1000 * 60)) / 1000);
    
    // Formatowanie do HH:MM:SS
    const format = (val) => String(val).padStart(2, '0');
    document.getElementById('event-countdown').innerText = `${format(h)}:${format(m)}:${format(s)}`;
}

// --- UTILS ---
function formatNumber(num, fixed = 2) {
    if (num === 0) return '0';
    if (num < 1000) return Math.floor(num);
    const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const i = Math.floor(Math.log(num) / Math.log(1000));
    const short = (num / Math.pow(1000, i)).toFixed(fixed);
    return short + suffixes[i];
}

function spawnParticles(x, y, text, color) {
    let el = document.createElement('div');
    el.className = 'particle';
    el.innerText = text;
    el.style.color = color;
    el.style.left = (x - 20 + Math.random()*40) + 'px';
    el.style.top = (y - 20) + 'px';
    document.getElementById('particles-container').appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    renderAll(); // Upewnij się, że zawartość jest świeża przy zmianie
}

function saveGame() { localStorage.setItem('CashSim_Ultimate', JSON.stringify(game)); }

function loadGame() {
    let d = localStorage.getItem('CashSim_Ultimate');
    if(d) {
        let p = JSON.parse(d);
        // Ładujemy zapisane, ale upewniamy się, że nowe pola istnieją
        game = { ...game, ...p };
        // Upewnienie się, że RC upgrades i autoClicker są zainicjalizowane w starych zapisach
        game.rcUpgrades = game.rcUpgrades || { rc_click: 0, rc_mps: 0, rc_mult_base: 0 };
        game.autoClicker = game.autoClicker || false;
    }
}

// Start gry
init();
