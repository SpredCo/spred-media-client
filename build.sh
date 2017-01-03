browserify src/spred.js -t [ envify --NODE_ENV $NODE_ENV --WEB_APP_URI $WEB_APP_URI --MEDIA_SERVICE_URI $MEDIA_SERVICE_URI ] > spred.io.min.js
echo Build complete.
