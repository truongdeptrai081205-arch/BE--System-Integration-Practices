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

router.put("/update/:id", async (req, res) => {
  try {
    await sql.connect(sqlConfig);

    const id = req.params.id;

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

    //  convert Gender -> bit
    let genderBit;
    if (Gender?.toLowerCase() === "male") genderBit = 1;
    else if (Gender?.toLowerCase() === "female") genderBit = 0;
    else genderBit = null;

    //  convert Shareholder_Status -> bit
    // let shareholderBit;
    // if (Shareholder_Status?.toLowerCase() === "yes") shareholderBit = 1;
    // else if (Shareholder_Status?.toLowerCase() === "no") shareholderBit = 0;
    // else shareholderBit = null;
    const shareholderBit = Shareholder_Status;

    const result = await sql.query`
      UPDATE HR.dbo.Personal
      SET 
        First_Name = ${First_Name},
        Last_Name = ${Last_Name},
        Email = ${Email},
        Phone_Number = ${Phone_Number},
        City = ${City},
        State = ${State},
        Shareholder_Status = ${shareholderBit},
        Gender = ${genderBit}
      WHERE Employee_ID = ${id}
    `;

    // check có update không
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Không tìm thấy Employee_ID" });
    }

    res.json({ message: "Sửa trong HR thành công" });

  } catch (err) {
    console.error("Lỗi chi tiết:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;