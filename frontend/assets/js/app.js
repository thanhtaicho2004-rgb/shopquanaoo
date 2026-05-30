// frontend/js/app.js

// Tự động chạy khi trang web tải xong
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 App đang khởi động...");
  loadHeader();
  loadFooter();
});

function loadHeader() {
  // Dùng đường dẫn tuyệt đối /components/header.html
  fetch("/components/header.html")
    .then((res) => {
      if (!res.ok) throw new Error("Không tìm thấy file header.html");
      return res.text();
    })
    .then((html) => {
      const headerEl = document.getElementById("header");
      if (headerEl) {
        headerEl.innerHTML = html;
        console.log("✅ Header đã hiện!");

        // Sau khi Header hiện, mới chạy các logic khác
        checkLoginStatus();
        updateCartCount();
        setupEvents();
      }
    })
    .catch((err) => console.error("❌ Lỗi tải Header:", err));
}

function loadFooter() {
  fetch("/components/footer.html")
    .then((res) => res.text())
    .then((html) => {
      const footerEl = document.getElementById("footer");
      if (footerEl) footerEl.innerHTML = html;
    });
}

function checkLoginStatus() {
  const token = localStorage.getItem("token");
  const greetingEl = document.getElementById("userGreeting");
  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");
  const logoutBtn = document.getElementById("logoutBtn");
  const adminBadge = document.getElementById("adminBadge");
  const adminBtn = document.getElementById("adminBtn");

  if (!greetingEl) return;

  if (token) {
    // --- ĐÃ ĐĂNG NHẬP ---
    fetch("/api/auth/me", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((res) => res.json())
      .then((user) => {
        if (user && user.name) {
          const lastName = user.name.split(" ").pop(); // Lấy tên cuối

          greetingEl.innerHTML = `👋 Chào, <span style="color: #ff4757; font-weight: bold;">${lastName}</span>`;

          // Ẩn nút đăng nhập/đăng ký
          if (loginLink) loginLink.style.display = "none";
          if (registerLink) registerLink.style.display = "none";

          // Hiện nút đăng xuất
          if (logoutBtn) logoutBtn.style.display = "inline-block";

          // Nếu là Admin
          if (user.role === "admin") {
            if (adminBadge) adminBadge.style.display = "inline-block";
            if (adminBtn) adminBtn.style.display = "inline-block";
          }
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
      });
  } else {
    // --- KHÁCH ---
    greetingEl.innerText = "Chào, Khách";
    if (loginLink) loginLink.style.display = "inline-block";
    if (registerLink) registerLink.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (adminBadge) adminBadge.style.display = "none";
    if (adminBtn) adminBtn.style.display = "none";
  }
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const el = document.getElementById("cartCount");
  if (el) el.innerText = count;
}

function setupEvents() {
  // Đăng xuất
  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Đăng xuất ngay?")) {
      localStorage.removeItem("token");
      window.location.href = "/pages/index.html";
    }
  });

  // Tìm kiếm
  const btn = document.getElementById("searchBtn");
  const input = document.getElementById("searchInput");
  if (btn && input) {
    btn.onclick = () => {
      const q = input.value.trim();
      if (q)
        window.location.href = `/pages/index.html?search=${encodeURIComponent(
          q
        )}`;
    };
  }
}

// Hàm global để các trang khác gọi cập nhật giỏ hàng
window.updateCartGlobal = updateCartCount;
