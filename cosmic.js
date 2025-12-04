/* === LOGIKA GRY (CORE) === */
    
// --- KONFIGURACJA DANYCH GRY ---
    
// ULEPSZONE PETY (Jednorazowy zakup za $)
const PETS_DATA = [
    { id: 'p1', name: 'Nano Dron', cost: 50000, mps: 500, mult: 0.15, icon: '🚁', desc: 'Ogromny impuls dla pasywnego dochodu i solidny mnożnik.' },
    { id: 'p2', name: 'Robo-Koparka', cost: 500000, mps: 3000, mult: 0.5, icon: '🐕‍🦺', desc: 'Maszyna do kasy, duży MPS i mnożnik.' },
    { id: 'p3', name: 'Kwantowy Haker', cost: 5000000, mps: 20000, mult: 1.0, icon: '💻', desc: 'Podwaja bazowy mnożnik! Generuje ogromne sumy.' },
];

// Skiny Przycisku (RC - Rebirth Coin Cost)
const SKINS_BTN_DATA = [
    { id: 'default', name: 'Klasyk', cost: 0, mult: 0, class: '' },
    { id: 'neon', name: 'Neon Pink', cost: 5, mult: 0.05, class: 'skin-neon' }, 
    { id: 'gold', name: 'Rich Gold', cost: 20, mult: 0.15, class: 'skin-gold' }, 
    { id: 'matrix', name: 'The Matrix', cost: 50, mult: 0.3, class: 'skin-matrix' }, 
    { id: 'fire', name: 'Hellfire', cost: 100, mult: 0.5, class: 'skin-fire' } 
];

// GLOBALNE TŁA (NOWE) - Jednorazowy zakup za $
// Używamy stabilnych klas CSS (z nowymi linkami w CSS)
const BACKGROUNDS_DATA = [
    { id: 'bg-default', name: 'Standard (Ciemny)', cost: 0, mult: 0, class: 'bg-default' },
    { id: 'bg-forest', name: 'Mroczny Las', cost: 10000, mult: 0.05, class: 'bg-forest' },
    { id: 'bg-lava', name: 'Piekielna Magma', cost: 50000, mult: 0.15, class: 'bg-lava' },
    { id: 'bg-candy', name: 'Kraina Cukierków', cost: 250000, mult: 0.3, class: 'bg-candy' },
    { id: 'bg-heaven', name: 'Niebiański Spokój', cost: 1000000, mult: 0.5, class: 'bg-heaven' },
];

// Ulepszenia za Rebirth Coins (RC)
const RC_UPGRADES = [
    { id: 'rc_click', name: '🚀 Super Klik', cost: 5, current: 0, max: 10, icon: '✨', effect: (lvl) => lvl * 0.1, desc: 'Zwiększa bazową moc kliknięcia o 10% za poziom.' },
    { id: 'rc_mps', name: '⚡ Hiper Pasyw', cost: 10, current: 0, max: 5, icon: '🔥', effect: (lvl) => lvl * 0.25, desc: 'Zwiększa MPS (Money Per Second) o 25% za poziom.' },
    { id: 'rc_mult_base', name: '🌟 Bonus Rebirth', cost: 25, current: 0, max: 1, icon: '⭐', effect: (lvl) => lvl * 1.0, desc: 'Podwaja bazowy mnożnik Rebirth (x2 zamiast x1).' }
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
    pets: { p1:0, p2:0, p3:0 }, 
    ownedSkinsBtn: ['default'],
    equippedSkinBtn: 'default',
    ownedBackgrounds: ['bg-default'], 
    equippedBackground: 'bg-default', 
    rcUpgrades: { rc_click: 0, rc_mps: 0, rc_mult_base: 0 } 
};

// --- ZMIENNE TYMCZASOWE ---
let comboHeat = 0;
let comboMaxBase = 100;
let isComboActive = false;

