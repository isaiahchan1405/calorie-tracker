const CIRC = 2 * Math.PI * 42;
const TODAY = new Date().toISOString().slice(0, 10);

let profileData = null;
let goals = { calories: 2000, protein: 50, carbs: 260, fat: 78, fibre: 30 };
let meals = [];
let allFoods = [];
let customFoods = [];
let selectedFood = null;
let currentSearchResults = [];

document.addEventListener('DOMContentLoaded', async () => {
    const heading = document.getElementById('today-heading');
    if (heading) {
        heading.textContent = new Date().toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    try {
        profileData = await MealLoggerStore.fetchProfileData();
        goals = profileData.userGoals || goals;
        meals = Array.isArray(profileData.mealsByDate && profileData.mealsByDate[TODAY]) ? profileData.mealsByDate[TODAY] : [];
    } catch {
        profileData = MealLoggerStore.defaultProfileData(MealLoggerStore.getActiveProfileKey());
        goals = profileData.userGoals;
        meals = [];
        const errEl = document.getElementById('form-error');
        if (errEl) {
            errEl.textContent = 'Could not load profile data from local file storage API.';
            errEl.style.display = 'block';
        }
    }

    try {
        customFoods = await MealLoggerStore.fetchCustomFoods();
    } catch {
        customFoods = [];
    }

    try {
        const res = await fetch('./cleanedFoodData.json');
        if (!res.ok) throw new Error();
        allFoods = await res.json();
    } catch {
        const errEl = document.getElementById('form-error');
        if (errEl) {
            errEl.textContent = 'Failed to load global food database.';
            errEl.style.display = 'block';
        }
    }

    setupSearch();
    renderTable();
    updateRings();
    updateGoalDisplays();
});

async function persistMeals() {
    if (!profileData) return;
    if (!profileData.mealsByDate || typeof profileData.mealsByDate !== 'object') profileData.mealsByDate = {};
    profileData.mealsByDate[TODAY] = meals;
    profileData.userGoals = goals;
    try {
        profileData = await MealLoggerStore.saveProfileData(profileData);
    } catch {
        const errEl = document.getElementById('form-error');
        if (errEl) {
            errEl.textContent = 'Could not save meals to local file storage API.';
            errEl.style.display = 'block';
        }
    }
}

function setupSearch() {
    const searchInput = document.getElementById('food-search');
    const resultsDiv = document.getElementById('food-results');
    if (!searchInput || !resultsDiv) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query === '') {
            resultsDiv.innerHTML = '';
            resultsDiv.style.display = 'none';
            selectedFood = null;
            currentSearchResults = [];
            return;
        }

        const customMatches = (customFoods || [])
            .filter(f => (f['Food Name'] || '').toLowerCase().includes(query));

        const globalMatches = (allFoods || [])
            .filter(f => (f['Food Name'] || '').toLowerCase().includes(query));

        currentSearchResults = [...customMatches, ...globalMatches].slice(0, 30);

        if (currentSearchResults.length === 0) {
            resultsDiv.innerHTML = '<div style="padding:0.5rem; color:#999;">No foods found</div>';
            resultsDiv.style.display = 'block';
            return;
        }

        resultsDiv.innerHTML = currentSearchResults.map((f, idx) => {
            const suffix = f.__custom === true ? ' (custom)' : '';
            return `<div class="food-result" style="padding:0.5rem; cursor:pointer; border-bottom:1px solid #eee;" onclick="selectFood(${idx})">${f['Food Name']}${suffix}</div>`;
        }).join('');
        resultsDiv.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && !resultsDiv.contains(e.target)) {
            resultsDiv.style.display = 'none';
        }
    });
}

function selectFood(idx) {
    const picked = currentSearchResults[idx];
    if (!picked) return;
    selectedFood = picked;
    document.getElementById('food-search').value = selectedFood['Food Name'];
    document.getElementById('food-results').style.display = 'none';
}

