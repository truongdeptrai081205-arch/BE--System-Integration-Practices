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

    const days = parseInt(req.query.days) || 7;

    const result = await sql.query(`
      SELECT 
          COUNT(*) AS TotalUpcoming,
          CAST(GETDATE() AS DATE) AS FromDate,
          DATEADD(DAY, ${days}, CAST(GETDATE() AS DATE)) AS ToDate
      FROM (
          SELECT 
              DATEDIFF(DAY, CAST(GETDATE() AS DATE),
                  CASE 
                      WHEN TRY_CONVERT(date, 
                          CONCAT(YEAR(GETDATE()), '-', MONTH(e.Hire_Date), '-', DAY(e.Hire_Date))
                      ) >= CAST(GETDATE() AS DATE)
                      THEN TRY_CONVERT(date, 
                          CONCAT(YEAR(GETDATE()), '-', MONTH(e.Hire_Date), '-', DAY(e.Hire_Date))
                      )
                      ELSE TRY_CONVERT(date, 
                          CONCAT(YEAR(GETDATE()) + 1, '-', MONTH(e.Hire_Date), '-', DAY(e.Hire_Date))
                      )
                  END
              ) AS Days_Remaining
          FROM Employment e
          WHERE e.Hire_Date IS NOT NULL
      ) AS temp
      WHERE Days_Remaining BETWEEN 0 AND ${days};
    `);

    const data = result.recordset[0];

    // ✅ fix ở đây
    const fromDate = data.FromDate;
    const toDate = data.ToDate;
    const total = data.TotalUpcoming;

    res.json({
      total,
      fromDate,
      toDate,
      message: `Từ ${fromDate.toISOString().split("T")[0]} đến ${toDate.toISOString().split("T")[0]} có ${total} nhân viên sắp đến ngày kỷ niệm tuyển dụng.`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ANNIVERSARY ERROR" });
  }
});

export default router;