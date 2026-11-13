#!/usr/bin/env bash
# One-time Google Cloud setup. Run it in Cloud Shell, as a project owner:
#
#   PROJECT_ID=my-project GITHUB_REPO=owner/repo bash scripts/gcp-setup.sh
#
# It enables the APIs, creates an Artifact Registry repository, two service
# accounts, and Workload Identity Federation so GitHub Actions can deploy
# without a stored key. It is safe to run again.
# The project must already exist and have billing attached.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID to your Google Cloud project ID}"
: "${GITHUB_REPO:?Set GITHUB_REPO to owner/repo}"
REGION="${REGION:-europe-west1}"
GAR_REPOSITORY="${GAR_REPOSITORY:-site}"
POOL="github"
PROVIDER="github-actions"

DEPLOYER="gh-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME="site-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format 'value(projectNumber)')"

echo "Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com

echo "Creating the Artifact Registry repository..."
gcloud artifacts repositories describe "$GAR_REPOSITORY" --location "$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create "$GAR_REPOSITORY" \
    --repository-format docker --location "$REGION" \
    --description "Site images"

echo "Creating service accounts..."
gcloud iam service-accounts describe "$DEPLOYER" >/dev/null 2>&1 ||
  gcloud iam service-accounts create gh-deployer --display-name "GitHub Actions deployer"
# The site itself runs as this account, which is given no permissions.
gcloud iam service-accounts describe "$RUNTIME" >/dev/null 2>&1 ||
  gcloud iam service-accounts create site-runtime --display-name "Site runtime"

echo "Granting the deployer its permissions..."
# run.admin rather than run.developer because the workflows make the service public.
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${DEPLOYER}" --role roles/run.admin --condition None >/dev/null
gcloud artifacts repositories add-iam-policy-binding "$GAR_REPOSITORY" --location "$REGION" \
  --member "serviceAccount:${DEPLOYER}" --role roles/artifactregistry.writer >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME" \
  --member "serviceAccount:${DEPLOYER}" --role roles/iam.serviceAccountUser >/dev/null

echo "Setting up Workload Identity Federation for ${GITHUB_REPO}..."
gcloud iam workload-identity-pools describe "$POOL" --location global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create "$POOL" --location global \
    --display-name "GitHub"
# The condition means only workflows in this one repository are accepted.
gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --location global --workload-identity-pool "$POOL" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location global --workload-identity-pool "$POOL" \
    --display-name "GitHub Actions" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition "assertion.repository == '${GITHUB_REPO}'"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GITHUB_REPO}" >/dev/null

cat <<EOF

Done. Add these as GitHub Actions repository variables (none of them is secret):

  GCP_PROJECT_ID           ${PROJECT_ID}
  GCP_REGION               ${REGION}
  GAR_REPOSITORY           ${GAR_REPOSITORY}
  WIF_PROVIDER             projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}
  DEPLOY_SERVICE_ACCOUNT   ${DEPLOYER}
  RUNTIME_SERVICE_ACCOUNT  ${RUNTIME}
EOF
