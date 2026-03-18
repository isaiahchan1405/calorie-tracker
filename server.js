const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data', 'profiles');
const CUSTOM_FOODS_FILE = path.join(ROOT, 'customFoodsData.json');
const PORT = process.env.PORT || 8080;

function contentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') return 'text/html; charset=utf-8';
    if (ext === '.js') return 'text/javascript; charset=utf-8';
    if (ext === '.css') return 'text/css; charset=utf-8';
    if (ext === '.json') return 'application/json; charset=utf-8';
    if (ext === '.svg') return 'image/svg+xml';
    return 'application/octet-stream';
}

function normalizeProfileKey(key) {
    return (key || 'default').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '') || 'default';
}

function profileFile(profileKey) {
    return path.join(DATA_DIR, normalizeProfileKey(profileKey) + '.json');
}

function defaultProfile(profileKey) {
    return {
        profileKey: normalizeProfileKey(profileKey),
        userGoals: {
            profileName: normalizeProfileKey(profileKey),
            age: null,
            sex: 'male',
            weight: null,
            height: null,
            activity: 1.55,
            calories: 2000,
            protein: 50,
            carbs: 260,
            fat: 78,
            fibre: 30
        },
        mealsByDate: {},
        updatedAt: new Date().toISOString()
    };
}

async function ensureDataDir() {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    try {
        await fsp.access(CUSTOM_FOODS_FILE);
    } catch {
        await fsp.writeFile(CUSTOM_FOODS_FILE, '[]', 'utf8');
    }
}

async function readCustomFoods() {
    try {
        const raw = await fsp.readFile(CUSTOM_FOODS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function writeCustomFoods(foods) {
    if (!Array.isArray(foods)) throw new Error('Payload must be an array');

    const normalized = foods.map((item) => ({
        'Food Name': String(item && item['Food Name'] ? item['Food Name'] : '').trim(),
        'Calories': Number(item && item['Calories']) || 0,
        'Protein': Number(item && item['Protein']) || 0,
        'Carbohydrate': Number(item && item['Carbohydrate']) || 0,
        'Fat': Number(item && item['Fat']) || 0,
        'Fibre': Number(item && item['Fibre']) || 0,
        '__custom': true
    })).filter((item) => item['Food Name'].length > 0);

    const tempPath = CUSTOM_FOODS_FILE + '.tmp';
    await fsp.writeFile(tempPath, JSON.stringify(normalized, null, 2), 'utf8');
    await fsp.rename(tempPath, CUSTOM_FOODS_FILE);
    return normalized;
}

async function readProfile(profileKey) {
    const file = profileFile(profileKey);
    try {
        const raw = await fsp.readFile(file, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed;
    } catch {
        return defaultProfile(profileKey);
    }
}

async function writeProfile(profileKey, data) {
    const file = profileFile(profileKey);
    const payload = {
        profileKey: normalizeProfileKey(profileKey),
        userGoals: data.userGoals || defaultProfile(profileKey).userGoals,
        mealsByDate: data.mealsByDate && typeof data.mealsByDate === 'object' ? data.mealsByDate : {},
        updatedAt: new Date().toISOString()
    };
    await fsp.writeFile(file, JSON.stringify(payload, null, 2), 'utf8');
    return payload;
}

function sendJson(res, status, obj) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
    return true;
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 5 * 1024 * 1024) {
                reject(new Error('Payload too large'));
                req.destroy();
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

async function handleApi(req, res, pathname) {
    if (pathname === '/api/custom-foods') {
        if (req.method === 'GET') {
            const foods = await readCustomFoods();
            return sendJson(res, 200, foods);
        }

        if (req.method === 'PUT') {
            try {
                const body = await parseBody(req);
                const saved = await writeCustomFoods(body);
                return sendJson(res, 200, saved);
            } catch (e) {
                return sendJson(res, 400, { error: e.message });
            }
        }

        return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const match = pathname.match(/^\/api\/profiles\/([a-zA-Z0-9_\-]+)$/);
    if (!match) return false;

    const key = normalizeProfileKey(match[1]);

    if (req.method === 'GET') {
        const data = await readProfile(key);
        return sendJson(res, 200, data);
    }

    if (req.method === 'PUT') {
        try {
            const body = await parseBody(req);
            const saved = await writeProfile(key, body || {});
            return sendJson(res, 200, saved);
        } catch (e) {
            return sendJson(res, 400, { error: e.message });
        }
    }

    sendJson(res, 405, { error: 'Method not allowed' });
    return true;
}

async function handleStatic(req, res, pathname) {
    let relPath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(relPath).replace(/^\.+/, '');
    const filePath = path.join(ROOT, safePath);

    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const stat = await fsp.stat(filePath);
        const resolved = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
        const data = await fsp.readFile(resolved);
        res.writeHead(200, { 'Content-Type': contentType(resolved) });
        res.end(data);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
    }
}

async function main() {
    await ensureDataDir();

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        if (pathname.startsWith('/api/')) {
            const handled = await handleApi(req, res, pathname);
            if (!handled) sendJson(res, 404, { error: 'API route not found' });
            return;
        }

        await handleStatic(req, res, pathname);
    });

    server.listen(PORT, () => {
        console.log(`MealLogger dev server running on http://localhost:${PORT}`);
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
