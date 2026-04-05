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

router.get("/hr-summary", async (req, res) => {
  try {
    await sql.connect(sqlConfig);

    const result = await sql.query(`
      SELECT 
        Gender,
        Ethnicity,
        Shareholder_Status,
        COUNT(*) as total
      FROM Personal
      GROUP BY Gender, Ethnicity, Shareholder_Status
    `);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

export default router;