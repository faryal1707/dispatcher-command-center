// ============================================================
// 🚛 DISPATCHER COMMAND CENTER
// Local Storage + Supabase Login + Cloud Sync
// ============================================================

const STORAGE_KEY = 'dispatcherCommandCenter.v2';

const emptyState = {
  xp: 0,
  streak: 1,
  shift: false,
  missions: [],
  trucks: [],
  loads: [],
  issues: [],
  cases: [],
  learning: [],
  journal: []
};

let state = loadLocalState();
let currentUser = null;
let supabaseClient = null;
let cloudEnabled = false;
let isLoadingCloud = false;

const $ = id => document.getElementById(id);

const money = n =>
  '$' + Number(n || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0
  });


// ============================================================
// ☁️ SUPABASE SETUP
// ============================================================

function setupSupabase() {

  const url = 'https://evcshsbyqkzhjtibfugo.supabase.co';

  const key = String(
    window.DISPATCHOS_SUPABASE_ANON_KEY || ''
  ).trim();

  console.log(
    'Supabase URL:',
    url
  );

  console.log(
    'Supabase key detected:',
    key.startsWith('sb_publishable_')
  );

  if (!key) {
    console.error(
      'Supabase publishable key is missing.'
    );

    createAccountBar();
    updateAccountBar(
      '⚠️ Supabase key is missing.'
    );

    return;
  }

  if (!window.supabase) {
    console.error(
      'Supabase library did not load.'
    );

    createAccountBar();
    updateAccountBar(
      '⚠️ Supabase library failed to load.'
    );

    return;
  }

  try {

    supabaseClient =
      window.supabase.createClient(
        url,
        key
      );

    cloudEnabled = true;

    console.log(
      '✅ DispatchOS Supabase connection initialized.'
    );

    createAccountBar();

    initializeAuth();

  } catch (error) {

    console.error(
      '❌ Supabase setup failed:',
      error
    );

    cloudEnabled = false;

    createAccountBar();

    updateAccountBar(
      '⚠️ Supabase connection failed.'
    );
  }
}
}


// ============================================================
// 👤 ACCOUNT / LOGIN BAR
// ============================================================

function createAccountBar() {
  if (document.getElementById('accountBar')) return;

  const bar = document.createElement('section');

  bar.id = 'accountBar';

  bar.style.cssText = `
    max-width: 1200px;
    margin: 16px auto 0;
    padding: 0 20px;
  `;

  bar.innerHTML = `
    <div
      style="
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 16px;
        border-radius:14px;
        border:1px solid rgba(148,163,184,.25);
        background:rgba(15,23,42,.55);
        backdrop-filter:blur(12px);
      "
    >

      <div>
        <div style="font-weight:700">
          ☁️ DispatchOS Cloud
        </div>

        <div
          id="accountStatus"
          style="
            font-size:13px;
            opacity:.75;
            margin-top:3px;
          "
        >
          Checking connection...
        </div>
      </div>

      <div
        id="accountActions"
        style="
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        "
      ></div>

    </div>
  `;

  document.body.insertBefore(bar, document.body.firstChild);
}


function updateAccountBar(message = '') {
  const status = $('accountStatus');
  const actions = $('accountActions');

  if (!status || !actions) return;

  actions.innerHTML = '';

  if (!cloudEnabled) {
    status.textContent =
      '💻 Local Mode — data is saved only on this browser.';

    return;
  }

  if (currentUser) {
    status.textContent =
      message ||
      `🟢 Cloud connected as ${currentUser.email}`;

    const syncButton = document.createElement('button');

    syncButton.textContent = '🔄 Sync Now';
    syncButton.className = 'primary';

    syncButton.addEventListener('click', async () => {
      syncButton.disabled = true;
      syncButton.textContent = '⏳ Syncing...';

      await syncToCloud();

      syncButton.disabled = false;
      syncButton.textContent = '✅ Synced';

      setTimeout(() => {
        syncButton.textContent = '🔄 Sync Now';
      }, 1500);
    });

    const logoutButton = document.createElement('button');

    logoutButton.textContent = '🚪 Sign Out';
    logoutButton.className = 'small-btn';

    logoutButton.addEventListener('click', signOut);

    actions.append(syncButton, logoutButton);

  } else {

    status.textContent =
      message ||
      '🔐 Sign in to synchronize your dispatcher office across devices.';

    const loginButton = document.createElement('button');

    loginButton.textContent = '🔐 Login';
    loginButton.className = 'primary';

    loginButton.addEventListener('click', showAuthModal);

    actions.append(loginButton);
  }
}


