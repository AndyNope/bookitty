import { companyStorageKey } from './companyStorage';

export type CompanyProfile = {
  name: string;
  street: string;
  city: string;
  vatId: string;
  email: string;
  phone: string;
  iban: string;
};

const KEY = 'bookitty.company';

const defaults: CompanyProfile = {
  name: '',
  street: '',
  city: '',
  vatId: '',
  email: '',
  phone: '',
  iban: '',
};

export const getCompany = (): CompanyProfile => {
  try {
    const raw = localStorage.getItem(companyStorageKey(KEY));
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
};

export const saveCompany = (profile: CompanyProfile): void => {
  localStorage.setItem(companyStorageKey(KEY), JSON.stringify(profile));
};
