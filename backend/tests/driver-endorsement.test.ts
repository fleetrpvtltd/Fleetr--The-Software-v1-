import { describe, it, expect } from 'vitest';

describe('Driver Endorsement Guard', () => {
  const checkDriverEndorsement = async (driver: any) => {
    if (!driver.endorsements?.includes('TRANS')) return false;
    if (driver.dlStatus !== 'Active') return false;
    if (new Date(driver.dlExpiryDate) < new Date()) return false;
    return true;
  };

  it('Should pass when driver has TRANS endorsement and active DL', async () => {
    const result = await checkDriverEndorsement({ endorsements: ['TRANS'], dlStatus: 'Active', dlExpiryDate: new Date(Date.now() + 100000000) });
    expect(result).toBe(true);
  });

  it('Should fail when TRANS endorsement is missing', async () => {
    const result = await checkDriverEndorsement({ endorsements: ['MCWG'], dlStatus: 'Active', dlExpiryDate: new Date(Date.now() + 100000000) });
    expect(result).toBe(false);
  });

  it('Should fail when DL status is Suspended', async () => {
    const result = await checkDriverEndorsement({ endorsements: ['TRANS'], dlStatus: 'Suspended', dlExpiryDate: new Date(Date.now() + 100000000) });
    expect(result).toBe(false);
  });

  it('Should fail when DL status is Expired', async () => {
    const result = await checkDriverEndorsement({ endorsements: ['TRANS'], dlStatus: 'Expired', dlExpiryDate: new Date(Date.now() + 100000000) });
    expect(result).toBe(false);
  });

  it('Should fail when DL expiry date is in the past', async () => {
    const result = await checkDriverEndorsement({ endorsements: ['TRANS'], dlStatus: 'Active', dlExpiryDate: new Date(Date.now() - 100000000) });
    expect(result).toBe(false);
  });

  it('Should pass when DL expiry date is in the future', async () => {
    const result = await checkDriverEndorsement({ endorsements: ['TRANS'], dlStatus: 'Active', dlExpiryDate: new Date(Date.now() + 100000000) });
    expect(result).toBe(true);
  });
});
