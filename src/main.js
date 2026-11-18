import "./styles.css";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const DEMO_SERVICES = [
  { id: "bridal-hd", name: "Bridal HD Makeup", category: "Makeup", price: 4999, duration: "3 hours", description: "Complete HD bridal look", icon: "💄" },
  { id: "party-makeup", name: "Party Glam Makeup", category: "Makeup", price: 1499, duration: "90 min", description: "Soft glam for every occasion", icon: "✨" },
  { id: "gold-facial", name: "Gold Glow Facial", category: "Facial", price: 999, duration: "60 min", description: "Radiance-boosting gold facial", icon: "🌟" },
  { id: "fruit-facial", name: "Fruit Glow Facial", category: "Facial", price: 799, duration: "45 min", description: "Fresh and natural glow", icon: "🍊" },
  { id: "full-wax", name: "Full Arms & Legs Wax", category: "Waxing", price: 1299, duration: "75 min", description: "Smooth, hygienic full waxing", icon: "🌸" },
  { id: "hair-styling", name: "Hair Styling", category: "Hair", price: 699, duration: "45 min", description: "Curls, straighten or party style", icon: "💇" }
];

const STATUS_LABELS = { pending: "Pending", confirmed: "Confirmed", completed: "Completed" };
let state = {
  tab: "services",
  category: "All",
  selectedService: null,
  step: "slot",
  date: nextDate(),
  time: "12:00 PM",
  bookingPhone: "",
  adminLoggedIn: false,
  bookingStatusFilter: "all",
  bookingError: "",
  adminError: "",
  adminLoginError: ""
};

function nextDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem("glowathome_bookings") || "[]");
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem("glowathome_bookings", JSON.stringify(bookings));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function syncBookingToCloud(booking) {
  if (!supabase) return;
  const { error } = await supabase.from("bookings").insert(booking);
  if (error) throw error;
}

async function syncStatusToCloud(id, status) {
  if (!supabase) return;
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw error;
}

async function syncBookingsFromCloud() {
  if (!supabase) return;
  if (state.adminLoggedIn) {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: true });
    if (error) {
      state.adminError = `Supabase error${error.code ? ` (${error.code})` : ""}: ${error.message}`;
      console.error("Cloud booking fetch failed:", error);
      render();
    } else if (data) {
      state.adminError = "";
      saveBookings(data);
      render();
    }
  }
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00`));
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `+91${digits}` : value;
}

async function createBooking(form) {
  const booking = {
    id: `GAH-${Date.now().toString().slice(-6)}`,
    service_id: state.selectedService.id,
    service_name: state.selectedService.name,
    price: state.selectedService.price,
    customer_name: form.fullName.value.trim(),
    phone: form.phone.value.replace(/\D/g, ""),
    address: form.address.value.trim(),
    landmark: form.landmark.value.trim(),
    booking_date: state.date,
    booking_time: state.time,
    payment_method: form.payment.value,
    status: "pending",
    created_at: new Date().toISOString()
  };
  state.bookingError = "";
  if (supabase) {
    try {
      await syncBookingToCloud(booking);
    } catch (error) {
      console.error("Cloud booking sync failed:", error);
      state.bookingError = "We couldn't send your booking. Please check your connection and try again.";
      render();
      return;
    }
  }
  const bookings = getBookings();
  bookings.unshift(booking);
  saveBookings(bookings);
  state.bookingPhone = booking.phone;
  state.step = "confirmation";
  state.tab = "bookings";
  render();
}

function appHeader() {
  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Salon at your doorstep</p>
        <h1>Glow<span>AtHome</span></h1>
      </div>
      <button class="header-icon" aria-label="Install app" title="Install app" id="installButton">↓</button>
    </header>`;
}

function bottomNav() {
  return `
    <nav class="bottom-nav" aria-label="Primary navigation">
      <button class="${state.tab === "services" ? "active" : ""}" data-nav="services">
        <span class="nav-icon">⌂</span><span>Services</span>
      </button>
      <button class="${state.tab === "bookings" ? "active" : ""}" data-nav="bookings">
        <span class="nav-icon">▦</span><span>My Bookings</span>
      </button>
      <button class="${state.tab === "admin" ? "active" : ""}" data-nav="admin">
        <span class="nav-icon">♚</span><span>Admin</span>
      </button>
    </nav>`;
}

