import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.bridgeback.app",
  appName: "BridgeBack",
  webDir: "out",
  backgroundColor: "#172f43",
  loggingBehavior: "none",
  ios: {
    contentInset: "never",
    backgroundColor: "#172f43",
    preferredContentMode: "mobile",
    allowsLinkPreview: false,
  },
  // No remote server URL or allowNavigation entries: ship the app itself.
};
export default config;
