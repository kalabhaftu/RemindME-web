function base64url(str: string): string {
  return btoa(str)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64url(binary);
}

function pemToDer(pem: string): ArrayBuffer {
  const cleanPem = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  
  const raw = atob(cleanPem);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    view[i] = raw.charCodeAt(i);
  }
  return buffer;
}

function parseServiceAccount(str: string): any {
  let clean = str.trim()
  if (clean.length > 1 &&
      ((clean[0] === "'" && clean[clean.length - 1] === "'") ||
       (clean[0] === '"' && clean[clean.length - 1] === '"'))) {
    clean = clean.slice(1, -1)
  }
  try {
    return JSON.parse(clean)
  } catch {}
  const noNewlines = clean.replace(/[\r\n]+/g, ' ')
  try {
    return JSON.parse(noNewlines)
  } catch {
    throw new Error(
      'Failed to parse FIREBASE_SERVICE_ACCOUNT. Verify the env var is valid JSON. ' +
      `Raw length: ${clean.length}`
    )
  }
}

export async function getAccessToken(serviceAccountJsonStr: string): Promise<string> {
  const sa = parseServiceAccount(serviceAccountJsonStr);
  const der = pemToDer(sa.private_key);
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign"]
  );

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    exp,
    iat,
  }));

  const message = new TextEncoder().encode(`${header}.${payload}`);
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    message
  );
  
  const signature = arrayBufferToBase64Url(signatureBuffer);
  const jwt = `${header}.${payload}.${signature}`;

  const response = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain Google access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function sendFcmNotification(
  serviceAccountJsonStr: string,
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const sa = parseServiceAccount(serviceAccountJsonStr);
  const accessToken = await getAccessToken(serviceAccountJsonStr);
  const projectId = sa.project_id;

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: {
          title,
          body,
        },
        data,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let unregistered = false;
    try {
      const parsed = JSON.parse(errorText);
      unregistered = parsed?.error?.details?.some(
        (detail: { errorCode?: string }) => detail.errorCode === 'UNREGISTERED'
      ) ?? false;
    } catch {
      unregistered = /notregistered|unregistered/i.test(errorText);
    }
    const error = new Error(`FCM send failed: ${errorText}`) as Error & { unregistered?: boolean };
    error.unregistered = unregistered;
    throw error;
  }
}
