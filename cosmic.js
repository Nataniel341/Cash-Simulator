/* === CASH SIMULATOR: CHRISTMAS FIX === */

// --- DANE GRY ---

const EVENT_DURATION = 48 * 60 * 60 * 1000; // 48h

const UPGRADES = [
    { id: 'click', name: 'Moc Kliknięcia', cost: 50, costMult: 1.5, type: 'click' },
    { id: 'combo', name: 'Pojemność Combo', cost: 300, costMult: 1.8, type: 'special' },
    { id: 'global', name: 'Mnożnik Globalny', cost: 1000, costMult: 2.0, type: 'special', bonus: 0.05 },
    { id: 'mps', name: 'Szybkość MPS', cost: 5000, costMult: 2.5, type: 'special', bonus: 0.10 }, // Naprawione 10%
    { id: 'crit', name: 'Szansa Krytyczna', cost: 15000, costMult: 3.0, type: 'special' }
];

const PETS = [
    // EVENTOWE (Nie znikają)
    { id: 'p_elf', name: '🧝 Elf', cost: 10000, mps: 200, mult: 0.05, event: true },
    { id: 'p_sleigh', name: '🛷 Sanie', cost: 2500000, mps: 25000, mult: 0.8, event: true },
    // ZWYKŁE (Znikają po rebirth)
    { id: 'p1', name: 'Dron', cost: 50000, mps: 500, mult: 0.15 },
    { id: 'p2', name: 'Pies', cost: 500000, mps: 3000, mult: 0.5 },
    { id: 'p3', name: 'Koparka', cost: 5000000, mps: 20000, mult: 1.0 }
];

const SKINS = [
    { id: 'default', name: 'Klasyk', cost: 0, mult: 0 },
    { id: 'winter', name: '🎅 Winter', cost: 2000000, mult: 0.30, event: true }, // 2MLN, 30%
    { id: 'gold', name: 'Gold', cost: 20, mult: 0.15, currency: 'rc' },
    { id: 'matrix', name: 'Matrix', cost: 50, mult: 0.3, currency: 'rc' }
];

const ACCESSORIES = [
    { id: 'butterfly', name: '🦋 Motyle', cost: 100000, mult: 0.1, class: 'acc-butterfly' },
    { id: 'tree', name: '🌲 Drzewa', cost: 500000, mult: 0.2, class: 'acc-tree' },
    { id: 'fire', name: '🔥 Ogień', cost: 5000000, mult: 0.5, class: 'acc-fire' }
];

// --- STAN GRY ---
let game = {
    money: 0,
    rc: 0,
    rebirthCount: 0,
    
    // Poziomy ulepszeń (Resetowalne)
    upgrades: { click: 1, combo: 1, global: 0, mps: 0, crit: 0 },
    
    // Ekwipunek (Pety - Liczba posiadanych)
    pets: {}, 
    
    // Permanentne (Nie resetować!)
    ownedSkins: ['default'],
    equippedSkin: 'default',
    ownedAccessories: [],
    equippedAccessory: null,
    autoClicker: false,
    
    startTime: Date.now()
};

// Zmienne tymczasowe
let combo = 0;
let comboMaxBase = 100;
let isComboActive = false;
let autoClickerInterval = null;

// --- INIT ---
function init() {
    loadGame();
    
    // Inicjalizacja pustych petów
    PETS.forEach(p => { if(game.pets[p.id] === undefined) game.pets[p.id] = 0; });

    setInterval(gameLoop, 100);
    setInterval(updateTimer, 1000);
    setInterval(saveGame, 5000); // Autosave co 5s

    if(game.autoClicker) startAutoClicker();

    applyVisuals();
    renderAll();
    updateUI();
}

// --- LOGIKA ---
function handleClick(e) {
    let val = calculateClick();
    let isCrit = Math.random() < (game.upgrades.crit * 0.01);
    if(isCrit) val *= 10;

    game.money += val;
    
    // Combo
    combo += 10;
    let maxC = comboMaxBase + (game.upgrades.combo * 20);
    if(combo > maxC) combo = maxC;

    if(e) spawnParticle(e.clientX, e.clientY, `+${format(val)}`, isCrit ? 'gold' : '#0f0');
    
    updateUI();
}

