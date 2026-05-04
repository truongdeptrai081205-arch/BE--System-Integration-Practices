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

router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;

    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const page = parseInt(req.query.page) || 1;

    const allowedPageSizes = [10, 20, 50, 100, 200];
    let pageSize = parseInt(req.query.pageSize) || 10;

    if (!allowedPageSizes.includes(pageSize)) {
      pageSize = 10;
    }

    const offset = (page - 1) * pageSize;

    // 🔹 Query có thêm field
    const result = await pool.request()
  .input("month", sql.Int, month)
  .input("offset", sql.Int, offset)
  .input("pageSize", sql.Int, pageSize)
  .query(`
    SELECT 
      Employee_ID,
      First_Name,
      Last_Name,
      Birth_Date,
      Gender,
      Email,
      Phone_Number,
      Shareholder_Status
    FROM Personal
    WHERE MONTH(Birth_Date) = @month
    ORDER BY DAY(Birth_Date)
    OFFSET @offset ROWS
    FETCH NEXT @pageSize ROWS ONLY
  `);

    // 🔹 Tổng
    const totalResult = await pool.request()
      .input("month", sql.Int, month)
      .query(`
        SELECT COUNT(*) AS Total
        FROM Personal
        WHERE MONTH(Birth_Date) = @month
      `);

    const total = totalResult.recordset[0].Total;

    // 🔹 Message
    const message = total > 0
      ? `Thông báo: Tổng ${total} nhân viên có sinh nhật trong tháng ${month} năm ${year}.`
      : `Thông báo: Không có nhân viên nào có sinh nhật trong tháng ${month} năm ${year}.`;

    // 🔥 Transform data
    const data = result.recordset.map(emp => ({
  Employee_ID: emp.Employee_ID,

  // 👉 tránh null
  Full_Name: `${emp.First_Name || ""} ${emp.Last_Name || ""}`.trim(),

  Birth_Date: emp.Birth_Date,

  // 👉 convert Gender cho đẹp
  Gender:
    emp.Gender === "M" ? "Male" :
    emp.Gender === "F" ? "Female" :
    emp.Gender,

  Email: emp.Email,

  // ❗ sửa đúng tên cột
  Phone: emp.Phone_Number,

  // 👉 convert Yes/No
  Shareholder_Status: emp.Shareholder_Status === 1 ? "Yes" : "No",
}));

    res.json({
      message,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      data,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("BIRTHDAY ERROR");
  }
});

export default router;