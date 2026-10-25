export type VerifiableRecord = { hash: string; createdAt: string; anchored: boolean; txHash?: string }

export async function createVerifiableRecord(payload: unknown): Promise<VerifiableRecord> {
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const record = { hash, createdAt: new Date().toISOString(), anchored: false }
  localStorage.setItem(`banjare-record-${hash}`, JSON.stringify(record))
  return record
}
