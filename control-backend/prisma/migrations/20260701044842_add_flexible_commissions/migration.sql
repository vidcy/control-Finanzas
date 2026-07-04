-- AlterTable
ALTER TABLE `Product` ADD COLUMN `commissionType` VARCHAR(191) NOT NULL DEFAULT 'PERCENT',
    ADD COLUMN `commissionValue` DOUBLE NOT NULL DEFAULT 0.0,
    ADD COLUMN `priceWithAgent` DOUBLE NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `agentRolePlural` VARCHAR(191) NOT NULL DEFAULT 'Asesores',
    ADD COLUMN `agentRoleSingular` VARCHAR(191) NOT NULL DEFAULT 'Asesor de venta',
    ADD COLUMN `defaultCommissionModel` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE';

-- CreateTable
CREATE TABLE `TransactionItem` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,
    `commissionAccrued` DOUBLE NOT NULL,
    `advisorId` VARCHAR(191) NULL,
    `presentationId` VARCHAR(191) NULL,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TransactionItem` ADD CONSTRAINT `TransactionItem_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionItem` ADD CONSTRAINT `TransactionItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionItem` ADD CONSTRAINT `TransactionItem_advisorId_fkey` FOREIGN KEY (`advisorId`) REFERENCES `Advisor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
