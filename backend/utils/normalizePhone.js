const { parsePhoneNumberFromString } = require('libphonenumber-js');

const normalizePhone = (input, defaultCountry) => {
    const raw = String(input || '').trim();
    if (!raw) return null;

    const phoneNumber = parsePhoneNumberFromString(raw, defaultCountry || undefined);
    if (!phoneNumber || !phoneNumber.isValid()) {
        return null;
    }

    return phoneNumber.number; // E.164
};

module.exports = normalizePhone;
