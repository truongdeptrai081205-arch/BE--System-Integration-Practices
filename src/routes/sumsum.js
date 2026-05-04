import express from "express";
import sql from "mssql";
import mysql from "mysql2/promise";

const router = express.Router();

// ================= SQL SERVER (HR) =================
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

// ================= MYSQL (PAYROLL) =================
const mysqlConfig = {
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "payroll",
};

// ================= API =================
router.get("/", async (req, res) => {
  let sqlPool;
  let mysqlPool;

  try {
    sqlPool = await sql.connect(sqlConfig);
    mysqlPool = await mysql.createPool(mysqlConfig);

    // HR
    const hr = await sqlPool.request().query(`
      SELECT COUNT(*) AS totalEmployees
      FROM Personal
    `);

    // Payroll
    const [payroll] = await mysqlPool.query(`
      SELECT 
        SUM(Paid_To_Date) AS incomeThisYear,
        SUM(Paid_Last_Year) AS incomeLastYear,
        SUM(Vacation_Days) AS totalVacationDays,
        AVG(Paid_To_Date) AS avgIncome
      FROM employee
    `);

    res.json({
      summary: {
        totalEmployees: hr.recordset[0].totalEmployees || 0,
        incomeThisYear: payroll[0].incomeThisYear || 0,
        incomeLastYear: payroll[0].incomeLastYear || 0,
        totalVacationDays: payroll[0].totalVacationDays || 0,
        avgIncome: payroll[0].avgIncome || 0,
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (sqlPool) await sqlPool.close();
    if (mysqlPool) await mysqlPool.end();
  }
});

export default router;