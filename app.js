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

function app() {
    let pending = list('approvals').filter(x => x.state === 'pending').length;
    $('#root').innerHTML = `<header class="topbar">
        <div class="top-left">
            <div class="brand"><i class="mark">U</i><span>UbwengeAI</span></div>
            <div class="workspace">${esc(ws().name)}</div>
        </div>
        <div class="top-actions">
            <div class="user-chip">
                <i class="avatar">${esc(me.name[0].toUpperCase())}</i>
                <span class="user-name">${esc(me.name)} · ${esc(me.role)}</span>
            </div>
            <button class="top-link" id="logout">Sign out</button>
        </div>
    </header>
    <div class="layout">
        <aside class="sidebar">
            <div class="nav-label">Workspace</div>
            ${nav('home', 'Overview', '⌂')}
            ${nav('tasks', 'Tasks', '☷')}
            ${nav('schedule', 'Schedule', '▦')}
            ${nav('records', 'Business records', '▤')}
            ${nav('assistant', 'AI assistant', '✳')}
            ${nav('review', 'Review actions', '✓', pending || '')}
            ${nav('activity', 'Activity log', '◷')}
            ${manager() ? nav('team', 'Team & settings', '⚙') : ''}
            <div class="side-note"><b>Human in control</b><br>Assistant proposals wait for your approval.</div>
        </aside>
        <main class="main" id="main"></main>
    </div>`;
    document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => {
        page = b.dataset.page;
        app();
    });
    $('#logout').onclick = () => {
        log('Signed out');
        localStorage.removeItem(session);
        me = null;
        auth();
    };
    render();
}

function head(title, desc, actions = '') {
    return `<div class="head">
        <div><h1>${title}</h1><p>${desc}</p></div>
        <div class="actions">${actions}</div>
    </div>`;
}

function empty(title = 'Nothing here yet', msg = 'Add your first item to get started.') {
    return `<div class="empty"><strong>${title}</strong>${msg}</div>`;
}

function home() {
    let ts = list('tasks'),
        open = ts.filter(t => t.status !== 'completed'),
        today = new Date().toISOString().slice(0, 10),
        ev = list('events').filter(e => e.when >= now()).sort((a, b) => a.when.localeCompare(b.when)).slice(0, 5),
        logs = list('logs').slice(0, 4),
        pending = list('approvals').filter(a => a.state === 'pending').length;

    return `${head(`Good ${new Date().getHours() < 12 ? 'morning' : 'day'}, ${esc(me.name.split(' ')[0])}`, `Here is what is moving in ${esc(ws().name)} today.`, `<button class="btn secondary" data-go="assistant">Ask assistant</button><button class="btn" data-modal="task">＋ New task</button>`)}
    <div class="grid kpis">
        ${[['Open tasks', open.length, 'Across the workspace'],
        ['Due today', open.filter(t => t.due === today).length, 'Keep these in view'],
        ['Upcoming events', ev.length, 'Scheduled activities'],
        ['Business records', list('docs').length, 'Notes and reports']].map(x => `<div class="card">
            <div class="k-label">${x[0]}</div>
            <div class="k-value">${x[1]}</div>
            <div class="k-foot">${x[2]}</div>
        </div>`).join('')}
    </div>
    <div class="grid two">
        <section class="card">
            <div class="card-head">
                <h2>Tasks in progress</h2>
                <button class="btn ghost small" data-go="tasks">View all →</button>
            </div>
            ${open.length ? open.slice(0, 5).map(t => `<div class="row">
                <div class="row-main">
                    <div class="row-title">${esc(t.title)}</div>
                    <div class="row-sub">${t.due ? `Due ${date(t.due)}` : 'No due date'} · ${esc(uname(t.assignee))}</div>
                </div>
                <span class="badge ${t.status === 'pending' ? 'amber' : 'blue'}">${esc(t.status)}</span>
            </div>`).join('') : empty()}
        </section>
        <section class="card">
            <div class="card-head">
                <h2>Upcoming schedule</h2>
                <button class="btn ghost small" data-go="schedule">View →</button>
            </div>
            ${ev.length ? ev.map(e => `<div class="row">
                <div class="event-date"><b>${new Date(e.when).getDate()}</b><span>${new Date(e.when).toLocaleDateString(undefined, { month: 'short' })}</span></div>
                <div class="row-main">
                    <div class="row-title">${esc(e.title)}</div>
                    <div class="row-sub">${stamp(e.when)}${e.place ? ' · ' + esc(e.place) : ''}</div>
                </div>
            </div>`).join('') : empty('Your calendar is clear')}
        </section>
        <section class="card">
            <div class="card-head">
                <h2>Recent activity</h2>
                <button class="btn ghost small" data-go="activity">Open log →</button>
            </div>
            ${logs.length ? logs.map(x => `<div class="row">
                <div><b>${esc(x.action)}</b>
                    <div class="row-sub">${esc(x.who)}${x.detail ? ' · ' + esc(x.detail) : ''}</div>
                </div>
                <span class="small">${stamp(x.at)}</span>
            </div>`).join('') : empty('No activity yet')}
        </section>
        <section class="card">
            <div class="card-head">
                <h2>Review queue</h2>
                <span class="badge amber">${pending} pending</span>
            </div>
            <p class="muted">Assistant suggestions only save after approval.</p>
            <button class="btn secondary" data-go="review">Review actions</button>
        </section>
    </div>`;
}

