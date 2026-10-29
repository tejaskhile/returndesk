const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const statuses = [
  ...Array(8).fill("OPEN"),
  ...Array(8).fill("IN_REVIEW"),
  ...Array(7).fill("APPROVED"),
  ...Array(6).fill("REJECTED"),
  ...Array(6).fill("COMPLETED"),
];

const reasons = [
  "DAMAGED",
  "WRONG_ITEM",
  "SIZE_ISSUE",
  "NOT_AS_DESCRIBED",
  "CHANGED_MIND",
];

const names = [
  "Aarav Sharma",
  "Priya Nair",
  "Rohan Mehta",
  "Ananya Patel",
  "Ishaan Gupta",
  "Kavya Rao",
  "Arjun Desai",
  "Meera Iyer",
  "Aditya Joshi",
  "Diya Shah",
  "Vihaan Kumar",
  "Sara Khan",
  "Reyansh Verma",
  "Aisha Reddy",
  "Kabir Singh",
  "Anika Das",
  "Dev Malhotra",
  "Ira Menon",
  "Neel Kapoor",
  "Tara Kulkarni",
  "Yash Sinha",
  "Nisha Pillai",
  "Krish Bansal",
  "Riya Chawla",
  "Samar Roy",
  "Myra Jain",
  "Ayaan Bose",
  "Zoya Fernandes",
  "Vivaan Arora",
  "Avni Mishra",
  "Dhruv Shetty",
  "Pooja Kulkarni",
  "Manav Thakur",
  "Simran Kaur",
  "Om Prakash",
];

const itemNames = [
  "Classic Cotton T-Shirt",
  "Linen Shirt",
  "Running Shoes",
  "Wireless Headphones",
  "Everyday Backpack",
  "Denim Jeans",
  "Ceramic Mug Set",
];

const noteTexts = [
  "Initial return details reviewed by the support agent.",
  "Customer contacted support for clarification.",
  "Item information checked against the order.",
  "Return decision recorded for operational tracking.",
];

async function main() {
  console.log("Starting ReturnDesk seed...");

  for (let i = 0; i < 35; i++) {
    const number = i + 1;
    const status = statuses[i];
    const reason = reasons[i % reasons.length];
    const resolution =
      status === "APPROVED" || status === "COMPLETED"
        ? i % 2 === 0
          ? "REFUND"
          : "STORE_CREDIT"
        : null;

    const refundAmount = resolution === "REFUND" ? 25 + (i % 8) * 10 : null;

    // A few archived examples help exercise the Removed page.
    const isArchived = [2, 26].includes(i);

    const reference = `RET-SEED-${String(number).padStart(4, "0")}`;

    const requestData = {
      reference,
      customerName: names[i],
      customerEmail: `customer${number}@example.com`,
      customerPhone: `900000${String(number).padStart(4, "0")}`,
      orderNumber: `ORDER-SEED-${String(number).padStart(4, "0")}`,
      itemSku: `SKU-SEED-${String(number).padStart(4, "0")}`,
      itemName: itemNames[i % itemNames.length],
      quantity: (i % 3) + 1,
      reason,
      status,
      resolution,
      refundAmount,
      archivedAt: isArchived ? new Date() : null,
    };

    const savedRequest = await prisma.returnRequest.upsert({
      where: { reference },
      update: {},
      create: requestData,
    });

    // Add sample notes without duplicating them on repeated seed runs.
    const existingNotes = await prisma.note.count({
      where: { requestId: savedRequest.id },
    });

    if (existingNotes === 0 && i % 3 === 0) {
      await prisma.note.create({
        data: {
          requestId: savedRequest.id,
          content: noteTexts[i % noteTexts.length],
        },
      });
    }

    console.log(`Seeded ${reference} (${status})`);
  }

  const total = await prisma.returnRequest.count();
  const noteTotal = await prisma.note.count();

  console.log(`Seed complete. Total requests in database: ${total}`);
  console.log(`Total notes in database: ${noteTotal}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
