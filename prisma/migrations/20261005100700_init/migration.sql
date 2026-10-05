-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SME" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "institute" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "location" TEXT,

    CONSTRAINT "SME_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SMEWorkEntry" (
    "id" TEXT NOT NULL,
    "smeId" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "attendanceFrom" TIMESTAMP(3),
    "attendanceTo" TIMESTAMP(3),
    "days" DOUBLE PRECISION,
    "ratePerDay" DOUBLE PRECISION,
    "taAmount" DOUBLE PRECISION,
    "otherAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "topicId" TEXT,
    "epicSequence" SERIAL NOT NULL,

    CONSTRAINT "SMEWorkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "workEntryId" TEXT NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "taAmount" DOUBLE PRECISION,
    "otherAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "utrNumber" TEXT,
    "paymentDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetHeadId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetHead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "approvedBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilizedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expenditure" (
    "id" TEXT NOT NULL,
    "budgetHeadId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "hrSalaryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expenditure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanResource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRSalary" (
    "id" TEXT NOT NULL,
    "hrId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "utrNumber" TEXT,
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HRSalary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "filePath" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "workEntryId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousData" TEXT,
    "newData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Status" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tradeId" TEXT,
    "languageId" TEXT,
    "statusId" TEXT,
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "moduleNumber" TEXT NOT NULL,
    "name" TEXT,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "videoUrl" TEXT,
    "shootDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "sheetName" TEXT,
    "importedBy" TEXT NOT NULL,
    "importDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "originalRow" INTEGER NOT NULL,
    "rawData" TEXT NOT NULL,
    "projectId" TEXT,
    "smeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,

    CONSTRAINT "LegacyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeputationLetter" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "letterDate" TIMESTAMP(3) NOT NULL,
    "year" TEXT NOT NULL,
    "smeId" TEXT NOT NULL,
    "projectId" TEXT,
    "approvalPeriod" TEXT NOT NULL,
    "extensionDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "pdfPath" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeputationLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetComponent" (
    "id" TEXT NOT NULL,
    "componentNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approvedBudget" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnexureI" (
    "id" TEXT NOT NULL,
    "budgetComponentId" TEXT NOT NULL,
    "datePeriod" TEXT NOT NULL,
    "expertName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "workingDays" DOUBLE PRECISION NOT NULL,
    "honorarium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenditure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utrNumber" TEXT,
    "contentDuration" TEXT,
    "approvalRef" TEXT,
    "remarks" TEXT,
    "supportingDoc" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnexureI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnexureII" (
    "id" TEXT NOT NULL,
    "budgetComponentId" TEXT NOT NULL,
    "datePeriod" TEXT NOT NULL,
    "trainingName" TEXT NOT NULL,
    "trainingType" TEXT NOT NULL,
    "participant" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "noOfParticipants" INTEGER NOT NULL DEFAULT 0,
    "trainingDays" DOUBLE PRECISION NOT NULL,
    "trainerFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trainingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accommodation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenditure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utrNumber" TEXT,
    "approvalRef" TEXT,
    "remarks" TEXT,
    "supportingDoc" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainingDates" TEXT,

    CONSTRAINT "AnnexureII_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnexureIII" (
    "id" TEXT NOT NULL,
    "budgetComponentId" TEXT NOT NULL,
    "datePeriod" TEXT NOT NULL,
    "personnelName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "supportType" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "workPeriod" TEXT NOT NULL,
    "remuneration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taDa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenditure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utrNumber" TEXT,
    "approvalRef" TEXT,
    "remarks" TEXT,
    "supportingDoc" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnexureIII_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnexureIV" (
    "id" TEXT NOT NULL,
    "budgetComponentId" TEXT NOT NULL,
    "datePeriod" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "purchaseRef" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "servicePeriod" TEXT NOT NULL,
    "infrastructureCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bandwidthCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archiveCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenditure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoiceNo" TEXT,
    "utrNumber" TEXT,
    "remarks" TEXT,
    "supportingDoc" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnexureIV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnexureV" (
    "id" TEXT NOT NULL,
    "budgetComponentId" TEXT NOT NULL,
    "datePeriod" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenditure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vendor" TEXT NOT NULL,
    "invoiceNo" TEXT,
    "utrNumber" TEXT,
    "remarks" TEXT,
    "supportingDoc" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnexureV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnexureVI" (
    "id" TEXT NOT NULL,
    "budgetComponentId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "campaignDesc" TEXT NOT NULL,
    "datePeriod" TEXT NOT NULL,
    "serviceProvider" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenditure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utrNumber" TEXT,
    "approvalRef" TEXT,
    "remarks" TEXT,
    "supportingDoc" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnexureVI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoLibrary" (
    "id" TEXT NOT NULL,
    "smeName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "videoLink" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "duration" TEXT,
    "trade" TEXT,

    CONSTRAINT "VideoLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetHead_name_key" ON "BudgetHead"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Language_name_key" ON "Language"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Status_name_key" ON "Status"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_name_key" ON "Trade"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetComponent_componentNo_key" ON "BudgetComponent"("componentNo");

-- AddForeignKey
ALTER TABLE "SMEWorkEntry" ADD CONSTRAINT "SMEWorkEntry_smeId_fkey" FOREIGN KEY ("smeId") REFERENCES "SME"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMEWorkEntry" ADD CONSTRAINT "SMEWorkEntry_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workEntryId_fkey" FOREIGN KEY ("workEntryId") REFERENCES "SMEWorkEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenditure" ADD CONSTRAINT "Expenditure_budgetHeadId_fkey" FOREIGN KEY ("budgetHeadId") REFERENCES "BudgetHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenditure" ADD CONSTRAINT "Expenditure_hrSalaryId_fkey" FOREIGN KEY ("hrSalaryId") REFERENCES "HRSalary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expenditure" ADD CONSTRAINT "Expenditure_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRSalary" ADD CONSTRAINT "HRSalary_hrId_fkey" FOREIGN KEY ("hrId") REFERENCES "HumanResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workEntryId_fkey" FOREIGN KEY ("workEntryId") REFERENCES "SMEWorkEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegacyRecord" ADD CONSTRAINT "LegacyRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeputationLetter" ADD CONSTRAINT "DeputationLetter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeputationLetter" ADD CONSTRAINT "DeputationLetter_smeId_fkey" FOREIGN KEY ("smeId") REFERENCES "SME"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnexureI" ADD CONSTRAINT "AnnexureI_budgetComponentId_fkey" FOREIGN KEY ("budgetComponentId") REFERENCES "BudgetComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnexureII" ADD CONSTRAINT "AnnexureII_budgetComponentId_fkey" FOREIGN KEY ("budgetComponentId") REFERENCES "BudgetComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnexureIII" ADD CONSTRAINT "AnnexureIII_budgetComponentId_fkey" FOREIGN KEY ("budgetComponentId") REFERENCES "BudgetComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnexureIV" ADD CONSTRAINT "AnnexureIV_budgetComponentId_fkey" FOREIGN KEY ("budgetComponentId") REFERENCES "BudgetComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnexureV" ADD CONSTRAINT "AnnexureV_budgetComponentId_fkey" FOREIGN KEY ("budgetComponentId") REFERENCES "BudgetComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnexureVI" ADD CONSTRAINT "AnnexureVI_budgetComponentId_fkey" FOREIGN KEY ("budgetComponentId") REFERENCES "BudgetComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

