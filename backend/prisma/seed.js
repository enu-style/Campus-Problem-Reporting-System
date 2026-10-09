const prisma = require("../src/config/prisma");

async function main() {
  const roles = [
    { name: "STUDENT" },
    { name: "STAFF" },
    { name: "DEPARTMENT_OFFICER" },
    { name: "ADMINISTRATOR" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log("Roles created successfully");
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
