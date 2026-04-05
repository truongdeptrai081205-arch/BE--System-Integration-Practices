import express from "express";
import sql from "mssql";

const router = express.Router();

const sqlConfig = {
  user: "sa",
  password: "a123456*",
  server: "DESKTOP-3GBH081\\MSSQLSERVER03",
  database: "HR",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then(pool => {
    console.log("Connected to MSSQL");
    return pool;
  })
  .catch(err => console.log("Database Connection Failed!", err));

// API: /api/birthday?day=5&month=4&page=1&pageSize=50
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;

    // Lấy params, nếu không có thì mặc định ngày/tháng hôm nay
    const day = parseInt(req.query.day) || new Date().getDate();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    // Query SQL chỉ lọc theo ngày + tháng, bỏ qua năm
    const result = await pool.request().query(`
      SELECT Employee_ID, First_Name, Last_Name, Birth_Date
      FROM Personal
      WHERE DAY(Birth_Date) = ${day} AND MONTH(Birth_Date) = ${month}
      ORDER BY Birth_Date
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `);

    // Optionally: lấy tổng số sinh nhật trong ngày để front-end biết
    const totalResult = await pool.request().query(`
      SELECT COUNT(*) AS Total
      FROM Personal
      WHERE DAY(Birth_Date) = ${day} AND MONTH(Birth_Date) = ${month}
    `);

    res.json({
      total: totalResult.recordset[0].Total,
      page,
      pageSize,
      data: result.recordset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("BIRTHDAY ERROR");
  }
});

export default router;