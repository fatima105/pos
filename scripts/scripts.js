document.addEventListener("DOMContentLoaded", function () {

  // Load external components
  function loadComponent(url, containerId, callback) {
    fetch(url)
      .then(response => response.text())
      .then(html => {
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = html;
          if (callback) callback(); // Run callback after content is loaded
        } else {
          console.error(`Container ID "${containerId}" not found.`);
        }
      })
      .catch(error => console.error(`Error loading ${url}:`, error));
  }

  // --- Load sidebar then initialize it ---
  loadComponent("sidebar.html", "sidebar-container", initSidebar);

  // Load header & footer
  loadComponent("header.html", "header-container");
  loadComponent("footer.html", "footer-container");

  // --- Charts (run after DOM ready) ---
  const visitorsEl = document.getElementById("visitorsChart");
  if (visitorsEl) {
    const ctx1 = visitorsEl.getContext("2d");
    new Chart(ctx1, {
      type: "line",
      data: {
        labels: ["18th", "20th", "22nd", "24th", "26th", "28th", "30th"],
        datasets: [{
          label: "This Week",
          data: [100, 140, 180, 175, 190, 185, 170],
          borderColor: "blue",
          borderWidth: 2
        }]
      }
    });
  }

  const salesEl = document.getElementById("salesChart");
  if (salesEl) {
    const ctx2 = salesEl.getContext("2d");
    new Chart(ctx2, {
      type: "bar",
      data: {
        labels: ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
        datasets: [{
          label: "This Year",
          data: [500, 1200, 2200, 1800, 2000, 1900, 2100],
          backgroundColor: "blue"
        }]
      }
    });
  }
});


// --- Initialize Sidebar ---
async function initSidebar() {
  const BASEURL = "http://localhost:8000/api/";
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const userEmail = localStorage.getItem("userEmail");
  const userRole = localStorage.getItem("userRole");

  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return; // Wait for sidebar to load

  const allNavItems = sidebar.querySelectorAll(".nav-item");
  const userInfoEl = document.getElementById("UserInfo");

  // Show user info
  if (userInfoEl && userName && userEmail) {
    userInfoEl.innerHTML = `
      <div class="text-white mt-3 mb-3">
        <strong>${userName}</strong><br>
        <small>${userEmail}</small><br>
        <small class="text-info">(${userRole})</small>
      </div>`;
  }

  // ✅ ADMIN or SUPERADMIN: Show all
  if (userRole && ["admin", "superadmin"].includes(userRole.toLowerCase())) {
    allNavItems.forEach(item => item.style.display = "block");

    // 🧾 Add license check for “Sale Register” click
    const saleRegisterLink = document.querySelector("a[href='sale-register.html']");
    if (saleRegisterLink) {
      saleRegisterLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await handleLicenseCheck(userId, BASEURL);
      });
    }
  }

  // ✅ Normal User: load assigned modules
  else if (userId) {
    try {
      const res = await fetch(`${BASEURL}assign/user/${userId}`);
      const data = await res.json();

      allNavItems.forEach(item => {
        const link = item.querySelector("a");
        if (!link || !link.textContent.toLowerCase().includes("logout")) {
          item.style.display = "none";
        }
      });

      if (data && Array.isArray(data.modules)) {
        const visibleParents = new Set();
        document.querySelectorAll(".collapse a.nav-link").forEach(a => (a.style.display = "none"));

        data.modules.forEach(mod => {
          const navLink = document.querySelector(`a[href='${mod.link}']`);
          if (navLink) {
            navLink.style.display = "block";

            // 🔒 Sale Register License Check
            if (mod.link === "sale-register.html") {
              navLink.addEventListener("click", async (e) => {
                e.preventDefault();
                await handleLicenseCheck(userId, BASEURL);
              });
            }

            const parentCollapse = navLink.closest(".collapse");
            if (parentCollapse) {
              parentCollapse.classList.add("show");
              const parentNavItem = parentCollapse.closest(".nav-item");
              if (parentNavItem) visibleParents.add(parentNavItem);
            }
          }
        });

        visibleParents.forEach(parent => (parent.style.display = "block"));
      }
    } catch (error) {
      console.error("Error fetching user modules:", error);
    }
  }

  // Logout function
  window.logoutFunction = function () {
    localStorage.clear();
    window.location.href = "login.html";
  };

  // Highlight current active page
  const currentPath = window.location.pathname.split("/").pop();
  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href");
    if (href && href.includes(currentPath)) {
      link.classList.add("active");
      const parentCollapse = link.closest(".collapse");
      if (parentCollapse) {
        parentCollapse.classList.add("show");
        const parentLink = parentCollapse.previousElementSibling;
        if (parentLink) parentLink.classList.add("active");
      }
    }
  });
}


// --- License Check Function ---
// --- License Check Function ---
async function handleLicenseCheck(userId, BASEURL) {
  const licenseUrl = `${BASEURL}users/license/${userId}`;
  console.log("🔍 Checking license for user:", userId);

  try {
    const res = await fetch(licenseUrl);

    // Handle response errors
    if (!res.ok) {
      console.warn(`⚠️ License API returned status: ${res.status}`);
      if (res.status === 404) {
        showInlineAlert("No license found. Redirecting to upload page...", "warning");
        setTimeout(() => {
          window.location.href = `license-upload.html?userId=${userId}`;
        }, 3000);
        return;
      }
      throw new Error(`License API Error (${res.status})`);
    }

    const data = await res.json();
    console.log("📄 License API Response:", data);

    // --- Check if expired ---
    const currentDate = new Date();
    const expiryDate = data.expiry_date ? new Date(data.expiry_date) : null;
    const isExpired = expiryDate && expiryDate < currentDate;

    if (!data || data.error) {
      console.warn("❌ License missing or invalid.");
      showInlineAlert("License not found. Please upload a valid license.", "danger");
      setTimeout(() => {
        window.location.href = `license-upload.html?userId=${userId}`;
      }, 3000);
      return;
    }

    if (isExpired) {
      console.warn("⚠️ License expired on:", expiryDate);
      showInlineAlert(`Your license expired on ${expiryDate.toDateString()}. Please renew.`, "danger");
      setTimeout(() => {
        window.location.href = `license-upload.html?userId=${userId}`;
      }, 3000);
      return;
    }

    // --- License Active ---
    console.log("✅ License is active until:", expiryDate ? expiryDate.toDateString() : "Unknown");
    showInlineAlert("License verified. Redirecting to Sale Register...", "success");
    setTimeout(() => {
      window.location.href = "sale-register.html";
    }, 1500);

  } catch (err) {
    console.error("💥 License check failed:", err);
    showInlineAlert("Error checking license. Redirecting...", "danger");
    setTimeout(() => {
      window.location.href = `license-upload.html?userId=${userId}`;
    }, 3000);
  }
}



// --- Inline Alert ---
function showInlineAlert(message, type = "info") {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} text-center`;
  alertDiv.textContent = message;

  const container = document.querySelector(".content-container") || document.body;
  container.prepend(alertDiv);

  setTimeout(() => alertDiv.remove(), 5000);
}
