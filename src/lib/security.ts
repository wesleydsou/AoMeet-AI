const MIN_AUTH_SECRET_LENGTH = 32;

export const uploadPolicy = {
  audio: {
    maxBytes: 25 * 1024 * 1024,
    allowedMimePrefixes: ["audio/"],
    allowedExtensions: ["mp3", "wav", "m4a", "aac", "ogg", "webm"],
  },
  video: {
    maxBytes: 100 * 1024 * 1024,
    allowedMimePrefixes: ["video/"],
    allowedExtensions: ["mp4", "mov", "m4v", "webm"],
  },
  transcript: {
    maxBytes: 2 * 1024 * 1024,
    allowedMimePrefixes: ["text/plain"],
    allowedExtensions: ["txt"],
  },
} as const;

export function assertStrongSecret(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  if (value.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_AUTH_SECRET_LENGTH} characters long.`);
  }

  return value;
}

export function maskSecret(value: string, visible = 6) {
  if (value.length <= visible * 2) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}
