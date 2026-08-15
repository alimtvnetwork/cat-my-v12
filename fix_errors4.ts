import * as fs from "fs";

function r(file: string, a: string | RegExp, b: string) {
  let content = fs.readFileSync(file, "utf8");
  let mod = content.replace(a, b);
  if (mod !== content) {
    fs.writeFileSync(file, mod, "utf8");
    console.log("Fixed " + file);
  }
}

r("src/lib/camera/facade.ts", /ok: true; isFail: false/g, "ok: true, isFail: false");
r("src/lib/camera/store.ts", /ok: true; isFail: false/g, "ok: true, isFail: false");
