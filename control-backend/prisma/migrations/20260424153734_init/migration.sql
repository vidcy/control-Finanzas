/*
  Warnings:

  - You are about to drop the column `parentId` on the `category` table. All the data in the column will be lost.
  - You are about to drop the `expensetransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `incometransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `category` DROP FOREIGN KEY `Category_parentId_fkey`;

-- DropForeignKey
ALTER TABLE `expensetransaction` DROP FOREIGN KEY `ExpenseTransaction_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `expensetransaction` DROP FOREIGN KEY `ExpenseTransaction_userId_fkey`;

-- DropForeignKey
ALTER TABLE `incometransaction` DROP FOREIGN KEY `IncomeTransaction_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `incometransaction` DROP FOREIGN KEY `IncomeTransaction_userId_fkey`;

-- AlterTable
ALTER TABLE `category` DROP COLUMN `parentId`;

-- DropTable
DROP TABLE `expensetransaction`;

-- DropTable
DROP TABLE `incometransaction`;
