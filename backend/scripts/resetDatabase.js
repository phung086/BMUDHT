const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "database.sqlite");
const schemaPath = path.join(__dirname, "..", "..", "database", "schema.sql");
const seedPath = path.join(__dirname, "..", "..", "database", "init.sql");

function readSql(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file SQL: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function resetDatabase() {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`Đã xóa database cũ: ${dbPath}`);
  } else {
    console.log("Không tìm thấy database cũ, sẽ tạo mới.");
  }

  const schema = readSql(schemaPath);
  const seed = readSql(seedPath);

  const db = new sqlite3.Database(dbPath);
  db.exec(schema, (err) => {
    if (err) {
      console.error("Lỗi khi tạo schema:", err.message);
      db.close();
      process.exit(1);
    }
    console.log("Tạo bảng thành công.");

    db.exec(seed, (seedErr) => {
      if (seedErr) {
        console.error("Lỗi khi seed dữ liệu:", seedErr.message);
        db.close();
        process.exit(1);
      }
      console.log("Seed dữ liệu mẫu thành công.");
      db.close(() => {
        console.log("Database đã sẵn sàng.");
        process.exit(0);
      });
    });
  });
}

resetDatabase();
