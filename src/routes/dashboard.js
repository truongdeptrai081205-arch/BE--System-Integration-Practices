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

router.get("/", async (req, res) => {
  try {
    await sql.connect(sqlConfig);

    let limit = parseInt(req.query.limit) || 20;
    let page = parseInt(req.query.page) || 1;

    const allowed = [10, 20, 25, 50, 100, 200];
    if (!allowed.includes(limit)) limit = 20;

    const offset = (page - 1) * limit;

    // STATS
    const statsResult = await sql.query(`
      SELECT 
        COUNT(*) as totalEmployees,
        SUM(PaidToDate) as totalPaidToDate,
        SUM(PaidLastYear) as totalPaidLastYear
      FROM Employees
    `);

    const stats = statsResult.recordset[0];

    const percent = stats.totalPaidLastYear
      ? ((stats.totalPaidToDate - stats.totalPaidLastYear) / stats.totalPaidLastYear * 100).toFixed(2)
      : 0;

    const tableResult = await sql.query(`
        SELECT 
        EmployeeId,
        FirstName + ' ' + LastName as FullName,
        Email,
        Phone,
        Country,
        EmploymentStatus,
        HireDate
        FROM Employees
        ORDER BY EmployeeId
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `);

    res.json({
      stats: {
        percent,
        totalEmployees: stats.totalEmployees,
        totalPaidToDate: stats.totalPaidToDate
      },
       pagination: {
        page,
        limit
      },
      employees: tableResult.recordset
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;