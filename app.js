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

function render() {
    let m = $('#main');
    ({ 
        home: () => m.innerHTML = home(),
        tasks: () => m.innerHTML = tasks(),
        schedule: () => m.innerHTML = schedule(),
        records: () => m.innerHTML = records(),
        assistant: () => m.innerHTML = assistant(),
        review: () => m.innerHTML = review(),
        activity: () => m.innerHTML = activity(),
        team: () => m.innerHTML = team()
    })[page]?.();
    bind();
}

function records() {
    let a = list('docs').sort((x, y) => y.updated.localeCompare(x.updated)),
        query = q.toLowerCase();
    if (query) a = a.filter(x => (x.title + x.content + x.type).toLowerCase().includes(query));
    return `${head('Business records', 'Save useful information and export reports.', '<button class="btn secondary" id="csv">Export task report</button><button class="btn" data-modal="doc">＋ New record</button>')}
    <div class="toolbar">
        <div class="search">
            <input class="field" id="search" placeholder="Search records" value="${esc(q)}">
        </div>
    </div>
    ${a.length ? `<div class="docgrid">${a.map(d => `<article class="doc">
        <div class="card-head"><span class="badge blue">${esc(d.type)}</span><button class="btn ghost small" data-edit-doc="${d.id}">Edit</button></div>
        <h3>${esc(d.title)}</h3>
        <p>${esc(d.content)}</p>
        <div class="small">Updated ${stamp(d.updated)}</div>
        <div class="row-actions" style="margin-top:10px">
            <button class="btn secondary small" data-download-doc="${d.id}">Download .txt</button>
            <button class="btn danger small" data-delete-doc="${d.id}">Delete</button>
        </div>
    </article>`).join('')}</div>` : `<div class="card">${empty('No records saved', 'Create notes, reports or procedures here.')}</div>`}
    <p class="footnote">Task data exports as CSV. Saved records download as text files.</p>`;
}

function assistant() {
    let chats = db.chats.filter(c => c.user === me.id).sort((a, b) => a.at.localeCompare(b.at)),
        pending = list('approvals').filter(a => a.state === 'pending');
    return `${head('AI assistant', 'Ask plainly. Review every proposed change before it is saved.')}
    <div class="assistant">
        <section class="card chatbox">
            <div class="messages" id="messages">
                ${chats.length ? chats.map(c => `<div class="bubble ${c.role === 'user' ? 'user' : ''}">${esc(c.text)}<div class="stamp">${stamp(c.at)}</div></div>${c.proposal ? proposal(db.approvals.find(a => a.id === c.proposal)) : ''}`).join('') : `<div class="notice"><b>Try asking:</b><br>“Create a task to call the supplier Friday”<br>“What tasks are overdue?”<br>“Schedule a team check-in tomorrow at 10am”</div>`}
            </div>
            <form class="compose" id="chat">
                <input class="field" id="prompt" placeholder="Ask or suggest an action…" required>
                <button class="btn">Send</button>
            </form>
        </section>
        <aside class="card">
            <div class="card-head"><h2>Human review</h2><span class="badge green">Required</span></div>
            <p class="muted">This MVP understands common task and schedule requests, and can answer basic questions from workspace records.</p>
            <div class="notice">Draft actions stay out of your workspace until approved.</div>
            <hr>
            <div class="card-head"><h2>Waiting for review</h2><span class="badge amber">${pending.length}</span></div>
            ${pending.slice(0, 3).map(a => `<div class="proposal"><strong>${esc(a.title)}</strong><div class="small">${esc(a.summary)}</div></div>`).join('') || '<div class="small">Nothing waiting.</div>'}
            <p class="footnote">Rules-based demo assistant; no external AI service is called.</p>
        </aside>
    </div>`;
}

function proposal(a) {
    return a ? `<div class="proposal"><strong>Draft ${esc(a.kind)}</strong>${esc(a.title)}<div class="small">${esc(a.summary)} · ${esc(a.state)}</div></div>` : '';
}

