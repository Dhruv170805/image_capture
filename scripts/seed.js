/**
 * Data Migration Script
 * Reads a specified CSV file and seeds MongoDB Atlas
 * Usage: node scripts/seed.js <path-to-csv>
 */

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Employee = require("../server/models/Employee");
const { connectDB } = require("../server/config/db");

const csvArg = process.argv[2];

if (!csvArg) {
  console.error("❌ Error: Please provide a path to a CSV file.");
  console.log("Usage: node scripts/seed.js <path-to-csv>");
  process.exit(1);
}

const CSV_PATH = path.isAbsolute(csvArg) ? csvArg : path.join(process.cwd(), csvArg);

async function seed() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ Error: File not found at ${CSV_PATH}`);
    process.exit(1);
  }

  await connectDB();

  console.log(`📖 Reading CSV from ${CSV_PATH}...`);
  const employees = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => {
        // Flexible mapping
        const code = (row.EmployeeCode || row.empcode || row.Code || "").toString().trim().toUpperCase();
        const name = (row.Name || row.name || row.fullname || "").toString().trim();
        const dept = (row.Department || row.desc || row.department || row.DepartmentName || "General").toString().trim();

        if (code && name) {
          employees.push({
            EmployeeCode: code,
            Name: name,
            Department: dept,
            IsActive: true,
          });
        }
      })
      .on("end", async () => {
        try {
          if (employees.length === 0) {
            console.log("⚠️ No valid employees found in CSV. Check headers.");
            mongoose.connection.close();
            return resolve();
          }

          console.log(`🚀 Upserting ${employees.length} employees...`);
          
          const operations = employees.map(emp => ({
            updateOne: {
              filter: { EmployeeCode: emp.EmployeeCode },
              update: { $set: emp },
              upsert: true
            }
          }));

          await Employee.bulkWrite(operations);

          console.log("✅ Seeding completed successfully!");
          mongoose.connection.close();
          resolve();
        } catch (err) {
          console.error("❌ Seeding failed:", err);
          mongoose.connection.close();
          reject(err);
        }
      })
      .on("error", (err) => {
        console.error("❌ Error reading CSV:", err);
        mongoose.connection.close();
        reject(err);
      });
  });
}

seed();