// ============================================================
// 🔐 LOGIN / SIGN-UP WINDOW
// ============================================================

function showAuthModal() {
  let modal = document.getElementById('dispatchAuthModal');

  if (modal) {
    modal.style.display = 'flex';
    return;
  }

  modal = document.createElement('div');

  modal.id = 'dispatchAuthModal';

  modal.style.cssText = `
    position:fixed;
    inset:0;
    z-index:9999;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    background:rgba(2,6,23,.8);
    backdrop-filter:blur(8px);
  `;

  modal.innerHTML = `

    <div
      style="
        width:100%;
        max-width:430px;
        border-radius:20px;
        padding:24px;
        background:#111827;
        border:1px solid rgba(148,163,184,.3);
        box-shadow:0 25px 70px rgba(0,0,0,.45);
        color:white;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:20px;
        "
      >

        <div>
          <div style="font-size:13px;opacity:.65">
            🚛 DISPATCH OPERATIONS TRACKER
          </div>

          <h2 style="margin:5px 0 0">
            DispatchOS Login
          </h2>
        </div>

        <button
          id="closeAuth"
          type="button"
          style="
            border:none;
            background:transparent;
            color:white;
            font-size:22px;
            cursor:pointer;
          "
        >
          ✕
        </button>

      </div>


      <label style="display:block;margin-top:22px">
        Email

        <input
          id="authEmail"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          style="
            width:100%;
            margin-top:7px;
            padding:12px;
            border-radius:10px;
            border:1px solid #475569;
            background:#0f172a;
            color:white;
            box-sizing:border-box;
          "
        />
      </label>


      <label style="display:block;margin-top:14px">
        Password

        <input
          id="authPassword"
          type="password"
          autocomplete="current-password"
          placeholder="Minimum 6 characters"
          style="
            width:100%;
            margin-top:7px;
            padding:12px;
            border-radius:10px;
            border:1px solid #475569;
            background:#0f172a;
            color:white;
            box-sizing:border-box;
          "
        />
      </label>


      <div
        id="authMessage"
        style="
          margin-top:14px;
          min-height:20px;
          font-size:13px;
          color:#fbbf24;
        "
      ></div>


      <button
        id="loginAccount"
        type="button"
        class="primary"
        style="
          width:100%;
          margin-top:10px;
          padding:12px;
        "
      >
        🔐 Login
      </button>


      <button
        id="createAccount"
        type="button"
        class="small-btn"
        style="
          width:100%;
          margin-top:10px;
          padding:12px;
        "
      >
        ✨ Create Account
      </button>


      <p
        style="
          font-size:12px;
          opacity:.6;
          margin-top:16px;
          line-height:1.5;
        "
      >
        Your trucks, loads, issues, cases, learning notes and
        performance data will be associated with your account.
      </p>

    </div>
  `;

  document.body.appendChild(modal);

  $('closeAuth').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  $('loginAccount').addEventListener('click', login);

  $('createAccount').addEventListener('click', createAccount);
}


// ============================================================
// ✨ CREATE ACCOUNT
// ============================================================

async function createAccount() {
  if (!supabaseClient) return;

  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;

  const message = $('authMessage');

  if (!email || !password) {
    message.textContent =
      '⚠️ Enter your email and password.';
    return;
  }

  if (password.length < 6) {
    message.textContent =
      '⚠️ Password must contain at least 6 characters.';
    return;
  }

  message.textContent =
    '⏳ Creating your DispatchOS account...';

  const { data, error } =
    await supabaseClient.auth.signUp({
      email,
      password
    });

  if (error) {
    message.textContent =
      '❌ ' + error.message;
    return;
  }

  if (data.session) {

    currentUser = data.user;

    message.textContent =
      '✅ Account created successfully.';

    await createCloudProfileIfNeeded();

    setTimeout(() => {
      $('dispatchAuthModal').style.display = 'none';
    }, 800);

  } else {

    message.textContent =
      '📧 Account created. Check your email for the confirmation link.';
  }
}


// ============================================================
// 🔐 LOGIN
// ============================================================

