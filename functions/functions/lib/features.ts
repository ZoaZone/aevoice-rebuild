import { appConfig } from "../config/appConfig.js";

export function isFeatureEnabled(key) {
  return Boolean(appConfig.features[key]);
}
