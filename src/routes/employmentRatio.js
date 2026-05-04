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

// API
router.get("/", async (req, res) => {
  try {
    const pool = await poolPromise;

    // 1. Full-time / Part-time
    const typeResult = await pool.request().query(`
      SELECT 
          Employment_Type,
          COUNT(*) AS Total,
          CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS Percentage
      FROM HR.dbo.Employment
      WHERE Employment_Type IN ('Full-time', 'Part-time')
      GROUP BY Employment_Type
    `);

    // 2. Status
    const statusResult = await pool.request().query(`
      SELECT 
          Employment_Status,
          COUNT(*) AS Total,
          CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS Percentage
      FROM HR.dbo.Employment
      WHERE Employment_Status IN ('Active', 'Terminated', 'On Leave')
      GROUP BY Employment_Status
    `);

    // 3. Shareholder / Employee retired
    const retireResult = await pool.request().query(`
      SELECT 
          CASE 
              WHEN p.Shareholder_Status = 1 THEN 'Cổ đông (đã nghỉ)'
              ELSE 'Nhân viên (đã nghỉ)'
          END AS Type,
          COUNT(*) AS Total,
          CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS Percentage
      FROM HR.dbo.Personal p
      JOIN HR.dbo.Employment e ON p.Employee_ID = e.Employee_ID
      WHERE e.Employment_Status = 'Terminated'
      GROUP BY 
          CASE 
              WHEN p.Shareholder_Status = 1 THEN 'Cổ đông (đã nghỉ)'
              ELSE 'Nhân viên (đã nghỉ)'
          END
    `);

    res.json({
      employmentType: typeResult.recordset,
      employmentStatus: statusResult.recordset,
      retiredGroup: retireResult.recordset
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;