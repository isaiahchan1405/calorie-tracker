function readAuthUser() {
    return JSON.parse(localStorage.getItem('authUser') || 'null');
}

function writeAuthUser(user) {
    if (user) {
        localStorage.setItem('authUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('authUser');
    }
}

function authLogin() {
    const input = prompt('Enter email for login UI preview:');
    if (!input) return;
    const email = input.trim();
    if (!email) return;
    writeAuthUser({ email: email, ts: Date.now() });
    renderAuthUi();
}

function authLogout() {
    writeAuthUser(null);
    renderAuthUi();
}

function renderAuthUi() {
    const nav = document.querySelector('nav.container-fluid');
    if (!nav) return;
    const navLists = nav.querySelectorAll('ul');
    if (navLists.length < 2) return;

    const menu = navLists[1];
    const existing = document.getElementById('auth-ui-root');
    if (existing) existing.remove();

    const user = readAuthUser();

    const root = document.createElement('li');
    root.id = 'auth-ui-root';

    const wrap = document.createElement('div');
    wrap.className = 'auth-ui-wrap';

    const status = document.createElement('span');
    status.className = 'auth-ui-status';
    status.textContent = user ? ('Signed in: ' + user.email) : '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'outline auth-ui-btn';
    btn.textContent = user ? 'Logout' : 'Login';
    btn.addEventListener('click', user ? authLogout : authLogin);

    wrap.appendChild(status);
    wrap.appendChild(btn);
    root.appendChild(wrap);
    menu.appendChild(root);
}

document.addEventListener('DOMContentLoaded', renderAuthUi);
