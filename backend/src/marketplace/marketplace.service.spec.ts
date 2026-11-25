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

  it('rejects ordering more than is left on the prescription', async () => {
    const client = cartWith([{ ...rxItem, quantity: 10 }]);
    client.query
      .mockResolvedValueOnce({ rows: [{ prescription_id: 3, patient_id: 7, status: 'ACTIVE' }] }) // prescription (locked)
      .mockResolvedValueOnce({
        rows: [{ medicine_id: 5, medicine_name: 'Amoxicillin 500mg', strength: null, prescribed: 21, dispensed: 7, reserved: 7 }],
      });
    db.transaction.mockImplementation((cb: any) => cb(client));

    await expect(
      service.createOrder(7, { paymentMethod: 'CASH_ON_COLLECTION', prescriptionReference: 'RX-1' }),
    ).rejects.toThrow(/10 requested but only 7 of the 21 prescribed are left \(14 already given out or ordered\)/);
    // The balance counts this patient's other open orders on the same number.
    expect(client.query.mock.calls[5][1]).toEqual([3, 7, 'RX-1', null]);
  });

  it("rejects another patient's prescription number", async () => {
    const client = cartWith([rxItem]);
    client.query.mockResolvedValueOnce({ rows: [{ prescription_id: 3, patient_id: 99, status: 'ACTIVE' }] });
    db.transaction.mockImplementation((cb: any) => cb(client));

    await expect(
      service.createOrder(7, { paymentMethod: 'CASH_ON_COLLECTION', prescriptionReference: 'RX-1' }),
    ).rejects.toThrow(/not on your account/);
  });

  it('accepts a prescription number PharmaTrack does not know yet (the pharmacy checks it)', async () => {
    const client = cartWith([rxItem]);
    client.query
      .mockResolvedValueOnce({ rows: [] }) // unknown number
      .mockResolvedValueOnce({ rows: [{ available_quantity: 0, unit_price: null }] }); // then the stock check runs
    db.transaction.mockImplementation((cb: any) => cb(client));

    await expect(
      service.createOrder(7, { paymentMethod: 'CASH_ON_COLLECTION', prescriptionReference: 'SMS-123' }),
    ).rejects.toThrow(/out of stock at this pharmacy/); // got past the prescription check
  });

  it('rejects an over-long prescription number before touching the cart', async () => {
    await expect(
      service.createOrder(7, { paymentMethod: 'CASH_ON_COLLECTION', prescriptionReference: 'X'.repeat(101) }),
    ).rejects.toThrow(/cannot exceed 100/);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
