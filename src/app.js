import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

// Routes
import indexRoutes from "./routes/index.routes.js";
import productRoutes from "./routes/products.routes.js";
import usersRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import dashboardRoutes from "./routes/dashboard.js";
import personalRoutes from "./routes/personal.js";
import summaryRoutes from "./routes/summary.js";
import employmentRoutes from "./routes/employment.js";
import benefitPlansRoutes from "./routes/benefitplans.js";
import employeeRoutes2 from "./routes/employee.js";
import earningsRoutes from "./routes/earnings.js";
import vacationRoutes from "./routes/vacation.js";
import benefitsRoutes from "./routes/benefits.js";
import birthdayRoutes from "./routes/birthday.js";
import anniversaryRoutes from "./routes/anniversary.js";
import summarydashbordRoutes from "./routes/SumDashbord.js";
import addpersonalRoutes from "./routes/appPersonalList.js";
import editpersonalRoutes from "./routes/editPersonalList.js";
import deletePersonalRoutes from "./routes/deletePersonal.js";
import employmentRatio from "./routes/employmentRatio.js";
import sumsumRoutes from "./routes/sumsum.js";
const app = express();

// Settings
app.set("port", process.env.PORT || 4000);
app.set("json spaces", 4);

// Middlewares
app.use(
  cors({
    // origin: "http://localhost:3000",
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use("/api", indexRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/personal", personalRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/employment", employmentRoutes);
app.use("/api/benefit-plans", benefitPlansRoutes);
app.use("/api/employee2", employeeRoutes2);
app.use("/api/earnings", earningsRoutes);
app.use("/api/alerts/vacation", vacationRoutes);
app.use("/api/benefits", benefitsRoutes);
app.use("/api/alerts/birthday", birthdayRoutes);
app.use("/api/alerts/anniversary", anniversaryRoutes);
app.use("/api/sumdashboard", summarydashbordRoutes);
app.use("/api/appPersonalList", addpersonalRoutes);
app.use("/api/editPersonalList", editpersonalRoutes);
app.use("/api/deletePersonal", deletePersonalRoutes);
app.use("/api/employment-ratio", employmentRatio);
app.use("/api/sumsum", sumsumRoutes);

export default app;
