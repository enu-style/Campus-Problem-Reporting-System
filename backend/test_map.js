require("dotenv").config();
const prisma = require("./src/config/prisma");
async function main() {
  const c = await prisma.complaint.create({
    data: {
      title: "Test Map Complaint",
      description: "Testing map coordinates",
      priority: "MEDIUM",
      reportedById: 1,
      categoryId: 1,
      latitude: 10.9897,
      longitude: 36.9335,
    },
    select: { id: true, title: true, latitude: true, longitude: true },
  });
  console.log("Created:", JSON.stringify(c));
  await prisma.complaint.delete({ where: { id: c.id } });
  console.log("Cleaned up");
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
