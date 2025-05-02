#!/bin/bash

# Setup versione
VERSION=$(npm version patch --no-git-tag-version)
VERSION_CLEAN=${VERSION#v}

# Aggiorna tutti i package.json delle librerie
for PACKAGE_JSON in libs/*/package.json
do
  echo "Version aligned for $PACKAGE_JSON"
  
  # Aggiorna la versione principale del pacchetto
  jq --arg v "$VERSION_CLEAN" '.version = $v' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"
  
  # Aggiorna tutte le peerDependencies che iniziano con @simply-direct/
  if jq -e 'has("peerDependencies")' "$PACKAGE_JSON" > /dev/null; then
    echo "Updating peerDependencies for $PACKAGE_JSON"
    
    # Crea un file temporaneo con le peerDependencies aggiornate
    jq --arg v "$VERSION_CLEAN" '
      .peerDependencies |= with_entries(
        if (.key | startswith("@simply-direct/")) then 
          .value = "^" + $v
        else 
          .
        end
      )
    ' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"
  fi
done

# Commit e tag personalizzati
git add .
git commit -m "[release]: $VERSION"
git tag "$VERSION"

# Push
git push
git push --tags