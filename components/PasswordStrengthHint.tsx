"use client";

import { passwordRequirements, passwordStrength } from "@/lib/password";

export default function PasswordStrengthHint({ password }: { password: string }) {
  if (!password) return null;

  const req = passwordRequirements(password);
  const strength = passwordStrength(password);

  const barColor =
    strength === "weak" ? "bg-danger" : strength === "medium" ? "bg-yellow-500" : "bg-green-600";
  const barWidth = strength === "weak" ? "w-1/3" : strength === "medium" ? "w-2/3" : "w-full";
  const label = strength === "weak" ? "Débil" : strength === "medium" ? "Aceptable" : "Fuerte";

  return (
    <div className="mt-2 space-y-2">
      <div className="h-1 w-full bg-line overflow-hidden">
        <div className={`h-full transition-all ${barColor} ${barWidth}`} />
      </div>
      <p className="text-xs text-text-dim">{label}</p>
      <ul className="text-xs space-y-1">
        <li className={req.length ? "text-text-dim" : "text-text-faint"}>
          {req.length ? "✓" : "·"} Al menos 8 caracteres
        </li>
        <li className={req.letter ? "text-text-dim" : "text-text-faint"}>
          {req.letter ? "✓" : "·"} Al menos una letra
        </li>
        <li className={req.number ? "text-text-dim" : "text-text-faint"}>
          {req.number ? "✓" : "·"} Al menos un número
        </li>
      </ul>
    </div>
  );
}
