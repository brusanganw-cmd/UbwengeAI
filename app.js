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