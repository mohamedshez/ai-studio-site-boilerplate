#!/usr/bin/env bash
# Builds the image, deploys it to Cloud Run and confirms the new version is live.
# Called by the deploy workflows after they have signed in to Google Cloud.
# Needs: gcloud, docker, jq, curl.
set -euo pipefail

: "${GCP_PROJECT_ID:?}" "${GCP_REGION:?}" "${GAR_REPOSITORY:?}" "${RUNTIME_SERVICE_ACCOUNT:?}"
: "${SERVICE:?}" "${SITE_ENV:?}" "${APP_VERSION:?}"

if [[ -z "${CONTACT_TO_GENERAL:-}" ]]; then
  echo "CONTACT_TO_GENERAL is not set for this environment. See README.md." >&2
  exit 1
fi
if [[ "$SITE_ENV" != "production" && ( -z "${DEV_AUTH_USER:-}" || -z "${DEV_AUTH_PASSWORD:-}" ) ]]; then
  echo "DEV_AUTH_USER and DEV_AUTH_PASSWORD must be set for a development site. See README.md." >&2
  exit 1
fi

registry="${GCP_REGION}-docker.pkg.dev"
image="${registry}/${GCP_PROJECT_ID}/${GAR_REPOSITORY}/site:${GITHUB_SHA:-$APP_VERSION}"

gcloud auth configure-docker "$registry" --quiet
docker build -t "$image" .
docker push "$image"

# Settings go in a file so values with commas or quotes survive intact.
# JSON is valid YAML. Empty settings are left out. The file replaces all
# settings on the service, so anything removed here is removed there.
env_file="$(mktemp)"
trap 'rm -f "$env_file"' EXIT
jq -n '
  ["SITE_ENV","SITE_URL","APP_VERSION","DEV_AUTH_USER","DEV_AUTH_PASSWORD",
   "CONTACT_TO_GENERAL","CONTACT_TO_SALES","CONTACT_TO_CAREERS","CONTACT_TO_SUPPORT",
   "SMTP_HOST","SMTP_PORT","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"]
  | map({key: ., value: (env[.] // "")})
  | map(select(.value != ""))
  | from_entries' > "$env_file"

gcloud run deploy "$SERVICE" \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --image "$image" \
  --service-account "$RUNTIME_SERVICE_ACCOUNT" \
  --env-vars-file "$env_file" \
  --port 8080 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --quiet

url="$(gcloud run services describe "$SERVICE" \
  --project "$GCP_PROJECT_ID" --region "$GCP_REGION" --format 'value(status.url)')"
echo "Service address: $url"

for attempt in 1 2 3 4 5 6; do
  live="$(curl -fsS "$url/api/health" | jq -r '.version' || true)"
  if [[ "$live" == "$APP_VERSION" ]]; then
    echo "Confirmed: $SERVICE is serving version $APP_VERSION."
    exit 0
  fi
  echo "Attempt $attempt: health reports '${live:-nothing}', expected '$APP_VERSION'."
  sleep 5
done

echo "The new version did not come up on $url/api/health." >&2
exit 1
