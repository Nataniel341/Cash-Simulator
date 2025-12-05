/* === LOGIKA GRY (CORE) === */
    
// --- KONFIGURACJA DANYCH GRY ---
    
// PETY (Zwykłe + Eventowe)
const PETS_DATA = [
    { id: 'p_event1', name: '🧝 Elf Pomocnik', cost: 10000, mps: 200, mult: 0.05, icon: '🧝', desc: '[EVENT] Mały ale pracowity!' },
    { id: 'p1', name: 'Nano Dron', cost: 50000, mps: 500, mult: 0.15, icon: '🚁', desc: 'Standardowy dron.' },
    { id: 'p2', name: 'Robo-Koparka', cost: 500000, mps: 3000, mult: 0.5, icon: '🐕‍🦺', desc: 'Maszyna do kasy.' },
    { id: 'p_event2', name: '🛷 Sanie Mikołaja', cost: 2500000, mps: 15000, mult: 0.8, icon: '🛷', desc: '[EVENT] Roznosi prezenty (i gotówkę).' },
    { id: 'p3', name: 'Kwantowy Haker', cost: 5000000, mps: 20000, mult: 1.0, icon: '💻', desc: 'Legendarny Haker.' },
];

// SKINY (Zwykłe + Eventowe)
const SKINS_BTN_DATA = [
    { id: 'default', name: 'Klasyk', cost: 0, mult: 0, class: '' },
    { id: 'neon', name: 'Neon Pink', cost: 5, mult: 0.05, class: 'skin-neon' }, 
    { id: 'gold', name: 'Rich Gold', cost: 20, mult: 0.15, class: 'skin-gold' }, 
    { id: 'matrix', name: 'The Matrix', cost: 50, mult: 0.3, class: 'skin-matrix' }, 
    { id: 'fire', name: 'Hellfire', cost: 100, mult: 0.5, class: 'skin-fire' },
    // EVENT SKIN
    { id: 'winter', name: '🎅 Santa Winter', cost: 2000000, mult: 0.30, class: 'skin-winter', currency: 'money' } // Koszt w $
];

// Ulepszenia za Rebirth Coins (RC)
const RC_UPGRADES = [
    { id: 'rc_click', name: '🚀 Super Klik', cost: 5, current: 0, max: 10, icon: '✨', effect: (lvl) => lvl * 0.1, desc: 'Zwiększa bazową moc kliknięcia o 10% za poziom.' },
    { id: 'rc_mps', name: '⚡ Hiper Pasyw', cost: 10, current: 0, max: 5, icon: '🔥', effect: (lvl) => lvl * 0.25, desc: 'Zwiększa MPS o 25% za poziom.' },
    { id: 'rc_mult_base', name: '🌟 Bonus Rebirth', cost: 25, current: 0, max: 1, icon: '⭐', effect: (lvl) => lvl * 1.0, desc: 'Podwaja bazowy mnożnik Rebirth.' }
];

// --- STAN GRY ---
let game = {
    money: 0,
    rebirthCoins: 0,
    rebirthCount: 0, 
    clickLevel: 1, 
    comboLevel: 1, 
    globalMultLevel: 0,
    mpsSpeedLevel: 0,
    bonusChanceLevel: 0,
    pets: { p_event1:0, p1:0, p2:0, p_event2:0, p3:0 }, 
    ownedSkinsBtn: ['default'],
    equippedSkinBtn: 'default',
    rcUpgrades: { rc_click: 0, rc_mps: 0, rc_mult_base: 0 },
    autoClicker: false // Nowe: czy auto-clicker kupiony
};

// --- ZMIENNE TYMCZASOWE ---
let comboHeat = 0;
let comboMaxBase = 100;
let isComboActive = false;
let autoClickerInterval = null;

