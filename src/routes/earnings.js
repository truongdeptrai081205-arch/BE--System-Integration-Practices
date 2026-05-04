import express from "express";
import sql from "mssql";
import mysql from "mysql2/promise";

const router = express.Router();

// ================= SQL SERVER =================
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

// ================= MYSQL POOL =================
const mysqlPool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "payroll",
  waitForConnections: true,
  connectionLimit: 10,
});

// ================= API =================
router.get("/", async (req, res) => {
  try {
    const {
      department,
      gender,
      ethnicity,
      employmentStatus,
      employmentType,
      IsShareholder,
      
    } = req.query;

    const pool = await sql.connect(sqlConfig);



    

    // ================= FILTER =================
    let filters = [];

    if (department)
      filters.push(`emp.Department = @department`);

    if (gender === "Male") {
      filters.push(`p.Gender = 1`);
    } else if (gender === "Female") {
      filters.push(`p.Gender = 0`);
    }

    if (ethnicity)
      filters.push(`p.Ethnicity = @ethnicity`);

    if (employmentStatus)
      filters.push(`e.EmploymentStatus = @employmentStatus`);

    if (employmentType) {
      filters.push(`emp.Employment_Type = @employmentType`);
    }

    // ✅ FIX: dùng đúng biến IsShareholder + đúng bảng
    const hasShareholderFilter =
    IsShareholder === "true" || IsShareholder === "false";

    if (hasShareholderFilter) {
      filters.push(`ISNULL(p.Shareholder_Status, 0) = @shareholder`);
    }
    

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    // ================= COUNT QUERY =================
    const countQuery = `
    
      SELECT COUNT(*) as total
      FROM Employees e
      LEFT JOIN Employment emp 
        ON e.EmployeeId = emp.Employee_ID
      LEFT JOIN Personal p 
        ON e.EmployeeId = p.Employee_ID
      ${whereClause}
    `;

    const countRequest = pool.request();

    if (department)
      countRequest.input("department", sql.NVarChar, department);

    if (ethnicity)
      countRequest.input("ethnicity", sql.NVarChar, ethnicity);

    if (hasShareholderFilter) {
      countRequest.input("shareholder", sql.Bit, IsShareholder === "true");
    }

    if (employmentStatus)
      countRequest.input("employmentStatus", sql.NVarChar, employmentStatus);

    if (employmentType)
      countRequest.input("employmentType", sql.NVarChar, employmentType);

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // ================= MAIN QUERY =================
    const query = `
      SELECT 
        e.EmployeeId,
        emp.Department,
        p.Gender,
        p.Ethnicity,
        e.EmploymentStatus,
        emp.Employment_Type,
        Shareholder_Status
      FROM Employees e
      LEFT JOIN Employment emp 
        ON e.EmployeeId = emp.Employee_ID
      LEFT JOIN Personal p 
        ON e.EmployeeId = p.Employee_ID
      ${whereClause}
      ORDER BY e.EmployeeId
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const request = pool.request();

    const limitNumber = Math.min(parseInt(req.query.limit) || 10, 200);
    const pageNumber = parseInt(req.query.page) || 1;
    const offset = (pageNumber - 1) * limitNumber;

    request.input("limit", sql.Int, limitNumber);
    request.input("offset", sql.Int, offset);

    if (department)
      request.input("department", sql.NVarChar, department);

    if (ethnicity)
      request.input("ethnicity", sql.NVarChar, ethnicity);

    if (hasShareholderFilter) {
      request.input("shareholder", sql.Bit, IsShareholder === "true");
    }

    if (employmentType)
      request.input("employmentType", sql.NVarChar, employmentType);

    if (employmentStatus)
      request.input("employmentStatus", sql.NVarChar, employmentStatus);

    const result = await request.query(query);
    const employees = result.recordset;

    // ================= MYSQL PAYROLL =================
    let payrollMap = {};

    if (employees.length > 0) {
      const ids = employees.map(e => e.EmployeeId);

      const [rows] = await mysqlPool.query(
        `SELECT Employee_Number, Paid_To_Date, Paid_Last_Year
         FROM employee
         WHERE Employee_Number IN (${ids.map(() => "?").join(",")})`,
        ids
      );

      rows.forEach(r => {
        payrollMap[r.Employee_Number] = r;
      });
    }

    // ================= MERGE =================
    const finalData = employees.map(e => ({
      ...e,
      PaidToDate: payrollMap[e.EmployeeId]?.Paid_To_Date || 0,
      PaidLastYear: payrollMap[e.EmployeeId]?.Paid_Last_Year || 0,
    }));

    // ================= SUMMARY (SUM) =================
  let summary = {
    totalEmployees: total,
    incomeThisYear: 0,
    incomeLastYear: 0,
    totalVacationDays: 0,
    avgIncome: 0,
  };

  try {
    const summaryQuery = `
      SELECT e.EmployeeId
      FROM Employees e
      LEFT JOIN Employment emp 
        ON e.EmployeeId = emp.Employee_ID
      LEFT JOIN Personal p 
        ON e.EmployeeId = p.Employee_ID
      ${whereClause}
    `;

    const summaryRequest = pool.request();

    if (department)
      summaryRequest.input("department", sql.NVarChar, department);

    if (ethnicity)
      summaryRequest.input("ethnicity", sql.NVarChar, ethnicity);

    if (hasShareholderFilter)
      summaryRequest.input("shareholder", sql.Bit, IsShareholder === "true");

    if (employmentStatus)
      summaryRequest.input("employmentStatus", sql.NVarChar, employmentStatus);

    if (employmentType)
      summaryRequest.input("employmentType", sql.NVarChar, employmentType);

    const summaryResult = await summaryRequest.query(summaryQuery);
    const allIds = summaryResult.recordset.map(e => e.EmployeeId);

    if (allIds.length > 0) {
      const [rows] = await mysqlPool.query(
    `SELECT 
      SUM(Paid_To_Date) AS incomeThisYear,
      SUM(Paid_Last_Year) AS incomeLastYear,
      SUM(Vacation_Days) AS totalVacationDays,
      AVG(Paid_To_Date) AS avgIncome
    FROM employee
    WHERE Employee_Number IN (${allIds.map(() => "?").join(",")})`,
    allIds
  );

      summary = {
    totalEmployees: total,
    incomeThisYear: rows[0].incomeThisYear || 0,
    incomeLastYear: rows[0].incomeLastYear || 0,
    totalVacationDays: rows[0].totalVacationDays || 0,
    avgIncome: rows[0].avgIncome || 0,
  };
    
    }

  } catch (err) {
    console.error("SUMMARY ERROR:", err);
  }
  // dashboard KHÔNG dùng employmentStatus
let dashboardFilters = [];

if (department)
  dashboardFilters.push(`emp.Department = @department`);

if (gender === "Male") {
  dashboardFilters.push(`p.Gender = 1`);
} else if (gender === "Female") {
  dashboardFilters.push(`p.Gender = 0`);
}

if (ethnicity)
  dashboardFilters.push(`p.Ethnicity = @ethnicity`);

if (employmentType)
  dashboardFilters.push(`emp.Employment_Type = @employmentType`);

if (hasShareholderFilter) {
  dashboardFilters.push(`ISNULL(p.Shareholder_Status, 0) = @shareholder`);
}

const dashboardWhere =
  dashboardFilters.length > 0
    ? `AND ${dashboardFilters.join(" AND ")}`
    : "";
  // ================= DASHBOARD =================
const typeRequest = pool.request();
const statusRequest = pool.request();
const retireRequest = pool.request();

// bind param giống hệt phía trên
if (department) {
  typeRequest.input("department", sql.NVarChar, department);
  statusRequest.input("department", sql.NVarChar, department);
  retireRequest.input("department", sql.NVarChar, department);
}

if (ethnicity) {
  typeRequest.input("ethnicity", sql.NVarChar, ethnicity);
  statusRequest.input("ethnicity", sql.NVarChar, ethnicity);
  retireRequest.input("ethnicity", sql.NVarChar, ethnicity);
}

if (employmentType) {
  typeRequest.input("employmentType", sql.NVarChar, employmentType);
  statusRequest.input("employmentType", sql.NVarChar, employmentType);
  retireRequest.input("employmentType", sql.NVarChar, employmentType);
}

if (hasShareholderFilter) {
  typeRequest.input("shareholder", sql.Bit, IsShareholder === "true");
  statusRequest.input("shareholder", sql.Bit, IsShareholder === "true");
  retireRequest.input("shareholder", sql.Bit, IsShareholder === "true");
}

// 1. employment type
const typeResult = await typeRequest.query(`
  SELECT 
    emp.Employment_Type,
    COUNT(*) AS Total,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS Percentage
  FROM Employment emp
  LEFT JOIN Employees e ON e.EmployeeId = emp.Employee_ID
  LEFT JOIN Personal p ON p.Employee_ID = e.EmployeeId
  WHERE emp.Employment_Type IN ('Full-time','Part-time')
  ${dashboardWhere}
  GROUP BY emp.Employment_Type
`);

// 2. status
const statusResult = await statusRequest.query(`
  SELECT 
    e.EmploymentStatus,
    COUNT(*) AS Total,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS Percentage
  FROM Employment emp
  LEFT JOIN Employees e ON e.EmployeeId = emp.Employee_ID
  LEFT JOIN Personal p ON p.Employee_ID = e.EmployeeId
  WHERE e.EmploymentStatus IN ('Active','Terminated','On Leave')
  ${dashboardWhere}
  GROUP BY e.EmploymentStatus
`);

// 3. retired
const retireResult = await retireRequest.query(`
  SELECT 
    CASE 
      WHEN p.Shareholder_Status = 1 THEN N'Cổ đông (đã nghỉ)'
      ELSE N'Nhân viên (đã nghỉ)'
    END AS Type,
    COUNT(*) AS Total,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS Percentage
  FROM Personal p
  JOIN Employees e ON p.Employee_ID = e.EmployeeId
  JOIN Employment emp ON emp.Employee_ID = e.EmployeeId
  WHERE e.EmploymentStatus = 'Terminated'
  ${dashboardWhere}
  GROUP BY 
    CASE 
      WHEN p.Shareholder_Status = 1 THEN N'Cổ đông (đã nghỉ)'
      ELSE N'Nhân viên (đã nghỉ)'
    END
`);

      // ================= RESPONSE =================
      res.json({
        success: true,
        total,
        data: finalData,
        summary,
        dashboard: {
          employmentType: typeResult.recordset,
          employmentStatus: statusResult.recordset,
          retiredGroup: retireResult.recordset
        },
        pageInfo: {
          page: pageNumber,
          limit: limitNumber,
          total
        }
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  });

export default router;