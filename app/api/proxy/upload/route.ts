import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "@/src/lib/auth";

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function unauthorized() {
  return NextResponse.json({error: "Unauthorized"}, {status: 401});
}

function extensionForContentType(contentType: string) {
  if (contentType === "application/pdf") {
    return "pdf";
  }

  if (contentType === "image/jpeg") {
    return "jpg";
  }

  return "png";
}

function buildObjectKey(userId: string, contentType: string) {
  const fileExtension = extensionForContentType(contentType);
  return `${userId}/${crypto.randomUUID()}.${fileExtension}`;
}

function normalizeStorageBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (typeof userId !== "string") {
    return unauthorized();
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("document");

  if (!(file instanceof File)) {
    return NextResponse.json({error: "Consent document is required"}, {status: 400});
  }

  if (file.size === 0 || file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json({error: "Document size must be between 1 byte and 10 MB"}, {status: 400});
  }

  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return NextResponse.json({error: "Only PDF, JPG, and PNG files are allowed"}, {status: 400});
  }

  const storageBaseUrl = process.env.S3_COMPAT_BASE_URL?.trim();
  const objectKey = buildObjectKey(userId, file.type);

  if (storageBaseUrl) {
    const uploadUrl = new URL(objectKey, normalizeStorageBaseUrl(storageBaseUrl));
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: Buffer.from(await file.arrayBuffer()),
    });

    if (!uploadResponse.ok) {
      return NextResponse.json({error: "Failed to upload document"}, {status: 502});
    }

    return NextResponse.json({consentDocumentUrl: uploadUrl.toString()});
  }

  const fallbackUrl = `https://s3.local/proxy-documents/${objectKey}`;
  return NextResponse.json({consentDocumentUrl: fallbackUrl, mocked: true});
}