function review() {
    let a = list('approvals').sort((x, y) => y.at.localeCompare(x.at));
    return `${head('Review actions', 'Check every assistant proposal before it changes workspace data.')}
    <section class="card">
        ${a.length ? a.map(x => `<div class="row">
            <div class="row-main">
                <span class="badge ${x.state === 'pending' ? 'amber' : x.state === 'approved' ? 'green' : 'red'}">${esc(x.state)}</span> 
                <span class="badge blue">${esc(x.kind)}</span>
                <div class="row-title" style="margin-top:7px">${esc(x.title)}</div>
                <div class="row-sub">${esc(x.summary)} · Asked by ${esc(uname(x.by))} · ${stamp(x.at)}</div>
            </div>
            ${x.state === 'pending' ? `<div class="row-actions"><button class="btn small" data-approve="${x.id}">Approve</button><button class="btn danger small" data-reject="${x.id}">Reject</button></div>` : ''}
        </div>`).join('') : empty('No proposals to review', 'Assistant drafts will appear here.')}
    </section>`;
}

function activity() {
    let a = list('logs');
    return `${head('Activity log', 'A shared history of important workspace changes.')}
    <section class="card">
        ${a.length ? a.map(x => `<div class="row">
            <div><b>${esc(x.action)}</b><div class="row-sub">${esc(x.who)}${x.detail ? ' · ' + esc(x.detail) : ''}</div></div>
            <span class="small">${stamp(x.at)}</span>
        </div>`).join('') : empty('No activity recorded')}
    </section>`;
}

function team() {
    let a = db.users.filter(u => u.space === me.space);
    return `${head('Team & settings', 'Manage access and save a backup.')}
    <div class="settings">
        <section class="card">
            <div class="card-head"><h2>Team members</h2><span class="badge green">${a.length}</span></div>
            ${a.map(u => `<div class="row">
                <div><b>${esc(u.name)}${u.id === me.id ? ' (you)' : ''}</b><div class="row-sub">${esc(u.email)}</div></div>
                <div class="row-actions"><span class="badge blue">${esc(u.role)}</span>${u.id !== me.id ? `<button class="btn ghost small" data-role="${u.id}">Change role</button>` : ''}</div>
            </div>`).join('')}
            <hr>
            <button class="btn secondary" data-modal="member">＋ Add team member</button>
            <p class="footnote">The temporary password is shown once after creation. Share it securely.</p>
        </section>
        <section class="card">
            <h2>Workspace backup</h2>
            <p class="muted">Download the workspace records, task data, approvals and activity log as JSON.</p>
            <button class="btn secondary" id="backup">Download backup</button>
            <p class="footnote">Data stays in this browser and does not sync across devices.</p>
        </section>
    </div>`;
}

function bind() {
    document.querySelectorAll('[data-modal]').forEach(b => b.onclick = () => modal(b.dataset.modal));
    document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
        page = b.dataset.go;
        app();
    });
    document.querySelectorAll('[data-edit-task]').forEach(b => b.onclick = () => modal('task', b.dataset.editTask));
    document.querySelectorAll('[data-edit-event]').forEach(b => b.onclick = () => modal('event', b.dataset.editEvent));
    document.querySelectorAll('[data-edit-doc]').forEach(b => b.onclick = () => modal('doc', b.dataset.editDoc));
    document.querySelectorAll('[data-status]').forEach(b => b.onchange = () => {
        let t = db.tasks.find(x => x.id === b.dataset.status);
        if (t && (manager() || t.by === me.id || t.assignee === me.id)) {
            t.status = b.value;
            log('Updated task status', t.title + ' → ' + t.status);
            save();
            render();
        } else toast('You do not have permission to update this task.', true);
    });
    document.querySelectorAll('[data-delete-event]').forEach(b => b.onclick = () => remove('events', b.dataset.deleteEvent));
    document.querySelectorAll('[data-delete-doc]').forEach(b => b.onclick = () => remove('docs', b.dataset.deleteDoc));
    document.querySelectorAll('[data-download-doc]').forEach(b => b.onclick = () => downloadDoc(b.dataset.downloadDoc));
    document.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => decide(b.dataset.approve, true));
    document.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => decide(b.dataset.reject, false));
    document.querySelectorAll('[data-role]').forEach(b => b.onclick = () => role(b.dataset.role));
    let s = $('#search');
    if (s) s.oninput = () => {
        q = s.value;
        let pos = s.selectionStart;
        render();
        $('#search')?.focus();
        $('#search')?.setSelectionRange(pos, pos);
    };
    if ($('#filter')) $('#filter').onchange = () => {
        status = $('#filter').value;
        render();
    };
    if ($('#clear')) $('#clear').onclick = () => {
        q = '';
        status = 'all';
        render();
    };
    $('#csv')?.addEventListener('click', exportCsv);
    $('#backup')?.addEventListener('click', backup);
    $('#chat')?.addEventListener('submit', chat);
}