// --- INICJALIZACJA ---
function init() {
    loadGame();
    
    RC_UPGRADES.forEach(upg => {
        upg.current = game.rcUpgrades[upg.id] || 0; 
    });
    
    // Pętla główna (10 razy na sekundę)
    setInterval(gameLoop, 100); 
    
    // Auto-clicker interval (1 raz na sekundę)
    if(game.autoClicker) startAutoClicker();

    // Event timer logic
    setInterval(updateEventTimer, 1000);

    window.addEventListener('beforeunload', saveGame);
    
    renderAllShops();
    applySkin(game.equippedSkinBtn, 'btn');
    updateUI(); 
}

/* === CORE LOOP & MECHANIKA === */

function handleClick(e) {
    const rcClickUpgrade = RC_UPGRADES.find(u => u.id === 'rc_click');
    let rcClickBonus = rcClickUpgrade ? rcClickUpgrade.effect(rcClickUpgrade.current) : 0;
    
    let clickBase = 1 + game.clickLevel + rcClickBonus;
    
    let totalMult = calculateTotalMultiplier();
    
    let comboBonus = isComboActive ? 2 : 1;
    
    let bonusChance = game.bonusChanceLevel * 0.01;
    let critBonus = 1;
    let isCrit = false;
    
    if (Math.random() < bonusChance) {
        critBonus = 10;
        isCrit = true;
    }

    let amount = clickBase * totalMult * comboBonus * critBonus;
    game.money += amount;

    comboHeat += 15; 
    let currentComboMax = comboMaxBase + (game.comboLevel * 20);
    if(comboHeat > currentComboMax) comboHeat = currentComboMax;

    // Tekst tylko jeśli kliknięcie fizyczne (e istnieje)
    if (e && isCrit) {
        createFloatingText(e, `CRIT X${critBonus}! +${formatNumber(Math.floor(amount))}$`, 'var(--neon-gold)');
    } else if (e) {
        createFloatingText(e, `+${formatNumber(Math.floor(amount))}$`, 'var(--neon-green)');
    }
    
    updateUI();
    saveGame(); 
}

function startAutoClicker() {
    if (autoClickerInterval) clearInterval(autoClickerInterval);
    autoClickerInterval = setInterval(() => {
        // Symuluj kliknięcie (bez eventu 'e', więc bez tekstu latającego, żeby nie lagowało)
        handleClick(null);
    }, 1000);
}

