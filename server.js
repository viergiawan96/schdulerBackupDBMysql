const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Hardcode konfigurasi MySQL
const username = "username"; // Ganti dengan username MySQL
const password = "password"; // Ganti dengan password MySQL
const host = "host"; // Ganti dengan IP atau hostname server MySQL

// Setup folder dan file log
const today = new Date();
const hours = today.getHours();
const minutes = today.getMinutes();
const seconds = today.getSeconds();

const logDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
  2,
  "0"
)}-${String(today.getDate()).padStart(2, "0")}-${hours}${minutes}${seconds}`;

const logFolder = path.join(__dirname, "error_log");
const logFile = path.join(logFolder, `${logDate}.log`);

// Cek dan buat folder log jika belum ada
if (!fs.existsSync(logFolder)) {
  fs.mkdirSync(logFolder, { recursive: true });
}

// Buat stream untuk log error
const logStream = fs.createWriteStream(logFile, { flags: "a" });

const backupDatabase = async () => {
  try {
    // Buat folder backup berdasarkan tanggal
    const dateFolder = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(
      2,
      "0"
    )}-${hours}${minutes}${seconds}`;

    const baseBackupPath = path.join(__dirname, dateFolder);

    // Cek dan buat folder jika belum ada
    if (!fs.existsSync(baseBackupPath)) {
      fs.mkdirSync(baseBackupPath, { recursive: true });
    }

    console.log(`Folder backup: ${baseBackupPath}`);

    // Ambil daftar schema
    const schemasCommand = `mysql -u ${username} --password="${password}" -h ${host} -e "SHOW DATABASES;" -s --skip-column-names`;
    exec(schemasCommand, (err, stdout, stderr) => {
      if (err) {
        console.error("Gagal mengambil daftar schema:", err.message);
        logStream.write(`Gagal mengambil daftar schema: ${err.message}\n`);
        return;
      }

      const schemas = stdout
        .split("\n")
        .map((schema) => schema.trim())
        .filter(
          (schema) =>
            schema &&
            schema !== "information_schema" &&
            schema !== "performance_schema" &&
            schema !== "sys" &&
            schema !== "mysql"
        );

      schemas.forEach((schema) => {
        const schemaFolder = path.join(baseBackupPath, schema);

        // Buat folder untuk schema
        if (!fs.existsSync(schemaFolder)) {
          fs.mkdirSync(schemaFolder);
        }

        console.log(`Backup schema: ${schema}`);

        // Ambil daftar tabel dalam schema
        const tablesCommand = `mysql -u ${username} --password="${password}" -h ${host} -e "SHOW TABLES IN ${schema};" -s --skip-column-names`;
        exec(tablesCommand, (err, stdout, stderr) => {
          if (err) {
            console.error(
              `Gagal mengambil daftar tabel untuk schema ${schema}:`,
              err.message
            );
            logStream.write(
              `Gagal mengambil daftar tabel untuk schema ${schema}: ${err.message}\n`
            );
            return;
          }

          const tables = stdout
            .split("\n")
            .map((table) => table.trim())
            .filter((table) => table);

          tables.forEach((table) => {
            const tableBackupFile = path.join(schemaFolder, `${table}.sql`);
            const tableDumpCommand = `mysqldump -u ${username} --password="${password}" -h ${host} ${schema} ${table} > "${tableBackupFile}"`;

            // Backup tabel ke file
            exec(tableDumpCommand, (err, stdout, stderr) => {
              if (err) {
                console.error(
                  `Gagal backup tabel ${table} di schema ${schema}:`,
                  err.message
                );
                logStream.write(
                  `Gagal backup tabel ${table} di schema ${schema}: ${err.message}\n`
                );
                return;
              }
              console.log(
                `Backup tabel ${table} selesai disimpan di ${tableBackupFile}`
              );
            });
          });
        });
      });
    });
  } catch (err) {
    console.error("Terjadi kesalahan:", err.message);
    logStream.write(`Terjadi kesalahan: ${err.message}\n`);
  }
};

// Jalankan fungsi backup
backupDatabase();
