/**
 * Validation Middleware
 * Request body/query/params validation using custom schema validation
 */
const ApiError = require('../utils/ApiError');

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation regex (Vietnam format)
 */
const PHONE_REGEX = /^(0|\+84)[3-9][0-9]{8}$/;

/**
 * Password requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

/**
 * Validate a value against a schema field
 * @param {any} value - Value to validate
 * @param {object} fieldSchema - Field schema definition
 * @param {string} fieldName - Field name for error messages
 * @returns {object} Validation result
 */
const validateField = (value, fieldSchema, fieldName) => {
    const errors = [];

    // Check required
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldName} is required`);
        return { valid: false, errors };
    }

    // If not required and empty, skip further validation
    if (value === undefined || value === null || value === '') {
        return { valid: true, errors: [] };
    }

    // Type validation
    if (fieldSchema.type) {
        switch (fieldSchema.type) {
            case 'string':
                if (typeof value !== 'string') {
                    errors.push(`${fieldName} must be a string`);
                }
                break;
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    errors.push(`${fieldName} must be a number`);
                }
                break;
            case 'integer':
                if (!Number.isInteger(value)) {
                    errors.push(`${fieldName} must be an integer`);
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push(`${fieldName} must be a boolean`);
                }
                break;
            case 'array':
                if (!Array.isArray(value)) {
                    errors.push(`${fieldName} must be an array`);
                }
                break;
            case 'object':
                if (typeof value !== 'object' || Array.isArray(value)) {
                    errors.push(`${fieldName} must be an object`);
                }
                break;
            case 'email':
                if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
                    errors.push(`${fieldName} must be a valid email address`);
                }
                break;
            case 'phone':
                if (typeof value !== 'string' || !PHONE_REGEX.test(value.replace(/\s/g, ''))) {
                    errors.push(`${fieldName} must be a valid Vietnamese phone number`);
                }
                break;
            case 'password':
                if (typeof value !== 'string' || !PASSWORD_REGEX.test(value)) {
                    errors.push(`${fieldName} must be at least 8 characters with uppercase, lowercase, and number`);
                }
                break;
        }
    }

    // String validations
    if (typeof value === 'string') {
        if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
            errors.push(`${fieldName} must be at least ${fieldSchema.minLength} characters`);
        }
        if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
            errors.push(`${fieldName} must not exceed ${fieldSchema.maxLength} characters`);
        }
        if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
            errors.push(`${fieldName} format is invalid`);
        }
        if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
            errors.push(`${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`);
        }
    }

    // Number validations
    if (typeof value === 'number') {
        if (fieldSchema.min !== undefined && value < fieldSchema.min) {
            errors.push(`${fieldName} must be at least ${fieldSchema.min}`);
        }
        if (fieldSchema.max !== undefined && value > fieldSchema.max) {
            errors.push(`${fieldName} must not exceed ${fieldSchema.max}`);
        }
    }

    // Array validations
    if (Array.isArray(value)) {
        if (fieldSchema.minItems && value.length < fieldSchema.minItems) {
            errors.push(`${fieldName} must have at least ${fieldSchema.minItems} items`);
        }
        if (fieldSchema.maxItems && value.length > fieldSchema.maxItems) {
            errors.push(`${fieldName} must not exceed ${fieldSchema.maxItems} items`);
        }
    }

    return { valid: errors.length === 0, errors };
};

/**
 * Create validation middleware from schema
 * @param {object} schema - Validation schema { body, params, query }
 * @returns {function} Express middleware
 */
const validate = (schema) => {
    return (req, res, next) => {
        const allErrors = [];

        // Validate body
        if (schema.body) {
            for (const [fieldName, fieldSchema] of Object.entries(schema.body)) {
                const value = req.body[fieldName];
                const result = validateField(value, fieldSchema, fieldName);
                allErrors.push(...result.errors);
            }
        }

        // Validate params
        if (schema.params) {
            for (const [fieldName, fieldSchema] of Object.entries(schema.params)) {
                let value = req.params[fieldName];
                // Convert to number if type is number/integer
                if ((fieldSchema.type === 'number' || fieldSchema.type === 'integer') && value) {
                    value = Number(value);
                    req.params[fieldName] = value;
                }
                const result = validateField(value, fieldSchema, fieldName);
                allErrors.push(...result.errors);
            }
        }

        // Validate query
        if (schema.query) {
            for (const [fieldName, fieldSchema] of Object.entries(schema.query)) {
                let value = req.query[fieldName];
                // Convert to number if type is number/integer
                if ((fieldSchema.type === 'number' || fieldSchema.type === 'integer') && value) {
                    value = Number(value);
                    req.query[fieldName] = value;
                }
                // Convert to boolean if type is boolean
                if (fieldSchema.type === 'boolean' && value) {
                    value = value === 'true' || value === '1';
                    req.query[fieldName] = value;
                }
                const result = validateField(value, fieldSchema, fieldName);
                allErrors.push(...result.errors);
            }
        }

        if (allErrors.length > 0) {
            return next(new ApiError(400, 'Validation failed', allErrors));
        }

        next();
    };
};

/**
 * Sanitize request body by only keeping allowed fields
 * @param {string[]} allowedFields - List of allowed field names
 * @returns {function} Express middleware
 */
const sanitize = (allowedFields) => {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            const sanitizedBody = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    sanitizedBody[field] = req.body[field];
                }
            }
            req.body = sanitizedBody;
        }
        next();
    };
};

module.exports = {
    validate,
    sanitize,
    EMAIL_REGEX,
    PHONE_REGEX,
    PASSWORD_REGEX,
};
