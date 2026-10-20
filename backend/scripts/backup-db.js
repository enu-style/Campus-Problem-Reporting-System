const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, "../backups");

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set in .env");
  process.exit(1);
}

// Parse the database name from DATABASE_URL
// Format: postgresql://user:password@host:port/dbname
const dbMatch = DATABASE_URL.match(/\/([^/?]+)$/);
const DB_NAME = dbMatch ? dbMatch[1] : "injibara_campus_reporting";

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_FILE = path.join(BACKUP_DIR, `injibara_backup_${TIMESTAMP}.sql`);

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log(`Starting backup of database "${DB_NAME}"...`);
console.log(`Backup file: ${BACKUP_FILE}`);

try {
  // Use pg_dump to create a backup
  // Extract connection parameters from DATABASE_URL
  const urlMatch = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!urlMatch) {
    console.error("ERROR: Could not parse DATABASE_URL");
    process.exit(1);
  }

  const [, dbUser, dbPassword, dbHost, dbPort, dbName] = urlMatch;

  const env = {
    ...process.env,
    PGPASSWORD: dbPassword,
  };

  execSync(
    `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password --verbose --file="${BACKUP_FILE}"`,
    { env, stdio: "inherit" },
  );

  console.log(`\nBackup completed successfully: ${BACKUP_FILE}`);
} catch (error) {
  console.error("Backup failed:", error.message);
  process.exit(1);
}