document.getElementById('log-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedFood) {
        const errEl = document.getElementById('form-error');
        errEl.textContent = 'Please select a food from the search results.';
        errEl.style.display = 'block';
        return;
    }

    const grams = parseFloat(document.getElementById('grams').value);
    const cat = document.getElementById('category').value;
    const errEl = document.getElementById('form-error');

    if (!grams || grams <= 0 || !Number.isFinite(grams)) {
        errEl.textContent = 'Please enter a valid amount greater than 0.';
        errEl.style.display = 'block';
        return;
    }

    if (grams > 2000) {
        errEl.textContent = 'Amount seems too large (max 2000g).';
        errEl.style.display = 'block';
        return;
    }

    errEl.style.display = 'none';

    const newMeal = {
        id: Date.now(),
        cat: cat,
        name: selectedFood['Food Name'],
        grams: grams,
        kcal: (selectedFood.Calories || 0) * grams,
        prot: (selectedFood.Protein || 0) * grams,
        carb: (selectedFood.Carbohydrate || 0) * grams,
        fat: (selectedFood.Fat || 0) * grams,
        fibre: (selectedFood.Fibre || 0) * grams
    };

    meals.push(newMeal);
    await persistMeals();
    renderTable();
    updateRings();

    document.getElementById('food-search').value = '';
    document.getElementById('grams').value = '';
    document.getElementById('food-results').innerHTML = '';
    document.getElementById('food-results').style.display = 'none';
    currentSearchResults = [];
    selectedFood = null;
});

function renderTable() {
    const body = document.getElementById('meal-table-body');
    if (meals.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="empty-state">No meals logged yet — add one on the left.</td></tr>';
        return;
    }

    body.innerHTML = meals.map(m => `
        <tr>
            <td><span class="meal-badge">${m.cat}</span></td>
            <td>${m.name}</td>
            <td>${m.grams}g</td>
            <td>${Math.round(m.kcal)}</td>
            <td>${m.prot.toFixed(1)}g</td>
            <td><button class="delete-btn" onclick="deleteMeal(${m.id})">Remove</button></td>
        </tr>
    `).join('');
}

async function deleteMeal(id) {
    meals = meals.filter(m => m.id !== id);
    await persistMeals();
    renderTable();
    updateRings();
}

function getTotals() {
    return meals.reduce((acc, m) => {
        acc.kcal += m.kcal || 0;
        acc.prot += m.prot || 0;
        acc.carb += m.carb || 0;
        acc.fat += m.fat || 0;
        acc.fibre += m.fibre || 0;
        return acc;
    }, { kcal: 0, prot: 0, carb: 0, fat: 0, fibre: 0 });
}

function setRing(ringId, consumed, goal) {
    const ratio = goal > 0 ? Math.min(consumed / goal, 1) : 0;
    const offset = CIRC - ratio * CIRC;
    const el = document.getElementById(ringId);
    if (el) el.style.strokeDashoffset = offset.toFixed(1);
}

function updateRings() {
    const t = getTotals();

    setRing('cal-ring', t.kcal, goals.calories);
    setRing('prot-ring', t.prot, goals.protein);
    setRing('carb-ring', t.carb, goals.carbs);
    setRing('fat-ring', t.fat, goals.fat);

    setText('cal-display', Math.round(t.kcal));
    setText('prot-display', t.prot.toFixed(1) + 'g');
    setText('carb-display', t.carb.toFixed(1) + 'g');
    setText('fat-display', t.fat.toFixed(1) + 'g');
}

function updateGoalDisplays() {
    setText('cal-goal-display', '/ ' + goals.calories + ' kcal');
    setText('prot-goal-display', '/ ' + goals.protein + 'g');
    setText('carb-goal-display', '/ ' + goals.carbs + 'g');
    setText('fat-goal-display', '/ ' + goals.fat + 'g');
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
