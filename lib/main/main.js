"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const core = __importStar(require("@actions/core"));
const mime_1 = require("mime");
const fs_1 = require("fs");
const path_1 = require("path");
const api = new github_1.GitHub(process.env.GITHUB_TOKEN);
const github = require('@actions/github');
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('initializing config variables');
            const name = core.getInput('name');
            const body = core.getInput('body');
            const prerelease = core.getInput('prerelease') == 'true';
            const overwrite = core.getInput('overwrite') == 'true';
            let artifact_paths = core.getInput('artifacts').split("\n");
            if (!artifact_paths && core.getInput('artifact')) {
                artifact_paths = [core.getInput('artifact')];
            }
            // use manual tag, unless its not set then try to use tag in ref
            let tag = core.getInput('tag');
            if (process.env.GITHUB_REF.startsWith('refs/tags/')) {
                tag = tag ? tag : process.env.GITHUB_REF.split('/')[2];
            }
            else if (!tag && name) {
                tag = name;
            }
            else if (!tag) {
                throw new Error('A tag is required for GitHub Releases');
            }
            if (overwrite) {
                console.log('Deleting previous release');
                yield deleteInitialRelease(tag);
            }
            console.log('Creating new release');
            const release = yield createRelease(body, tag, prerelease, name);
            console.log('Uploading assets (if any)');
            for (const artifact_path of artifact_paths) {
                const asset = getAsset(artifact_path);
                yield uploadAsset(release.upload_url, asset);
            }
            console.log(`Uploaded release to ${release.html_url}`);
        }
        catch (error) {
            console.error(error);
            core.setFailed(error.message);
        }
    });
}
run();
function getAsset(path) {
    return {
        name: path_1.basename(path),
        contentType: mime_1.getType(path) || 'application/octet-stream',
        contentLength: fs_1.lstatSync(path).size,
        file: fs_1.readFileSync(path)
    };
}
function uploadAsset(url, asset) {
    return __awaiter(this, void 0, void 0, function* () {
        return api.repos.uploadReleaseAsset({
            url: url,
            headers: {
                ['content-type']: asset.contentType,
                ['content-length']: asset.contentLength
            },
            name: asset.name,
            file: asset.file
        });
    });
}
function deleteInitialRelease(tag) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const release = yield api.repos.getReleaseByTag(Object.assign(Object.assign({}, github.context.repo), { tag: tag }));
            yield api.repos.deleteRelease(Object.assign(Object.assign({}, github.context.repo), { release_id: release.data.id }));
            yield api.git.deleteRef(Object.assign(Object.assign({}, github.context.repo), { ref: `tags/${tag}` }));
        }
        catch (error) {
            if (error.name != 'HttpError' || error.status != 404) {
                throw error;
            }
        }
    });
}
function createRelease(body, tag, prerelease, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const release = yield api.repos.createRelease(Object.assign(Object.assign({}, github.context.repo), { tag_name: tag || 'DEFAULT_RELEASE', target_commitish: github.context.sha, name: name || tag || 'DEFAULT_RELEASE', body: body, prerelease: prerelease }));
        return release.data; // {upload_url, html_url, ...}
    });
}
