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

    //  STATS: bạn có thể tùy chỉnh theo Personal, ví dụ đếm tổng số nhân viên
    const statsResult = await sql.query(`
      SELECT COUNT(*) as totalEmployees
      FROM Personal
    `);
    const stats = statsResult.recordset[0];

    // Lấy dữ liệu bảng Personal với paging
    const tableResult = await sql.query(`
        SELECT 
          Employee_ID,
          First_Name + ' ' + Last_Name as FullName,
          Email,
          Phone_Number as Phone,
          City,
          State,
          Shareholder_Status,
          CASE 
        WHEN Gender = 1 THEN 'Male'
        WHEN Gender = 0 THEN 'Female'
        ELSE 'N/A'
      END as Gender 
        FROM Personal
        ORDER BY Employee_ID DESC
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY
    `);

    res.json({
      stats: {
        totalEmployees: stats.totalEmployees
      },
      pagination: {
        page,
        limit
      },
      personal: tableResult.recordset
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

export default router;