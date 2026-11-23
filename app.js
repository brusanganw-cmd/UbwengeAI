const $ = s => document.querySelector(s),
    dbkey = 'ubwengeai.data.v1',
    session = 'ubwengeai.user.v1';

const id = () => crypto.randomUUID(),
    now = () => new Date().toISOString(),
    esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }));

const date = d => d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) : '—',
    stamp = d => new Date(d).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

const blank = () => ({
    users: [],
    spaces: [],
    tasks: [],
    events: [],
    docs: [],
    approvals: [],
    logs: [],
    chats: []
});

let db;
try {
    db = JSON.parse(localStorage.getItem(dbkey)) || blank();
} catch {
    db = blank();
}
let me = null,
    page = 'home',
    q = '',
    status = 'all';

function save() {
    localStorage.setItem(dbkey, JSON.stringify(db));
}

function ws() {
    return db.spaces.find(x => x.id === me.space);
}

function list(k) {
    return db[k].filter(x => x.space === me.space);
}

function manager() {
    return ['owner', 'admin'].includes(me.role);
}

function uname(x) {
    return db.users.find(u => u.id === x)?.name || '—';
}

function log(action, detail = '') {
    db.logs.unshift({
        id: id(),
        space: me.space,
        who: me.name,
        action,
        detail,
        at: now()
    });
    save();
}

function toast(t, bad = false) {
    $('#toast').innerHTML = `<div class="toast ${bad ? 'error' : ''}">${esc(t)}</div>`;
    setTimeout(() => $('#toast').innerHTML = '', 3000);
}

async function hash(p, s) {
    let a = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s + p));
    return [...new Uint8Array(a)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function start() {
    me = db.users.find(x => x.id === localStorage.getItem(session)) || null;
    if (me) app();
    else auth();
}

function auth(reg = false) {
    $('#root').innerHTML = `<div class="auth">
        <section class="art">
            <div class="brand"><i class="mark">U</i>UbwengeAI</div>
            <div>
                <div class="eyebrow">Simple tools for growing businesses</div>
                <h1>Make room for work that matters.</h1>
                <p>Keep tasks, schedules, business notes and AI assisted workflows in one practical workspace.</p>
            </div>
            <div class="small">Made for SME teams, starting in Rwanda.</div>
        </section>
        <section class="auth-panel">
            <form class="auth-box" id="auth">
                <h1>${reg ? 'Create your workspace' : 'Welcome back'}</h1>
                <p class="sub">${reg ? 'Set up your business workspace.' : 'Sign in to your workspace.'}</p>
                ${reg ? `<div class="form-row"><label>Your name</label><input class="field" name="name" required></div>
                <div class="form-row"><label>Business name</label><input class="field" name="business" required></div>` : ''}
                <div class="form-row"><label>Email</label><input class="field" name="email" type="email" required></div>
                <div class="form-row"><label>Password (8+ characters)</label><input class="field" name="password" type="password" minlength="8" required></div>
                <button class="btn full">${reg ? 'Create workspace' : 'Sign in'}</button>
                <p class="footnote" id="err"></p>
                <div class="switch">${reg ? 'Already registered?' : 'New here?'} 
                    <button class="link" type="button" id="switch">${reg ? 'Sign in' : 'Create an account'}</button>
                </div>
                <div class="note">This MVP stores data in this browser only. Use a trusted device and download backups.</div>
            </form>
        </section>
    </div>`;
    $('#switch').onclick = () => auth(!reg);
    $('#auth').onsubmit = async e => {
        e.preventDefault();
        let f = new FormData(e.target),
            email = String(f.get('email')).trim().toLowerCase(),
            pw = String(f.get('password'));

        try {
            if (reg) {
                if (db.users.some(u => u.email === email)) throw Error('That email already has an account.');
                let space = id(),
                    salt = id(),
                    u = {
                        id: id(),
                        name: String(f.get('name')).trim(),
                        email,
                        role: 'owner',
                        space,
                        salt,
                        pass: await hash(pw, salt)
                    };
                db.spaces.push({
                    id: space,
                    name: String(f.get('business')).trim()
                });
                db.users.push(u);
                save();
                me = u;
                localStorage.setItem(session, u.id);
                log('Created workspace', ws().name);
                app();
            } else {
                let u = db.users.find(x => x.email === email);
                if (!u || await hash(pw, u.salt) !== u.pass) throw Error('Email or password not recognized.');
                me = u;
                localStorage.setItem(session, u.id);
                log('Signed in');
                app();
            }
        } catch (x) {
            $('#err').textContent = x.message;
            $('#err').style.color = '#a3463d';
        }
    }
}

function nav(id, label, icon, n = '') {
    return `<button class="nav ${page === id ? 'active' : ''}" data-page="${id}">
        <span>${icon}</span>${label}${n ? `<b class="count">${n}</b>` : ''}
    </button>`;
}
