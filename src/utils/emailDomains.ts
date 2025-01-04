export const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
];

export const getUserDomain = (email: string): string => {
  return email.split('@')[1];
};

export const isFreeDomain = (domain: string): boolean => {
  return FREE_EMAIL_DOMAINS.includes(domain.toLowerCase());
};