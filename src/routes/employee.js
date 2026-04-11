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

        // Tổng số nhân viên
        const statsResult = await sql.query(`
            SELECT COUNT(*) as totalEmployees
            FROM Personal
        `);
        const stats = statsResult.recordset[0];

        // Lấy dữ liệu kèm Employment
        const dataResult = await sql.query(`
            SELECT 
                p.Employee_ID,
                p.First_Name + ' ' + p.Last_Name AS FullName,
                p.Gender,
                p.Ethnicity,
                p.Shareholder_Status,
                e.Hire_Date,
                e.Employment_Status,
                e.Workers_Comp_Code,
                e.Termination_Date,
                e.Rehire_Date,
                e.Last_Review_Date
            FROM Personal p
            LEFT JOIN Employment e ON p.Employee_ID = e.Employee_ID
            ORDER BY p.Employee_ID
            OFFSET ${offset} ROWS
            FETCH NEXT ${limit} ROWS ONLY
        `);

        res.json({
            stats,
            pagination: { page, limit },
            data: dataResult.recordset
        });

    } catch (err) {
        console.error("Error fetching employees:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await sql.close();
    }
});

export default router;