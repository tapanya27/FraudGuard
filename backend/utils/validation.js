const SPECIAL_CHAR_PATTERN = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  if (trimmed.length > 254) return false;

  const atMatches = trimmed.match(/@/g);
  if (!atMatches || atMatches.length !== 1) return false;

  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (local.includes("..")) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;

  if (domain.startsWith(".") || domain.endsWith(".") || domain.startsWith("-")) {
    return false;
  }
  if (domain.includes("..")) return false;
  if (!domain.includes(".")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;

  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (!/^[A-Za-z0-9-]+$/.test(label)) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/^[A-Za-z]{2,}$/.test(tld)) return false;

  return true;
}

function getPasswordRequirementState(password) {
  const value = typeof password === "string" ? password : "";
  return {
    minLength: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: SPECIAL_CHAR_PATTERN.test(value),
  };
}

function getPasswordValidationMessages(password) {
  if (typeof password !== "string" || password.length === 0) {
    return ["Password is required."];
  }

  const state = getPasswordRequirementState(password);
  const messages = [];

  if (!state.minLength) {
    messages.push("Password must be at least 8 characters.");
  }
  if (!state.uppercase) {
    messages.push("Password must contain at least one uppercase letter.");
  }
  if (!state.lowercase) {
    messages.push("Password must contain at least one lowercase letter.");
  }
  if (!state.number) {
    messages.push("Password must contain at least one number.");
  }
  if (!state.special) {
    messages.push("Password must contain at least one special character.");
  }

  return messages;
}

function isStrongPassword(password) {
  return getPasswordValidationMessages(password).length === 0;
}

module.exports = {
  SPECIAL_CHAR_PATTERN,
  normalizeEmail,
  isValidEmail,
  getPasswordRequirementState,
  getPasswordValidationMessages,
  isStrongPassword,
};
