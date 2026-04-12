import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

function extractToken(url: string): string | null {
  const match = url.match(
    /(?:share\.icloud\.com\/photos\/|icloud\.com\/photos\/#|sharedalbum\/#)([A-Za-z0-9_-]+)/
  );
  return match ? match[1].split("#")[0] : null;
}

interface ResolveResult {
  partition: string;
  zoneID: { zoneName: string; ownerRecordName: string };
  authToken: string;
  photoCount: number;
}

async function resolveShortGUID(token: string): Promise<ResolveResult> {
  const res = await fetch(
    "https://p48-ckdatabasews.icloud.com/database/1/com.apple.photos.cloud/production/public/records/resolve",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.icloud.com",
      },
      body: JSON.stringify({
        shortGUIDs: [{ value: token }],
      }),
    }
  );

  if (!res.ok) throw new Error("Failed to resolve iCloud link");

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) throw new Error("No results from resolve");

  const anon = result.anonymousPublicAccess;
  if (!anon?.token) {
    throw new Error(
      "This album requires sign-in to access. Only public iCloud links are supported."
    );
  }

  const photoCount =
    result.rootRecord?.fields?.photosCount?.value ??
    result.rootRecord?.fields?.assetCount?.value ??
    0;

  return {
    partition: anon.databasePartition.replace(/^https?:\/\//, "").replace(/:443$/, ""),
    zoneID: result.zoneID,
    authToken: anon.token,
    photoCount,
  };
}

interface AssetRecord {
  recordName: string;
  masterRecordName: string;
}

async function fetchAllAssets(
  partition: string,
  zoneID: { zoneName: string; ownerRecordName: string },
  authToken: string,
  maxPhotos: number
): Promise<AssetRecord[]> {
  const baseUrl = `https://${partition}/database/1/com.apple.photos.cloud/production/shared/changes/zone`;
  const params = `remapEnums=true&getCurrentSyncToken=true&publicAccessAuthToken=${encodeURIComponent(authToken)}`;

  const assets: AssetRecord[] = [];
  let syncToken: string | undefined;

  for (let page = 0; page < 100; page++) {
    const body: Record<string, unknown> = {
      zones: [{ zoneID, ...(syncToken ? { syncToken } : {}) }],
    };

    const res = await fetch(`${baseUrl}?${params}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.icloud.com",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Zone changes failed: ${res.status}`);
    const data = await res.json();
    const zone = data.zones?.[0];
    if (!zone) break;

    for (const r of zone.records || []) {
      if (r.recordType === "CPLAsset" && !r.deleted) {
        const masterRef = r.fields?.masterRef?.value?.recordName;
        if (masterRef) {
          assets.push({
            recordName: r.recordName,
            masterRecordName: masterRef,
          });
        }
      }
    }

    syncToken = zone.syncToken;
    if (!zone.moreComing) break;
    if (assets.length >= maxPhotos) break;
  }

  return assets.slice(0, maxPhotos);
}

interface PhotoInfo {
  name: string;
  url: string;
  width: number;
  height: number;
  thumbUrl: string;
}

async function lookupMasters(
  partition: string,
  zoneID: { zoneName: string; ownerRecordName: string },
  authToken: string,
  masterRecordNames: string[]
): Promise<PhotoInfo[]> {
  const baseUrl = `https://${partition}/database/1/com.apple.photos.cloud/production/shared/records/lookup`;
  const params = `remapEnums=true&publicAccessAuthToken=${encodeURIComponent(authToken)}`;
  const photos: PhotoInfo[] = [];

  const batchSize = 50;
  for (let i = 0; i < masterRecordNames.length; i += batchSize) {
    const batch = masterRecordNames.slice(i, i + batchSize);
    const body = {
      records: batch.map((n) => ({ recordName: n })),
      zoneID,
      numbersAsStrings: true,
    };

    const res = await fetch(`${baseUrl}?${params}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.icloud.com",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) continue;
    const data = await res.json();

    for (const r of data.records || []) {
      if (r.recordType !== "CPLMaster") continue;
      const fields = r.fields || {};

      const orig = fields.resOriginalRes?.value;
      const med = fields.resJPEGMedRes?.value;
      const thumb = fields.resJPEGThumbRes?.value;

      const best = orig || med;
      if (!best?.downloadURL) continue;

      const filename = fields.filenameEnc?.value || `photo-${photos.length + 1}.jpg`;

      photos.push({
        name: typeof filename === "string" ? filename : `photo-${photos.length + 1}.jpg`,
        url: best.downloadURL,
        width: Number(fields.resOriginalWidth?.value || 0),
        height: Number(fields.resOriginalHeight?.value || 0),
        thumbUrl: thumb?.downloadURL || med?.downloadURL || best.downloadURL,
      });
    }
  }

  return photos;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    const token = extractToken(url);
    if (!token) {
      return NextResponse.json(
        { error: "Invalid iCloud sharing URL" },
        { status: 400 }
      );
    }

    const { partition, zoneID, authToken, photoCount } =
      await resolveShortGUID(token);

    const maxPhotos = 1200;
    const assets = await fetchAllAssets(
      partition,
      zoneID,
      authToken,
      maxPhotos
    );

    if (assets.length === 0) {
      return NextResponse.json(
        { error: "No photos found in this album" },
        { status: 404 }
      );
    }

    const masterNames = assets.map((a) => a.masterRecordName);
    const photos = await lookupMasters(
      partition,
      zoneID,
      authToken,
      masterNames
    );

    return NextResponse.json({
      photos,
      total: photos.length,
      albumTotal: photoCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
