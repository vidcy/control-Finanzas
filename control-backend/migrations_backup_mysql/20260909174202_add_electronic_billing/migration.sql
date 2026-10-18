/*
  Warnings:

  - You are about to drop the column `advisorId` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `commissionAmount` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `commissionPercentage` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the `transactionitem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_advisorId_fkey`;

-- DropForeignKey
ALTER TABLE `transactionitem` DROP FOREIGN KEY `TransactionItem_advisorId_fkey`;

-- DropForeignKey
ALTER TABLE `transactionitem` DROP FOREIGN KEY `TransactionItem_productId_fkey`;

-- DropForeignKey
ALTER TABLE `transactionitem` DROP FOREIGN KEY `TransactionItem_transactionId_fkey`;

-- DropIndex
DROP INDEX `Transaction_advisorId_fkey` ON `transaction`;

-- AlterTable
ALTER TABLE `advisor` ADD COLUMN `commissionModelId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `category` MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL;

-- AlterTable
ALTER TABLE `transaction` DROP COLUMN `advisorId`,
    DROP COLUMN `commissionAmount`,
    DROP COLUMN `commissionPercentage`,
    ADD COLUMN `destinationAccount` VARCHAR(191) NULL,
    ADD COLUMN `originAccount` VARCHAR(191) NULL,
    MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `cashRegisterPin` VARCHAR(191) NULL,
    ADD COLUMN `hasElectronicBilling` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isSelfRegistered` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `nubefactToken` VARCHAR(191) NULL,
    ADD COLUMN `nubefactUrl` VARCHAR(191) NULL,
    ADD COLUMN `trialEndsAt` DATETIME(3) NULL;

-- DropTable
DROP TABLE `transactionitem`;

-- CreateTable
CREATE TABLE `Sale` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `workspace` VARCHAR(191) NOT NULL DEFAULT 'PERSONAL',
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cashShiftId` VARCHAR(191) NULL,
    `paymentMethod` ENUM('CASH', 'CARD', 'TRANSFER', 'YAPE', 'PLIN') NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` ENUM('PEN', 'USD') NOT NULL DEFAULT 'PEN',
    `exchangeRate` DOUBLE NULL,
    `amountSoles` DOUBLE NULL,
    `advisorId` VARCHAR(191) NULL,
    `billingType` VARCHAR(191) NOT NULL,
    `billingStatus` VARCHAR(191) NULL,
    `billingNumber` INTEGER NULL,
    `billingSerie` VARCHAR(191) NULL,
    `billingError` TEXT NULL,
    `billingPdfUrl` TEXT NULL,
    `billingXmlUrl` TEXT NULL,
    `billingCdrUrl` TEXT NULL,
    `clientDocumentType` VARCHAR(191) NULL,
    `clientDocumentNumber` VARCHAR(191) NULL,
    `clientDenomination` VARCHAR(191) NULL,
    `clientAddress` VARCHAR(191) NULL,
    `clientEmail` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleItem` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,
    `commissionType` VARCHAR(191) NULL,
    `commissionValue` DOUBLE NULL,
    `commissionAmount` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Commission` (
    `id` VARCHAR(191) NOT NULL,
    `advisorId` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `isAdditional` BOOLEAN NOT NULL DEFAULT false,
    `transactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Commission_transactionId_key`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommissionModel` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL DEFAULT 0.0,
    `applyTo` VARCHAR(191) NOT NULL DEFAULT 'SALE',
    `minCommission` DOUBLE NOT NULL DEFAULT 0.0,
    `maxCommission` DOUBLE NULL,
    `allowDiscounts` BOOLEAN NOT NULL DEFAULT true,
    `allowManualEdit` BOOLEAN NOT NULL DEFAULT true,
    `isAdditional` BOOLEAN NOT NULL DEFAULT false,
    `categoryIds` JSON NULL,
    `brandIds` JSON NULL,
    `productIds` JSON NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_cashShiftId_fkey` FOREIGN KEY (`cashShiftId`) REFERENCES `CashShift`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_advisorId_fkey` FOREIGN KEY (`advisorId`) REFERENCES `Advisor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Commission` ADD CONSTRAINT `Commission_advisorId_fkey` FOREIGN KEY (`advisorId`) REFERENCES `Advisor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Commission` ADD CONSTRAINT `Commission_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Advisor` ADD CONSTRAINT `Advisor_commissionModelId_fkey` FOREIGN KEY (`commissionModelId`) REFERENCES `CommissionModel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommissionModel` ADD CONSTRAINT `CommissionModel_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