function updateEventTimer() {
    // Prosta symulacja 48h (odlicza w kółko)
    const now = new Date();
    const hours = 47 - (now.getHours() % 48);
    const minutes = 59 - now.getMinutes();
    const seconds = 59 - now.getSeconds();
    document.getElementById('event-countdown').innerText = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function gameLoop() {
    let mps = calculateMPS();
    
    // NAPRAWA MPS: mpsSpeedLevel daje 10% za poziom (0.1)
    let mpsSpeedMult = 1 + (game.mpsSpeedLevel * 0.1);
    
    const rcMpsUpgrade = RC_UPGRADES.find(u => u.id === 'rc_mps');
    let rcMpsMult = 1 + (rcMpsUpgrade ? rcMpsUpgrade.effect(rcMpsUpgrade.current) : 0);

    let totalMult = calculateTotalMultiplier();

    // Całkowity mnożnik dla pasywnego dochodu
    let finalPassiveMult = mpsSpeedMult * rcMpsMult * totalMult;

    let passiveAmount = (mps * finalPassiveMult) / 10;
    
    if(passiveAmount > 0) {
        game.money += passiveAmount;
    }

    // Obsługa Combo
    let currentComboMax = comboMaxBase + (game.comboLevel * 20);
    if(comboHeat > 0) {
        comboHeat -= (1.5 / game.comboLevel); 
    } else {
        comboHeat = 0;
    }

    const comboFill = document.getElementById('combo-fill');
    const comboBox = document.getElementById('combo-box');
    
    if(comboHeat >= currentComboMax * 0.9 && !isComboActive) {
        isComboActive = true;
        comboBox.classList.add('combo-active');
    } 
    if(comboHeat < currentComboMax * 0.3 && isComboActive) {
        isComboActive = false;
        comboBox.classList.remove('combo-active');
    }
    
    comboFill.style.width = (comboHeat / currentComboMax * 100) + "%";

    updateUI();
}

/* === ZAKUPY === */

function buyClickUpgrade() {
    let cost = getUpgradeCost('click', game.clickLevel);
    if(game.money >= cost) {
        game.money -= cost;
        game.clickLevel++;
        updateUI();
        saveGame();
    }
}
function buyComboUpgrade() {
    let cost = getUpgradeCost('combo', game.comboLevel);
    if(game.money >= cost) {
        game.money -= cost;
        game.comboLevel++;
        updateUI();
        saveGame();
    }
}
function buyGlobalMultiplier() {
    let cost = getUpgradeCost('global-mult', game.globalMultLevel);
    if(game.money >= cost) {
        game.money -= cost;
        game.globalMultLevel++;
        updateUI();
        saveGame();
    }
}
function buyMpsSpeed() {
    let cost = getUpgradeCost('mps-speed', game.mpsSpeedLevel);
    if(game.money >= cost) {
        game.money -= cost;
        game.mpsSpeedLevel++;
        updateUI();
        saveGame();
    }
}
function buyBonusChance() {
    let cost = getUpgradeCost('bonus-chance', game.bonusChanceLevel);
    if(game.money >= cost) {
        game.money -= cost;
        game.bonusChanceLevel++;
        updateUI();
        saveGame();
    }
}

function buyRCUpgrade(id) {
    let upg = RC_UPGRADES.find(u => u.id === id);
    if (!upg || upg.current >= upg.max) return;
    let cost = upg.cost * (upg.current + 1);
    if (game.rebirthCoins >= cost) {
        game.rebirthCoins -= cost;
        upg.current++;
        game.rcUpgrades[upg.id] = upg.current;
        renderAllShops();
        updateUI();
        saveGame();
    }
}

function buyPet(id) {
    let pet = PETS_DATA.find(p => p.id === id);
    if(game.pets[id] > 0) return; 
    if(game.money >= pet.cost) {
        game.money -= pet.cost;
        game.pets[id] = 1; 
        renderAllShops();
        updateUI();
        saveGame();
    }
}

// Kupowanie skinów (Obsługuje RC i Money)
function buySkin(id) {
    let skin = SKINS_BTN_DATA.find(s => s.id === id);
    let ownedList = game.ownedSkinsBtn;
    
    // Rozróżnienie waluty
    if (skin.currency === 'money') {
        if (game.money >= skin.cost && !ownedList.includes(id)) {
            game.money -= skin.cost;
            ownedList.push(id);
            renderAllShops();
            updateUI();
            saveGame();
        }
    } else {
        // Domyślnie RC
        if (game.rebirthCoins >= skin.cost && !ownedList.includes(id)) {
            game.rebirthCoins -= skin.cost;
            ownedList.push(id);
            renderAllShops();
            updateUI();
            saveGame();
        }
    }
}

// EVENT: Auto Clicker
function buyAutoClicker() {
    let cost = 1000000; // 1M $
    if (!game.autoClicker && game.money >= cost) {
        game.money -= cost;
        game.autoClicker = true;
        startAutoClicker();
        renderAllShops(); // Odśwież widok eventu
        updateUI();
        saveGame();
    }
}

function equipSkin(id, type) {
    game.equippedSkinBtn = id;
    applySkin(id, 'btn');
    renderAllShops();
    updateUI(); 
    saveGame();
}

function applySkin(id, type) {
    let btn = document.getElementById('main-btn');
    let skin = SKINS_BTN_DATA.find(s => s.id === id);
    if (!skin) return; 
    btn.className = '';
    if(skin.class) btn.classList.add(skin.class);
}

/* === REBIRTH SYSTEM === */
function getRebirthCost() {
    // 100k start, wzrost 50%
    let cost = 100000 * Math.pow(1.5, game.rebirthCount);
    return Math.floor(cost);
}

function getRebirthGain() {
    let cost = getRebirthCost();
    if(game.money < cost) return 0; 
    return 5;
}

function doRebirth() {
    let cost = getRebirthCost();
    let gain = getRebirthGain();

    if(gain > 0) {
        if(confirm(`ZROBIĆ REBIRTH #${game.rebirthCount + 1}? Koszt: ${formatNumber(cost)}$. Zyskasz ${gain} RC!`)) {
            game.rebirthCoins += gain;
            game.rebirthCount++; 
            
            // RESET (Zachowujemy Event AutoClicker i Skiny)
            game.money = 0;
            game.clickLevel = 1;
            game.comboLevel = 1;
            game.globalMultLevel = 0;
            game.mpsSpeedLevel = 0;
            game.bonusChanceLevel = 0;
            game.pets = { p_event1:0, p1:0, p2:0, p_event2:0, p3:0 }; 
            comboHeat = 0;
            // AutoClicker zostaje! (jest "permanentny" w evencie)
            
            saveGame(); 
            location.reload(); 
        }
    } else {
        alert(`Potrzebujesz minimum ${formatNumber(cost)}$!`);
    }
}

/* === UI === */

function switchTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    btn.classList.add('active');
    updateUI(); 
}

