/*
  Warnings:

  - You are about to drop the column `day` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `transaction` DROP COLUMN `day`,
    DROP COLUMN `month`,
    DROP COLUMN `year`;