async function login() {
  if (!supabaseClient) return;

  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;

  const message = $('authMessage');

  if (!email || !password) {
    message.textContent =
      '⚠️ Enter your email and password.';
    return;
  }

  message.textContent = '⏳ Logging in...';

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    message.textContent =
      '❌ ' + error.message;
    return;
  }

  currentUser = data.user;

  message.textContent =
    '✅ Login successful. Loading your office...';

  await loadCloudState();

  updateAccountBar();

  setTimeout(() => {
    $('dispatchAuthModal').style.display = 'none';
  }, 600);
}


// ============================================================
// 🚪 SIGN OUT
// ============================================================

async function signOut() {
  if (!supabaseClient) return;

  await syncToCloud();

  await supabaseClient.auth.signOut();

  currentUser = null;

  state = {
    ...emptyState
  };

  saveLocalOnly();

  renderAll();

  updateAccountBar(
    '🔐 Signed out. Login again to access your cloud office.'
  );
}


// ============================================================
// 🔎 INITIAL AUTH CHECK
// ============================================================

async function initializeAuth() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session?.user) {

    currentUser = session.user;

    updateAccountBar(
      '⏳ Loading your cloud office...'
    );

    await loadCloudState();

  } else {

    currentUser = null;

    updateAccountBar();
  }


  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

      if (event === 'SIGNED_IN' && session?.user) {

        currentUser = session.user;

        await loadCloudState();

        updateAccountBar();

      }

      if (event === 'SIGNED_OUT') {

        currentUser = null;

        updateAccountBar();
      }
    }
  );
}


// ============================================================
// 💾 LOCAL STORAGE
// ============================================================

function loadLocalState() {
  try {

    return {
      ...emptyState,
      ...JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
      )
    };

  } catch {

    return {
      ...emptyState
    };
  }
}


function saveLocalOnly() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}


// ============================================================
// ☁️ CLOUD DATABASE
// ============================================================

async function createCloudProfileIfNeeded() {
  if (!currentUser || !supabaseClient) return;

  const { data, error } =
    await supabaseClient
      .from('dispatcher_profiles')
      .select('state')
      .eq('user_id', currentUser.id)
      .maybeSingle();

  if (error) {
    console.error(
      'Could not check cloud profile:',
      error
    );

    return;
  }

  if (!data) {

    const { error: insertError } =
      await supabaseClient
        .from('dispatcher_profiles')
        .insert({
          user_id: currentUser.id,
          state: state
        });

    if (insertError) {
      console.error(
        'Could not create cloud profile:',
        insertError
      );
    }
  }
}


async function loadCloudState() {
  if (
    !currentUser ||
    !supabaseClient ||
    isLoadingCloud
  ) return;

  isLoadingCloud = true;

  try {

    const { data, error } =
      await supabaseClient
        .from('dispatcher_profiles')
        .select('state')
        .eq('user_id', currentUser.id)
        .maybeSingle();


    if (error) {
      console.error(
        'Cloud loading error:',
        error
      );

      updateAccountBar(
        '⚠️ Cloud connection error. Local data remains available.'
      );

      return;
    }


    if (data?.state) {

      state = {
        ...emptyState,
        ...data.state
      };

      saveLocalOnly();

      renderAll();

      updateAccountBar(
        `🟢 Cloud synced as ${currentUser.email}`
      );

    } else {

      await createCloudProfileIfNeeded();

      await syncToCloud();

      updateAccountBar(
        `🟢 New cloud office created for ${currentUser.email}`
      );
    }

  } finally {

    isLoadingCloud = false;
  }
}


async function syncToCloud() {
  if (
    !cloudEnabled ||
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }

  const { error } =
    await supabaseClient
      .from('dispatcher_profiles')
      .upsert(
        {
          user_id: currentUser.id,
          state: state,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id'
        }
      );


  if (error) {

    console.error(
      'Cloud synchronization failed:',
      error
    );

    updateAccountBar(
      '⚠️ Cloud sync failed. Your data is still saved locally.'
    );

  } else {

    updateAccountBar(
      `🟢 Synced as ${currentUser.email}`
    );
  }
}


// ============================================================
// 💾 UNIVERSAL SAVE
// ============================================================

function save() {
  saveLocalOnly();

  updateStats();

  if (currentUser) {
    syncToCloud();
  }
}


function addXP(n) {
  state.xp = Math.max(
    0,
    state.xp + n
  );

  save();
}