function getUpgradeCost(id, level) {
    switch(id) {
        case 'click': return Math.floor(50 * Math.pow(1.5, level - 1));
        case 'combo': return Math.floor(300 * Math.pow(1.8, level - 1));
        case 'global-mult': return Math.floor(1000 * Math.pow(2, level));
        case 'mps-speed': return Math.floor(5000 * Math.pow(2.5, level));
        case 'bonus-chance': return Math.floor(15000 * Math.pow(3, level));
        default: return 9999999999;
    }
}

function updateUI() {
    document.getElementById('ui-money').innerText = formatNumber(Math.floor(game.money));
    document.getElementById('ui-rc').innerText = game.rebirthCoins;
    
    // Obliczanie widocznego MPS
    let rawMps = calculateMPS();
    let speedMult = 1 + (game.mpsSpeedLevel * 0.1);
    let rcMpsMult = 1 + (RC_UPGRADES[1].current * 0.25);
    let totalMult = calculateTotalMultiplier();
    
    // Pokazujemy realny MPS jaki gracz dostaje
    let realMps = rawMps * speedMult * rcMpsMult * totalMult;
    
    document.getElementById('ui-mps').innerText = formatNumber(Math.floor(realMps));
    document.getElementById('ui-mps-boost').innerText = `(+${((speedMult-1)*100).toFixed(0)}%)`; // Pokazuje boost z upgrade'u
    document.getElementById('ui-total-mult').innerText = totalMult.toFixed(2);
    document.getElementById('ui-rebirth-count').innerText = game.rebirthCount;
    
    const rcClickUpgrade = RC_UPGRADES.find(u => u.id === 'rc_click');
    let rcClickBonus = rcClickUpgrade ? rcClickUpgrade.effect(rcClickUpgrade.current) : 0;
    document.getElementById('click-base').innerText = (1 + game.clickLevel + rcClickBonus).toFixed(1);

    // Poziomy
    document.getElementById('lvl-click').innerText = game.clickLevel;
    document.getElementById('lvl-combo').innerText = game.comboLevel;
    document.getElementById('lvl-global-mult').innerText = game.globalMultLevel;
    document.getElementById('lvl-mps-speed').innerText = game.mpsSpeedLevel;
    document.getElementById('lvl-bonus-chance').innerText = game.bonusChanceLevel;

    // Koszty UPG
    const upgData = [
        { id: 'btn-upg-click', level: game.clickLevel, levelId: 'click', currency: game.money, nav: 'nav-upgrades' },
        { id: 'btn-upg-combo', level: game.comboLevel, levelId: 'combo', currency: game.money, nav: 'nav-upgrades' },
        { id: 'btn-upg-global-mult', level: game.globalMultLevel, levelId: 'global-mult', currency: game.money, nav: 'nav-upgrades' },
        { id: 'btn-upg-mps-speed', level: game.mpsSpeedLevel, levelId: 'mps-speed', currency: game.money, nav: 'nav-upgrades' },
        { id: 'btn-upg-bonus-chance', level: game.bonusChanceLevel, levelId: 'bonus-chance', currency: game.money, nav: 'nav-upgrades' }
    ];
    
    let alertFlags = { 'nav-event': false, 'nav-upgrades': false, 'nav-pets': false, 'nav-skins': false, 'nav-coinshop': false, 'nav-rebirth': false };

    upgData.forEach(item => {
        let cost = getUpgradeCost(item.levelId, item.level);
        document.getElementById('cost-' + item.levelId).innerText = formatNumber(cost);
        if (checkAfford(item.id, cost, item.currency)) alertFlags[item.nav] = true;
    });
    
    if (checkPetsReady()) alertFlags['nav-pets'] = true;
    if (checkRCSkinsReady()) alertFlags['nav-skins'] = true;
    if (checkRCUpgradesReady()) alertFlags['nav-coinshop'] = true;
    if (getRebirthGain() > 0) alertFlags['nav-rebirth'] = true;
    if (checkEventReady()) alertFlags['nav-event'] = true;
    
    Object.keys(alertFlags).forEach(navId => {
        const navBtn = document.getElementById(navId);
        if (navBtn) {
            if (alertFlags[navId] && !navBtn.classList.contains('active')) navBtn.classList.add('alert');
            else navBtn.classList.remove('alert');
        }
    });

    // Rebirth info
    document.getElementById('rebirth-gain').innerText = getRebirthGain();
    document.getElementById('rebirth-req-display').innerText = formatNumber(getRebirthCost());
    
    let rBtn = document.getElementById('rebirth-btn');
    if(getRebirthGain() > 0) rBtn.style.opacity = 1;
    else rBtn.style.opacity = 0.5;
    
    renderActivePets(); 
    renderAllShops();
}