// --- INICJALIZACJA ---
function init() {
    loadGame();
    
    RC_UPGRADES.forEach(upg => {
        upg.current = game.rcUpgrades[upg.id] || 0; 
    });
    
    // Pętla główna (co 100ms)
    setInterval(gameLoop, 100); 

    // !!! NATYCHMIASTOWY ZAPIS PRZY WYJŚCIU/ODŚWIEŻENIU !!!
    window.addEventListener('beforeunload', saveGame);
    
    renderAllShops();
    applySkin(game.equippedSkinBtn, 'btn');
    applyBackground(game.equippedBackground); 
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

    if (isCrit) {
        createFloatingText(e, `CRIT X${critBonus}! +${formatNumber(Math.floor(amount))}$`, 'var(--neon-gold)');
    } else {
        createFloatingText(e, `+${formatNumber(Math.floor(amount))}$`, 'var(--neon-green)');
    }
    
    updateUI();
    saveGame(); 
}

function gameLoop() {
    let mps = calculateMPS();
    let totalMult = calculateTotalMultiplier();
    
    let mpsSpeedMult = 1 + (game.mpsSpeedLevel * 0.1);
    
    const rcMpsUpgrade = RC_UPGRADES.find(u => u.id === 'rc_mps');
    let rcMpsMult = 1 + (rcMpsUpgrade ? rcMpsUpgrade.effect(rcMpsUpgrade.current) : 0);

    let passiveAmount = (mps * mpsSpeedMult * rcMpsMult * totalMult) / 10;
    
    if(passiveAmount > 0) {
        game.money += passiveAmount;
    }

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

/* === OBLICZENIA I ULEPSZENIA (Zapis po zakupie) === */

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

function buyBackground(id) {
    let bg = BACKGROUNDS_DATA.find(b => b.id === id);
    if (game.ownedBackgrounds.includes(id)) return;
    
    if (game.money >= bg.cost) {
        game.money -= bg.cost;
        game.ownedBackgrounds.push(id);
        equipBackground(id); 
        renderAllShops();
        updateUI();
        saveGame();
    }
}

function buySkin(id, type) {
    let data = SKINS_BTN_DATA; 
    let skin = data.find(s => s.id === id);
    let ownedList = game.ownedSkinsBtn;
    
    if (game.rebirthCoins >= skin.cost && !ownedList.includes(id)) {
        game.rebirthCoins -= skin.cost;
        ownedList.push(id);
        renderAllShops();
        updateUI();
        saveGame();
    }
}


function equipSkin(id, type) {
    if (type === 'btn') {
        game.equippedSkinBtn = id;
        applySkin(id, 'btn');
    }
    renderAllShops();
    updateUI(); 
    saveGame();
}

function equipBackground(id) {
    game.equippedBackground = id;
    applyBackground(id);
    renderAllShops();
    updateUI(); 
    saveGame();
}

function applySkin(id, type) {
    if (type === 'btn') {
        let btn = document.getElementById('main-btn');
        let skin = SKINS_BTN_DATA.find(s => s.id === id);
        if (!skin) return; 
        btn.className = '';
        if(skin.class) btn.classList.add(skin.class);
    }
}

function applyBackground(id) {
    let body = document.body;
    let bg = BACKGROUNDS_DATA.find(b => b.id === id);
    if (!bg) return; 
    
    // Usuwa stare klasy tła i dodaje nową (zdefiniowaną w CSS)
    body.className = '';
    body.classList.add(bg.class); 
}

/* === REBIRTH SYSTEM === */
function getRebirthCost() {
    return 100000 + game.rebirthCount * 150000;
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
        if(confirm(`ZROBIĆ REBIRTH #${game.rebirthCount + 1}? Koszt: ${formatNumber(cost)}$. Zyskasz ${gain} RC! Pamiętaj, koszt następnego wzrośnie!`)) {
            game.rebirthCoins += gain;
            game.rebirthCount++; 
            
            // RESET
            game.money = 0;
            game.clickLevel = 1;
            game.comboLevel = 1;
            game.globalMultLevel = 0;
            game.mpsSpeedLevel = 0;
            game.bonusChanceLevel = 0;
            game.pets = { p1:0, p2:0, p3:0 }; 
            comboHeat = 0;
            
            saveGame(); // Zapis przed odświeżeniem
            location.reload(); 
        }
    } else {
        alert(`Potrzebujesz minimum ${formatNumber(cost)}$ aby wykonać Rebirth!`);
    }
}

/* === UI & RENDERING FUNCTIONS (Poprawione obliczanie kosztów UPG) === */

function switchTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    btn.classList.add('active');
    updateUI(); 
}

