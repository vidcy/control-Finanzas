import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { NubefactService } from '../nubefact/nubefact.service';
import { BadRequestException } from '@nestjs/common';
import { BillingDocTypeEnum } from './emit-billing.dto';

describe('BillingService (Unit Tests)', () => {
  let service: BillingService;
  let prismaMock: any;
  let nubefactMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      fiscalDocument: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sale: {
        update: jest.fn(),
      },
    };

    nubefactMock = {
      sendInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NubefactService, useValue: nubefactMock },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('calculateTaxBreakdown', () => {
    it('should correctly calculate Base Imponible and 18% IGV for Gravado items', () => {
      // 1 item of 118 PEN (should be 100 base + 18 IGV)
      const items = [{ quantity: 1, unitPrice: 118, igvType: 1 }];
      const breakdown = service.calculateTaxBreakdown(items);

      expect(breakdown.totalAmount).toBe(118);
      expect(breakdown.totalOpGravada).toBe(100);
      expect(breakdown.totalIgv).toBe(18);
      expect(breakdown.totalOpExonerada).toBe(0);
      expect(breakdown.totalOpInafecta).toBe(0);
    });

    it('should correctly handle multiple items with different tax categories', () => {
      const items = [
        { quantity: 2, unitPrice: 59, igvType: 1 }, // 118 gravado (100 base + 18 igv)
        { quantity: 1, unitPrice: 50, igvType: 8 }, // 50 exonerado
      ];
      const breakdown = service.calculateTaxBreakdown(items);

      expect(breakdown.totalAmount).toBe(168);
      expect(breakdown.totalOpGravada).toBe(100);
      expect(breakdown.totalIgv).toBe(18);
      expect(breakdown.totalOpExonerada).toBe(50);
    });
  });

  describe('validateCustomerIdentity', () => {
    it('should pass validation for a valid 11-digit RUC starting with 20', () => {
      expect(() => {
        service.validateCustomerIdentity(BillingDocTypeEnum.FACTURA, '6', '20601234567');
      }).not.toThrow();
    });

    it('should pass validation for a valid 11-digit RUC starting with 10', () => {
      expect(() => {
        service.validateCustomerIdentity(BillingDocTypeEnum.FACTURA, '6', '10456789012');
      }).not.toThrow();
    });

    it('should throw BadRequestException if Factura customer document is not RUC (code 6)', () => {
      expect(() => {
        service.validateCustomerIdentity(BillingDocTypeEnum.FACTURA, '1', '45678901');
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if RUC does not have 11 digits', () => {
      expect(() => {
        service.validateCustomerIdentity(BillingDocTypeEnum.FACTURA, '6', '206012345');
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if RUC starts with an invalid prefix', () => {
      expect(() => {
        service.validateCustomerIdentity(BillingDocTypeEnum.FACTURA, '6', '33601234567');
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if Boleta DNI does not have 8 digits', () => {
      expect(() => {
        service.validateCustomerIdentity(BillingDocTypeEnum.BOLETA, '1', '12345');
      }).toThrow(BadRequestException);
    });
  });

  describe('emitDocument simulation mode', () => {
    it('should generate a compliant document with hash, XML, CDR, and fullNumber', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        businessRuc: '20123456789',
        businessName: 'MI NEGOCIO SAC',
        hasElectronicBilling: false,
      });

      prismaMock.fiscalDocument.findFirst.mockResolvedValue(null);
      prismaMock.fiscalDocument.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({ id: 'doc-uuid-1', ...data });
      });

      const result = await service.emitDocument('user-1', {
        docType: BillingDocTypeEnum.FACTURA,
        customerDocType: '6',
        customerDocNum: '20609876543',
        customerName: 'CLIENTE VIP SAC',
        items: [{ quantity: 2, unitPrice: 100, description: 'Servicio Contable' }],
      });

      expect(result.success).toBe(true);
      expect(result.document.fullNumber).toBe('F001-00000001');
      expect(result.document.totalAmount).toBe(200);
      expect(result.document.hash).toBeDefined();
      expect(result.document.xmlUrl).toContain('F001-00000001.xml');
      expect(result.document.cdrUrl).toContain('R-F001-00000001.zip');
    });
  });
});
