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

router.post("/", async (req, res) => {
  const pool = await sql.connect(sqlConfig);
  const transaction = new sql.Transaction(pool);

  try {
    const {
      First_Name,
      Last_Name,
      Email,
      Phone_Number,
      City,
      State,
      Shareholder_Status,
      Gender
    } = req.body;

    // ✅ validate nhẹ
    if (!First_Name || !Last_Name) {
      return res.status(400).json({ error: "Thiếu tên" });
    }

    // ✅ convert Gender -> bit
    let genderBit;
    if (Gender?.toLowerCase() === "male") genderBit = 1;
    else if (Gender?.toLowerCase() === "female") genderBit = 0;
    else genderBit = null;

    await transaction.begin();

    const request = new sql.Request(transaction);

    // 🔥 lock bảng để tránh trùng ID
    const result = await request.query(`
      SELECT ISNULL(MAX(Employee_ID), 0) + 1 AS newId
      FROM HR.dbo.Personal WITH (TABLOCKX)
    `);

    const newEmployeeId = result.recordset[0].newId;

    // insert
    await request.query(`
      INSERT INTO HR.dbo.Personal
      (Employee_ID, First_Name, Last_Name, Email, Phone_Number, City, State, Shareholder_Status, Gender)
      VALUES
      (${newEmployeeId}, '${First_Name}', '${Last_Name}', '${Email}', '${Phone_Number}', '${City}', '${State}', '${Shareholder_Status}', ${genderBit})
    `);

    await transaction.commit();

    res.json({
      message: "Thêm thành công",
      Employee_ID: newEmployeeId
    });

  } catch (err) {
    await transaction.rollback();
    console.error("Lỗi chi tiết:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;