function checkPetsReady() {
    return PETS_DATA.some(pet => {
        // Pomiń pety eventowe w tej zakładce, jeśli są w innej (ale tutaj są w jednej liście danych)
        // Sprawdź czy to nie event pet
        if (pet.id.includes('event')) return false; 
        return game.pets[pet.id] === 0 && game.money >= pet.cost;
    });
}
function checkEventReady() {
    // Sprawdź skin
    let skin = SKINS_BTN_DATA.find(s => s.id === 'winter');
    if (!game.ownedSkinsBtn.includes('winter') && game.money >= skin.cost) return true;
    // Sprawdź auto clicker
    if (!game.autoClicker && game.money >= 1000000) return true;
    // Sprawdź pety eventowe
    if (game.pets['p_event1'] === 0 && game.money >= 10000) return true;
    if (game.pets['p_event2'] === 0 && game.money >= 2500000) return true;
    return false;
}

function checkRCSkinsReady() {
    return SKINS_BTN_DATA.some(skin => !skin.currency && !game.ownedSkinsBtn.includes(skin.id) && game.rebirthCoins >= skin.cost);
}
function checkRCUpgradesReady() {
    return RC_UPGRADES.some(upg => {
        let cost = upg.cost * (upg.current + 1);
        return upg.current < upg.max && game.rebirthCoins >= cost;
    });
}

function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toString();
}

function checkAfford(id, cost, currency) {
    let el = document.getElementById(id);
    let canAfford = currency >= cost;
    if(el) {
        if (id.includes('rc') || (id.includes('skin') && !id.includes('winter'))) { 
            if(canAfford) el.classList.add('can-afford-rc');
            else el.classList.remove('can-afford-rc');
        } else { // $
            if(canAfford) el.classList.add('can-afford');
            else el.classList.remove('can-afford');
        }
    }
    return canAfford;
}

function calculateMPS() {
    let mps = 0;
    PETS_DATA.forEach(pet => {
        if(game.pets[pet.id] > 0) mps += pet.mps;
    });
    return mps;
}

