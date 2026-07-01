const B2_PREFIX = "b2:";

function sanitizeEnv(value?: string) {
  if (!value) {
    return "";
  }

  let cleaned = value.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

export function getB2Config() {
  const bucket = sanitizeEnv(process.env.B2_BUCKET_NAME);
  const keyId = sanitizeEnv(process.env.B2_APPLICATION_KEY_ID);
  const applicationKey = sanitizeEnv(process.env.B2_APPLICATION_KEY);
  const endpoint =
    sanitizeEnv(process.env.B2_ENDPOINT).replace(/\/$/, "") || "https://s3.us-east-005.backblazeb2.com";
  const region = sanitizeEnv(process.env.B2_REGION) || "us-east-005";

  if (!bucket || !keyId || !applicationKey) {
    return null;
  }

  return { bucket, keyId, applicationKey, endpoint, region };
}

export function usesB2Storage() {
  return Boolean(getB2Config());
}

export function formatB2Error(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === "object" && error && "name" in error ? String((error as { name?: string }).name) : "";

  if (/minimum allowed size/i.test(message)) {
    return "Parte do upload abaixo do minimo do Backblaze B2 (5 MB). Tente novamente — o app foi ajustado para evitar esse fluxo.";
  }

  if (/Malformed Access Key Id|InvalidAccessKeyId/i.test(message) || code === "InvalidAccessKeyId") {
    return [
      "Credenciais Backblaze B2 invalidas para a API S3.",
      "Crie uma Application Key NOVA (nao use a Master Key):",
      "Backblaze > App Keys > Add New Key > acesso ao bucket AoMeetAI (Read & Write).",
      "Use keyID em B2_APPLICATION_KEY_ID e applicationKey em B2_APPLICATION_KEY.",
      "Confira B2_ENDPOINT e B2_REGION na pagina do bucket (S3 Endpoint).",
    ].join(" ");
  }

  if (/SignatureDoesNotMatch|InvalidAccessKey/i.test(message)) {
    return "B2_APPLICATION_KEY incorreta. Gere uma nova Application Key no Backblaze e atualize a Vercel.";
  }

  if (/NoSuchBucket|InvalidBucketName/i.test(message)) {
    return "B2_BUCKET_NAME ou B2_ENDPOINT incorretos. Use o nome e o S3 Endpoint exatos do bucket.";
  }

  return message || "Erro desconhecido no Backblaze B2.";
}

export { B2_PREFIX };

export function isB2StorageKey(storageKey: string) {
  return storageKey.startsWith(B2_PREFIX);
}

export function toB2StorageKey(objectKey: string) {
  return `${B2_PREFIX}${objectKey}`;
}

export function toObjectKey(storageKey: string) {
  return storageKey.slice(B2_PREFIX.length);
}
