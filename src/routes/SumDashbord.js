import express from "express";
import sql from "mssql";
import PayrollTransaction from "../models/PayrollTransaction.js";
import VacationHistory from "../models/VacationHistory.js";

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

    // Lấy page + limit từ query, default page 1, limit 50
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 50;
    const allowedLimits = [10, 20, 25, 50, 100, 200];
    if (!allowedLimits.includes(limit)) limit = 50;
    const offset = (page - 1) * limit;

    // HR: chỉ lấy page + limit
    const hr = await sql.query(`
      SELECT Employee_ID, Gender, Ethnicity, Shareholder_Status
      FROM Personal
      ORDER BY Employee_ID
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);
    const hrData = hr.recordset;

    // earnings cho những employee trong page
    const earnings = await PayrollTransaction.aggregate([
      { $match: { employeeId: { $in: hrData.map(e => e.Employee_ID) } } },
      {
        $group: {
          _id: "$employeeId",
          totalEarnings: { $sum: "$amount" }
        }
      }
    ]);

    // vacation cho những employee trong page
    const vacation = await VacationHistory.aggregate([
      { $match: { employeeId: { $in: hrData.map(e => e.Employee_ID) } } },
      {
        $group: {
          _id: "$employeeId",
          totalVacation: { $sum: "$daysTaken" }
        }
      }
    ]);

    // merge từng employee
    const data = hrData.map(emp => {
      const earn = earnings.find(e => e._id == emp.Employee_ID);
      const vac = vacation.find(v => v._id == emp.Employee_ID);

      return {
        employeeId: emp.Employee_ID,
        gender: emp.Gender,
        ethnicity: emp.Ethnicity,
        shareholder: emp.Shareholder_Status,
        totalEarnings: earn ? earn.totalEarnings : 0,
        totalVacation: vac ? vac.totalVacation : 0
      };
    });

    // Tính tổng cho toàn bộ HR (không chỉ page) để hiển thị 3 stat-card
    const allHr = await sql.query(`SELECT Employee_ID FROM Personal`);
    const allEmployeeIds = allHr.recordset.map(e => e.Employee_ID);

    const allEarnings = await PayrollTransaction.aggregate([
      { $match: { employeeId: { $in: allEmployeeIds } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const allVacation = await VacationHistory.aggregate([
      { $match: { employeeId: { $in: allEmployeeIds } } },
      { $group: { _id: null, total: { $sum: "$daysTaken" } } }
    ]);

    const totalEarnings = allEarnings[0]?.total || 0;
    const totalVacation = allVacation[0]?.total || 0;

    // Ví dụ percent = (PaidToDate - PaidLastYear) / PaidToDate * 100
    // hiện tại chưa có PaidLastYear, tạm set = 0
    const percent = 0;

    res.json({
      page,
      limit,
      stats: {
        totalEarnings,
        totalVacation,
        percent
      },
      data
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("DASHBOARD ERROR");
  }
});

export default router;