function calculateTotalMultiplier() {
    let mult = 1.0;
    
    PETS_DATA.forEach(pet => {
        if(game.pets[pet.id] > 0) mult += pet.mult;
    });
    
    game.ownedSkinsBtn.forEach(id => {
        let skin = SKINS_BTN_DATA.find(s => s.id === id);
        if (skin) mult += skin.mult;
    });

    mult += (game.globalMultLevel * 0.05);

    const rcMultBaseUpgrade = RC_UPGRADES.find(u => u.id === 'rc_mult_base');
    let rcMultBase = 1 + (rcMultBaseUpgrade ? rcMultBaseUpgrade.effect(rcMultBaseUpgrade.current) : 0);
    mult *= rcMultBase;

    return mult;
}

function renderActivePets() {
    const display = document.getElementById('active-pets-display');
    display.innerHTML = '';
    let count = 0;
    PETS_DATA.forEach(pet => {
        if (game.pets[pet.id] > 0) {
            let petIcon = document.createElement('span');
            petIcon.className = 'pet-icon';
            petIcon.innerText = pet.icon;
            petIcon.style.animationDelay = `${count * 0.15}s`;
            display.appendChild(petIcon);
            count++;
        }
    });
}

function renderEventTab() {
    const list = document.getElementById('event-list');
    list.innerHTML = '';

    // 1. AUTO CLICKER
    let acCost = 1000000;
    let acHtml = '';
    if (game.autoClicker) {
        acHtml = `<button class="btn-buy purchased" disabled>POSIADANY</button>`;
    } else {
        let can = game.money >= acCost;
        acHtml = `<button class="btn-buy ${can?'can-afford':''}" onclick="buyAutoClicker()">$${formatNumber(acCost)}</button>`;
    }
    let acDiv = document.createElement('div');
    acDiv.className = 'upgrade-card';
    acDiv.style.border = "1px solid cyan";
    acDiv.innerHTML = `<div class="upgrade-info"><h3>🤖 Auto-Clicker</h3><p>Klika za Ciebie co 1s! (Permanentny)</p></div>${acHtml}`;
    list.appendChild(acDiv);

    // 2. WINTER SKIN
    let skin = SKINS_BTN_DATA.find(s => s.id === 'winter');
    let owned = game.ownedSkinsBtn.includes('winter');
    let skinHtml = '';
    if (owned) {
        if (game.equippedSkinBtn === 'winter') skinHtml = `<button class="btn-buy" disabled>UBRANE</button>`;
        else skinHtml = `<button class="btn-buy can-afford" onclick="equipSkin('winter', 'btn')">Ubierz</button>`;
    } else {
        let can = game.money >= skin.cost;
        skinHtml = `<button class="btn-buy ${can?'can-afford':''}" onclick="buySkin('winter')">$${formatNumber(skin.cost)}</button>`;
    }
    let skinDiv = document.createElement('div');
    skinDiv.className = 'upgrade-card';
    skinDiv.style.border = "1px solid #cc0000";
    skinDiv.innerHTML = `<div class="upgrade-info"><h3>🎅 Winter Skin (+30%)</h3><p>Unikalny skin Mikołaja.</p></div>${skinHtml}`;
    list.appendChild(skinDiv);

    // 3. EVENT PETS
    PETS_DATA.forEach(pet => {
        if (pet.id.includes('event')) {
            let isPurchased = game.pets[pet.id] > 0;
            let btn = isPurchased 
                ? `<button class="btn-buy purchased" disabled>POSIADANY</button>`
                : `<button class="btn-buy ${game.money>=pet.cost?'can-afford':''}" onclick="buyPet('${pet.id}')">$${formatNumber(pet.cost)}</button>`;
            
            let pDiv = document.createElement('div');
            pDiv.className = 'upgrade-card';
            pDiv.innerHTML = `<div class="upgrade-info"><h3>${pet.icon} ${pet.name}</h3><p>Bonus: +${(pet.mult*100).toFixed(0)}%. MPS: ${formatNumber(pet.mps)}</p></div>${btn}`;
            list.appendChild(pDiv);
        }
    });
}

