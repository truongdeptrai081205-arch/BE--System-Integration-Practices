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

    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    let limit = parseInt(req.query.limit) || 50;
    const allowedLimits = [10, 20, 25, 50, 100];
    if (!allowedLimits.includes(limit)) limit = 50;

    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    let whereClause = "";
    if (startDate && endDate) {
      whereClause = `
        WHERE CAST(Hire_Date AS DATE) BETWEEN '${startDate.toISOString().split('T')[0]}' 
                                          AND '${endDate.toISOString().split('T')[0]}'
      `;
    }

    const result = await sql.query(`
      SELECT *
      FROM (
        SELECT 
          Employee_ID,
          Hire_Date,
          ROW_NUMBER() OVER (ORDER BY Hire_Date ASC) AS RowNum
        FROM Employment
        ${whereClause}
      ) AS temp
      WHERE RowNum > ${offset} AND RowNum <= ${offset + limit}
    `);

    res.json({
      page,
      limit,
      data: result.recordset
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("ANNIVERSARY ERROR");
  }
});

export default router;