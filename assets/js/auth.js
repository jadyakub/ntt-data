<script>
// === auth.js ===
const SESSION_KEY = "nff.session";

export function getUser(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function login({username, role, next}){
  const payload = { username: (username||"user").trim(), role: role||"Tech", ts: Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  location.href = next || "index.html";
}

export function logout(){
  localStorage.removeItem(SESSION_KEY);
  location.href = "login.html";
}

export function hasRole(...roles){
  const u = getUser();
  return !!u && roles.includes(u.role);
}

/** Protect a page. Example:
    requireAuth();                       // any logged-in user
    requireAuth(["Admin","CM Team"]);    // only Admin & CM Team
*/
export function requireAuth(allowedRoles=null){
  const u = getUser();
  if(!u){
    const next = encodeURIComponent(location.pathname.replace(/^\//,""));
    location.href = `login.html?next=${next}`;
    return;
  }
  if(Array.isArray(allowedRoles) && allowedRoles.length && !allowedRoles.includes(u.role)){
    location.href = "index.html?denied=1";
  }
}

/** Auto-hide elements that have data-roles="Admin,CM Team" etc */
export function applyRoleVisibility(){
  const u = getUser();
  document.querySelectorAll("[data-roles]").forEach(el=>{
    const roles = (el.dataset.roles||"").split(",").map(s=>s.trim()).filter(Boolean);
    if(!u || (roles.length && !roles.includes(u.role))) el.remove();
  });
  if(u){
    const nameEl = document.querySelector("[data-user-name]");
    const roleEl = document.querySelector("[data-user-role]");
    if(nameEl) nameEl.textContent = u.username;
    if(roleEl) roleEl.textContent = u.role;
  }
}

// Wire up any [data-logout] button
export function bindLogout(){
  const btn = document.querySelector("[data-logout]");
  if(btn) btn.addEventListener("click", e=>{ e.preventDefault(); logout(); });
}

document.addEventListener("DOMContentLoaded", ()=>{
  // Optional: show toast if denied
  if(new URLSearchParams(location.search).get("denied")==="1"){
    console.warn("Access denied for this role.");
  }
});
</script>