function calculateClick() {
    let base = 1 + game.upgrades.click;
    let mult = calculateTotalMult();
    let comboM = isComboActive ? 2 : 1;
    return base * mult * comboM;
}

function calculateMPS() {
    let mps = 0;
    PETS.forEach(p => { if(game.pets[p.id] > 0) mps += p.mps; });
    return mps;
}

function calculateTotalMult() {
    let mult = 1.0;
    mult += (game.rebirthCount * 0.5); // Rebirth bonus
    
    // Upgrades
    mult += (game.upgrades.global * 0.05); // Global 5%
    
    // Pets mult
    PETS.forEach(p => { if(game.pets[p.id] > 0) mult += p.mult; });
    
    // Skins mult
    game.ownedSkins.forEach(id => {
        let s = SKINS.find(x => x.id === id);
        if(s) mult += s.mult;
    });

    // Accessories mult
    game.ownedAccessories.forEach(id => {
        let a = ACCESSORIES.find(x => x.id === id);
        if(a) mult += a.mult;
    });

    return mult;
}

function gameLoop() {
    let mps = calculateMPS();
    // Fix MPS Upgrade: mnoży podstawę o (1 + poziom * 0.1)
    let speedMult = 1 + (game.upgrades.mps * 0.1); 
    let totalMult = calculateTotalMultiplier();
    
    let finalMPS = mps * speedMult * totalMult;
    
    if(finalMPS > 0) game.money += finalMPS / 10;

    // Combo Decay
    if(combo > 0) combo -= 0.5; else combo = 0;
    let maxC = comboMaxBase + (game.upgrades.combo * 20);
    
    const fill = document.getElementById('combo-fill');
    if(combo >= maxC * 0.9) isComboActive = true;
    if(combo < maxC * 0.3) isComboActive = false;
    
    fill.style.width = (combo/maxC*100) + '%';
    document.getElementById('combo-text').innerText = isComboActive ? "MAX COMBO x2" : "COMBO x1";

    updateUI();
}

function startAutoClicker() {
    if(autoClickerInterval) clearInterval(autoClickerInterval);
    autoClickerInterval = setInterval(() => { handleClick(null); }, 1000);
}

// --- REBIRTH SYSTEM (MULTI) ---
function getRebirthCost(count) {
    // 100k * 1.5^count
    return Math.floor(100000 * Math.pow(1.5, count));
}

function getMultiRebirthCost(amount) {
    let total = 0;
    for(let i=0; i<amount; i++) {
        total += getRebirthCost(game.rebirthCount + i);
    }
    return total;
}

function doMultiRebirth(amount) {
    let cost = getMultiRebirthCost(amount);
    
    if(game.money >= cost) {
        if(confirm(`Kupić ${amount} Odrodzeń za $${format(cost)}?`)) {
            game.money -= cost;
            game.rebirthCount += amount;
            game.rebirthCoins += (5 * amount);
            
            // RESET STATÓW (Ale nie permanentnych!)
            game.money = 0;
            game.upgrades = { click: 1, combo: 1, global: 0, mps: 0, crit: 0 };
            
            // Resetuj tylko ZWYKŁE pety
            PETS.forEach(p => {
                if(!p.event) game.pets[p.id] = 0;
            });
            
            saveGame();
            location.reload();
        }
    } else {
        alert("Za mało kasy!");
    }
}

// --- KUPOWANIE ---
function buyItem(type, id) {
    if(type === 'upgrade') {
        let u = UPGRADES.find(x => x.id === id);
        let lvl = game.upgrades[id];
        let cost = Math.floor(u.cost * Math.pow(u.costMult, lvl));
        if(game.money >= cost) {
            game.money -= cost;
            game.upgrades[id]++;
        }
    }
    else if(type === 'pet') {
        let p = PETS.find(x => x.id === id);
        if(game.pets[id] > 0) return;
        if(game.money >= p.cost) {
            game.money -= p.cost;
            game.pets[id] = 1;
        }
    }
    else if(type === 'accessory') {
        let a = ACCESSORIES.find(x => x.id === id);
        if(game.money >= a.cost && !game.ownedAccessories.includes(id)) {
            game.money -= a.cost;
            game.ownedAccessories.push(id);
        }
    }
    else if(type === 'skin') {
        let s = SKINS.find(x => x.id === id);
        let curr = s.currency === 'rc' ? game.rc : game.money;
        if(curr >= s.cost && !game.ownedSkins.includes(id)) {
            if(s.currency === 'rc') game.rc -= s.cost; else game.money -= s.cost;
            game.ownedSkins.push(id);
        }
    }
    else if(type === 'autoclicker') {
        if(game.money >= 1000000 && !game.autoClicker) {
            game.money -= 1000000;
            game.autoClicker = true;
            startAutoClicker();
        }
    }
    renderAll(); updateUI(); saveGame();
}

