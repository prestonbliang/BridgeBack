"""Record public GitHub CI evidence; never turn queued or failed jobs into a pass."""
import datetime
import json
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

if len(sys.argv) != 2 or not sys.argv[1].isdigit():
    raise SystemExit("Usage: npm run ci:evidence -- <successful iOS run ID>")
run_id = sys.argv[1]
url = f"https://github.com/prestonbliang/BridgeBack/actions/runs/{run_id}"
request = urllib.request.Request(url, headers={"User-Agent": "BridgeBack-release-evidence", "Cache-Control": "no-cache"})
with urllib.request.urlopen(request, timeout=25) as response:
    html = response.read().decode()

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = []
        self.hidden = 0
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.hidden += 1
    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)
    def handle_data(self, data):
        if not self.hidden and data.strip():
            self.values.append(data.strip())

parser = VisibleText()
parser.feed(html)
text = parser.values
status = text[text.index("Status") + 1]
if status != "Success":
    raise SystemExit(f"CI is {status}; existing evidence was preserved.")
commits = set(re.findall(r"/prestonbliang/BridgeBack/commit/([a-f0-9]{40})", html))
if len(commits) != 1:
    raise SystemExit("The source commit could not be determined unambiguously.")
artifacts = []
for name in ("BridgeBack-unsigned-simulator", "BridgeBack-unsigned-device"):
    index = text.index(name)
    digest = next((value for value in text[index:index+6] if re.fullmatch(r"sha256:[a-f0-9]{64}", value)), None)
    if not digest:
        raise SystemExit(f"Missing public artifact digest for {name}; existing evidence was preserved.")
    artifacts.append({"name": name, "displaySize": text[index+1], "digest": digest})
report = {
    "schemaVersion": 1,
    "sourceCommit": commits.pop(),
    "runUrl": url,
    "status": status,
    "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "evidence": "Public GitHub workflow summary and artifact digests; native runtime and signing were not exercised.",
    "artifacts": artifacts,
    "doesNotEstablish": ["real-device usability", "VoiceOver verification", "signing or provisioning", "TestFlight distribution", "Apple approval", "contest authorship eligibility"],
}
destination = Path(__file__).resolve().parents[1] / "docs/ios-build-evidence.json"
destination.write_text(json.dumps(report, indent=2) + "\n")
print(f"Recorded successful simulator/device build evidence for {report['sourceCommit']}: {url}")
