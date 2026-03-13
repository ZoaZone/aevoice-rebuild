import { invoke } from "./api";

export async function getScreenContext() {
  return (await invoke("get_screen_context")) || null;
}

export async function captureScreen() {
  return (await invoke("capture_screen")) || null;
}