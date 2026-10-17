// Opt-in sync layer. Local-only remains the default; nothing here runs
// until the user signs in from the sync panel.

const Sync = (() => {
  let client = null;
  let signedInEmail = null;

  const SYNC_TOMBSTONES = "sync_tombstones";
  const SYNC_STATE = "sync_state";

  function getClient() {
    if (!client) {
      if (
        typeof SUPABASE_URL !== "string" ||
        typeof SUPABASE_ANON_KEY !== "string" ||
        SUPABASE_URL.indexOf("PASTE_YOUR") === 0 ||
        SUPABASE_ANON_KEY.indexOf("PASTE_YOUR") === 0
      ) {
        console.warn("Sync is not configured (js/sync-config.js).");
        return null;
      }
      if (window.supabase) {
        client = window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_ANON_KEY,
        );
      }
    }
    return client;
  }

  async function getSetting(key) {
    return localStorage.getItem(key);
  }

  async function setSetting(key, value) {
    localStorage.setItem(key, value);
  }

  async function ensureTombstoneStore() {
    try {
      localStorage.getItem(SYNC_TOMBSTONES);
    } catch (e) {
      localStorage.setItem(SYNC_TOMBSTONES, "[]");
    }
  }

  function getTombstones() {
    ensureTombstoneStore();
    try {
      return JSON.parse(localStorage.getItem(SYNC_TOMBSTONES) || "[]");
    } catch (e) {
      return [];
    }
  }

  function addTombstone(timestamp) {
    const tombstones = getTombstones();
    if (tombstones.indexOf(timestamp) === -1) {
      tombstones.push(timestamp);
      localStorage.setItem(SYNC_TOMBSTONES, JSON.stringify(tombstones));
    }
  }

  async function clearTombstones() {
    localStorage.removeItem(SYNC_TOMBSTONES);
  }

  function isSignedIn() {
    return signedInEmail !== null;
  }

  function onAuthChange(session) {
    signedInEmail = session && session.user ? session.user.email : null;
    updateSyncUI();
    if (signedInEmail) {
      syncNow();
    }
  }

  async function init() {
    const c = getClient();
    if (!c) {
      updateSyncUI();
      return;
    }
    const { data } = await c.auth.getSession();
    onAuthChange(data && data.session ? data.session : null);
    c.auth.onAuthStateChange((_event, session) => {
      onAuthChange(session);
    });
  }

  async function requestMagicLink(email) {
    const c = getClient();
    if (!c) return { error: "Sync is not configured." };
    const { error } = await c.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return error ? { error: error.message } : {};
  }

  async function signOut() {
    const c = getClient();
    if (c) {
      await c.auth.signOut();
      signedInEmail = null;
      updateSyncUI();
    }
  }

  async function syncNow() {
    const c = getClient();
    if (!c || !signedInEmail) return;

    try {
      await pushLocalEntries(c);
      await pullRemoteEntries(c);
      await pushDeletes(c);
      await pullDeletes(c);
      await setSetting(SYNC_STATE, new Date().toISOString());
      updateSyncUI();
    } catch (error) {
      console.error("Sync failed:", error);
      updateSyncUI();
    }
  }

  function rowFromItem(item) {
    return {
      id: item.timestamp,
      tag: item.tag || "",
      mood: item.mood,
      text: item.text,
      updated_at: new Date(item.timestamp).toISOString(),
      deleted_at: null,
    };
  }

  async function pushLocalEntries(c) {
    const items = await db.thoughts.toArray();
    if (items.length === 0) return;

    const rows = items.map(rowFromItem);
    const { error } = await c
      .from("entries")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: false });
    if (error) throw error;
  }

  async function pullRemoteEntries(c) {
    const { data, error } = await c
      .from("entries")
      .select("id, tag, mood, text, updated_at")
      .is("deleted_at", null);
    if (error) throw error;
    if (!data || data.length === 0) return;

    const localTimestamps = new Set(
      (await db.thoughts.toArray()).map((i) => i.timestamp),
    );

    const toInsert = data
      .filter((row) => !localTimestamps.has(row.id))
      .map((row) => ({
        timestamp: row.id,
        tag: row.tag || "",
        mood: row.mood,
        text: row.text,
      }));

    if (toInsert.length > 0) {
      await db.thoughts.bulkAdd(toInsert);
      getAndDisplayThoughts();
    }
  }

  async function pushDeletes(c) {
    const tombstones = getTombstones();
    if (tombstones.length === 0) return;

    const { error } = await c
      .from("entries")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", tombstones);
    if (error) throw error;

    await clearTombstones();
  }

  async function pullDeletes(c) {
    const { data, error } = await c
      .from("entries")
      .select("id")
      .not("deleted_at", "is", null);
    if (error) throw error;
    if (!data || data.length === 0) return;

    const ids = data.map((row) => row.id);
    await db.thoughts.bulkDelete(ids);
    await getAndDisplayThoughts();
  }

  function onEntryAdded(timestamp) {
    addTombstoneRemoval(timestamp);
    if (isSignedIn()) syncNow();
  }

  function addTombstoneRemoval(timestamp) {
    const tombstones = getTombstones();
    const idx = tombstones.indexOf(timestamp);
    if (idx !== -1) {
      tombstones.splice(idx, 1);
      localStorage.setItem(SYNC_TOMBSTONES, JSON.stringify(tombstones));
    }
  }

  function onEntryDeleted(timestamp) {
    addTombstone(timestamp);
    if (isSignedIn()) syncNow();
  }

  async function getLastSyncTime() {
    return getSetting(SYNC_STATE);
  }

  function updateSyncUI() {
    const panel = document.getElementById("syncPanel");
    if (!panel) return;

    const signedInSection = document.getElementById("syncSignedIn");
    const signInSection = document.getElementById("syncSignIn");
    if (!signedInSection || !signInSection) return;

    if (isSignedIn()) {
      signedInSection.style.display = "block";
      signInSection.style.display = "none";
      const emailLabel = document.getElementById("syncEmail");
      if (emailLabel) emailLabel.textContent = signedInEmail;
      getLastSyncTime().then((t) => {
        const lastSyncLabel = document.getElementById("syncLastTime");
        if (lastSyncLabel && t) {
          lastSyncLabel.textContent = new Date(t).toLocaleString();
        }
      });
    } else {
      signedInSection.style.display = "none";
      signInSection.style.display = "block";
    }
  }

  return {
    init,
    syncNow,
    requestMagicLink,
    signOut,
    isSignedIn,
    onEntryAdded,
    onEntryDeleted,
  };
})();

window.Sync = Sync;

if (typeof module !== "undefined" && module.exports) {
  module.exports = Sync;
}
