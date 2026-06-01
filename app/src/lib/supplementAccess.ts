export function getSupplementEntryAction(isLoggedIn: boolean) {
  return isLoggedIn ? 'open-supplement' : 'request-login';
}
