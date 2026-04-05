import express from "express";
import sql from "mssql";

const router = express.Router();

// Cấu hình kết nối SQL Server
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

// API lấy danh sách Benefit_Plans với phân trang và filter
router.get("/", async (req, res) => {
    // Lấy query params
    const page = parseInt(req.query.page) || 1;             // Trang hiện tại
    const limit = parseInt(req.query.limit) || 10;          // Số bản ghi/trang
    const plan = req.query.plan || "";                      // Filter theo Plan_Name

    const offset = (page - 1) * limit;

    try {
        const pool = await sql.connect(sqlConfig);

        // Tạo điều kiện filter
        let whereClause = "";
        const request = pool.request();

        if (plan) {
            whereClause = "WHERE Plan_Name = @plan";
            request.input("plan", sql.VarChar, plan);
        }

        // Query phân trang + filter
        const result = await request.query(`
            SELECT Benefit_Plan_ID, Plan_Name, Deductable, Percentage_CoPay
            FROM Benefit_Plans
            ${whereClause}
            ORDER BY Benefit_Plan_ID
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `);

        res.json({
            page,
            limit,
            plan: plan || "All",
            data: result.recordset
        });
    } catch (err) {
        console.error("Error fetching benefit plans:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await sql.close();
    }
});

export default router;