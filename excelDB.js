// Very small "database" that stores rows in .xlsx files using ExcelJS.
// Every table (sheet) has an auto-incrementing numeric `id` as column 1.
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const { runExclusive } = require("./mutex");

async function loadWorkbook(filePath, sheetName, headers) {
  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(filePath)) {
    await workbook.xlsx.readFile(filePath);
  }
  let sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    sheet = workbook.addWorksheet(sheetName);
    sheet.addRow(headers);
  }
  return { workbook, sheet };
}

function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((h, i) => {
    const val = row.getCell(i + 1).value;
    obj[h] = val === null || val === undefined ? "" : val;
  });
  return obj;
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Read every row of a sheet as an array of plain objects. */
function readAll(filePath, sheetName, headers) {
  return runExclusive(filePath, async () => {
    ensureDir(filePath);
    const { sheet } = await loadWorkbook(filePath, sheetName, headers);
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header row
      rows.push(rowToObject(row, headers));
    });
    return rows;
  });
}

/** Insert a new row. Auto-assigns `id`. Returns the inserted object. */
function insert(filePath, sheetName, headers, data) {
  return runExclusive(filePath, async () => {
    ensureDir(filePath);
    const { workbook, sheet } = await loadWorkbook(filePath, sheetName, headers);
    let maxId = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const idVal = Number(row.getCell(1).value) || 0;
      if (idVal > maxId) maxId = idVal;
    });
    const record = { ...data, id: maxId + 1 };
    const rowValues = headers.map((h) =>
      record[h] === undefined || record[h] === null ? "" : record[h]
    );
    sheet.addRow(rowValues);
    await workbook.xlsx.writeFile(filePath);
    return record;
  });
}

/** Update the row whose `id` matches. Returns the updated object or null. */
function updateById(filePath, sheetName, headers, id, updates) {
  return runExclusive(filePath, async () => {
    ensureDir(filePath);
    const { workbook, sheet } = await loadWorkbook(filePath, sheetName, headers);
    let updated = null;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (Number(row.getCell(1).value) === Number(id)) {
        headers.forEach((h, i) => {
          if (updates[h] !== undefined) {
            row.getCell(i + 1).value = updates[h];
          }
        });
        updated = rowToObject(row, headers);
      }
    });
    if (updated) await workbook.xlsx.writeFile(filePath);
    return updated;
  });
}

/** Delete the row whose `id` matches. Returns true/false. */
function deleteById(filePath, sheetName, headers, id) {
  return runExclusive(filePath, async () => {
    ensureDir(filePath);
    const { workbook, sheet } = await loadWorkbook(filePath, sheetName, headers);
    let target = null;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (Number(row.getCell(1).value) === Number(id)) target = rowNumber;
    });
    if (target) {
      sheet.spliceRows(target, 1);
      await workbook.xlsx.writeFile(filePath);
      return true;
    }
    return false;
  });
}

module.exports = { readAll, insert, updateById, deleteById };
