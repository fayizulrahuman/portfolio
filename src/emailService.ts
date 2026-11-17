export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

export interface ContactValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ContactFormInput, string>>;
  summary?: string;
}

export interface SendContactResult {
  ok: boolean;
  code: 'sent' | 'validation_error' | 'missing_config' | 'network_error';
  message: string;
  fieldErrors?: Partial<Record<keyof ContactFormInput, string>>;
}

const PLACEHOLDER_VALUES = new Set([
  '',
  'your_emailjs_service_id',
  'your_emailjs_template_id',
  'your_emailjs_public_key',
  'your_service_id',
  'your_template_id',
  'your_public_key',
]);

function normalizeEnvValue(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  return PLACEHOLDER_VALUES.has(trimmed) ? '' : trimmed;
}

export function getEmailJsConfig(env: Record<string, unknown>): EmailJsConfig {
  return {
    serviceId: normalizeEnvValue(env.VITE_EMAILJS_SERVICE_ID),
    templateId: normalizeEnvValue(env.VITE_EMAILJS_TEMPLATE_ID),
    publicKey: normalizeEnvValue(env.VITE_EMAILJS_PUBLIC_KEY),
  };
}

export function hasEmailJsConfig(config: EmailJsConfig): boolean {
  return Boolean(config.serviceId && config.templateId && config.publicKey);
}

export function validateContactForm(input: ContactFormInput): ContactValidationResult {
  const errors: Partial<Record<keyof ContactFormInput, string>> = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (name.length < 2) {
    errors.name = 'Please enter your name.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email) {
    errors.email = 'Please enter your email address.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (message.length < 10) {
    errors.message = 'Please include a short message (at least 10 characters).';
  }

  const firstError = errors.name ?? errors.email ?? errors.message;
  return {
    valid: !firstError,
    errors,
    summary: firstError,
  };
}

export function buildEmailJsPayload(input: ContactFormInput, config: EmailJsConfig) {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  return {
    service_id: config.serviceId,
    template_id: config.templateId,
    user_id: config.publicKey,
    template_params: {
      from_name: name,
      name,
      from_email: email,
      email,
      reply_to: email,
      message,
      to_name: 'Fayizul Rahuman S',
    },
  };
}

export async function sendContactEmail(
  input: ContactFormInput,
  config: EmailJsConfig,
  fetchImpl: typeof fetch = fetch
): Promise<SendContactResult> {
  const validation = validateContactForm(input);
  if (!validation.valid) {
    return {
      ok: false,
      code: 'validation_error',
      message: validation.summary ?? 'Please complete all required fields.',
      fieldErrors: validation.errors,
    };
  }

  if (!hasEmailJsConfig(config)) {
    return {
      ok: false,
      code: 'missing_config',
      message:
        'EmailJS is not configured yet. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY to your .env file.',
    };
  }

  try {
    const response = await fetchImpl('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildEmailJsPayload(input, config)),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        ok: false,
        code: 'network_error',
        message: errorText
          ? `Could not send message (${errorText}).`
          : `Could not send message (HTTP ${response.status}).`,
      };
    }

    return {
      ok: true,
      code: 'sent',
      message: "Message sent cleanly. I'll get back to you shortly!",
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network failure';
    return {
      ok: false,
      code: 'network_error',
      message: `Unable to reach EmailJS right now (${detail}). Please try again or email fayizulrahuman2005@gmail.com.`,
    };
  }
}