function servicesView() {
  if (state.selectedService) return bookingFlow();
  const categories = ["All", ...new Set(DEMO_SERVICES.map((service) => service.category))];
  const services = state.category === "All"
    ? DEMO_SERVICES
    : DEMO_SERVICES.filter((service) => service.category === state.category);

  return `
    ${appHeader()}
    <main class="content">
      <button class="install-banner" id="installBanner">
        <span class="install-symbol">↓</span>
        <span><strong>Install GlowAtHome</strong><small>Add to Home Screen</small></span>
        <span class="install-arrow">›</span>
      </button>
      ${supabase ? "" : `<p class="demo-notice">Demo mode: bookings stay on this device until Supabase is configured.</p>`}
      <div class="section-heading">
        <div><p class="eyebrow">Our services</p><h2>Choose your glow</h2></div>
        <span class="location">New Delhi <b>⌄</b></span>
      </div>
      <div class="category-list" role="tablist">
        ${categories.map((category) => `
          <button role="tab" aria-selected="${state.category === category}" class="${state.category === category ? "active" : ""}" data-category="${category}">
            ${category}
          </button>`).join("")}
      </div>
      <div class="service-grid">
        ${services.map((service) => `
          <article class="service-card">
            <div class="service-art ${service.category.toLowerCase()}">${service.icon}</div>
            <div class="service-info">
              <span class="duration">${service.duration}</span>
              <h3>${service.name}</h3>
              <p>${service.description}</p>
              <div class="service-footer">
                <strong>₹${service.price.toLocaleString("en-IN")}</strong>
                <button data-book="${service.id}">Book <span>›</span></button>
              </div>
            </div>
          </article>`).join("")}
      </div>
    </main>
    ${bottomNav()}
  `;
}

function bookingFlow() {
  const service = state.selectedService;
  return `
    ${appHeader()}
    <main class="content booking-flow">
      <button class="back-button" id="backToServices">‹ <span>Back to services</span></button>
      <div class="booking-progress">
        <div class="${state.step === "slot" ? "active" : "done"}"><b>1</b><span>Date & Time</span></div>
        <i></i>
        <div class="${state.step === "details" ? "active" : state.step === "confirmation" ? "done" : ""}"><b>2</b><span>Visit Details</span></div>
      </div>
      ${state.step === "slot" ? slotView(service) : detailsView(service)}
    </main>
  `;
}

function slotView(service) {
  const dates = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return date.toISOString().slice(0, 10);
  });
  const times = ["10:00 AM", "12:00 PM", "02:30 PM", "05:00 PM"];
  return `
    <section class="flow-card">
      <div class="selected-service">
        <div class="mini-art">${service.icon}</div>
        <div><p>Selected service</p><h2>${service.name}</h2></div>
        <strong>₹${service.price.toLocaleString("en-IN")}</strong>
      </div>
      <h3>Select a date</h3>
      <div class="date-list">
        ${dates.map((date) => {
          const d = new Date(`${date}T12:00:00`);
          const day = d.toLocaleDateString("en-IN", { weekday: "short" });
          const number = d.getDate();
          return `<button class="${state.date === date ? "active" : ""}" data-date="${date}">
            <span>${day}</span><strong>${number}</strong><small>${d.toLocaleDateString("en-IN", { month: "short" })}</small>
          </button>`;
        }).join("")}
      </div>
      <h3>Select a time slot</h3>
      <div class="time-list">
        ${times.map((time) => `<button class="${state.time === time ? "active" : ""}" data-time="${time}">${time}</button>`).join("")}
      </div>
      <button class="primary-button" id="nextDetails">Continue to address <span>→</span></button>
    </section>`;
}

function detailsView(service) {
  return `
    <section class="flow-card">
      <div class="visit-summary">
        <span>${formatDate(state.date)}</span><b>•</b><span>${state.time}</span>
      </div>
      <form id="bookingForm" class="booking-form">
        <label>Full name *
          <input name="fullName" required placeholder="Enter your full name" autocomplete="name" />
        </label>
        <label>Mobile / WhatsApp *
          <div class="phone-input"><span>+91</span><input name="phone" required minlength="10" maxlength="10" inputmode="numeric" pattern="[0-9]{10}" placeholder="98765 43210" autocomplete="tel" /></div>
        </label>
        <label>House / Street address *
          <textarea name="address" required rows="2" placeholder="House no., street, area" autocomplete="street-address"></textarea>
        </label>
        <label>Nearby landmark *
          <input name="landmark" required placeholder="e.g. Near Metro Gate 2" />
        </label>
        ${state.bookingError ? `<p class="form-error" role="alert">${state.bookingError}</p>` : ""}
        <fieldset>
          <legend>Payment method</legend>
          <label class="radio-card"><input type="radio" name="payment" value="UPI" checked /><span>UPI</span></label>
          <label class="radio-card"><input type="radio" name="payment" value="Cash" /><span>Cash</span></label>
        </fieldset>
        <button class="primary-button" type="submit">Confirm appointment <span>→</span></button>
      </form>
    </section>`;
}

