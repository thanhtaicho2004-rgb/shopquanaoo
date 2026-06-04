const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- GỘP GIAO DIỆN FRONTEND VÀO SERVER ---
// Cho phép server đọc các file css, js, hình ảnh trong thư mục frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Khi khách hàng vào đường link chính, tự động mở trang chủ index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "pages", "index.html"));
});

// --- 1. KẾT NỐI DATABASE ---
const db = mysql.createConnection({
  host: "sql12.freesqldatabase.com", // Database Host của bạn
  user: "sql12828734", // Database Username của bạn
  password: "tAf6zgfMjE", // Mật khẩu của bạn
  database: "sql12828734", // Database Name của bạn
});

db.connect((err) => {
  if (err) console.error("❌ Lỗi kết nối DB:", err.message);
  else console.log("✅ Đã kết nối MySQL thành công!");
});

// ================== API KHÁCH HÀNG ==================

// 1. Lấy danh sách sản phẩm
app.get("/api/products", (req, res) => {
  db.query("SELECT * FROM products", (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json(data);
  });
});

// 2. Lấy chi tiết 1 sản phẩm
app.get("/api/products/:id", (req, res) => {
  db.query(
    "SELECT * FROM products WHERE id = ?",
    [req.params.id],
    (err, data) => {
      if (err) return res.status(500).json(err);
      return res.json(data[0]);
    },
  );
});

// 3. ĐĂNG NHẬP
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(sql, [email, password], (err, data) => {
    if (err) return res.status(500).json(err);
    if (data.length > 0) {
      const user = data[0];
      return res.json({
        message: "Login thành công",
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      return res.status(401).json({ message: "Sai email hoặc mật khẩu!" });
    }
  });
});

// 4. ĐẶT HÀNG
app.post("/api/orders", (req, res) => {
  const { customer_name, phone, address, total_money, cart } = req.body;
  const sqlOrder = `INSERT INTO orders (customer_name, phone, address, total_money, status) VALUES (?, ?, ?, ?, 'pending')`;

  db.query(
    sqlOrder,
    [customer_name, phone, address, total_money],
    (err, result) => {
      if (err) return res.status(500).json(err);
      const orderId = result.insertId;

      // Nếu có sản phẩm trong giỏ thì mới thêm vào order_items
      if (cart && cart.length > 0) {
        const items = cart.map((item) => [
          orderId,
          item.id,
          item.qty,
          item.price,
        ]);
        const sqlItems = `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ?`;

        db.query(sqlItems, [items], (err, resultItems) => {
          if (err) return res.status(500).json(err);
          return res.json({ message: "Thành công!", orderId });
        });
      } else {
        return res.json({
          message: "Thành công nhưng giỏ hàng trống!",
          orderId,
        });
      }
    },
  );
});

// ================== API ADMIN ==================

// 5. Lấy danh sách đơn hàng
app.get("/api/admin/orders", (req, res) => {
  db.query("SELECT * FROM orders ORDER BY created_at DESC", (err, data) => {
    if (err) return res.status(500).json(err);
    return res.json(data);
  });
});

// 6. Duyệt đơn
app.put("/api/admin/orders/:id", (req, res) => {
  const { status } = req.body;
  db.query(
    "UPDATE orders SET status = ? WHERE id = ?",
    [status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      return res.json({ message: "Đã cập nhật trạng thái" });
    },
  );
});

// 7. Thống kê
app.get("/api/admin/stats", (req, res) => {
  const sqlRevenue =
    "SELECT SUM(total_money) as revenue FROM orders WHERE status = 'approved'";
  const sqlBestSeller = `
    SELECT p.name, SUM(oi.quantity) as sold 
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'approved' 
    GROUP BY p.name ORDER BY sold DESC LIMIT 5`;

  db.query(sqlRevenue, (err, revenueData) => {
    if (err) return res.json(err);
    db.query(sqlBestSeller, (err, bestData) => {
      if (err) return res.json(err);
      res.json({ revenue: revenueData[0].revenue || 0, bestSellers: bestData });
    });
  });
});

// ================== API QUẢN LÝ SẢN PHẨM ==================

// 8. THÊM SẢN PHẨM MỚI
app.post("/api/products", (req, res) => {
  const { name, price, image, description } = req.body;

  const sql = `INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)`;
  db.query(sql, [name, price, image, description], (err, result) => {
    if (err) {
      console.error("Lỗi thêm sản phẩm:", err);
      return res.status(500).json({ message: "Lỗi Server" });
    }
    res.json({ message: "Thêm sản phẩm thành công!", id: result.insertId });
  });
});

// 9. SỬA SẢN PHẨM (MỚI BỔ SUNG ĐỂ FIX LỖI)
app.put("/api/products/:id", (req, res) => {
  const { name, image, price } = req.body;
  const sql = "UPDATE products SET name=?, image=?, price=? WHERE id=?";
  db.query(sql, [name, image, price, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Cập nhật thành công" });
  });
});

// 10. XÓA SẢN PHẨM (MỚI BỔ SUNG ĐỂ FIX LỖI)
app.delete("/api/products/:id", (req, res) => {
  const sql = "DELETE FROM products WHERE id=?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Xóa thành công" });
  });
});

// CHẠY SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server API đang chạy tại Port: ${PORT}`);
});