// ============================================================
// 🗂️ TABS
// ============================================================

function setTab(id) {
  document
    .querySelectorAll('.tab')
    .forEach(button => {

      button.classList.toggle(
        'active',
        button.dataset.tab === id
      );

    });

  document
    .querySelectorAll('.panel')
    .forEach(panel => {

      panel.classList.toggle(
        'active-panel',
        panel.id === id
      );

    });
}


document
  .querySelectorAll('.tab')
  .forEach(button => {

    button.addEventListener(
      'click',
      () => setTab(button.dataset.tab)
    );

  });


// ============================================================
// 🟢 SHIFT
// ============================================================

$('shiftBtn').addEventListener(
  'click',
  () => {

    state.shift = !state.shift;

    save();

    renderShift();
  }
);


function renderShift() {

  $('shiftBtn').textContent =
    state.shift
      ? '🔴 End Shift'
      : '🟢 Start Shift';

  $('shiftState').textContent =
    state.shift
      ? '🟢 Live Shift'
      : '⚪ Off Shift';
}


// ============================================================
// 📊 STATISTICS
// ============================================================

function updateStats() {

  const activeLoads =
    state.loads.filter(
      load => load.status !== 'Delivered'
    ).length;


  const gross =
    state.loads.reduce(
      (total, load) =>
        total + Number(load.rate || 0),
      0
    );


  const openIssues =
    state.issues.filter(
      issue => !issue.solved
    ).length;


  const totalMiles =
    state.loads.reduce(
      (total, load) =>
        total + Number(load.miles || 0),
      0
    );


  $('xpTop').textContent =
    state.xp;


  $('streak').textContent =
    state.streak;


  $('statTrucks').textContent =
    state.trucks.length;


  $('statLoads').textContent =
    activeLoads;


  $('statGross').textContent =
    money(gross);


  $('statIssues').textContent =
    openIssues;


  $('missionDone').textContent =
    state.missions.filter(
      mission => mission.done
    ).length;


  $('missionTotal').textContent =
    state.missions.length;


  $('reviewXp').textContent =
    state.xp;


  $('reviewLoads').textContent =
    state.loads.length;


  $('reviewGross').textContent =
    money(gross);


  $('reviewRpm').textContent =
    totalMiles
      ? '$' + (gross / totalMiles).toFixed(2)
      : '$0.00';


  $('reviewCases').textContent =
    state.cases.length;


  $('reviewLearning').textContent =
    state.learning.length;


  $('reviewSolved').textContent =
    state.issues.filter(
      issue => issue.solved
    ).length;


  renderAttention();
}


// ============================================================
// EMPTY MESSAGE
// ============================================================

function empty(box, text) {
  box.innerHTML =
    `<div class="item meta">${text}</div>`;
}


// ============================================================
// 🎯 DAILY MISSIONS
// ============================================================

function renderMissions() {

  const box = $('missionList');

  box.innerHTML = '';


  if (!state.missions.length) {

    empty(
      box,
      'No missions yet. Add 3–6 important goals for today.'
    );

    return;
  }


  state.missions.forEach(
    (mission, index) => {

      const element =
        document.createElement('div');

      element.className =
        'item item-row';


      element.innerHTML = `
        <label
          style="
            display:flex;
            align-items:center;
            gap:10px;
            margin:0;
            flex:1;
            color:inherit;
          "
        >

          <input
            type="checkbox"
            style="width:auto"
            ${mission.done ? 'checked' : ''}
          >

          <span
            ${
              mission.done
                ? 'style="text-decoration:line-through;opacity:.6"'
                : ''
            }
          >
            ${escapeHtml(mission.text)}
          </span>

        </label>

        <button class="small-btn">
          🗑️
        </button>
      `;


      element
        .querySelector('input')
        .addEventListener(
          'change',
          event => {

            mission.done =
              event.target.checked;


            addXP(
              event.target.checked
                ? 10
                : -10
            );


            renderMissions();
          }
        );


      element
        .querySelector('button')
        .addEventListener(
          'click',
          () => {

            if (mission.done) {
              state.xp =
                Math.max(
                  0,
                  state.xp - 10
                );
            }


            state.missions.splice(
              index,
              1
            );


            save();

            renderMissions();
          }
        );


      box.appendChild(element);
    }
  );
}


