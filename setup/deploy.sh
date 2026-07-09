#!/usr/bin/env bash
# Deploys both demo stacks in dependency order
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

PULUMI_ORG="mtan-psp-demo"
STACK="dev"
MEMBER_USERNAME="MeganYTan"
TEAM_NAME="service-provider-demo-team-dev"

(cd ../esc-aws-oidc &&
  pulumi stack select "$PULUMI_ORG/esc-aws-oidc/$STACK" --create &&
  pulumi up --yes)

(cd ../service-provider-demo &&
  pulumi stack select "$PULUMI_ORG/service-provider-demo/$STACK" --create &&
  pulumi config set --path 'memberUsernames[0]' "$MEMBER_USERNAME" &&
  pulumi config set teamName "$TEAM_NAME" &&
  pulumi up --yes)