function getUpgradeCost(id, level) {
    // Poprawne obliczanie kosztów dla wszystkich UPG
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
    // Statystyki
    document.getElementById('ui-money').innerText = formatNumber(Math.floor(game.money));
    document.getElementById('ui-rc').innerText = game.rebirthCoins;
    document.getElementById('ui-mps').innerText = calculateMPS().toFixed(1);
    document.getElementById('ui-total-mult').innerText = calculateTotalMultiplier().toFixed(2);
    
    const rcClickUpgrade = RC_UPGRADES.find(u => u.id === 'rc_click');
    let rcClickBonus = rcClickUpgrade ? rcClickUpgrade.effect(rcClickUpgrade.current) : 0;
    document.getElementById('click-base').innerText = (1 + game.clickLevel + rcClickBonus).toFixed(1);

    // Poziomy Ulepszeń
    document.getElementById('lvl-click').innerText = game.clickLevel;
    document.getElementById('lvl-combo').innerText = game.comboLevel;
    document.getElementById('lvl-global-mult').innerText = game.globalMultLevel;
    document.getElementById('lvl-mps-speed').innerText = game.mpsSpeedLevel;
    document.getElementById('lvl-bonus-chance').innerText = game.bonusChanceLevel;

    // Ceny ulepszeń UPG i podświetlanie
    const upgData = [
        { id: 'btn-upg-click', level: game.clickLevel, levelId: 'click', currency: game.money, nav: 'nav-upgrades' },
        { id: 'btn-upg-combo', level: game.comboLevel, levelId: 'combo', currency: game.money, nav: 'nav-upgrades' },
        { id: 'btn-upg-global-mult', level: game.globalMultLevel, levelId: 'global-mult', currency: game.money, nav: 'nav-upgrades' },
        { id: 'btn-upg-mps-speed', level: game.mpsSpeedLevel, levelId: 'mps-speed', currency: game.money, nav: 'nav-upgrades' },
        { id: 'btn-upg-bonus-chance', level: game.bonusChanceLevel, levelId: 'bonus-chance', currency: game.money, nav: 'nav-upgrades' }
    ];
    
    let alertFlags = { 'nav-upgrades': false, 'nav-pets': false, 'nav-skins': false, 'nav-coinshop': false, 'nav-backgrounds': false };

    upgData.forEach(item => {
        let cost = getUpgradeCost(item.levelId, item.level);
        
        let el = document.getElementById(item.id);
        let costSpan = document.getElementById('cost-' + item.levelId); 
        
        if (costSpan) {
            costSpan.innerText = formatNumber(cost); // Aktualizacja ceny
        }

        if (el) {
            // Sprawdzenie, czy stać i ustawienie flagi alertu
            if (checkAfford(item.id, cost, item.currency)) alertFlags[item.nav] = true;
        }
    });
    
    // Sprawdzanie gotowości innych sekcji
    if (checkPetsReady()) alertFlags['nav-pets'] = true;
    if (checkBackgroundsReady()) alertFlags['nav-backgrounds'] = true;
    if (checkRCSkinsReady()) alertFlags['nav-skins'] = true;
    if (checkRCUpgradesReady()) alertFlags['nav-coinshop'] = true;
    
    // Aplikacja alertów
    Object.keys(alertFlags).forEach(navId => {
        const navBtn = document.getElementById(navId);
        if (navBtn) {
            if (alertFlags[navId] && !navBtn.classList.contains('active')) navBtn.classList.add('alert');
            else navBtn.classList.remove('alert');
        }
    });


    // Rebirth UI
    document.getElementById('rebirth-gain').innerText = getRebirthGain();
    document.querySelector('#tab-rebirth p:nth-child(5)').innerText = `Wymagane: ${formatNumber(getRebirthCost())}$ (Wykonano: ${game.rebirthCount}x)`;
    
    let rBtn = document.getElementById('rebirth-btn');
    if(getRebirthGain() > 0) rBtn.style.opacity = 1;
    else rBtn.style.opacity = 0.5;
    
    renderActivePets(); 
    renderAllShops();
}

