/* === CASH SIMULATOR: FIXED ENGINE === */

// DANE
const UPGRADES = [
    { id: 'click', name: 'Moc Klika', cost: 50, mult: 1.5, type: 'click' },
    { id: 'combo', name: 'Max Combo', cost: 300, mult: 1.8, type: 'combo' },
    { id: 'global', name: 'Mnożnik', cost: 1000, mult: 2.0, type: 'global', bonus: 0.05 },
    { id: 'mps', name: 'Szybkość MPS', cost: 5000, mult: 2.5, type: 'mps', bonus: 0.10 }, // Poprawione 10%
    { id: 'crit', name: 'Krytyk', cost: 15000, mult: 3.0, type: 'crit' }
];

const PETS = [
    // ZWYKŁE (Resetowalne)
    { id: 'p1', name: 'Dron', cost: 50000, mps: 500, event: false },
    { id: 'p2', name: 'Pies', cost: 500000, mps: 3000, event: false },
    // EVENTOWE (Permanentne)
    { id: 'elf', name: '🧝 Elf', cost: 10000, mps: 200, event: true },
    { id: 'sleigh', name: '🛷 Sanie', cost: 2500000, mps: 25000, event: true }
];

const ACCESSORIES = [
    { id: 'butterfly', name: '🦋 Motyle', cost: 100000, mult: 0.1, class: 'acc-butterfly' },
    { id: 'tree', name: '🎄 Choinki', cost: 500000, mult: 0.2, class: 'acc-tree' },
    { id: 'fire', name: '🔥 Piekło', cost: 2000000, mult: 0.5, class: 'acc-fire' }
];

const SKINS = [
    { id: 'default', name: 'Klasyk', cost: 0 },
    { id: 'winter', name: '🎅 Winter (2M)', cost: 2000000, mult: 0.3, event: true },
    { id: 'gold', name: 'Gold', cost: 5000000, mult: 0.2, event: false }
];

// STAN GRY
let game = {
    money: 0,
    rc: 0,
    rebirths: 0,
    upgrades: { click: 1, combo: 1, global: 0, mps: 0, crit: 0 },
    pets: {}, // id: ilosc
    accessories: [], // id posiadanych
    skins: ['default'],
    equippedAcc: null,
    equippedSkin: 'default',
    autoClicker: false // Event item
};

let combo = 0;
let comboMax = 100;
let isCombo = false;
let autoInterval = null;

// INIT
function init() {
    loadGame();
    fixSaveData(); // NAPRAWIENIE STARYCH ZAPISÓW
    
    setInterval(loop, 100);
    setInterval(saveGame, 5000);
    setInterval(updateTimer, 1000);
    
    if(game.autoClicker) startAuto();
    
    applyVisuals();
    renderShops();
    updateUI();
}

// LOGIKA
function loop() {
    // MPS
    let mps = calcMPS();
    let speed = 1 + (game.upgrades.mps * 0.1);
    let totalMult = calcMult();
    
    let income = (mps * speed * totalMult) / 10;
    if(income > 0) game.money += income;

    // Combo Decay
    if(combo > 0) combo -= 0.5; else combo = 0;
    let max = 100 + (game.upgrades.combo * 20);
    comboMax = max;
    
    const fill = document.getElementById('combo-fill');
    if(combo >= max * 0.9) isCombo = true;
    if(combo < max * 0.3) isCombo = false;
    
    fill.style.width = (combo/max*100) + '%';
    document.getElementById('combo-text').innerText = isCombo ? "MAX x2" : "x1";
    fill.style.background = isCombo ? 'red' : 'linear-gradient(90deg, blue, magenta)';

    updateUI();
}

function clickBtn(e) {
    let val = (1 + game.upgrades.click) * calcMult();
    if(isCombo) val *= 2;
    
    // Krytyk
    let critChance = game.upgrades.crit * 0.01;
    let isCrit = Math.random() < critChance;
    if(isCrit) val *= 10;

    game.money += val;
    combo += 10;
    if(combo > comboMax) combo = comboMax;

    // Particle
    if(e) {
        let txt = isCrit ? `CRIT! +${format(val)}` : `+${format(val)}`;
        let col = isCrit ? 'gold' : 'lime';
        spawnParticle(e.clientX, e.clientY, txt, col);
    }
    updateUI();
}

