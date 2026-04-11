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

router.delete("/delete/:id", async (req, res) => {
  try {
    await sql.connect(sqlConfig);

    const id = req.params.id;

    //  xóa bảng con trước
    await sql.query`
      DELETE FROM HR.dbo.Employment
      WHERE Employee_ID = ${id}
    `;

    //  rồi xóa bảng cha
    const result = await sql.query`
      DELETE FROM HR.dbo.Personal
      WHERE Employee_ID = ${id}
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Không tìm thấy Employee_ID" });
    }

    res.json({ message: "Xóa thành công cả Personal + Employment" });

  } catch (err) {
    console.error("Lỗi chi tiết:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;