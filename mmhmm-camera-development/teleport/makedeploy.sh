#!/bin/sh

DEPLOY_DIR=deploy

if [ ! -d ${DEPLOY_DIR} ]; then
  mkdir ${DEPLOY_DIR}
fi

if [ -d teleport ]; then
    TELEPORT_DIR=teleport
else
    TELEPORT_DIR=.
fi

AUTH_EMBED="mmhmm_auth.js"

APP_HTML="index.html"
APP_JS="main.js"
APP_CSS="main.css"

CAMERA_DEMO_HTML="camera_demo.html"

echo Copy assets directory
if [ -d ${DEPLOY_DIR}/assets ]; then
    rm -rf ${DEPLOY_DIR}/assets
fi
cp -rf ${TELEPORT_DIR}/assets ${DEPLOY_DIR}/assets

echo Copy workers directory
if [ -d ${DEPLOY_DIR}/workers ]; then
    rm -rf ${DEPLOY_DIR}/workers
fi
cp -rf ${TELEPORT_DIR}/workers ${DEPLOY_DIR}/workers

echo Copy caching ServiceWorker
cp -rf ${TELEPORT_DIR}/cacher.js ${DEPLOY_DIR}/

# In order to facilitate lazy loading of third party sources
# we don't want to reference them in index.html but then
# there aren't refs to them anywhere.  For now we'll just
# blindly copy the third_party directory over.
echo Copy third_party directory over
tar -cf - ${TELEPORT_DIR}/third_party | (cd ${DEPLOY_DIR} ; tar --strip-components 1 -xf -)

# Extract local script tags from mmhmm_auth.html
echo Extract sources from mmhmm_auth
grep 'script src=' ${TELEPORT_DIR}/mmhmm_auth.html | grep -v http | cut -f2 -d\" | sed "s/^/${TELEPORT_DIR}\//" | xargs cat >> ${DEPLOY_DIR}/${AUTH_EMBED}

function preprocess {
    local HTML_FILE=$1
    local JS_FILE=$2
    local CSS_FILE=$3

    echo Pre Processing $HTML_FILE

    # Copy <link> files
    echo Copy link element sources from $HTML_FILE
    grep '<link.*href' ${TELEPORT_DIR}/${HTML_FILE} | grep -v 'href="http' | grep -v 'rel="stylesheet"' | grep -v 'href="assets' | sed 's/^.*href=['"'"'"]\([^'"'"'"]*\).*$/\1/' | sed "s/^/${TELEPORT_DIR}\//" | xargs tar -cf - | (cd ${DEPLOY_DIR} ; tar --strip-components 1 -xf -)

    # Combine stylesheets into one
    echo Combine stylesheets from $HTML_FILE into $CSS_FILE
    grep '<link.*href' ${TELEPORT_DIR}/${HTML_FILE} | grep -v 'href="http' | grep 'rel="stylesheet"' | sed 's/^.*href="\([^"]*\)".*$/\1/' | sed "s/^/${TELEPORT_DIR}\//" | xargs node ${TELEPORT_DIR}/css_relative_urls.js > ${DEPLOY_DIR}/${CSS_FILE}

    # Copy script files prefixed with a dot, indicating
    # they cannot be part of the combined sources file
    echo Copy files from $HTML_FILE that must remain separate
    grep 'script src=' ${TELEPORT_DIR}/${HTML_FILE} | grep "\./" | grep -v workers/ | grep -v no-ship | cut -f2 -d\" | sed "s/^\.\//${TELEPORT_DIR}\//" | xargs tar -cf - | (cd ${DEPLOY_DIR} ; tar --strip-components 1 -xf -)

    # Concatenate all of the other local script files
    echo Combine sources from $HTML_FILE into $JS_FILE
    echo "const gLocalDeployment = false;" > ${DEPLOY_DIR}/${JS_FILE}
    cat ${TELEPORT_DIR}/utils/cookies.js >> ${DEPLOY_DIR}/${JS_FILE}
    cat ${TELEPORT_DIR}/core/localization.js >> ${DEPLOY_DIR}/${JS_FILE}

    grep 'script src=' ${TELEPORT_DIR}/${HTML_FILE} | grep -v http | grep -v "\.\/" | grep -v no-ship | grep -v localization.js | grep -v cookies.js |  cut -f2 -d\" | grep -v "^tests/" | sed "s/^/${TELEPORT_DIR}\//" | xargs cat > ${DEPLOY_DIR}/${JS_FILE}.tmp

    if [ x"" = x"`command -v node`" ]; then
      echo Could not find node
      exit 1
    else
      node ${TELEPORT_DIR}/localizations/make_table.js ${TELEPORT_DIR}/localizations ${DEPLOY_DIR}/${JS_FILE}.tmp >> ${DEPLOY_DIR}/${JS_FILE}
      if [ $? -ne 0 ]; then
        echo "Failed to generate localizations"
        exit 1
      fi
    fi

    cat ${DEPLOY_DIR}/${JS_FILE}.tmp >> ${DEPLOY_DIR}/${JS_FILE}
    rm ${DEPLOY_DIR}/${JS_FILE}.tmp
}