function startAuto() {
    if(autoInterval) clearInterval(autoInterval);
    autoInterval = setInterval(() => clickBtn(null), 1000);
}

// KALKULACJE
function calcMPS() {
    let mps = 0;
    for(let id in game.pets) {
        let p = PETS.find(x => x.id === id);
        if(p && game.pets[id] > 0) mps += p.mps; // Pety są jednorazowe teraz (0 lub 1)
    }
    return mps;
}

function calcMult() {
    let m = 1.0;
    m += (game.rebirths * 0.5); // +50% per rebirth
    m += (game.upgrades.global * 0.05); // +5% per upgrade
    
    // Accessories
    game.accessories.forEach(id => {
        let a = ACCESSORIES.find(x => x.id === id);
        if(a) m += a.mult;
    });
    
    // Skins
    let s = SKINS.find(x => x.id === game.equippedSkin);
    if(s && s.mult) m += s.mult;

    return m;
}

// SKLEPY I ZAKUPY
function buyUpgrade(id) {
    let u = UPGRADES.find(x => x.id === id);
    let lvl = game.upgrades[id];
    let cost = Math.floor(u.cost * Math.pow(u.mult, lvl));
    
    if(game.money >= cost) {
        game.money -= cost;
        game.upgrades[id]++;
        renderShops(); updateUI();
    }
}

function buyPet(id) {
    let p = PETS.find(x => x.id === id);
    if(game.pets[id]) return; // Już masz
    if(game.money >= p.cost) {
        game.money -= p.cost;
        game.pets[id] = 1;
        renderShops(); updateUI(); applyVisuals();
    }
}

function buyAcc(id) {
    let a = ACCESSORIES.find(x => x.id === id);
    if(game.accessories.includes(id)) {
        game.equippedAcc = id; // Equip if owned
    } else if(game.money >= a.cost) {
        game.money -= a.cost;
        game.accessories.push(id);
        game.equippedAcc = id;
    }
    renderShops(); applyVisuals();
}

function buySkin(id) {
    let s = SKINS.find(x => x.id === id);
    if(game.ownedSkins.includes(id)) {
        game.equippedSkin = id;
    } else if(game.money >= s.cost) {
        game.money -= s.cost;
        game.ownedSkins.push(id);
        game.equippedSkin = id;
    }
    renderShops(); applyVisuals();
}

function buyAuto() {
    if(!game.autoClicker && game.money >= 1000000) {
        game.money -= 1000000;
        game.autoClicker = true;
        startAuto();
        renderShops();
    }
}

// REBIRTH
function getRebirthPrice(count) {
    return Math.floor(100000 * Math.pow(1.5, count));
}

function buyRebirth(amount) {
    let totalCost = 0;
    // Symulacja kosztu
    for(let i=0; i<amount; i++) {
        totalCost += getRebirthPrice(game.rebirths + i);
    }

    if(game.money >= totalCost) {
        if(confirm(`Kupić ${amount} Rebirth za $${format(totalCost)}?`)) {
            game.money -= totalCost;
            game.rebirths += amount;
            game.rc += (5 * amount);
            
            // RESET (Tylko zwykłe rzeczy)
            game.money = 0;
            game.upgrades = { click: 1, combo: 1, global: 0, mps: 0, crit: 0 };
            
            // Pety Eventowe zostają
            for(let pid in game.pets) {
                let def = PETS.find(x => x.id === pid);
                if(def && !def.event) delete game.pets[pid];
            }
            
            saveGame();
            location.reload();
        }
    } else {
        alert("Za mało kasy!");
    }
}

