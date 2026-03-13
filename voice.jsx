// Voice API placeholder for desktop
export async function startMic() {
  try { return await window?.electron?.startMic?.(); } catch (_) { return null; }
}
export async function stopMic() {
  try { return await window?.electron?.stopMic?.(); } catch (_) { return null; }
}