function modal(type, key = '') {
    let item = key ? db[{ task: 'tasks', event: 'events', doc: 'docs' }[type]].find(x => x.id === key) : null,
        users = db.users.filter(u => u.space === me.space);
    let title = { task: item ? 'Edit task' : 'New task', event: item ? 'Edit event' : 'Add event', doc: item ? 'Edit record' : 'New record', member: 'Add team member' }[type],
        body = '';

    if (type === 'task') body = `<div class="form-row"><label>Task</label><input class="field" name="title" required value="${esc(item?.title || '')}"></div>
    <div class="form-row"><label>Description</label><textarea class="field" name="desc">${esc(item?.desc || '')}</textarea></div>
    <div class="form-row"><label>Assigned to</label><select class="field" name="assignee"><option value="">Unassigned</option>${users.map(u => `<option value="${u.id}" ${item?.assignee === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
    <div class="form-row"><label>Status</label><select class="field" name="status">${['pending', 'in progress', 'completed'].map(x => `<option ${item?.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="form-row"><label>Due date</label><input class="field" type="date" name="due" value="${esc(item?.due || '')}"></div>
    <div class="form-row"><label>Reminder date and time</label><input class="field" type="datetime-local" name="remind" value="${esc(item?.remind || '')}"></div>`;

    if (type === 'event') body = `<div class="form-row"><label>Activity</label><input class="field" name="title" required value="${esc(item?.title || '')}"></div>
    <div class="form-row"><label>Details</label><textarea class="field" name="desc">${esc(item?.desc || '')}</textarea></div>
    <div class="form-row"><label>Date and time</label><input class="field" name="when" type="datetime-local" required value="${esc(item?.when || '')}"></div>
    <div class="form-row"><label>Location</label><input class="field" name="place" value="${esc(item?.place || '')}"></div>`;

    if (type === 'doc') body = `<div class="form-row"><label>Title</label><input class="field" name="title" required value="${esc(item?.title || '')}"></div>
    <div class="form-row"><label>Type</label><select class="field" name="type">${['Note', 'Report', 'Procedure'].map(x => `<option ${item?.type === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="form-row"><label>Content</label><textarea class="field" style="min-height:150px" name="content" required>${esc(item?.content || '')}</textarea></div>`;

    if (type === 'member') body = `<div class="form-row"><label>Name</label><input class="field" name="name" required></div>
    <div class="form-row"><label>Email</label><input class="field" type="email" name="email" required></div>
    <div class="form-row"><label>Role</label><select class="field" name="role"><option value="employee">Employee</option><option value="admin">Administrator</option></select></div>
    <div class="notice">A temporary password is generated and shown once.</div>`;

    $('#modal').innerHTML = `<div class="modal-bg" id="bg">
        <form class="modal-box" id="form">
            <div class="modal-head"><h2>${title}</h2><button class="close" type="button" id="x">×</button></div>
            ${body}
            <div class="footnote" id="err"></div>
            <div class="modal-actions"><button type="button" class="btn secondary" id="cancel">Cancel</button><button class="btn">${type === 'member' ? 'Create member' : 'Save'}</button></div>
        </form>
    </div>`;

    $('#x').onclick = $('#cancel').onclick = () => $('#modal').innerHTML = '';
    $('#bg').onclick = e => { if (e.target.id === 'bg') $('#modal').innerHTML = ''; };
    $('#form').onsubmit = e => saveForm(e, type, item);
}

async function saveForm(e, type, item) {
    e.preventDefault();
    let f = Object.fromEntries(new FormData(e.target));

    if (type === 'member') {
        if (!manager()) return $('#err').textContent = 'Only an owner or administrator can add teammates.';
        let email = f.email.trim().toLowerCase();
        if (db.users.some(u => u.email === email)) return $('#err').textContent = 'That email already has an account.';
        let pw = 'Uw!' + Math.random().toString(36).slice(2, 9) + '9',
            salt = id(),
            u = {
                id: id(),
                space: me.space,
                name: f.name.trim(),
                email,
                role: f.role,
                salt,
                pass: await hash(pw, salt)
            };
        db.users.push(u);
        save();
        log('Added team member', u.name);
        $('#modal').innerHTML = `<div class="modal-bg">
            <div class="modal-box">
                <h2>Member created</h2>
                <p>${esc(u.name)} can sign in as ${esc(u.email)} with this temporary password:</p>
                <div class="notice" style="font:700 18px monospace">${esc(pw)}</div>
                <p class="small">Share this securely. Password reset is not available in this MVP.</p>
                <button class="btn" id="done">Done</button>
            </div>
        </div>`;
        $('#done').onclick = () => { $('#modal').innerHTML = ''; render(); };
        return;
    }

    let bucket = { task: 'tasks', event: 'events', doc: 'docs' }[type],
        x = item || { id: id(), space: me.space, by: me.id, created: now() };

    if (item && !manager() && item.by !== me.id && (type !== 'task' || item.assignee !== me.id)) return $('#err').textContent = 'You do not have permission to edit this record.';

    Object.assign(x, f, { updated: now() });

    if (type === 'task') {
        x.assignee = f.assignee || '';
        x.status = f.status || 'pending';
        log(item ? 'Updated task' : 'Created task', x.title);
    }
    if (type === 'event') log(item ? 'Updated schedule item' : 'Created schedule item', x.title);
    if (type === 'doc') log(item ? 'Updated business record' : 'Saved business record', x.title);

    if (!item) db[bucket].unshift(x);
    save();
    $('#modal').innerHTML = '';
    render();
    toast('Saved');
}

function remove(bucket, key) {
    let x = db[bucket].find(r => r.id === key && r.space === me.space);
    if (!x) return;
    if (!manager() && x.by !== me.id) {
        toast('You do not have permission to delete this record.', true);
        return;
    }
    if (!confirm(`Delete “${x.title}”?`)) return;
    db[bucket] = db[bucket].filter(r => r.id !== key);
    log('Deleted ' + (bucket === 'events' ? 'schedule item' : 'business record'), x.title);
    save();
    render();
}

function decide(key, yes) {
    if (!manager()) {
        toast('Only an owner or administrator can approve proposals.', true);
        return;
    }
    let a = db.approvals.find(x => x.id === key && x.space === me.space && x.state === 'pending');
    if (!a) return;

    if (yes) {
        if (a.kind === 'task') db.tasks.unshift({
            id: id(),
            space: me.space,
            by: me.id,
            title: a.data.title,
            desc: a.data.desc || '',
            assignee: '',
            due: a.data.due || '',
            remind: '',
            status: 'pending',
            created: now(),
            updated: now()
        });
        else db.events.unshift({
            id: id(),
            space: me.space,
            by: me.id,
            title: a.data.title,
            desc: a.data.desc || '',
            when: a.data.when,
            place: ''
        });
        a.state = 'approved';
        log('Approved assistant proposal', a.title);
        toast('Approved and saved');
    } else {
        a.state = 'rejected';
        log('Rejected assistant proposal', a.title);
        toast('Proposal rejected');
    }
    a.decided = now();
    save();
    app();
}

function due(text) {
    let d = new Date(),
        t = text.toLowerCase();
    if (t.includes('tomorrow')) d.setDate(d.getDate() + 1);
    else for (let [day, n] of Object.entries({ sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }))
        if (t.includes(day)) {
            d.setDate(d.getDate() + ((n - d.getDay() + 7) % 7 || 7));
            break;
        }
    return d.toISOString().slice(0, 10);
}

function answer(text) {
    let t = text.trim(),
        l = t.toLowerCase(),
        tasks = list('tasks'),
        events = list('events'),
        docs = list('docs');

    if (/\b(create|add|make|remind me to)\b/.test(l) && /\b(task|todo|to-do|reminder|follow up|call|prepare|send|review)\b/.test(l)) {
        let title = t.replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(task|todo|to-do)\s*(to\s*)?/i, '').replace(/^remind me to\s*/i, '').trim();
        if (!title || title === t) title = t.replace(/^(please\s+)?(create|add|make)\s+/i, '');
        let d = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(t) ? due(t) : '';
        return draft('task', title, `Create a pending task${d ? ' due ' + date(d) : ''}.`, { title, desc: `Suggested from: ${t}`, due: d });
    }
    
    if (/\b(schedule|book|plan)\b/.test(l) && /\b(meeting|event|call|check-in|check in|appointment|session)\b/.test(l)) {
        let title = t.replace(/^(please\s+)?(schedule|book|plan)\s+(a\s+)?/i, '').trim(),
            d = new Date();
        if (l.includes('tomorrow')) d.setDate(d.getDate() + 1);
        let m = l.match(/\b(\d{1,2})(?::(\d\d))?\s*(am|pm)\b/i);
        d.setHours(m ? (Number(m[1]) % 12 + (m[3].toLowerCase() === 'pm' ? 12 : 0)) : 10, m ? Number(m[2] || 0) : 0, 0, 0);
        let when = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        return draft('schedule', title, `Add a schedule item for ${stamp(when)}.`, { title, when, desc: `Suggested from: ${t}` });
    }
    
    if (/\b(overdue|late)\b/.test(l) && /task/.test(l)) {
        let a = tasks.filter(x => x.status !== 'completed' && x.due && x.due < new Date().toISOString().slice(0, 10));
        return { text: a.length ? `${a.length} overdue: ` + a.map(x => `${x.title} (${date(x.due)})`).join('; ') : 'There are no overdue tasks.' };
    }
    
    if (/task|todo|to-do/.test(l)) {
        let a = tasks.filter(x => x.status !== 'completed');
        return { text: `You have ${a.length} open task${a.length === 1 ? '' : 's'}${a.length ? ': ' + a.slice(0, 5).map(x => x.title + (x.due ? ' (due ' + date(x.due) + ')' : '')).join('; ') : '.'}` };
    }
    
    if (/schedule|calendar|event|meeting/.test(l)) return { text: `${events.length} schedule item${events.length === 1 ? '' : 's'} saved${events.length ? ': ' + events.slice(0, 4).map(x => x.title + ' (' + stamp(x.when) + ')').join('; ') : '.'}` };

    if (/record|document|note|report|information/.test(l)) return { text: `${docs.length} business record${docs.length === 1 ? '' : 's'} saved. Open Business records to search or export them.` };

    return { text: 'I can summarize your tasks, schedule or saved records, and draft a task or meeting for review. Try “What tasks are overdue?”' };
}

function draft(kind, title, summary, data) {
    let a = {
        id: id(),
        space: me.space,
        by: me.id,
        kind,
        title,
        summary,
        data,
        state: 'pending',
        at: now()
    };
    db.approvals.unshift(a);
    return { text: `I drafted a ${kind} for your review. It will not be saved until someone approves it.`, proposal: a.id };
}

function chat(e) {
    e.preventDefault();
    let text = $('#prompt').value.trim(),
        out = answer(text),
        at = now();

    db.chats.push({ id: id(), user: me.id, role: 'user', text, at }, { id: id(), user: me.id, role: 'assistant', text: out.text, proposal: out.proposal || '', at: now() });
    log('Asked assistant', text.slice(0, 90));
    save();
    render();
    $('#messages').scrollTop = $('#messages').scrollHeight;
}

function download(name, data, type = 'text/plain') {
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function csv(rows) {
    return rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
}

function exportCsv() {
    let rows = [['Task', 'Description', 'Assignee', 'Status', 'Due date', 'Reminder'], ...list('tasks').map(t => [t.title, t.desc, uname(t.assignee), t.status, t.due, t.remind])];
    download('ubwengeai-task-report.csv', csv(rows), 'text/csv');
    log('Exported task report');
    save();
    toast('CSV report downloaded');
}