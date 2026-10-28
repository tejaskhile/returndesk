-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'SIZE_ISSUE', 'NOT_AS_DESCRIBED', 'CHANGED_MIND');

-- CreateEnum
CREATE TYPE "Resolution" AS ENUM ('REFUND', 'REPLACEMENT', 'STORE_CREDIT');

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "orderNumber" TEXT NOT NULL,
    "itemSku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "ReturnReason" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "Resolution",
    "refundAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_reference_key" ON "ReturnRequest"("reference");

-- CreateIndex
CREATE INDEX "ReturnRequest_customerName_idx" ON "ReturnRequest"("customerName");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderNumber_idx" ON "ReturnRequest"("orderNumber");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "ReturnRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnRequest_reason_createdAt_idx" ON "ReturnRequest"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "Note_requestId_createdAt_idx" ON "Note"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- 1. Quantity must be positive.
ALTER TABLE "ReturnRequest"
ADD CONSTRAINT "ReturnRequest_quantity_positive"
CHECK ("quantity" > 0);

-- 2. A refund amount is allowed only for a Refund resolution,
-- and must be greater than zero.
ALTER TABLE "ReturnRequest"
ADD CONSTRAINT "ReturnRequest_refund_positive"
CHECK (
  "refundAmount" IS NULL
  OR (
    "resolution" = 'REFUND'
    AND "refundAmount" > 0
  )
);

-- 3. An Approved request must have a valid resolution
-- and the corresponding refund information.
ALTER TABLE "ReturnRequest"
ADD CONSTRAINT "ReturnRequest_approval_valid"
CHECK (
  "status" <> 'APPROVED'
  OR (
    "resolution" IS NOT NULL
    AND (
      (
        "resolution" = 'REFUND'
        AND "refundAmount" IS NOT NULL
        AND "refundAmount" > 0
      )
      OR (
        "resolution" IN ('REPLACEMENT', 'STORE_CREDIT')
        AND "refundAmount" IS NULL
      )
    )
  )
);

-- 4. Only one live request per order and item.
CREATE UNIQUE INDEX "ReturnRequest_one_live_per_order_item"
ON "ReturnRequest" ("orderNumber", "itemSku")
WHERE "status" NOT IN ('REJECTED', 'COMPLETED');