function renderPets() {
    const list = document.getElementById('pets-list');
    list.innerHTML = '';
    PETS_DATA.forEach(pet => {
        if (!pet.id.includes('event')) { // Tylko zwykłe pety
            let isPurchased = game.pets[pet.id] > 0;
            let btn = isPurchased 
                ? `<button class="btn-buy purchased" disabled>POSIADANY</button>`
                : `<button class="btn-buy ${game.money>=pet.cost?'can-afford':''}" onclick="buyPet('${pet.id}')">$${formatNumber(pet.cost)}</button>`;
            let div = document.createElement('div');
            div.className = 'upgrade-card';
            div.innerHTML = `<div class="upgrade-info"><h3>${pet.icon} ${pet.name}</h3><p>Bonus: +${(pet.mult*100).toFixed(0)}%. MPS: ${formatNumber(pet.mps)}</p></div>${btn}`;
            list.appendChild(div);
        }
    });
}

function renderSkins() {
    const listBtn = document.getElementById('skins-btn-list');
    listBtn.innerHTML = '';
    SKINS_BTN_DATA.forEach(skin => {
        // Pomiń skin eventowy w zwykłym sklepie, chyba że już kupiony (wtedy pokaż do ubrania)
        let owned = game.ownedSkinsBtn.includes(skin.id);
        if (skin.id === 'winter' && !owned) return;

        let equipped = game.equippedSkinBtn === skin.id;
        let btnHTML = '';
        if(equipped) btnHTML = `<button class="btn-buy" disabled>Ubrane</button>`;
        else if (owned) btnHTML = `<button class="btn-buy can-afford-rc" onclick="equipSkin('${skin.id}', 'btn')">Ubierz</button>`;
        else btnHTML = `<button class="btn-buy ${game.rebirthCoins>=skin.cost?'can-afford-rc':''}" onclick="buySkin('${skin.id}')">${skin.cost} RC</button>`;

        let div = document.createElement('div');
        div.className = 'upgrade-card';
        div.innerHTML = `<div class="upgrade-info"><h3>${skin.name}</h3><p style="color:var(--neon-gold)">Bonus: +${(skin.mult*100).toFixed(0)}%</p></div>${btnHTML}`;
        listBtn.appendChild(div);
    });
}

function renderRCShop() {
    const list = document.getElementById('rc-shop-list');
    list.innerHTML = '';
    RC_UPGRADES.forEach(upg => {
        let isMax = upg.current >= upg.max;
        let cost = upg.cost * (upg.current + 1);
        let btn = isMax 
            ? `<button class="btn-buy" disabled>MAX</button>`
            : `<button class="btn-buy ${game.rebirthCoins>=cost?'can-afford-rc':''}" id="btn-buy-${upg.id}" onclick="buyRCUpgrade('${upg.id}')">${cost} RC</button>`;
        
        let div = document.createElement('div');
        div.className = 'upgrade-card';
        div.innerHTML = `<div class="upgrade-info"><h3>${upg.icon} ${upg.name} (P: ${upg.current})</h3><p>${upg.desc}</p></div>${btn}`;
        list.appendChild(div);
    });
}

function renderAllShops() {
    renderEventTab();
    renderPets();
    renderSkins();
    renderRCShop();
}

function createFloatingText(e, text, color) {
    if (!e) return;
    const btn = document.getElementById('main-btn');
    const rect = btn.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;
    const el = document.createElement('div');
    el.className = 'floater';
    el.innerText = text;
    let randomX = (Math.random() - 0.5) * 60;
    el.style.left = (x + randomX) + 'px';
    el.style.top = (y - 20) + 'px';
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function saveGame() {
    localStorage.setItem('CashSimulatorV5', JSON.stringify(game));
}

function loadGame() {
    let saved = localStorage.getItem('CashSimulatorV5');
    if(saved) {
        let parsed = JSON.parse(saved);
        game = { ...game, ...parsed };
        
        // Kompatybilność
        if (game.autoClicker === undefined) game.autoClicker = false;
        if (game.pets['p_event1'] === undefined) game.pets['p_event1'] = 0;
        if (game.pets['p_event2'] === undefined) game.pets['p_event2'] = 0;
    }
}

// Start
init();