function equip(type, id) {
    if(type === 'skin') { game.equippedSkin = id; applyVisuals(); }
    if(type === 'accessory') { game.equippedAccessory = id; applyVisuals(); }
    renderAll(); saveGame();
}

function applyVisuals() {
    const btn = document.getElementById('main-btn');
    const wrap = document.getElementById('btn-wrapper');
    
    // Skin
    let s = SKINS.find(x => x.id === game.equippedSkin);
    btn.className = '';
    if(s && id !== 'default') btn.classList.add(`skin-${s.id}`);
    
    // Accessory
    wrap.className = 'btn-wrapper';
    let a = ACCESSORIES.find(x => x.id === game.equippedAccessory);
    if(a) wrap.classList.add(a.class);
}

// --- RENDEROWANIE SKLEPÓW ---
function renderAll() {
    // Upgrades
    let html = '';
    UPGRADES.forEach(u => {
        let lvl = game.upgrades[u.id];
        let cost = Math.floor(u.cost * Math.pow(u.costMult, lvl));
        html += `<div class="item-card"><div class="item-info"><h3>${u.name} (Lvl ${lvl})</h3></div>
        <button class="btn-buy ${game.money>=cost?'can-afford':''}" onclick="buyItem('upgrade','${u.id}')">$${format(cost)}</button></div>`;
    });
    document.getElementById('list-upgrades').innerHTML = html;

    // Pets (Dzielone na zwykłe i eventowe w odpowiednich zakładkach)
    let petHtml = '';
    let eventHtml = '';
    
    // Auto Clicker w Event
    eventHtml += `<div class="item-card"><div class="item-info"><h3>🤖 Auto-Clicker</h3><p>Klika co 1s</p></div>
    <button class="btn-buy ${game.autoClicker?'purchased':(game.money>=1000000?'can-afford':'')}" onclick="buyItem('autoclicker')">${game.autoClicker?'POSIADASZ':'$1M'}</button></div>`;

    PETS.forEach(p => {
        let owned = game.pets[p.id] > 0;
        let btn = owned ? `<button class="btn-buy purchased">KUPIONE</button>` : 
            `<button class="btn-buy ${game.money>=p.cost?'can-afford':''}" onclick="buyItem('pet','${p.id}')">$${format(p.cost)}</button>`;
        let item = `<div class="item-card"><div class="item-info"><h3>${p.name}</h3><p>MPS: ${format(p.mps)}</p></div>${btn}</div>`;
        
        if(p.event) eventHtml += item; else petHtml += item;
    });
    document.getElementById('list-pets').innerHTML = petHtml;
    
    // Event Skin
    let ws = SKINS.find(x => x.id === 'winter');
    let wsOwned = game.ownedSkins.includes('winter');
    let wsBtn = wsOwned ? `<button class="btn-buy purchased">POSIADASZ</button>` : 
        `<button class="btn-buy ${game.money>=ws.cost?'can-afford':''}" onclick="buyItem('skin','winter')">$${format(ws.cost)}</button>`;
    eventHtml += `<div class="item-card" style="border-color:cyan"><div class="item-info"><h3>🎅 Winter Skin (+30%)</h3></div>${wsBtn}</div>`;
    
    document.getElementById('list-event').innerHTML = eventHtml;

    // Accessories
    let accHtml = '';
    ACCESSORIES.forEach(a => {
        let owned = game.ownedAccessories.includes(a.id);
        let equipped = game.equippedAccessory === a.id;
        let btn = '';
        if(equipped) btn = `<button class="btn-buy purchased">ZAŁOŻONE</button>`;
        else if(owned) btn = `<button class="btn-buy can-afford" onclick="equip('accessory','${a.id}')">UBIERZ</button>`;
        else btn = `<button class="btn-buy ${game.money>=a.cost?'can-afford':''}" onclick="buyItem('accessory','${a.id}')">$${format(a.cost)}</button>`;
        
        accHtml += `<div class="item-card"><div class="item-info"><h3>${a.name}</h3><p>Bonus: ${a.mult*100}%</p></div>${btn}</div>`;
    });
    document.getElementById('list-accessories').innerHTML = accHtml;

    // Skins (zwykłe)
    let skinHtml = '';
    SKINS.forEach(s => {
        if(s.event) return; // Pomiń eventowe tutaj
        let owned = game.ownedSkins.includes(s.id);
        let equipped = game.equippedSkin === s.id;
        let btn = '';
        if(equipped) btn = `<button class="btn-buy purchased">ZAŁOŻONE</button>`;
        else if(owned) btn = `<button class="btn-buy can-afford" onclick="equip('skin','${s.id}')">UBIERZ</button>`;
        else {
            let costTxt = s.currency === 'rc' ? s.cost + ' RC' : '$' + format(s.cost);
            let can = s.currency === 'rc' ? game.rc >= s.cost : game.money >= s.cost;
            btn = `<button class="btn-buy ${can?'can-afford':''}" onclick="buyItem('skin','${s.id}')">${costTxt}</button>`;
        }
        skinHtml += `<div class="item-card"><div class="item-info"><h3>${s.name}</h3><p>Bonus: ${s.mult*100}%</p></div>${btn}</div>`;
    });
    document.getElementById('list-skins').innerHTML = skinHtml;
    
    // Active Pets Icons
    let ap = document.getElementById('active-pets');
    ap.innerHTML = '';
    if(game.pets['p_elf'] > 0) ap.innerHTML += '🧝';
    if(game.pets['p_sleigh'] > 0) ap.innerHTML += '🛷';
}

