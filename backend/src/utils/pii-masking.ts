export function maskName(name: string): string {
  if (!name) return name;
  const parts = name.split(' ');
  return parts.map(p => p.length > 2 ? `${p[0]}${'*'.repeat(p.length - 2)}${p[p.length - 1]}` : p).join(' ');
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  const firstTwo = phone.slice(0, 2);
  const lastFour = phone.slice(-4);
  const starCount = Math.max(4, phone.length - 6);
  return `${firstTwo}${'*'.repeat(starCount)}${lastFour}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function maskDlNumber(dl: string): string {
  if (!dl || dl.length < 8) return dl;
  return `${dl.slice(0, 4)}${'*'.repeat(Math.max(4, dl.length - 8))}${dl.slice(-4)}`;
}

export function maskPan(pan: string): string {
  if (!pan || pan.length !== 10) return pan;
  // ABCPK1234A -> A***K1***A
  return `${pan[0]}***${pan.slice(4, 6)}***${pan[9]}`;
}

/**
 * Masks Personally Identifiable Information based on the user's role.
 * Admins get full access; others get masked versions.
 */
export function maskPII(data: any, userRole: string): any {
  if (userRole === 'ADMIN') {
    return data;
  }

  const masked = { ...data };
  
  if (masked.name) masked.name = maskName(masked.name);
  if (masked.fullName) masked.fullName = maskName(masked.fullName);
  if (masked.phone) masked.phone = maskPhone(masked.phone);
  if (masked.email) masked.email = maskEmail(masked.email);
  if (masked.dlNumber) masked.dlNumber = maskDlNumber(masked.dlNumber);
  if (masked.pan) masked.pan = maskPan(masked.pan);
  
  return masked;
}

export function maskPii(val: string, type?: string): string {
  if (!val) return val;
  if (type === 'PHONE') return maskPhone(val);
  if (type === 'DRIVERS_LICENSE') return maskDlNumber(val);
  if (type === 'EMAIL') return maskEmail(val);
  if (type === 'PAN') return maskPan(val);
  if (val.length <= 4) return '****';
  return `${val.slice(0, 2)}${'*'.repeat(val.length - 4)}${val.slice(-2)}`;
}