// RENDEROWANIE
function renderShops() {
    // UPGRADES
    let uh = '';
    UPGRADES.forEach(u => {
        let lvl = game.upgrades[u.id];
        let cost = Math.floor(u.cost * Math.pow(u.mult, lvl));
        let can = game.money >= cost;
        uh += `<div class="card">
            <div><h3>${u.name} (Lvl ${lvl})</h3><small>Koszt: $${format(cost)}</small></div>
            <button class="btn-buy ${can?'afford':''}" onclick="buyUpgrade('${u.id}')">KUP</button>
        </div>`;
    });
    document.getElementById('shop-upgrades').innerHTML = uh;

    // PETS
    let ph = '';
    PETS.forEach(p => {
        if(!p.event) {
            let owned = game.pets[p.id];
            let can = game.money >= p.cost;
            ph += `<div class="card">
                <div><h3>${p.name}</h3><small>MPS: ${p.mps}</small></div>
                <button class="btn-buy ${owned?'owned':(can?'afford':'')}" onclick="buyPet('${p.id}')">
                    ${owned?'POSIADASZ':'$'+format(p.cost)}
                </button>
            </div>`;
        }
    });
    document.getElementById('shop-pets').innerHTML = ph;

    // EVENT
    let eh = '';
    // Auto Clicker
    eh += `<div class="card" style="border:1px solid cyan">
        <div><h3>🤖 Auto-Clicker</h3><small>Klika co 1s (Permanentny)</small></div>
        <button class="btn-buy ${game.autoClicker?'owned':(game.money>=1000000?'afford':'')}" onclick="buyAuto()">
            ${game.autoClicker?'POSIADASZ':'$1M'}
        </button>
    </div>`;
    // Skin Winter
    let ws = SKINS.find(x => x.id === 'winter');
    let wsOwn = game.ownedSkins.includes('winter');
    eh += `<div class="card" style="border:1px solid cyan">
        <div><h3>🎅 Skin Zima</h3><small>Mnożnik +30%</small></div>
        <button class="btn-buy ${wsOwn?'owned':(game.money>=ws.cost?'afford':'')}" onclick="buySkin('winter')">
            ${wsOwn?'POSIADASZ':'$2M'}
        </button>
    </div>`;
    // Event Pets
    PETS.forEach(p => {
        if(p.event) {
            let owned = game.pets[p.id];
            eh += `<div class="card" style="border:1px solid cyan">
                <div><h3>${p.name}</h3><small>Eventowy Pet</small></div>
                <button class="btn-buy ${owned?'owned':(game.money>=p.cost?'afford':'')}" onclick="buyPet('${p.id}')">
                    ${owned?'POSIADASZ':'$'+format(p.cost)}
                </button>
            </div>`;
        }
    });
    document.getElementById('shop-event').innerHTML = eh;

    // ACCESSORIES
    let ah = '';
    ACCESSORIES.forEach(a => {
        let owned = game.accessories.includes(a.id);
        let equipped = game.equippedAcc === a.id;
        let btnTxt = owned ? (equipped ? 'ZAŁOŻONE' : 'UBIERZ') : '$'+format(a.cost);
        let cls = owned ? (equipped ? 'owned' : 'afford') : (game.money>=a.cost?'afford':'');
        
        ah += `<div class="card">
            <div><h3>${a.name}</h3><small>Bonus +${a.mult*100}%</small></div>
            <button class="btn-buy ${cls}" onclick="buyAcc('${a.id}')">${btnTxt}</button>
        </div>`;
    });
    document.getElementById('shop-accessories').innerHTML = ah;

    // SKINS
    let sh = '';
    SKINS.forEach(s => {
        if(!s.event || (s.event && game.ownedSkins.includes(s.id))) {
            let owned = game.ownedSkins.includes(s.id);
            let equipped = game.equippedSkin === s.id;
            let btnTxt = owned ? (equipped ? 'ZAŁOŻONE' : 'UBIERZ') : '$'+format(s.cost);
            let cls = owned ? (equipped ? 'owned' : 'afford') : (game.money>=s.cost?'afford':'');
            
            sh += `<div class="card">
                <div><h3>${s.name}</h3></div>
                <button class="btn-buy ${cls}" onclick="buySkin('${s.id}')">${btnTxt}</button>
            </div>`;
        }
    });
    document.getElementById('shop-skins').innerHTML = sh;
}