// --- UI UPDATE ---
function updateUI() {
    document.getElementById('ui-money').innerText = format(game.money);
    document.getElementById('ui-rc').innerText = game.rc;
    document.getElementById('ui-rebirth-count').innerText = game.rebirthCount;
    
    let rawMps = calculateMPS();
    let speedMult = 1 + (game.upgrades.mps * 0.1);
    let totalMult = calculateTotalMultiplier();
    document.getElementById('ui-mps').innerText = format(rawMps * speedMult * totalMult);
    document.getElementById('ui-mps-boost').innerText = `(+${Math.round((speedMult-1)*100)}%)`;
    document.getElementById('ui-total-mult').innerText = totalMult.toFixed(2);
    document.getElementById('ui-click-power').innerText = format(calculateClick());

    // Rebirth Buttons Costs
    document.getElementById('cost-r-1').innerText = format(getMultiRebirthCost(1));
    document.getElementById('cost-r-3').innerText = format(getMultiRebirthCost(3));
    document.getElementById('cost-r-10').innerText = format(getMultiRebirthCost(10));
}

// --- UTILS ---
function format(num) {
    if(num >= 1e6) return (num/1e6).toFixed(2)+'M';
    if(num >= 1e3) return (num/1e3).toFixed(1)+'k';
    return Math.floor(num);
}

function spawnParticle(x, y, text, color) {
    let p = document.createElement('div');
    p.className = 'particle';
    p.innerText = text;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.color = color;
    document.getElementById('particles-container').appendChild(p);
    setTimeout(() => p.remove(), 800);
}

function updateTimer() {
    let now = new Date();
    let h = 47 - (now.getHours() % 48);
    let m = 59 - now.getMinutes();
    let s = 59 - now.getSeconds();
    document.getElementById('event-timer').innerText = `${h}:${m}:${s}`;
}

function switchTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function saveGame() { localStorage.setItem('CashSim_FinalFix', JSON.stringify(game)); }
function loadGame() {
    let d = localStorage.getItem('CashSim_FinalFix');
    if(d) {
        let p = JSON.parse(d);
        game = { ...game, ...p };
        // Fix for arrays
        if(!game.ownedAccessories) game.ownedAccessories = [];
        if(!game.pets) game.pets = {};
    }
}

init();
