"""Check the generated iOS handoff. This is not an Xcode or App Store review."""
import json
import plistlib
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "ios/App/App"
info = plistlib.loads((APP / "Info.plist").read_bytes())
privacy = plistlib.loads((APP / "PrivacyInfo.xcprivacy").read_bytes())
config = json.loads((APP / "capacitor.config.json").read_text())
project = (ROOT / "ios/App/App.xcodeproj/project.pbxproj").read_text()

assert config["appId"] == "org.bridgeback.app"
assert config["loggingBehavior"] == "none", "Bridge calls must not log exported profile data"
assert "server" not in config, "Native app must ship local assets, not a remote URL"
assert not config.get("allowNavigation"), "External websites must not run in the app web view"
assert not info.get("NSAppTransportSecurity", {}).get("NSAllowsArbitraryLoads")
assert not any(key.endswith("UsageDescription") for key in info), "Unexpected permission request"
assert privacy["NSPrivacyTracking"] is False
assert privacy["NSPrivacyCollectedDataTypes"] == []
assert privacy["NSPrivacyTrackingDomains"] == []
assert privacy["NSPrivacyAccessedAPITypes"] == [{
    "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
    "NSPrivacyAccessedAPITypeReasons": ["C617.1"],
}]
resources = project.split("/* Begin PBXResourcesBuildPhase section */")[1].split("/* End PBXResourcesBuildPhase section */")[0]
assert "PrivacyInfo.xcprivacy in Resources" in resources
assert set(re.findall(r"IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+)", project)) == {"16.0"}
assert project.count("PRODUCT_BUNDLE_IDENTIFIER = org.bridgeback.app;") == 2

public = APP / "public"
assert (public / "index.html").exists(), "Run npm run ios:bundle first"
assert (public / "privacy.html").exists()
source_report = json.loads((public / "api/source-status").read_text())
assert source_report["mode"] == "bundled" and source_report["checkedAt"] is None and source_report["checks"] == [], "Native export must never claim that its bundled source response is a current online check"
assert (public / "notices.html").exists()
assert not (public / "sw.js").exists(), "Native bundle must not ship a browser worker"
html = (public / "index.html").read_text()
assets = re.findall(r'(?:src|href)="([^" ]+)"', html)
for asset in assets:
    if asset.startswith("/_next/"):
        assert (public / asset.split("?")[0].lstrip("/")).is_file(), f"Missing asset: {asset}"
for font in ["AtkinsonHyperlegible-Regular.ttf", "AtkinsonHyperlegible-Bold.ttf"]:
    assert (public / "fonts" / font).is_file()

icon = (APP / "Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png").read_bytes()
assert icon[:8] == b"\x89PNG\r\n\x1a\n"
assert struct.unpack(">II", icon[16:24]) == (1024, 1024)
assert icon[25] == 2, "App icon must be opaque RGB"

print("iOS handoff checks passed: bundled shell/fonts/privacy page, native config, privacy manifest resource, permission scope, deployment target, and opaque 1024px icon.")
print("Not checked here: Swift compilation, SDK eligibility, signing, Apple review, or behavior on an Apple device.")
