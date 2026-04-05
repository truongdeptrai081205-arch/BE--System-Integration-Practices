
import mongoose from "mongoose";
import sql from "mssql";

const MONGO_URI = "mongodb://127.0.0.1:27017/apicompany";

const sqlConfig = {
  user: "sa",
  password: "a123456*", // sửa password của bạn
  server: "DESKTOP-3GBH081\\MSSQLSERVER03",
  database: "HR",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const run = async () => {
  try {
    // 1️⃣ Connect Mongo
    await mongoose.connect(MONGO_URI);
    console.log("✅ Mongo connected");

    const EmployeeSchema = new mongoose.Schema({}, { strict: false });
    const MongoEmployee = mongoose.model("Employee", EmployeeSchema);

    // 2️⃣ Connect SQL
    await sql.connect(sqlConfig);
    console.log("✅ SQL connected");
    await sql.query("DELETE FROM Employees");

    // 3️⃣ Lấy dữ liệu SQL
    const sqlResult = await sql.query(`
      SELECT p.*, e.Employment_Status, e.Hire_Date
      FROM Personal p
      JOIN Employment e ON p.Employee_ID = e.Employee_ID
    `);

    const sqlData = sqlResult.recordset;
    console.log("SQL records:", sqlData.length);

    // 4️⃣ Lấy dữ liệu Mongo
    const mongoData = await MongoEmployee.find().lean();
    console.log("Mongo records:", mongoData.length);

    // 5️⃣ Map Mongo bằng employeeId
    const mongoMap = new Map();
   mongoData.forEach(m => {
    mongoMap.set(Number(m.employeeId), m);
    });

    // const m = mongoMap.get(Number(s.Employee_ID));

    // 6️⃣ Batch size
    const batchSize = 2000;
    let insertedCount = 0;

    for (let i = 0; i < sqlData.length; i += batchSize) {
      const batch = sqlData.slice(i, i + batchSize);

      const table = new sql.Table("dbo.Employees");
      table.create = false;

      // 7️⃣ Define columns
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

      // 8️⃣ Add rows, chỉ merge nếu có dữ liệu Mongo
      batch.forEach(s => {
        const m = mongoMap.get(Number(s.Employee_ID));

       if (!m) {
    console.log("❌ Không match Mongo:", s.Employee_ID);
    return;
  }

        table.rows.add(
          m.employeeId,           // dùng Mongo ID để unique
          s.First_Name || m?.firstName,
          s.Last_Name || m?.lastName,
          s.Email,
          s.Phone_Number,
          s.City,
          s.State,
          s.Shareholder_Status,
          s.Employment_Status,
          s.Hire_Date,
         m?.vacationDays ?? null,
        m?.paidToDate ?? null,
        m?.paidLastYear ?? null,
        m?.payRate ?? null,
        m?.payRateId ?? null
        );
      });

      // 9️⃣ Bulk insert
      if (table.rows.length > 0) {
        const request = new sql.Request();
        await request.bulk(table);
        insertedCount += table.rows.length;
        console.log(`✅ Inserted ${insertedCount} rows so far`);
      }
    }

    console.log("🎉 DONE, total inserted:", insertedCount);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();