function tasks() {
    let a = list('tasks'),
        query = q.toLowerCase();
    if (query) a = a.filter(t => (t.title + ' ' + t.desc + ' ' + uname(t.assignee)).toLowerCase().includes(query));
    if (status !== 'all') a = a.filter(t => t.status === status);
    a.sort((x, y) => (x.due || '9999').localeCompare(y.due || '9999'));
    return `${head('Tasks', 'Plan work, assign owners and keep actions visible.', '<button class="btn" data-modal="task">＋ New task</button>')}
    <div class="toolbar">
        <div class="search">
            <input class="field" id="search" placeholder="Search tasks" value="${esc(q)}">
        </div>
        <select class="field" id="filter">
            <option value="all">All statuses</option>
            ${['pending', 'in progress', 'completed'].map(x => `<option ${status === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
        <button class="btn secondary small" id="clear">Clear</button>
    </div>
    <div class="card table-wrap">
        <table class="data">
            <thead>
                <tr>
                    <th>Task</th>
                    <th>Assigned to</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${a.length ? a.map(t => `<tr>
                    <td><b>${esc(t.title)}</b><div class="small">${esc(t.desc || '')}</div>${t.remind ? `<div class="small">Reminder ${stamp(t.remind)}</div>` : ''}</td>
                    <td>${esc(uname(t.assignee))}</td>
                    <td>${date(t.due)}</td>
                    <td><select class="status" data-status="${t.id}">${['pending', 'in progress', 'completed'].map(x => `<option ${t.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
                    <td><button class="btn ghost small" data-edit-task="${t.id}">Edit</button></td>
                </tr>`).join('') : `<tr><td colspan="5">${empty('No matching tasks')}</td></tr>`}
            </tbody>
        </table>
    </div>`;
}

function schedule() {
    let a = list('events').sort((x, y) => x.when.localeCompare(y.when));
    return `${head('Schedule', 'Keep meetings and business activities together.', '<button class="btn" data-modal="event">＋ Add event</button>')}
    <section class="card">
        ${a.length ? a.map(e => `<div class="row">
            <div class="event-date"><b>${new Date(e.when).getDate()}</b><span>${new Date(e.when).toLocaleDateString(undefined, { month: 'short' })}</span></div>
            <div class="row-main">
                <div class="row-title">${esc(e.title)}</div>
                <div class="row-sub">${stamp(e.when)}${e.place ? ' · ' + esc(e.place) : ''}${e.desc ? ' · ' + esc(e.desc) : ''}</div>
            </div>
            <div class="row-actions">
                <button class="btn ghost small" data-edit-event="${e.id}">Edit</button>
                <button class="btn danger small" data-delete-event="${e.id}">Delete</button>
            </div>
        </div>`).join('') : empty('Your calendar is clear', 'Add a meeting or activity.')}
    </section>`;
}
