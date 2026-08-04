export function detectLanguage(text = "") {
  const value = String(text).toLowerCase();

  if (/\b(merci|bonjour|s'il|reservation|chambre|disponibilite)\b/i.test(value)) {
    return "fr";
  }

  if (/\b(hola|gracias|habitacion|disponibilidad|reserva|precio)\b/i.test(value)) {
    return "es";
  }

  if (/\b(hello|thanks|room|availability|booking|price|need|info|information|details|request)\b/i.test(value)) {
    return "en";
  }

  return "auto";
}
