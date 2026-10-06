// Reglas de contraseña compartidas entre el registro y el reseteo.
// Mínimo 8 caracteres, al menos una letra y al menos un número.

export const PASSWORD_MIN_LENGTH = 8;

export function passwordRequirements(password: string) {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const req = passwordRequirements(password);
  return req.length && req.letter && req.number;
}

export function passwordErrorMessage(password: string): string | null {
  const req = passwordRequirements(password);
  if (!req.length) return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (!req.letter) return "La contraseña debe incluir al menos una letra.";
  if (!req.number) return "La contraseña debe incluir al menos un número.";
  return null;
}

export type PasswordStrength = "weak" | "medium" | "strong";

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return "weak";
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}