$('missionForm').addEventListener(
  'submit',
  event => {

    event.preventDefault();

    const text =
      $('missionText').value.trim();

    if (!text) return;


    state.missions.push({
      text,
      done: false
    });


    $('missionText').value = '';

    save();

    renderMissions();
  }
);


// ============================================================
// 🚚 FLEET
// ============================================================

function renderTrucks() {

  const box =
    $('truckList');

  box.innerHTML = '';


  if (!state.trucks.length) {

    empty(
      box,
      '🚚 No trucks added yet.'
    );

    return;
  }


  state.trucks.forEach(
    (truck, index) => {

      const element =
        document.createElement('article');

      element.className = 'card';


      element.innerHTML = `

        <div class="item-row">

          <div>

            <b>
              🚛 Truck ${escapeHtml(truck.no)}
            </b>

            <div class="meta">
              ${escapeHtml(truck.driver)}
              ·
              ${escapeHtml(truck.equipment)}
            </div>

            <div class="meta">
              📍
              ${escapeHtml(
                truck.loc ||
                'Location not set'
              )}
            </div>

          </div>

          <button class="small-btn">
            Remove
          </button>

        </div>
      `;


      element
        .querySelector('button')
        .addEventListener(
          'click',
          () => {

            state.trucks.splice(
              index,
              1
            );

            save();

            renderTrucks();
          }
        );


      box.appendChild(element);
    }
  );
}


$('truckForm').addEventListener(
  'submit',
  event => {

    event.preventDefault();


    state.trucks.push({

      no:
        $('truckNo').value.trim(),

      driver:
        $('driverName').value.trim(),

      equipment:
        $('equipment').value,

      loc:
        $('truckLoc').value.trim()

    });


    event.target.reset();

    addXP(5);

    renderTrucks();
  }
);


// ============================================================
// 📦 LOADS
// ============================================================

function renderLoads() {

  const box =
    $('loadList');

  box.innerHTML = '';


  if (!state.loads.length) {

    empty(
      box,
      '📦 No loads recorded yet.'
    );

    return;
  }


  state.loads.forEach(
    (load, index) => {

      const element =
        document.createElement('div');

      element.className =
        'item';


      element.innerHTML = `

        <div class="item-row">

          <div>

            <b>
              📦 Truck ${escapeHtml(load.truck)}
              ·
              ${escapeHtml(load.origin)}
              →
              ${escapeHtml(load.destination)}
            </b>

            <div class="meta">

              ${escapeHtml(load.broker)}
              ·
              ${escapeHtml(load.source)}
              ·
              ${money(load.rate)}

              ${
                load.miles
                  ? ` · ${load.miles} mi · $${(
                      load.rate / load.miles
                    ).toFixed(2)}/mi`
                  : ''
              }

            </div>

          </div>


          <select
            class="status"
            style="width:auto"
          >

            <option>Booked</option>

            <option>At Pickup</option>

            <option>In Transit</option>

            <option>At Delivery</option>

            <option>Delivered</option>

          </select>

        </div>


        <div style="margin-top:10px">

          <button
            class="small-btn remove"
          >
            Remove
          </button>

        </div>
      `;


      const select =
        element.querySelector('.status');


      select.value =
        load.status;


      select.addEventListener(
        'change',
        () => {

          if (
            select.value === 'Delivered' &&
            load.status !== 'Delivered'
          ) {
            state.xp += 20;
          }


          load.status =
            select.value;


          save();

          renderLoads();
        }
      );


      element
        .querySelector('.remove')
        .addEventListener(
          'click',
          () => {

            state.loads.splice(
              index,
              1
            );

            save();

            renderLoads();
          }
        );


      box.appendChild(element);
    }
  );
}


$('loadForm').addEventListener(
  'submit',
  event => {

    event.preventDefault();


    state.loads.push({

      truck:
        $('loadTruck').value.trim(),

      broker:
        $('loadBroker').value.trim(),

      rate:
        Number(
          $('loadRate').value || 0
        ),

      origin:
        $('origin').value.trim(),

      destination:
        $('destination').value.trim(),

      miles:
        Number(
          $('miles').value || 0
        ),

      status:
        $('loadStatus').value,

      source:
        $('source').value

    });


    event.target.reset();

    addXP(10);

    renderLoads();
  }
);


// ============================================================
// 🚨 ISSUES
// ============================================================

