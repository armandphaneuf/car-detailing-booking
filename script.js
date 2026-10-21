// Premium Shine — booking site logic.
// Bookings are stored in localStorage (per device). To accept real bookings,
// connect this to a backend or a form service later.

const SERVICES = [
  {
    id: "basic",
    name: "Exterior Wash",
    price: 49,
    duration: "60–90 min",
    perks: ["Hand wash & dry", "Wheel & tire detail", "Tire shine", "Window wash"],
  },
  {
    id: "interior",
    name: "Interior Deep Clean",
    price: 60,
    duration: "2–3 hrs",
    perks: ["Vacuum & steam clean", "Carpet & seat shampoo", "Dashboard wipe-down", "Odor treatment"],
  },
  {
    id: "full",
    name: "Full Detail",
    price: 159,
    duration: "3–5 hrs",
    perks: ["Everything in both packages", "Clay bar treatment", "Wax & sealant", "Engine bay wipe-down"],
    featured: true,
  },
  {
    id: "ceramic",
    name: "Ceramic Coating",
    price: 50,
    duration: "Full day",
    perks: ["Paint decontamination", "Machine polish", "2-year ceramic coating", "Free 6-month checkup"],
  },
];

const TIME_SLOTS = ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];
const STORAGE_KEY = "premium-shine-bookings";

// Bookings are emailed to this address through the client's own mail app.
// Change it here if the address is ever different.
const OWNER_EMAIL = "heckyeah.det@gmail.com";

// ---------- Rendering ----------

function renderServices() {
  const container = document.getElementById("service-cards");
  container.innerHTML = SERVICES.map((s) => `
    <article class="card${s.featured ? " featured" : ""}">
      <h3>${s.name}</h3>
      <div class="price">$${s.price}</div>
      <ul>${s.perks.map((p) => `<li>${p}</li>`).join("")}</ul>
      <a class="btn btn-primary" href="#book" data-service="${s.id}">Book This</a>
    </article>
  `).join("");

  // Pre-select the chosen package when a "Book This" link is clicked.
  container.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      document.getElementById("service").value = link.dataset.service;
    });
  });
}

function populateForm() {
  const serviceSelect = document.getElementById("service");
  for (const s of SERVICES) {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = `${s.name} — $${s.price}`;
    serviceSelect.appendChild(option);
  }

  const timeSelect = document.getElementById("time");
  for (const slot of TIME_SLOTS) {
    const option = document.createElement("option");
    option.value = slot;
    option.textContent = slot;
    timeSelect.appendChild(option);
  }

  // Earliest bookable date is today.
  const dateInput = document.getElementById("date");
  dateInput.min = new Date().toISOString().split("T")[0];
}

// ---------- Bookings ----------

function loadBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function renderAppointments() {
  const list = document.getElementById("appointments-list");
  const bookings = loadBookings().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  if (bookings.length === 0) {
    list.innerHTML = `<p class="empty-state">No appointments yet. Book your first detail above.</p>`;
    return;
  }

  list.innerHTML = "";
  for (const b of bookings) {
    const service = SERVICES.find((s) => s.id === b.service);
    const item = document.createElement("div");
    item.className = "appointment";
    item.innerHTML = `
      <div class="appointment-info">
        <strong>${service ? service.name : b.service} — $${service ? service.price : "?"}</strong>
        <span>${b.vehicle}</span>
        <span>${formatDate(b.date)} at ${b.time} · ${b.name}</span>
      </div>
      <button class="btn-cancel" data-id="${b.id}">Cancel</button>
    `;
    list.appendChild(item);
  }

  list.querySelectorAll(".btn-cancel").forEach((btn) => {
    btn.addEventListener("click", () => cancelBooking(btn.dataset.id));
  });
}

function cancelBooking(id) {
  saveBookings(loadBookings().filter((b) => b.id !== id));
  renderAppointments();
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------- Form ----------

function showError(message) {
  const error = document.getElementById("form-error");
  error.textContent = message;
  error.hidden = false;
}

function handleBooking(event) {
  event.preventDefault();
  document.getElementById("form-error").hidden = true;

  const form = event.target;
  const data = Object.fromEntries(new FormData(form));

  if (!data.name?.trim() || !data.phone?.trim() || !data.vehicle?.trim()) {
    showError("Please fill in your name, phone number and vehicle.");
    return;
  }
  if (!data.service || !data.date || !data.time) {
    showError("Please choose a service package, date and time.");
    return;
  }
  const today = new Date().toISOString().split("T")[0];
  if (data.date < today) {
    showError("Please pick today or a future date.");
    return;
  }

  const booking = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    ...data,
    createdAt: new Date().toISOString(),
  };

  saveBookings([...loadBookings(), booking]);
  form.reset();

  const service = SERVICES.find((s) => s.id === booking.service);
  document.getElementById("confirm-details").textContent =
    `Booking saved: ${service.name} ($${service.price})\n${formatDate(booking.date)} at ${booking.time}`;

  const mailtoLink = document.getElementById("confirm-mailto");
  mailtoLink.href = buildMailto(booking, service);
  document.getElementById("confirm-modal").hidden = false;

  // Open the client's mail app with the booking pre-filled to the owner.
  window.location.href = mailtoLink.href;

  renderAppointments();
}

// Build a mailto: URL that delivers the booking straight to the owner's inbox.
function buildMailto(booking, service) {
  const subject = `New Detailing Booking — ${formatDate(booking.date)} at ${booking.time}`;
  const body = [
    `New booking request from the website.`,
    ``,
    `Service: ${service.name} — $${service.price} (${service.duration})`,
    `Date: ${formatDate(booking.date)}`,
    `Time: ${booking.time}`,
    `Name: ${booking.name}`,
    `Phone: ${booking.phone}`,
    `Vehicle: ${booking.vehicle}`,
    `Notes: ${booking.notes?.trim() || "None"}`,
  ].join("\n");

  return `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ---------- Init ----------

document.getElementById("booking-form").addEventListener("submit", handleBooking);
document.getElementById("confirm-close").addEventListener("click", () => {
  document.getElementById("confirm-modal").hidden = true;
});

renderServices();
populateForm();
renderAppointments();