function bookingsView() {
  const bookings = getBookings().filter((booking) =>
    !state.bookingPhone || booking.phone === state.bookingPhone
  );
  return `
    ${appHeader()}
    <main class="content">
      <div class="section-heading booking-heading">
        <div><p class="eyebrow">My appointments</p><h2>Your bookings</h2></div>
      </div>
      <form class="tracking-search" id="trackingSearch">
        <span>+91</span>
        <input name="phone" maxlength="10" inputmode="numeric" placeholder="Enter 10-digit mobile number" value="${state.bookingPhone}" />
        <button aria-label="Search">⌕</button>
      </form>
      ${bookings.length ? `
        <div class="booking-list">
          ${bookings.map((booking) => `
            <article class="booking-card">
              <div class="booking-card-top">
                <div class="booking-service-icon">${DEMO_SERVICES.find((s) => s.id === booking.service_id)?.icon || "✨"}</div>
                <div><p>${booking.id}</p><h3>${booking.service_name}</h3></div>
                <strong>₹${booking.price.toLocaleString("en-IN")}</strong>
              </div>
              <div class="booking-meta">
                <span>📅 ${formatDate(booking.booking_date)}</span>
                <span>◷ ${booking.booking_time}</span>
              </div>
              <div class="status-row">
                <span>Status</span>
                <b class="status ${booking.status}">${STATUS_LABELS[booking.status]}</b>
              </div>
              ${state.step === "confirmation" && bookings[0].id === booking.id ? `
                <div class="confirmation-note"><span>✓</span><div><strong>Booking request sent!</strong><small>We will confirm your appointment shortly.</small></div></div>` : ""}
            </article>`).join("")}
        </div>` : `
        <div class="empty-state"><div>▦</div><h3>No bookings found</h3><p>Search with your mobile number or book a new service.</p><button class="primary-button" id="newBooking">Explore services</button></div>`}
    </main>
    ${bottomNav()}
  `;
}

function adminView() {
  if (!state.adminLoggedIn) return adminLogin();
  return adminDashboard();
}

function adminLogin() {
  return `
    ${appHeader()}
    <main class="content admin-login">
      <div class="admin-mark">♚</div>
      <p class="eyebrow">Owner access only</p>
      <h2>Admin login</h2>
      <form id="adminLoginForm" class="booking-form">
        <label>Email address
          <input name="email" type="email" required placeholder="owner@glowathome.com" />
        </label>
        <label>Password
          <input name="password" type="password" required minlength="4" placeholder="Enter password" />
        </label>
        <p class="login-error" id="loginError">${state.adminLoginError}</p>
        <button class="primary-button" type="submit">Login to dashboard <span>→</span></button>
      </form>
      <p class="protected-note">Protected by secure admin session</p>
    </main>
    ${bottomNav()}
  `;
}

