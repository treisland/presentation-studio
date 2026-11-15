(() => {
  "use strict";
  const sourceTemplate =
    "<!doctype html>\n" + document.documentElement.outerHTML.replace(
      /(<script id="studio-entry" type="application\/json">)true(<\/script>)/,
      "$1false$2",
    );
  const $ = (id) => document.getElementById(id),
    params = new URLSearchParams(location.search);

const studioBuild = /* @BUILD_KIND */;
const studioTemplateName = "Studio demo";
