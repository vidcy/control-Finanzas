-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `justified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `programmed` BOOLEAN NOT NULL DEFAULT false;
