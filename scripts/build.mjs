import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFile(resolve(root, path), "utf8");
const config = JSON.parse(await read("build.config.json"));
const { version } = JSON.parse(await read("package.json"));
let commit = 'unknown', tagged = false, dirty = true;
try {
  commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim();
  dirty = !!execFileSync('git', ['status','--porcelain','--untracked-files=no'], {cwd:root,encoding:'utf8'}).trim();
  tagged = execFileSync('git', ['tag','--points-at','HEAD'], {cwd:root,encoding:'utf8'}).split(/\r?\n/).includes('v'+version);
} catch { /* Source archives remain identifiable as development builds. */ }
// Docker source contexts deliberately omit .git. A supplied revision is only a
// development hint, never permission to label rebuilt source as a clean release.
if (process.env.STUDIO_SOURCE_COMMIT !== undefined) {
  const supplied=process.env.STUDIO_SOURCE_COMMIT;
  if(supplied!=='unknown'&&!/^[a-f0-9]{40}$/.test(supplied))throw Error('Invalid source build revision.');
  commit=supplied;tagged=false;dirty=true;
}
const buildInfo = {version, commit, channel: tagged && !dirty ? (version.match(/-(alpha|beta|rc)\./)?.[1] || 'stable') : 'development', dirty,
  imports:{native:[2,3,4],legacy:[1],authoring:[1,2],library:[1]}};
const authoringFiles = {
  "AUTHORING.md": await read("docs/ai/AUTHORING.md"),
  "example.json": await read("docs/ai/example.json"),
  "project-update.json": await read("docs/ai/project-update.json"),
  "technical-walkthrough.json": await read("docs/ai/technical-walkthrough.json"),
  "custom-backgrounds-v2.json": await read("docs/ai/custom-backgrounds-v2.json"),
  "background-effects.json": await read("docs/ai/background-effects.json"),
};
const authoringContext = vm.createContext({ URL });
vm.runInContext(await read("src/runtime/background-effects-core.js"), authoringContext);
vm.runInContext(await read("src/runtime/custom-background-core.js"), authoringContext);
vm.runInContext(await read("src/runtime/authoring-definitions.js"), authoringContext);
vm.runInContext(await read("src/runtime/authoring-contract.js"), authoringContext);
const authoringSchema = vm.runInContext("JSON.stringify(paSchema(), null, 2)", authoringContext);
for (const [name, content] of Object.entries(authoringFiles)) if (name.endsWith(".json"))
  vm.runInContext("paValidate(" + content + ")", authoringContext, { filename: name });
authoringFiles["capabilities.json"] = vm.runInContext("JSON.stringify(paCatalog(), null, 2)", authoringContext);
authoringFiles["CAPABILITIES.md"] = vm.runInContext("paCapabilityGuide()", authoringContext);
await mkdir(resolve(root, "dist/ai-authoring"), { recursive: true });
// Remove only this obsolete generated diagnostic when rebuilding an older checkout.
await unlink(resolve(root, "dist/folder-picker-probe.html")).catch(error => { if (error.code !== "ENOENT") throw error; });
for (const [name, content] of Object.entries({ ...authoringFiles, "presentation.schema.json": authoringSchema, "presentation-v2.schema.json": vm.runInContext("JSON.stringify(paSchema(2), null, 2)", authoringContext) }))
  await writeFile(resolve(root, "dist/ai-authoring", name), content);
const styles = (await Promise.all(config.styles.map(read))).join("\n");
const vendor = await read(config.vendor);
new vm.Script(vendor, { filename: config.vendor });
const licenseFiles = (await readdir(resolve(root, "vendor/licenses"))).sort();
const notices =
  (await read("LICENSE")) + "\n\n" + (await read("THIRD_PARTY_NOTICES.md")) +
  "\n\n" +
  (
    await Promise.all(
      licenseFiles.map(
        async (name) => name + "\n" + (await read("vendor/licenses/" + name)),
      ),
    )
  ).join("\n\n");
const source = (await read("src/shell.html")).replace(
  "</body>",
  () =>
    '<script id="third-party-notices" type="application/json">' +
    JSON.stringify(notices).replace(/</g, "\\u003c") +
    "</script></body>",
);
const demo = JSON.parse(await read("templates/studio/presentation.json"));
const blank = JSON.parse(await read("templates/blank/presentation.json"));
const image = await read("examples/sample-diagram.svg");
const assets = {
  "assets/portfolio-library.svg": {
    type: "image/svg+xml",
    data: Buffer.from(await read("examples/portfolio-library.svg")).toString("base64"),
  },
  "assets/studio-demo-workflow.svg": {
    type: "image/svg+xml",
    data: Buffer.from(image).toString("base64"),
  },
};
for(const name of ['signs','workshop','plan'])assets['assets/portfolio-'+name+'.svg']={type:'image/svg+xml',data:Buffer.from(await read('examples/portfolio-'+name+'.svg')).toString('base64')};
for(const n of [1,2,3])assets['assets/comic-seed-'+n+'.svg']={type:'image/svg+xml',data:Buffer.from(await read('examples/comic-seed-'+n+'.svg')).toString('base64')};
assets['assets/flyer-gathering.svg']={type:'image/svg+xml',data:Buffer.from(await read('examples/flyer-gathering.svg')).toString('base64')};
for (const [name, kind, project] of [
  ["presentation-studio.html", "generic", demo],
  ["presentation-studio-blank.html", "generic", blank],
]) {
  const paths = [...config.scripts];
  const boot = paths.pop();
  let app =
    (await Promise.all(paths.map(read))).join("\n") +
    "\n" +
    (await read("templates/studio/runtime.js")) +
    "\n" +
    (await read(boot));
  app = app.replace("/* @BUILD_KIND */", JSON.stringify(kind));
  app = app.replace("/* @AUTHORING_PACK */", () => JSON.stringify(authoringFiles).replace(/</g, "\\u003c"));
  new vm.Script(app, { filename: name + ".js" });
  let output = source;
  const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
  for (const [token, value] of [
    ["/* @STYLES */", styles],
    [
      "<!-- @PRESENTATION_SLIDES -->",
      await read("templates/studio/initial.html"),
    ],
    ["@PROJECT_CONFIG", json(project)],
    ["@APP_BUILD_INFO", json(buildInfo)],
    [
      "@MEDIA_CONFIG",
      json({ schemaVersion: 1, slides: project?.state.media || {} }),
    ],
    ["@STUDIO_TEMPLATE", json(kind === "generic" ? demo : null)],
    ["@THEME_SCHEMES", json(JSON.parse(await read("src/themes.json")))],
    ["@STUDIO_ASSETS", json(kind === "generic" ? assets : {})],
    ["/* @ZIP_RUNTIME */", vendor],
    ["/* @APPLICATION */", app],
  ]) {
    if (output.split(token).length !== 2)
      throw new Error("Expected one " + token);
    output = output.replace(token, () => value);
  }
  const destination = resolve(root, "dist", name);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, output);
  console.log(
    "Built dist/" + name + " (" + Buffer.byteLength(output) + " bytes)",
  );
}
await writeFile(resolve(root,'dist/version.json'), JSON.stringify(buildInfo,null,2)+'\n');
