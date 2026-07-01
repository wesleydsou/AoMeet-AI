import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const B2_PREFIX = "b2:";

function getB2Config() {
  const bucket = process.env.B2_BUCKET_NAME?.trim();
  const keyId = process.env.B2_APPLICATION_KEY_ID?.trim();
  const applicationKey = process.env.B2_APPLICATION_KEY?.trim();
  const endpoint = process.env.B2_ENDPOINT?.trim().replace(/\/$/, "") || "https://s3.us-east-005.backblazeb2.com";
  const region = process.env.B2_REGION?.trim() || "us-east-005";

  if (!bucket || !keyId || !applicationKey) {
    return null;
  }

  return { bucket, keyId, applicationKey, endpoint, region };
}

function createB2Client(config: NonNullable<ReturnType<typeof getB2Config>>) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function usesB2Storage() {
  return Boolean(getB2Config());
}

export function isB2StorageKey(storageKey: string) {
  return storageKey.startsWith(B2_PREFIX);
}

export function toB2StorageKey(objectKey: string) {
  return `${B2_PREFIX}${objectKey}`;
}

function toObjectKey(storageKey: string) {
  return storageKey.slice(B2_PREFIX.length);
}

export async function uploadToB2(objectKey: string, buffer: Buffer, contentType?: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return toB2StorageKey(objectKey);
}

export async function createPresignedUploadUrl(objectKey: string, contentType: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: objectKey,
    ContentType: contentType || "application/octet-stream",
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

  return {
    uploadUrl,
    storageKey: toB2StorageKey(objectKey),
  };
}

export async function downloadFromB2(storageKey: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);
  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: toObjectKey(storageKey),
    }),
  );

  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error("Arquivo vazio no Backblaze B2.");
  }

  return Buffer.from(bytes);
}

export async function deleteFromB2(storageKey: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);
  const objectKey = toObjectKey(storageKey);
  let bytesFreed = 0;

  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );
    bytesFreed = head.ContentLength ?? 0;
  } catch {
    bytesFreed = 0;
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    }),
  );

  return bytesFreed;
}
