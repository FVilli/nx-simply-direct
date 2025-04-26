# Setup versione
VERSION=$(npm version patch --no-git-tag-version)
VERSION_CLEAN=${VERSION#v}

# Aggiorna tutti i package.json delle librerie
for PACKAGE_JSON in libs/*/package.json
do
  echo "Version aligned for $PACKAGE_JSON"
  jq --arg v "$VERSION_CLEAN" '.version = $v' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"
done

# Commit e tag personalizzati
git add .
git commit -m "[release]: $VERSION"
git tag "$VERSION"

# Push
git push
git push --tags