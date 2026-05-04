import mongoose from "mongoose";
import sql from "mssql";
import mysql from "mysql2/promise";

const MONGO_URI = "mongodb://127.0.0.1:27017/apicompany";

// SQL Server
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

// MySQL
const mysqlConfig = {
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "payroll",
};

const run = async () => {
  try {
    // ==============================
    // 1️⃣ CONNECT DATABASE
    // ==============================
    await mongoose.connect(MONGO_URI);
    console.log("✅ Mongo connected");

    await sql.connect(sqlConfig);
    console.log("✅ SQL Server connected");

    const mysqlConn = await mysql.createConnection(mysqlConfig);
    console.log("✅ MySQL connected");

    // ==============================
    // 2️⃣ MODEL MONGO
    // ==============================
    const EmployeeSchema = new mongoose.Schema({}, { strict: false });
    const MongoEmployee = mongoose.model("Employee", EmployeeSchema);

    // ==============================
    // 3️⃣ CLEAR TABLE
    // ==============================
    await sql.query("DELETE FROM Employees");

    // ==============================
    // 4️⃣ LOAD SQL DATA (HR)
    // ==============================
    const sqlResult = await sql.query(`
      SELECT p.*, e.Employment_Status, e.Hire_Date
      FROM Personal p
      JOIN Employment e ON p.Employee_ID = e.Employee_ID
    `);

    const sqlData = sqlResult.recordset;
    console.log("SQL records:", sqlData.length);

    // ==============================
    // 5️⃣ LOAD MONGO DATA
    // ==============================
    const mongoData = await MongoEmployee.find().lean();
    console.log("Mongo records:", mongoData.length);

    const mongoMap = new Map();
    mongoData.forEach(m => {
      mongoMap.set(Number(m.employeeId), m);
    });

    // ==============================
    // 6️⃣ LOAD MYSQL DATA (PAYROLL)
    // ==============================
    const [mysqlData] = await mysqlConn.query(`
      SELECT 
        e.Employee_Number,
        e.Paid_To_Date,
        e.Paid_Last_Year,
        e.Vacation_Days,
        p.Pay_Amount,
        p.idPay_Rates
      FROM employee e
      LEFT JOIN pay_rates p 
        ON e.PayRates_id = p.idPay_Rates
    `);

    console.log("MySQL records:", mysqlData.length);

    const mysqlMap = new Map();
    mysqlData.forEach(m => {
      mysqlMap.set(Number(m.Employee_Number), m);
    });

    // ==============================
    // 7️⃣ BATCH INSERT
    // ==============================
    const batchSize = 2000;
    let insertedCount = 0;

    for (let i = 0; i < sqlData.length; i += batchSize) {
      const batch = sqlData.slice(i, i + batchSize);

      const table = new sql.Table("dbo.Employees");
      table.create = false;

      // columns
      table.columns.add("EmployeeId", sql.NVarChar(50), { nullable: false });
      table.columns.add("FirstName", sql.NVarChar(50));
      table.columns.add("LastName", sql.NVarChar(50));
      table.columns.add("Email", sql.NVarChar(100));
      table.columns.add("Phone", sql.NVarChar(20));
      table.columns.add("City", sql.NVarChar(50));
      table.columns.add("Country", sql.NVarChar(50));
      table.columns.add("IsShareholder", sql.Bit);
      table.columns.add("EmploymentStatus", sql.NVarChar(50));
      table.columns.add("HireDate", sql.DateTime);
      table.columns.add("VacationDays", sql.Int);
      table.columns.add("PaidToDate", sql.Float);
      table.columns.add("PaidLastYear", sql.Float);
      table.columns.add("PayRate", sql.Float);
      table.columns.add("PayRateId", sql.Int);

      // ==============================
      // 8️⃣ MERGE 3 DATABASE
      // ==============================
      batch.forEach(s => {
        const id = Number(s.Employee_ID);

        const m = mongoMap.get(id);
        const my = mysqlMap.get(id);

        if (!m && !my) {
          console.log("❌ Missing ALL:", id);
          return;
        }

        if (!m) console.log("⚠️ Missing Mongo:", id);
        if (!my) console.log("⚠️ Missing MySQL:", id);

        // table.rows.add(
        //   id,

        //   // Name
        //   s.First_Name || m?.firstName || null,
        //   s.Last_Name || m?.lastName || null,

        //   // Contact
        //   s.Email || null,
        //   s.Phone_Number || null,
        //   s.City || null,
        //   s.State || null,

        //   // HR
        //   s.Shareholder_Status || null,
        //   s.Employment_Status || null,
        //   s.Hire_Date || null,

        //   // Vacation (ưu tiên MySQL)
        //   my?.Vacation_Days ?? m?.vacationDays ?? 0,

        //   // Earnings
        //   my?.Paid_To_Date ?? m?.paidToDate ?? 0,
        //   my?.Paid_Last_Year ?? m?.paidLastYear ?? 0,

        //   // PayRate
        //   my?.Pay_Amount ?? m?.payRate ?? 0,
        //   my?.idPay_Rates ?? m?.payRateId ?? null
        // );
        table.rows.add(
  String(id),

  // Name
  String(s.First_Name ?? m?.firstName ?? ""),
  String(s.Last_Name ?? m?.lastName ?? ""),

  // Contact
  String(s.Email ?? ""),
  String(s.Phone_Number ?? ""),
  String(s.City ?? ""),
  String(s.State ?? ""),

  // HR
  Boolean(s.Shareholder_Status ?? false),
  String(s.Employment_Status ?? ""),
  s.Hire_Date ? new Date(s.Hire_Date) : null,

  // Vacation
  Number(my?.Vacation_Days ?? m?.vacationDays ?? 0),

  // Earnings
  Number(my?.Paid_To_Date ?? m?.paidToDate ?? 0),
  Number(my?.Paid_Last_Year ?? m?.paidLastYear ?? 0),

  // PayRate
  Number(my?.Pay_Amount ?? m?.payRate ?? 0),
  Number(my?.idPay_Rates ?? m?.payRateId ?? 0)
);
      });

      // ==============================
      // 9️⃣ INSERT
      // ==============================
      if (table.rows.length > 0) {
        const request = new sql.Request();
        await request.bulk(table);
        insertedCount += table.rows.length;
        console.log(`✅ Inserted ${insertedCount}`);
      }
    }

    console.log("🎉 DONE:", insertedCount);

    process.exit();
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
};

run();