import fs from 'node:fs';
import path from 'node:path';

const locales = ['en', 'fa','ps'];
const messagesDir = path.join(process.cwd(), 'src', 'i18n', 'messages');

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value, nextKey);
    }
    return nextKey;
  });
}

function readMessages(locale) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing messages file for locale "${locale}" at ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function validate() {
  if (!fs.existsSync(messagesDir)) {
    throw new Error(`Messages directory not found at ${messagesDir}`);
  }

  const [baseLocale, ...restLocales] = locales;
  const baseKeys = new Set(flattenKeys(readMessages(baseLocale)));

  const errors = [];

  for (const locale of restLocales) {
    const keys = new Set(flattenKeys(readMessages(locale)));

    for (const key of baseKeys) {
      if (!keys.has(key)) {
        errors.push(`Locale "${locale}" is missing key "${key}"`);
      }
    }

    for (const key of keys) {
      if (!baseKeys.has(key)) {
        errors.push(`Locale "${locale}" has extra key "${key}" not present in base locale "${baseLocale}"`);
      }
    }
  }

  if (errors.length > 0) {
    errors.forEach((message) => console.error(message));
    process.exitCode = 1;
    return;
  }

  console.log('✓ All locale message files are in sync');
}

validate();
