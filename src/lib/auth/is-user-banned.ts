export function isUserBanned(bannedUntil: string | null | undefined) {
  return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
}
