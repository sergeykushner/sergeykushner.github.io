#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile

SCRIPT_DIR = Path(__file__).resolve().parent
SITE_ROOT = SCRIPT_DIR.parent
DEFAULT_METADATA_PATH = SITE_ROOT / "data" / "apps-metadata.json"


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_metadata(path):
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError:
        fail(f"metadata file not found: {path}")
    except json.JSONDecodeError as error:
        fail(f"invalid JSON in {path}: {error}")

    if not isinstance(data, list):
        fail("metadata root must be a JSON array")
    return data


def save_metadata(path, data):
    write_path = path.resolve() if path.is_symlink() else path
    write_path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, indent=4) + "\n"
    with NamedTemporaryFile("w", encoding="utf-8", dir=write_path.parent, delete=False) as tmp:
        tmp.write(text)
        tmp_path = Path(tmp.name)
    tmp_path.replace(write_path)


def project_file_paths(project_path):
    project_path = project_path.expanduser().resolve()
    if not project_path.exists():
        fail(f"project path does not exist: {project_path}")

    if project_path.suffix == ".xcodeproj":
        candidates = [project_path / "project.pbxproj"]
    else:
        candidates = sorted(project_path.glob("*.xcodeproj/project.pbxproj"))

    existing = [path for path in candidates if path.is_file()]
    if not existing:
        fail(f"no .xcodeproj/project.pbxproj found in {project_path}")
    return existing


def project_bundle_ids(project_path):
    bundle_ids = []
    pattern = re.compile(r"PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);")
    for pbxproj in project_file_paths(project_path):
        text = pbxproj.read_text(encoding="utf-8", errors="replace")
        for match in pattern.finditer(text):
            value = match.group(1).strip().strip('"')
            if value and "$" not in value and value not in bundle_ids:
                bundle_ids.append(value)
    if not bundle_ids:
        fail(f"no concrete PRODUCT_BUNDLE_IDENTIFIER values found in {project_path}")
    return bundle_ids


def app_key(app):
    return app.get("id") or app.get("displayName") or "<unknown>"


def find_app_for_project(metadata, project_path):
    bundle_ids = project_bundle_ids(project_path)
    matches = []
    for index, app in enumerate(metadata):
        if not isinstance(app, dict):
            continue
        bundle_id = app.get("bundleId")
        if bundle_id and bundle_id in bundle_ids:
            matches.append((index, app))

    if len(matches) == 1:
        return matches[0]

    if not matches:
        found = ", ".join(bundle_ids)
        fail(f"no metadata record matches project bundle ids: {found}")

    labels = ", ".join(f"{app_key(app)} ({app.get('bundleId')})" for _, app in matches)
    fail(f"multiple metadata records match project bundle ids: {labels}")


def is_empty(value):
    if value is None or value == "" or value == []:
        return True
    if isinstance(value, list):
        return all(is_empty(item) for item in value)
    return False


APP_TEMPLATE = {
    "id": "",
    "type": "App",
    "platform": [
        "iOS"
    ],
    "origin": "fromScratch",
    "status": "inDevelopment",
    "displayName": "",
    "title": "",
    "subtitle": "",
    "promoText": "",
    "shortDescription": "",
    "fullDescription": [
        "<description paragraph>",
        "Features:",
        "• <feature>"
    ],
    "keywords": "",
    "supportUrl": "",
    "marketingUrl": "",
    "privacyPolicyUrl": "",
    "termsOfUseUrl": "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
    "reviewNotes": [
        "<review note paragraph>",
        "Review steps:",
        "1. <step>"
    ],
    "appStoreId": "",
    "bundleId": "",
    "googlePlayId": "",
    "screenshots": [
        0
    ],
    "screenshotProduct": "iPhone 17 Pro Max",
    "email": "",
    "privacyUpdatedDate": "",
    "inAppPurchases": [
        {
            "originalName": "<optional>",
            "productId": "<optional>",
            "type": "nonConsumable",
            "price": "<optional>",
            "localizations": [
                {
                    "locale": "en-US",
                    "displayName": "<optional>",
                    "description": "<optional>"
                }
            ]
        }
    ],
    "subscriptionGroup": {
        "originalName": "<optional>",
        "id": "<optional>",
        "localizations": [
            {
                "locale": "en-US",
                "displayName": "<optional>",
                "appName": "<optional>"
            }
        ],
        "subscriptions": [
            {
                "level": 1,
                "originalName": "Year",
                "productId": "<optional>",
                "duration": "1 year",
                "price": "<optional>",
                "localizations": [
                    {
                        "locale": "en-US",
                        "displayName": "Year",
                        "description": "<optional>"
                    }
                ]
            }
        ]
    },
    "releaseDate": "0000-00-00",
    "whatsNew": [
        {
            "version": "",
            "changes": [
                "• <change>"
            ]
        }
    ],
    "saleDate": "",
    "salePrice": 0,
    "listingFee": [
        0
    ],
    "successFee": 0,
    "appStoreUnits": 0,
    "appStoreSales": None,
    "appStoreProceeds": None,
    "flippaLink": [
        "https://flippa.com"
    ],
    "gitHubLink": ""
}