function adminDashboard() {
  const bookings = getBookings();
  return `
    <header class="app-header admin-header">
      <div><p class="eyebrow">GlowAtHome</p><h1>Visit Queue</h1></div>
      <button class="logout-button" id="adminLogout">Logout</button>
    </header>
    <main class="content admin-content">
      <div class="admin-summary">
        <div><strong>${bookings.length}</strong><span>Total</span></div>
        <div><strong>${bookings.filter((b) => b.status === "pending").length}</strong><span>Pending</span></div>
        <div><strong>${bookings.filter((b) => b.status === "confirmed").length}</strong><span>Confirmed</span></div>
      </div>
      ${bookings.length ? `
        <div class="queue-list">
          ${bookings.map((booking) => `
            <article class="queue-card">
              <div class="queue-top">
                <div><p>${formatDate(booking.booking_date)} • ${booking.booking_time}</p><h3>${booking.customer_name}</h3></div>
                <b class="status ${booking.status}">${STATUS_LABELS[booking.status]}</b>
              </div>
              <p class="queue-service">${booking.service_name} <strong>₹${booking.price.toLocaleString("en-IN")}</strong></p>
              <p class="queue-address">⌖ ${booking.address}${booking.landmark ? `, ${booking.landmark}` : ""}</p>
              <div class="field-actions">
                <a href="tel:+91${booking.phone}" class="field-button">☎ <span>Call</span></a>
                <a target="_blank" rel="noopener" href="https://wa.me/91${booking.phone}?text=${encodeURIComponent(`Hello ${booking.customer_name}, your ${booking.service_name} appointment is ${STATUS_LABELS[booking.status].toLowerCase()} for ${formatDate(booking.booking_date)} at ${booking.booking_time}.`)}" class="field-button whatsapp">◉ <span>WhatsApp</span></a>
                <select data-status="${booking.id}" aria-label="Update booking status">
                  ${["pending", "confirmed", "completed"].map((status) => `<option value="${status}" ${booking.status === status ? "selected" : ""}>${STATUS_LABELS[status]}</option>`).join("")}
                </select>
              </div>
            </article>`).join("")}
        </div>` : `
        <div class="empty-state"><div>✓</div><h3>Queue is clear</h3><p>New customer appointments will appear here.</p></div>`}
      ${state.adminError ? `<p class="form-error" role="alert">${escapeHtml(state.adminError)}</p>` : ""}
    </main>
    ${bottomNav()}
  `;
}

function render() {
  const app = document.getElementById("app");
  if (state.tab === "services") app.innerHTML = servicesView();
  if (state.tab === "bookings") app.innerHTML = bookingsView();
  if (state.tab === "admin") app.innerHTML = adminView();
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.nav;
      if (button.dataset.nav !== "services") state.selectedService = null;
      render();
    });
  });
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => { state.category = button.dataset.category; render(); });
  });
  document.querySelectorAll("[data-book]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedService = DEMO_SERVICES.find((service) => service.id === button.dataset.book);
      state.step = "slot";
      state.time = "12:00 PM";
      render();
    });
  });
  document.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => { state.date = button.dataset.date; render(); });
  });
  document.querySelectorAll("[data-time]").forEach((button) => {
    button.addEventListener("click", () => { state.time = button.dataset.time; render(); });
  });
  document.getElementById("backToServices")?.addEventListener("click", () => {
    if (state.step === "details") { state.step = "slot"; render(); }
    else { state.selectedService = null; render(); }
  });
  document.getElementById("nextDetails")?.addEventListener("click", () => { state.step = "details"; render(); });
  document.querySelector("#bookingForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    createBooking(event.currentTarget);
  });
  document.getElementById("trackingSearch")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.bookingPhone = event.currentTarget.phone.value.replace(/\D/g, "");
    state.step = "tracking";
    render();
  });
  document.getElementById("newBooking")?.addEventListener("click", () => { state.tab = "services"; render(); });
  document.getElementById("adminLoginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = event.currentTarget.email.value.trim();
    const password = event.currentTarget.password.value;
    if (!supabase) {
      document.getElementById("loginError").textContent = "Admin login is unavailable until Supabase is configured.";
      return;
    }
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        document.getElementById("loginError").textContent = error.message;
        return;
      }
      if (data.user.app_metadata?.role !== "admin") {
        await supabase.auth.signOut();
        document.getElementById("loginError").textContent = "This account is not authorized for admin access.";
        return;
      }
    }
    if (email && password.length >= 4) {
      state.adminLoggedIn = true;
      state.adminLoginError = "";
      render();
      syncBookingsFromCloud();
    }
  });
  document.getElementById("adminLogout")?.addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    state.adminLoggedIn = false;
    render();
  });
  document.querySelectorAll("[data-status]").forEach((select) => {
    select.addEventListener("change", () => {
      const bookings = getBookings();
      const booking = bookings.find((item) => item.id === select.dataset.status);
      if (booking) {
        booking.status = select.value;
        saveBookings(bookings);
        syncStatusToCloud(booking.id, booking.status).catch((error) =>
          console.error("Cloud status sync failed:", error)
        );
        render();
      }
    });
  });
  document.getElementById("installButton")?.addEventListener("click", () => requestInstall());
  document.getElementById("installBanner")?.addEventListener("click", () => requestInstall());
}

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

async function requestInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  } else {
    alert("Open your browser menu and choose 'Add to Home screen' or 'Install app'.");
  }
}

state.adminLoggedIn = false;

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user.app_metadata?.role === "admin") {
      state.adminLoggedIn = true;
      syncBookingsFromCloud();
      render();
    }
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  );
}

render();
