import express from "express";
import mysql from "mysql2/promise";

const router = express.Router();

const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "payroll",
});

router.get("/", async (req, res) => {
  try {
    // 🔹 limit mặc định 10
    let limit = parseInt(req.query.limit) || 10;
    const allowedLimits = [10, 50, 100, 200];
    if (!allowedLimits.includes(limit)) limit = 10;

    // 🔹 page mặc định 1
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const threshold = parseInt(req.query.threshold) || 15;

    // 🔹 COUNT tổng
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM employee
       WHERE Vacation_Days >= ?`,
      [threshold]
    );

    const total = countResult[0].total;

    // 🔹 LIST có phân trang
    const [list] = await pool.query(
      `
      SELECT 
        Employee_Number,
        CONCAT(Last_Name, ' ', First_Name) AS Full_Name,
        Vacation_Days,
        CASE 
          WHEN Vacation_Days >= 18 THEN 'CRITICAL'
          WHEN Vacation_Days >= 15 THEN 'WARNING'
          ELSE 'NORMAL'
        END AS Level
      FROM employee
      WHERE Vacation_Days >= ?
      ORDER BY Vacation_Days DESC
      LIMIT ? OFFSET ?
      `,
      [threshold, limit, offset]
    );
    const message = `Cảnh báo: Tổng ${total} nhân viên đã tích lũy từ ${threshold} ngày nghỉ phép trở lên, vượt quá mức quy định.`;
    res.json({
      total,
      page,
      limit,
      message,
      totalPages: Math.ceil(total / limit),
      data: list
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "VACATION PAGINATION ERROR" });
  }
});

export default router;