function applyVisuals() {
    const btn = document.getElementById('main-btn');
    const wrap = document.getElementById('btn-container');
    const petsContainer = document.getElementById('pets-orbit-container');
    
    // Skin
    btn.className = '';
    let s = SKINS.find(x => x.id === game.equippedSkin);
    if(s) btn.classList.add('skin-' + s.id);

    // Accessory
    wrap.className = '';
    let a = ACCESSORIES.find(x => x.id === game.equippedAcc);
    if(a) wrap.classList.add(a.class);

    // Pety (Orbity)
    petsContainer.innerHTML = '';
    let petCount = 0;
    for(let pid in game.pets) {
        if(game.pets[pid] > 0) {
            // Dodaj ikonkę
            let pIcon = document.createElement('div');
            pIcon.className = 'orbit-pet';
            // Proste ikony (można podmienić na img)
            if(pid.includes('elf')) pIcon.innerText = '🧝';
            else if(pid.includes('sleigh')) pIcon.innerText = '🛷';
            else if(pid === 'p1') pIcon.innerText = '🚁';
            else if(pid === 'p2') pIcon.innerText = '🐕';
            else pIcon.innerText = '🤖';
            
            petsContainer.appendChild(pIcon);
            petCount++;
            if(petCount >= 5) break; // Limit wizualny
        }
    }
}

// UTILS & FIXES
function updateUI() {
    document.getElementById('ui-money').innerText = format(game.money);
    document.getElementById('ui-rc').innerText = game.rc;
    document.getElementById('ui-rebirth').innerText = game.rebirths;
    document.getElementById('ui-mult').innerText = calcMult().toFixed(1);
    
    let mps = calcMPS() * (1 + game.upgrades.mps * 0.1) * calcMult();
    document.getElementById('ui-mps').innerText = format(mps);
    document.getElementById('ui-click').innerText = format(calculateClick());

    // Rebirth costs
    document.getElementById('cost-r1').innerText = format(getRebirthPrice(game.rebirths));
    let c3 = 0; for(let i=0;i<3;i++) c3+=getRebirthPrice(game.rebirths+i);
    document.getElementById('cost-r3').innerText = format(c3);
    let c10 = 0; for(let i=0;i<10;i++) c10+=getRebirthPrice(game.rebirths+i);
    document.getElementById('cost-r10').innerText = format(c10);
}

function fixSaveData() {
    // Naprawa struktury dla starych zapisów
    if(Array.isArray(game.pets)) game.pets = {}; // Konwersja tablicy na obiekt
    if(!game.accessories) game.accessories = [];
    if(game.ownedSkins.length === 0) game.ownedSkins = ['default'];
    
    // Mapowanie starych petów na nowe (jeśli były w tablicy)
    PETS.forEach(p => {
        if(game.pets[p.id] === undefined) game.pets[p.id] = 0;
    });
}

function setView(id) {
    document.querySelectorAll('.view-content').forEach(e => e.classList.remove('active'));
    document.getElementById('view-' + id).classList.add('active');
    renderShops(); // Refresh UI przy zmianie
}

function updateTimer() {
    // Prosty timer odliczający w kółko
    let d = new Date();
    let h = 47 - (d.getHours() % 48);
    let m = 59 - d.getMinutes();
    let s = 59 - d.getSeconds();
    document.getElementById('event-timer').innerText = `${h}h ${m}m ${s}s`;
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

function format(num) {
    if(num >= 1e6) return (num/1e6).toFixed(2) + 'M';
    if(num >= 1e3) return (num/1e3).toFixed(1) + 'k';
    return Math.floor(num).toString();
}

function saveGame() { localStorage.setItem('CashSim_Fix', JSON.stringify(game)); }
function loadGame() {
    let d = localStorage.getItem('CashSim_Fix');
    if(d) {
        let p = JSON.parse(d);
        game = { ...game, ...p };
    }
}

init();
