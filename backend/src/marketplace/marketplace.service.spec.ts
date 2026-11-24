import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service.js';

// Client queries createOrder makes before it checks prescriptions.
const cartWith = (items: any[]) => {
  const client = {
    query: vi
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // ensure cart exists
      .mockResolvedValueOnce({ rows: [{ cart_id: 1, patient_id: 7, pharmacy_id: 2 }] }) // lock cart
      .mockResolvedValueOnce({ rows: [{ pharmacy_id: 2 }] }) // pharmacy active
      .mockResolvedValueOnce({ rows: items }), // cart items
  };
  return client;
};

describe('MarketplaceService.createOrder prescriptions', () => {
  let service: MarketplaceService;
  let db: any;
  let upload: any;

  beforeEach(() => {
    db = { query: vi.fn(), transaction: vi.fn() };
    upload = {
      savePrescriptionImage: vi.fn().mockResolvedValue('prescriptions/patient-7/photo.jpg'),
      removeStoredFile: vi.fn().mockResolvedValue(undefined),
    };
    service = new MarketplaceService(db, {} as any, upload);
  });

  const rxItem = { item_id: 1, medicine_id: 5, quantity: 1, unit_price: '100', medicine_name: 'Amoxicillin 500mg', requires_prescription: true };

  it('rejects prescription-only medicine with no prescription', async () => {
    const client = cartWith([rxItem]);
    db.transaction.mockImplementation((cb: any) => cb(client));

    await expect(
      service.createOrder(7, { paymentMethod: 'CASH_ON_COLLECTION' }),
    ).rejects.toThrow(/prescription is needed for: Amoxicillin 500mg/);
    expect(upload.savePrescriptionImage).not.toHaveBeenCalled();
  });

  it('removes the uploaded photo when the order fails', async () => {
    const client = cartWith([rxItem]);
    db.transaction.mockImplementation(async (cb: any) => {
      await cb(client);
      throw new BadRequestException('later failure');
    });
    // Let the order get past the prescription check, then fail.
    client.query.mockResolvedValue({ rows: [{ available_quantity: 0, unit_price: null }] });

    await expect(
      service.createOrder(7, { paymentMethod: 'CASH_ON_COLLECTION' }, { buffer: Buffer.from('x') } as any),
    ).rejects.toThrow();
    expect(upload.savePrescriptionImage).toHaveBeenCalledWith(7, expect.anything());
    expect(upload.removeStoredFile).toHaveBeenCalledWith('prescriptions/patient-7/photo.jpg', 'prescriptions');
  });

  it('rejects an over-long prescription number before touching the cart', async () => {
    await expect(
      service.createOrder(7, { paymentMethod: 'CASH_ON_COLLECTION', prescriptionReference: 'X'.repeat(101) }),
    ).rejects.toThrow(/cannot exceed 100/);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