function checkPetsReady() {
    return PETS_DATA.some(pet => game.pets[pet.id] === 0 && game.money >= pet.cost);
}
function checkBackgroundsReady() {
    return BACKGROUNDS_DATA.some(bg => !game.ownedBackgrounds.includes(bg.id) && game.money >= bg.cost);
}
function checkRCSkinsReady() {
    return SKINS_BTN_DATA.some(skin => !game.ownedSkinsBtn.includes(skin.id) && game.rebirthCoins >= skin.cost);
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
        // Sprawdzenie, czy to ulepszenie RC
        const isRCUpg = id.includes('rc');
        
        let isRCMaxed = false;
        if (isRCUpg) {
             const upgID = id.replace('btn-buy-', '');
             const upg = RC_UPGRADES.find(u => u.id === upgID);
             if (upg && upg.current >= upg.max) isRCMaxed = true;
        }

        if (isRCMaxed) {
             el.classList.remove('can-afford-rc');
             el.classList.remove('can-afford');
             return false;
        }

        if (isRCUpg || id.includes('skin')) { 
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
        if(game.pets[pet.id] > 0) {
            mps += pet.mps;
        }
    });
    return mps;
}

function calculateTotalMultiplier() {
    let mult = 1.0;
    
    // 1. Pety
    PETS_DATA.forEach(pet => {
        if(game.pets[pet.id] > 0) {
             mult += pet.mult;
        }
    });
    
    // 2. Skiny Przycisku
    game.ownedSkinsBtn.forEach(id => {
        let skin = SKINS_BTN_DATA.find(s => s.id === id);
        if (skin) mult += skin.mult;
    });
    
    // 3. Globalne Tła
    game.ownedBackgrounds.forEach(id => {
        let bg = BACKGROUNDS_DATA.find(b => b.id === id);
        if (bg) mult += bg.mult;
    });

    // 4. Ulepszenia Globalne
    mult += (game.globalMultLevel * 0.05);

    // 5. Mnożnik RC 
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

function renderPets() {
    const list = document.getElementById('pets-list');
    list.innerHTML = '';

    PETS_DATA.forEach(pet => {
        let isPurchased = game.pets[pet.id] > 0;
        let cost = pet.cost;
        
        let btnHTML = '';
        if (isPurchased) {
            btnHTML = `<button class="btn-buy purchased" disabled>POSIADANY</button>`;
        } else {
            let canAfford = game.money >= cost;
            btnHTML = `<button class="btn-buy ${canAfford ? 'can-afford' : ''}" onclick="buyPet('${pet.id}')">
                $${formatNumber(cost)}
            </button>`;
        }
        
        let div = document.createElement('div');
        div.className = 'upgrade-card';
        div.innerHTML = `
            <div class="upgrade-info">
                <h3><span style="font-size:1.5rem;">${pet.icon}</span> ${pet.name} (Jednorazowy)</h3>
                <p>${pet.desc}. Bonus: +${(pet.mult * 100).toFixed(0)}% do Mnożnika. MPS: +${formatNumber(pet.mps)}/s.</p>
            </div>
            ${btnHTML}
        `;
        list.appendChild(div);
    });
}

function renderBackgrounds() {
    const list = document.getElementById('backgrounds-list');
    list.innerHTML = '';

    BACKGROUNDS_DATA.forEach(bg => {
        let owned = game.ownedBackgrounds.includes(bg.id);
        let equipped = game.equippedBackground === bg.id;
        let cost = bg.cost;
        
        let btnHTML = '';
        if (equipped) {
            btnHTML = `<button class="btn-buy" disabled style="background:#004d00; color:#fff;">UBRANE</button>`;
        } else if (owned) {
            btnHTML = `<button class="btn-buy can-afford" onclick="equipBackground('${bg.id}')">Ubierz</button>`; 
        } else {
            let canAfford = game.money >= cost;
            btnHTML = `<button class="btn-buy ${canAfford ? 'can-afford' : ''}" onclick="buyBackground('${bg.id}')">
                $${formatNumber(cost)}
            </button>`;
        }

        let div = document.createElement('div');
        div.className = 'upgrade-card';
        
        // Używamy klasy CSS dla podglądu
        div.innerHTML = `
            <div class="upgrade-info">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div class="background-preview ${bg.class}"></div>
                    <div>
                        <h3>${bg.name}</h3>
                        <p style="color:var(--neon-green)">Bonus: +${(bg.mult * 100).toFixed(0)}% do Mnożnika</p>
                    </div>
                </div>
            </div>
            ${btnHTML}
        `;
        list.appendChild(div);
    });
}

function renderSkins() {
    const listBtn = document.getElementById('skins-btn-list');
    listBtn.innerHTML = '';

    SKINS_BTN_DATA.forEach(skin => {
        let owned = game.ownedSkinsBtn.includes(skin.id);
        let equipped = game.equippedSkinBtn === skin.id;
        let currency = game.rebirthCoins;
        
        let btnHTML = '';
        if(equipped) {
            btnHTML = `<button class="btn-buy" disabled style="background:#444; color:#fff;">Ubrane</button>`;
        } else if (owned) {
            btnHTML = `<button class="btn-buy can-afford-rc" onclick="equipSkin('${skin.id}', 'btn')">Ubierz</button>`;
        } else {
            let canAfford = currency >= skin.cost;
            btnHTML = `<button class="btn-buy ${canAfford ? 'can-afford-rc' : ''}" onclick="buySkin('${skin.id}', 'btn')">
                ${skin.cost} RC
            </button>`;
        }

        let div = document.createElement('div');
        div.className = 'upgrade-card';
        
        let previewStyle = skin.id === 'default' ? 'background: radial-gradient(circle, #444, #222); border: 2px solid #fff;' : '';

        div.innerHTML = `
            <div class="upgrade-info">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div class="${skin.class}" style="width:40px; height:40px; border-radius:50%; ${previewStyle}"></div>
                    <div>
                        <h3>${skin.name}</h3>
                        <p style="color:var(--neon-gold)">Bonus: +${(skin.mult * 100).toFixed(1)}% do Mnożnika</p>
                    </div>
                </div>
            </div>
            ${btnHTML}
        `;
        listBtn.appendChild(div);
    });
}

function renderRCShop() {
    const list = document.getElementById('rc-shop-list');
    list.innerHTML = '';
    
    RC_UPGRADES.forEach(upg => {
        let isMax = upg.current >= upg.max;
        let cost = upg.cost * (upg.current + 1);
        let currency = game.rebirthCoins;
        
        let btnHTML = '';
        if (isMax) {
            btnHTML = `<button class="btn-buy" disabled style="background:#444;">MAX</button>`;
        } else {
            let canAfford = currency >= cost;
            btnHTML = `<button class="btn-buy ${canAfford ? 'can-afford-rc' : ''}" id="btn-buy-${upg.id}" onclick="buyRCUpgrade('${upg.id}')">
                ${cost} RC
            </button>`;
        }

        let div = document.createElement('div');
        div.className = 'upgrade-card';
        div.innerHTML = `
            <div class="upgrade-info">
                <h3>${upg.icon} ${upg.name} (P: ${upg.current} / ${upg.max})</h3>
                <p>${upg.desc}. Aktualny Bonus: ${(upg.effect(upg.current) * 100).toFixed(0)}%.</p>
            </div>
            ${btnHTML}
        `;
        list.appendChild(div);
    });
}

function renderAllShops() {
    renderPets();
    renderBackgrounds();
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

/* === ZAPIS I ODCZYT (Natychmiastowy po zmianie stanu/zamknięciu) === */
function saveGame() {
    localStorage.setItem('CashSimulatorV4', JSON.stringify(game));
    // console.log("Gra zapisana!");
}

function loadGame() {
    let saved = localStorage.getItem('CashSimulatorV4');
    if(saved) {
        let parsed = JSON.parse(saved);
        game = { ...game, ...parsed };
        
        // Zapewnienie kompatybilności po aktualizacjach struktury gry
        if (game.rebirthCount === undefined) game.rebirthCount = 0;
        if (game.ownedBackgrounds === undefined) game.ownedBackgrounds = ['bg-default'];
        if (game.equippedBackground === undefined) game.equippedBackground = 'bg-default';
        if (game.rcUpgrades === undefined) game.rcUpgrades = { rc_click: 0, rc_mps: 0, rc_mult_base: 0 };

        const newPets = {};
        PETS_DATA.forEach(pet => {
            const oldVal = parsed.pets ? parsed.pets[pet.id] : 0;
            newPets[pet.id] = oldVal > 0 ? 1 : 0;
        });
        game.pets = newPets;

        RC_UPGRADES.forEach(upg => {
            if (game.rcUpgrades[upg.id] === undefined) {
                game.rcUpgrades[upg.id] = 0;
            }
        });
    }
}

// Start
init();