function renderIssues() {

  const box =
    $('issueList');

  box.innerHTML = '';


  if (!state.issues.length) {

    empty(
      box,
      '✅ No issues recorded.'
    );

    return;
  }


  state.issues.forEach(
    (issue, index) => {

      const element =
        document.createElement('div');

      element.className =
        'item';


      element.innerHTML = `

        <div class="item-row">

          <div>

            <b>

              ${
                issue.solved
                  ? '✅'
                  : '🚨'
              }

              ${escapeHtml(issue.title)}

            </b>


            <div class="meta">

              ${escapeHtml(issue.type)}
              ·
              ${escapeHtml(issue.priority)}

            </div>


            <div class="meta">

              ${escapeHtml(
                issue.details ||
                'No details'
              )}

            </div>

          </div>


          <div>

            <button
              class="small-btn toggle"
            >

              ${
                issue.solved
                  ? '↩️ Reopen'
                  : '✅ Resolve'
              }

            </button>


            <button
              class="small-btn remove"
            >
              Remove
            </button>

          </div>

        </div>
      `;


      element
        .querySelector('.toggle')
        .addEventListener(
          'click',
          () => {

            issue.solved =
              !issue.solved;


            state.xp =
              Math.max(
                0,
                state.xp +
                (
                  issue.solved
                    ? 20
                    : -20
                )
              );


            save();

            renderIssues();
          }
        );


      element
        .querySelector('.remove')
        .addEventListener(
          'click',
          () => {

            state.issues.splice(
              index,
              1
            );

            save();

            renderIssues();
          }
        );


      box.appendChild(element);
    }
  );
}


$('issueForm').addEventListener(
  'submit',
  event => {

    event.preventDefault();


    state.issues.push({

      title:
        $('issueTitle').value.trim(),

      type:
        $('issueType').value,

      priority:
        $('issuePriority').value,

      details:
        $('issueDetails').value.trim(),

      solved: false

    });


    event.target.reset();

    save();

    renderIssues();
  }
);


// ============================================================
// 🧠 CASE LIBRARY
// ============================================================

function renderCases(filter = '') {

  const box =
    $('caseList');

  const query =
    filter.toLowerCase();


  box.innerHTML = '';


  const list =
    state.cases.filter(
      item =>
        `
          ${item.problem}
          ${item.category}
          ${item.solution}
          ${item.lesson}
        `
          .toLowerCase()
          .includes(query)
    );


  if (!list.length) {

    empty(
      box,
      '🧠 No matching cases yet.'
    );

    return;
  }


  list.forEach(caseItem => {

    const element =
      document.createElement('div');

    element.className =
      'item';


    element.innerHTML = `

      <b>
        🧩 ${escapeHtml(caseItem.problem)}
      </b>

      <div class="meta">
        ${escapeHtml(
          caseItem.category ||
          'General'
        )}
      </div>

      <p>

        <b>✅ Solution:</b>

        ${escapeHtml(
          caseItem.solution
        )}

      </p>

      <p>

        <b>💡 Next time:</b>

        ${escapeHtml(
          caseItem.lesson ||
          'No prevention note'
        )}

      </p>
    `;


    box.appendChild(element);
  });
}


$('caseForm').addEventListener(
  'submit',
  event => {

    event.preventDefault();


    state.cases.unshift({

      problem:
        $('caseProblem').value.trim(),

      category:
        $('caseCategory').value.trim(),

      solution:
        $('caseSolution').value.trim(),

      lesson:
        $('caseLesson').value.trim()

    });


    event.target.reset();

    addXP(25);

    renderCases(
      $('caseSearch').value
    );
  }
);


$('caseSearch').addEventListener(
  'input',
  event =>
    renderCases(
      event.target.value
    )
);


// ============================================================
// 🎓 LEARNING
// ============================================================

function renderLearning() {

  const box =
    $('learningList');

  box.innerHTML = '';


  if (!state.learning.length) {

    empty(
      box,
      '🎓 No learning entries yet.'
    );

    return;
  }


  state.learning.forEach(
    learningItem => {

      const element =
        document.createElement('div');

      element.className =
        'item';


      element.innerHTML = `

        <b>
          🎓
          ${escapeHtml(
            learningItem.topic
          )}
        </b>


        <div class="meta">

          ${escapeHtml(
            learningItem.source ||
            'Personal learning'
          )}

        </div>


        <p>

          📘
          ${escapeHtml(
            learningItem.note
          )}

        </p>


        <p>

          ${
            learningItem.question

              ? '❓ ' +
                escapeHtml(
                  learningItem.question
                )

              : '✅ No open question recorded.'
          }

        </p>
      `;


      box.appendChild(element);
    }
  );
}


