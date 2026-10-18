#!/bin/sh
set -eu

key=${CRM_SHOWCASE_JWT_SECRET:-}
if [ "${#key}" -lt 32 ]; then
  echo "CRM_SHOWCASE_JWT_SECRET must contain at least 32 characters." >&2
  exit 1
fi

exec java -jar /app/crm-api.jar "$@"
