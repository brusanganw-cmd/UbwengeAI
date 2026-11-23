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
