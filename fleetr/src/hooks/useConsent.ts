import { useState, useEffect } from 'react';
import { consentApi } from '@/services/api';

export const useConsent = () => {
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  const fetchStatus = async () => {
    try {
      const res = await consentApi.getConsentStatus();
      setConsents(res.data.consents || {});
    } catch (e) {
      console.error('Failed to fetch consent status', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const checkConsent = (purpose: string) => !!consents[purpose];

  const grantConsent = async (purpose: string) => {
    await consentApi.grantConsent(purpose);
    await fetchStatus();
  };

  const withdrawConsent = async (purpose: string) => {
    await consentApi.withdrawConsent(purpose);
    await fetchStatus();
  };

  return { checkConsent, grantConsent, withdrawConsent, consents };
};
