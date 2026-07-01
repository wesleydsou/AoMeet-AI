import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";

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

export async function startMultipartUpload(objectKey: string, contentType?: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);
  const response = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: config.bucket,
      Key: objectKey,
      ContentType: contentType || "application/octet-stream",
    }),
  );

  if (!response.UploadId) {
    throw new Error("Falha ao iniciar upload multipart no B2.");
  }

  return {
    uploadId: response.UploadId,
    objectKey,
    storageKey: toB2StorageKey(objectKey),
  };
}

export async function uploadMultipartPart(input: {
  objectKey: string;
  uploadId: string;
  partNumber: number;
  body: Buffer;
}) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);
  const response = await client.send(
    new UploadPartCommand({
      Bucket: config.bucket,
      Key: input.objectKey,
      UploadId: input.uploadId,
      PartNumber: input.partNumber,
      Body: input.body,
    }),
  );

  if (!response.ETag) {
    throw new Error(`Falha ao enviar parte ${input.partNumber}.`);
  }

  return { partNumber: input.partNumber, etag: response.ETag };
}

export async function completeMultipartUpload(input: {
  objectKey: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: config.bucket,
      Key: input.objectKey,
      UploadId: input.uploadId,
      MultipartUpload: {
        Parts: input.parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
          })),
      },
    }),
  );

  return toB2StorageKey(input.objectKey);
}

export async function abortMultipartUpload(objectKey: string, uploadId: string) {
  const config = getB2Config();
  if (!config) {
    return;
  }

  const client = createB2Client(config);
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: config.bucket,
      Key: objectKey,
      UploadId: uploadId,
    }),
  );
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