$('learningForm').addEventListener(
  'submit',
  event => {

    event.preventDefault();


    state.learning.unshift({

      topic:
        $('learnTopic').value.trim(),

      source:
        $('learnSource').value.trim(),

      note:
        $('learnNote').value.trim(),

      question:
        $('learnQuestion').value.trim()

    });


    event.target.reset();

    addXP(15);

    renderLearning();
  }
);


// ============================================================
// 📍 ATTENTION BOARD
// ============================================================

function renderAttention() {

  const box =
    $('attentionBoard');

  if (!box) return;


  box.innerHTML = '';


  const openProblems =
    state.issues.filter(
      issue => !issue.solved
    ).length;


  const activeLoads =
    state.loads.filter(
      load =>
        load.status !== 'Delivered'
    ).length;


  const trucksToCover =
    Math.max(
      0,
      state.trucks.length -
      activeLoads
    );


  const cards = [

    [
      '🚨 Open Problems',
      openProblems,
      'Resolve critical issues first.'
    ],

    [
      '🚚 Trucks To Cover',
      trucksToCover,
      'Keep equipment moving.'
    ],

    [
      '🎓 Knowledge Entries',
      state.cases.length +
      state.learning.length,
      'Build your personal playbook.'
    ]

  ];


  cards.forEach(
    ([title, number, text]) => {

      const element =
        document.createElement('div');

      element.className =
        'item';


      element.innerHTML = `

        <b>
          ${title}: ${number}
        </b>

        <div class="meta">
          ${text}
        </div>
      `;


      box.appendChild(element);
    }
  );
}


// ============================================================
// 🏆 END OF DAY
// ============================================================

$('finishBtn').addEventListener(
  'click',
  () => {

    const total =
      state.missions.length;


    const done =
      state.missions.filter(
        mission => mission.done
      ).length;


    const missionRate =
      total
        ? done / total
        : 0;


    const score =
      Math.round(

        45 * missionRate +

        20 *
        Math.min(
          1,
          state.loads.length / 3
        ) +

        15 *
        Math.min(
          1,
          state.issues.filter(
            issue => issue.solved
          ).length / 2
        ) +

        20 *
        Math.min(
          1,
          (
            state.cases.length +
            state.learning.length
          ) / 2
        )

      );


    const grade =
      score >= 90 ? 'S' :
      score >= 80 ? 'A' :
      score >= 70 ? 'B' :
      score >= 60 ? 'C' :
      score >= 45 ? 'D' :
      'F';


    state.journal.unshift({

      date:
        new Date().toISOString(),

      win:
        $('dayWin').value.trim(),

      mistake:
        $('dayMistake').value.trim(),

      improve:
        $('dayImprove').value.trim(),

      score,

      grade

    });


    state.xp +=
      grade === 'S'
        ? 40
        : grade === 'A'
        ? 30
        : grade === 'B'
        ? 20
        : 10;


    save();


    $('gradeBox').textContent =

      `🏆 Daily Grade: ${grade} · ${score}/100. ` +

      `Missions ${done}/${total}. ` +

      (
        grade === 'S' ||
        grade === 'A'

          ? 'Excellent operational discipline.'

          : grade === 'B'

          ? 'Solid day. Keep improving documentation and completion rate.'

          : 'Review unfinished work and set one clear improvement for tomorrow.'
      );
  }
);


// ============================================================
// 🛡️ SAFE HTML
// ============================================================

function escapeHtml(value) {

  return String(
    value ?? ''
  ).replace(

    /[&<>'"]/g,

    character => ({

      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'

    }[character])

  );
}


// ============================================================
// 🔄 RENDER EVERYTHING
// ============================================================

function renderAll() {

  renderShift();

  renderMissions();

  renderTrucks();

  renderLoads();

  renderIssues();

  renderCases();

  renderLearning();

  updateStats();
}


// ============================================================
// 🚀 START DISPATCHOS
// ============================================================

renderAll();

setupSupabase();
