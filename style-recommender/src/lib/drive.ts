import { google } from "googleapis";

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || "{}"),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

const FOLDER_IDS: Record<string, string | undefined> = {};

async function getOrCreateFolder(drive: ReturnType<typeof google.drive>, name: string, parentId?: string): Promise<string> {
  const cacheKey = `${parentId || "root"}/${name}`;
  if (FOLDER_IDS[cacheKey]) return FOLDER_IDS[cacheKey]!;

  const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ""}`;
  const res = await drive.files.list({ q: query, fields: "files(id)" });

  if (res.data.files?.length) {
    FOLDER_IDS[cacheKey] = res.data.files[0].id!;
    return res.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
  });

  FOLDER_IDS[cacheKey] = folder.data.id!;
  return folder.data.id!;
}

export type DriveFolder = "Quiz Assets" | "Feed Items" | "Selfies" | "Outfit Checks";

export async function uploadToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: DriveFolder
): Promise<string> {
  const drive = getDriveClient();

  const rootFolderId = await getOrCreateFolder(drive, "Whatisms Style");
  const subFolderId = await getOrCreateFolder(drive, folder, rootFolderId);

  const { Readable } = await import("stream");
  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [subFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id",
  });

  // Make file readable via direct link
  await drive.permissions.create({
    fileId: file.data.id!,
    requestBody: { role: "reader", type: "anyone" },
  });

  return file.data.id!;
}

export function getDriveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?id=${fileId}`;
}

export async function downloadFromDrive(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}
