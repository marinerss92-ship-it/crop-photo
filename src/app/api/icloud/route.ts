import { NextRequest, NextResponse } from "next/server";

interface Derivative {
  checksum: string;
  fileSize: number | string;
  width: number | string;
  height: number | string;
}

interface PhotoEntry {
  photoGuid: string;
  caption?: string;
  dateCreated?: string;
  derivatives: Record<string, Derivative>;
}

interface AssetUrlItem {
  url_expiry: string;
  url_location: string;
  url_path: string;
}

interface AssetLocations {
  [host: string]: { scheme: string; hosts: string[] };
}

function extractToken(url: string): string | null {
  const match = url.match(
    /(?:share\.icloud\.com\/photos\/|sharedalbum\/#)([A-Za-z0-9_-]+)/
  );
  return match ? match[1].split("#")[0] : null;
}

function pickBestDerivative(derivatives: Record<string, Derivative>): {
  key: string;
  derivative: Derivative;
} | null {
  let best: { key: string; derivative: Derivative } | null = null;
  let bestPixels = 0;

  for (const [key, d] of Object.entries(derivatives)) {
    const pixels = Number(d.width) * Number(d.height);
    if (pixels > bestPixels) {
      bestPixels = pixels;
      best = { key, derivative: d };
    }
  }
  return best;
}

async function discoverPartition(
  token: string
): Promise<{ partition: string; streamData: Record<string, unknown> }> {
  const partitions = ["p48", "p47", "p46", "p45", "p44", "p43"];

  for (const p of partitions) {
    const url = `https://${p}-sharedstreams.icloud.com/${token}/sharedstreams/webstream`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Origin: "https://www.icloud.com",
        },
        body: JSON.stringify({ streamCtag: null }),
      });

      if (res.status === 330) {
        const body = await res.json();
        const host = body["X-Apple-MMe-Host"];
        if (host) {
          const correctPartition = host.split("-sharedstreams")[0];
          const retryUrl = `https://${correctPartition}-sharedstreams.icloud.com/${token}/sharedstreams/webstream`;
          const retryRes = await fetch(retryUrl, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
              Origin: "https://www.icloud.com",
            },
            body: JSON.stringify({ streamCtag: null }),
          });
          if (retryRes.ok) {
            return {
              partition: correctPartition,
              streamData: await retryRes.json(),
            };
          }
        }
      }

      if (res.ok) {
        return { partition: p, streamData: await res.json() };
      }
    } catch {
      continue;
    }
  }

  throw new Error("Could not find iCloud partition server");
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

    const { partition, streamData } = await discoverPartition(token);
    const photos: PhotoEntry[] =
      (streamData as { photos?: PhotoEntry[] }).photos || [];

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "No photos found in this album" },
        { status: 404 }
      );
    }

    const photoGuids = photos.map((p) => p.photoGuid);
    const assetRes = await fetch(
      `https://${partition}-sharedstreams.icloud.com/${token}/sharedstreams/webasseturls`,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Origin: "https://www.icloud.com",
        },
        body: JSON.stringify({ photoGuids }),
      }
    );

    if (!assetRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch photo URLs" },
        { status: 502 }
      );
    }

    const assetData = (await assetRes.json()) as {
      items: Record<string, AssetUrlItem>;
      locations: AssetLocations;
    };

    const results: {
      name: string;
      url: string;
      width: number;
      height: number;
    }[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const best = pickBestDerivative(photo.derivatives);
      if (!best) continue;

      const assetItem = assetData.items[best.derivative.checksum];
      if (!assetItem) continue;

      const loc = assetData.locations[assetItem.url_location];
      if (!loc) continue;

      const downloadUrl = `${loc.scheme}://${loc.hosts[0]}${assetItem.url_path}`;
      results.push({
        name: photo.caption || `icloud-photo-${i + 1}.jpg`,
        url: downloadUrl,
        width: Number(best.derivative.width),
        height: Number(best.derivative.height),
      });
    }

    return NextResponse.json({ photos: results, total: results.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
