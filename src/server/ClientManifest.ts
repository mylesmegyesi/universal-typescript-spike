import * as fs from "fs";
import * as path from "path";

import * as jsonschema from "jsonschema";

export type ClientManifest = {
  mainScriptName: string;
  mainCssName: string;
  scriptOnLoadCallback: string;
  publicDirectoryPath: string;
}

const clientManifestJsonSchema = {
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "mainScriptName": {
      "type": "string",
    },
    "mainCssName": {
      "type": "string",
    },
    "scriptOnLoadCallback": {
      "type": "string",
    },
    "publicDirectoryPath": {
      "type": "string",
    }
  },
  "required": [
    "mainScriptName",
    "mainCssName",
    "scriptOnLoadCallback",
    "publicDirectoryPath",
  ],
};

function readFileAsync(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, { encoding: "utf8", flag: "r" }, (err, content) => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}

export const MANIFEST_FILE_NAME = "manifest.json";

export function parseManifest(content: string): ClientManifest {
  const parsedManifest = JSON.parse(content);

  const validationResult = jsonschema.validate(parsedManifest, clientManifestJsonSchema)

  if (validationResult.valid) {
    return {
      mainScriptName: parsedManifest["mainScriptName"],
      mainCssName: parsedManifest["mainCssName"],
      scriptOnLoadCallback: parsedManifest["scriptOnLoadCallback"],
      publicDirectoryPath: parsedManifest["publicDirectoryPath"],
    };
  } else {
    const errors = validationResult.errors.map((e) => `  * ${e.property} ${e.message}`).join("\n");
    const errorMessage = `Manifest is invalid:\n${errors}`;
    throw new Error(errorMessage);
  }
}

export async function readManifest(bundlePath: string): Promise<ClientManifest> {
  const manifestPath = path.join(bundlePath, MANIFEST_FILE_NAME);
  const content = await readFileAsync(manifestPath);
  const manifest = parseManifest(content);
  return { ...manifest, publicDirectoryPath: path.join(bundlePath, manifest.publicDirectoryPath) };
}
