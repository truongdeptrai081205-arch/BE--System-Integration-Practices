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

// API lấy danh sách Employment với phân trang và filter
router.get("/", async (req, res) => {
    const page = parseInt(req.query.page) || 1;        // page hiện tại, mặc định 1
    const limit = parseInt(req.query.limit) || 10;     // số bản ghi/trang, mặc định 10
    const status = req.query.status || "";            // lọc theo Employment_Status

    const offset = (page - 1) * limit;

    try {
        const pool = await sql.connect(sqlConfig);

        // Tạo điều kiện filter
        let whereClause = "";
        if (status) {
            // Tránh SQL Injection bằng cách dùng parameter
            whereClause = "WHERE Employment_Status = @status";
        }

        // Query phân trang + filter
        const request = pool.request();
        if (status) request.input("status", sql.VarChar, status);

        const result = await request.query(`
            SELECT Employee_ID, Hire_Date, Employment_Status
            FROM Employment
            ${whereClause}
            ORDER BY Hire_Date DESC
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `);

        res.json({
            page,
            limit,
            status: status || "All",
            data: result.recordset
        });
    } catch (err) {
        console.error("Error fetching employment data:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await sql.close();
    }
});

export default router;