preprocess $APP_HTML $APP_JS $APP_CSS

if [ x"" = x"`command -v minify`" ]; then
  echo Could not find minify - the JS will not be minified
else
  # Minify CSS files
  for fname in ${DEPLOY_DIR}/*css; do
    echo Minify ${fname}
    minify ${fname} > ${fname}.tmp
    mv ${fname}.tmp ${fname}
  done

  BUILD=`git rev-parse --short=7 HEAD`

  # Minify JS files
  for fname in ${DEPLOY_DIR}/*.js ${DEPLOY_DIR}/workers/*js; do
    echo Minify ${fname}
    minify ${fname} > ${fname}.tmp
    cat <<EOF>${fname}
/**
 * Copyright mmhmm, inc. `date "+%Y"`
 * Date: `date "+%Y-%m-%d"`
 * Build: ${BUILD}
 */
EOF

    if [ x"${fname}" == x"${DEPLOY_DIR}/${APP_JS}" ]; then
      # Inject variables for the main app sources
      cat <<EOF>>${fname}
const gAppBuild = '${BUILD}';
const gAppBuildDate = new Date(`date "+%s"` * 1000);
EOF
    fi

    cat ${fname}.tmp >> ${fname}
    rm ${fname}.tmp
  done
fi

function postprocess {
    local HTML_FILE=$1
    local JS_FILE=$2
    local CSS_FILE=$3

    echo Post Processing $HTML_FILE

    # Replace script tags with a single tag poining at main.js
    grep -v 'script src="[a-zA-Z0-9_\/]*\.js' ${TELEPORT_DIR}/${HTML_FILE} | grep -v 'script.*no-ship' | grep -v '^$' | sed 's/<script>/<script src="'${JS_FILE}'"><\/script>\
        <script>/' > ${DEPLOY_DIR}/${HTML_FILE}

    # Replace stylesheet tags with a single tag poining at main.css
    grep -v 'link rel="stylesheet" href="[a-zA-Z0-9_\/]*\.css' ${DEPLOY_DIR}/${HTML_FILE} | grep -v '^$' | sed 's/<head>/<head>\
        <link rel="stylesheet" href="'${CSS_FILE}'" \/>/' > ${DEPLOY_DIR}/${HTML_FILE}.tmp
    mv ${DEPLOY_DIR}/${HTML_FILE}.tmp ${DEPLOY_DIR}/${HTML_FILE}
}

postprocess $APP_HTML $APP_JS $APP_CSS

# Create camera_demo.html
echo "Creating camera_demo.html"
cp ${DEPLOY_DIR}/${APP_HTML} ${DEPLOY_DIR}/${CAMERA_DEMO_HTML}

# weird things to inject minified code back into the mmhmm_auth.html file...
grep -v 'script src="[a-zA-Z0-9_\/]*\.js' ${TELEPORT_DIR}/mmhmm_auth.html | grep -v '^$' > ${DEPLOY_DIR}/mmhmm_auth.html

# find head/tail location
HEAD_LOC=`grep '<script>' -n ${DEPLOY_DIR}/mmhmm_auth.html | head -1 | cut -f1 -d\:`
TAIL_LOC=`expr ${HEAD_LOC} + 1`

# ensure the file is empty
echo > ${DEPLOY_DIR}/mmhmm_auth.html.tmp

# add the head
head -${HEAD_LOC} ${DEPLOY_DIR}/mmhmm_auth.html >> ${DEPLOY_DIR}/mmhmm_auth.html.tmp
# add the minified/inlined sources
cat ${DEPLOY_DIR}/${AUTH_EMBED} >> ${DEPLOY_DIR}/mmhmm_auth.html.tmp
# add the tail
tail +${TAIL_LOC} ${DEPLOY_DIR}/mmhmm_auth.html >> ${DEPLOY_DIR}/mmhmm_auth.html.tmp

# finished
mv ${DEPLOY_DIR}/mmhmm_auth.html.tmp ${DEPLOY_DIR}/mmhmm_auth.html

# no longer need the inlined sources
rm ${DEPLOY_DIR}/${AUTH_EMBED}