def command_template(args):
    template = dict(APP_TEMPLATE)
    if args.project:
        bundle_ids = project_bundle_ids(args.project)
        main_candidates = [bundle_id for bundle_id in bundle_ids if "Tests" not in bundle_id and "Extension" not in bundle_id]
        template["bundleId"] = main_candidates[0] if main_candidates else bundle_ids[0]
    print(json.dumps(template, ensure_ascii=False, indent=4))


def command_get_current(args):
    metadata = load_metadata(args.metadata_path)
    _, app = find_app_for_project(metadata, args.project)
    print(json.dumps(app, ensure_ascii=False, indent=4))


def command_empty_current(args):
    metadata = load_metadata(args.metadata_path)
    _, app = find_app_for_project(metadata, args.project)
    empty_fields = [key for key, value in app.items() if is_empty(value)]
    result = {
        "id": app.get("id"),
        "bundleId": app.get("bundleId"),
        "emptyFields": empty_fields,
    }
    print(json.dumps(result, ensure_ascii=False, indent=4))


def command_patch_current(args):
    metadata = load_metadata(args.metadata_path)
    index, app = find_app_for_project(metadata, args.project)

    try:
        with args.patch.open("r", encoding="utf-8") as file:
            patch = json.load(file)
    except FileNotFoundError:
        fail(f"patch file not found: {args.patch}")
    except json.JSONDecodeError as error:
        fail(f"invalid JSON in patch file: {error}")

    if not isinstance(patch, dict):
        fail("patch must be a JSON object")

    changed = []
    skipped = []
    for key, value in patch.items():
        if not args.overwrite and key in app and not is_empty(app[key]):
            skipped.append(key)
            continue
        app[key] = value
        changed.append(key)

    metadata[index] = app
    save_metadata(args.metadata_path, metadata)

    result = {
        "id": app.get("id"),
        "bundleId": app.get("bundleId"),
        "changedFields": changed,
        "skippedFields": skipped,
    }
    print(json.dumps(result, ensure_ascii=False, indent=4))


def command_validate(args):
    metadata = load_metadata(args.metadata_path)
    errors = []
    bundle_owners = {}
    missing_bundle_id = []

    for index, app in enumerate(metadata):
        label = f"record[{index}]"
        if not isinstance(app, dict):
            errors.append(f"{label}: must be an object")
            continue

        label = app_key(app)
        bundle_id = app.get("bundleId")
        if bundle_id:
            if not isinstance(bundle_id, str):
                errors.append(f"{label}: bundleId must be a string")
            elif bundle_id in bundle_owners:
                errors.append(f"{label}: duplicate bundleId {bundle_id} also used by {bundle_owners[bundle_id]}")
            else:
                bundle_owners[bundle_id] = label
        else:
            missing_bundle_id.append(label)

        if "fullDescription" in app:
            full_description = app["fullDescription"]
            if not isinstance(full_description, list) or not all(isinstance(item, str) for item in full_description):
                errors.append(f"{label}: fullDescription must be an array of strings")

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)

    result = {
        "status": "ok",
        "records": len(metadata),
        "recordsWithBundleId": len(bundle_owners),
        "recordsMissingBundleId": len(missing_bundle_id),
    }
    print(json.dumps(result, ensure_ascii=False, indent=4))


def add_current_arguments(parser):
    parser.add_argument("--project", type=Path, default=Path.cwd(), help="Path to an app project directory or .xcodeproj")


def build_parser():
    parser = argparse.ArgumentParser(description="Work with one app record in apps-metadata.json.")
    parser.add_argument("--metadata-path", type=Path, default=DEFAULT_METADATA_PATH, help="Path to apps-metadata.json")
    subparsers = parser.add_subparsers(dest="command", required=True)

    get_current = subparsers.add_parser("get-current", help="Print one app record for the current project")
    add_current_arguments(get_current)
    get_current.set_defaults(func=command_get_current)

    empty_current = subparsers.add_parser("empty-current", help="Print empty fields for one app record")
    add_current_arguments(empty_current)
    empty_current.set_defaults(func=command_empty_current)

    patch_current = subparsers.add_parser("patch-current", help="Apply a JSON object patch to one app record")
    add_current_arguments(patch_current)
    patch_current.add_argument("patch", type=Path, help="Path to a JSON object patch")
    patch_current.add_argument("--overwrite", action="store_true", help="Allow overwriting non-empty fields")
    patch_current.set_defaults(func=command_patch_current)

    validate = subparsers.add_parser("validate", help="Validate metadata structure without printing private data")
    validate.set_defaults(func=command_validate)

    template = subparsers.add_parser("template", help="Print an empty app record template")
    template.add_argument("--project", type=Path, help="Optional app project path used to prefill bundleId")
    template.set_defaults(func=command_template)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.metadata_path = args.metadata_path.expanduser().resolve()
    args.func(args)


if __name__ == "__main__":
    main()
