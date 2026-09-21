const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='100%' height='100%' fill='#f0e8e0'/><text x='50%' y='50%' font-size='20' fill='#c9b8a8' text-anchor='middle' dy='.3em'>petsath.com</text></svg>`
  );

function renderLayout() {
  const page = document.body.getAttribute("data-page") || "";
  const user = api.getUser();

  const header = document.getElementById("site-header");
  if (header) {
    header.innerHTML = `
      <div class="header-inner">
        <a href="index.html" class="logo">🐾 pets<span>ath.com</span></a>
        <button class="hamburger" id="hamburgerBtn">&#9776;</button>
        <nav class="main-nav" id="mainNav">
          <ul>
            <li><a href="index.html" class="${page === "home" ? "active" : ""}">Home</a></li>
            <li><a href="gallery.html" class="${page === "gallery" ? "active" : ""}">Gallery</a></li>
            <li><a href="help.html" class="${page === "help" ? "active" : ""}">Help</a></li>
            <li><a href="contact.html" class="${page === "contact" ? "active" : ""}">Contact</a></li>
            ${user ? `<li><a href="profile.html" class="${page === "profile" ? "active" : ""}">Profile</a></li>` : ""}
            ${user && user.role === "admin" ? `<li><a href="admin.html" class="${page === "admin" ? "active" : ""}">Admin Panel</a></li>` : ""}
          </ul>
        </nav>
        <div class="nav-actions">
          ${
            user
              ? `<span style="font-weight:600;font-size:14px;">Hi, ${escapeHtml(user.name.split(" ")[0])}</span>
                 <button class="btn btn-outline btn-small" id="logoutBtn">Logout</button>`
              : `<a href="login.html" class="btn btn-outline btn-small">Login</a>
                 <a href="register.html" class="btn btn-primary btn-small">Register</a>`
          }
        </div>
      </div>
    `;
    const hamburger = document.getElementById("hamburgerBtn");
    const nav = document.getElementById("mainNav");
    if (hamburger) hamburger.addEventListener("click", () => nav.classList.toggle("open"));
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn)
      logoutBtn.addEventListener("click", () => {
        api.clearSession();
        window.location.href = "index.html";
      });
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-col">
          <h4>🐾 petsath.com</h4>
          <p style="font-size:14px;color:#b8b0a8;max-width:260px;">
            Connecting loving homes with pets that need one. Register, list, adopt.
          </p>
        </div>
        <div class="footer-col">
          <h4>Explore</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="gallery.html">Pet Gallery</a></li>
            <li><a href="help.html">Help / FAQ</a></li>
            <li><a href="contact.html">Contact Us</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Account</h4>
          <ul>
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Register</a></li>
            <li><a href="profile.html">My Profile</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <ul>
            <li>Email: hello@petsath.com</li>
            <li>Mon - Sat, 9am - 6pm</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">&copy; ${new Date().getFullYear()} petsath.com — All rights reserved.</div>
    `;
  }
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function requireLogin(redirectTo = "login.html") {
  if (!api.getToken()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

function showAlert(container, message, type = "error") {
  container.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

document.addEventListener("DOMContentLoaded", renderLayout);
