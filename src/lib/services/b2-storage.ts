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
import {
  B2_PREFIX,
  formatB2Error,
  getB2Config,
  isB2StorageKey,
  toB2StorageKey,
  toObjectKey,
  usesB2Storage,
} from "@/lib/services/b2-config";

export { B2_PREFIX, isB2StorageKey, toB2StorageKey, toObjectKey, usesB2Storage, getB2Config };

function createB2Client(config: NonNullable<ReturnType<typeof getB2Config>>) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

async function withB2Error<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(formatB2Error(error));
  }
}

export async function uploadToB2(objectKey: string, buffer: Buffer, contentType?: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);

  return withB2Error(async () => {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return toB2StorageKey(objectKey);
  });
}

export async function startMultipartUpload(objectKey: string, contentType?: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);

  return withB2Error(async () => {
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
  });
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

  return withB2Error(async () => {
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
  });
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

  return withB2Error(async () => {
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
  });
}

export async function abortMultipartUpload(objectKey: string, uploadId: string) {
  const config = getB2Config();
  if (!config) {
    return;
  }

  const client = createB2Client(config);

  try {
    await client.send(
      new AbortMultipartUploadCommand({
        Bucket: config.bucket,
        Key: objectKey,
        UploadId: uploadId,
      }),
    );
  } catch {
    // ignore abort errors
  }
}

export async function downloadFromB2(storageKey: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);

  return withB2Error(async () => {
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
  });
}

export async function deleteFromB2(storageKey: string) {
  const config = getB2Config();
  if (!config) {
    throw new Error("Backblaze B2 nao configurado.");
  }

  const client = createB2Client(config);
  const objectKey = toObjectKey(storageKey);
  let bytesFreed = 0;

  return withB2Error(async () => {
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
  });
}
