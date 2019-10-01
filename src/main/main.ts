import { GitHub } from '@actions/github';
import * as core from '@actions/core';
import { getType } from 'mime';
import { lstatSync, readFileSync } from 'fs';
import { basename } from 'path';
import { Asset } from './asset';
import { ReposCreateReleaseResponse } from '@octokit/rest';

const api = new GitHub(process.env.GITHUB_TOKEN!);
const github = require('@actions/github');
async function run() {
    try {
        console.log('initializing config variables');
        const name = core.getInput('name');
        const body = core.getInput('body');
        const prerelease = core.getInput('prerelease') == 'true';
        const overwrite = core.getInput('overwrite') == 'true';

        let artifact_paths = core.getInput('artifacts').split("\n");
        if (!artifact_paths && core.getInput('artifact')) {
            artifact_paths = [core.getInput('artifact')]
        }

        // use manual tag, unless its not set then try to use tag in ref
        let tag = core.getInput('tag');
        if (process.env.GITHUB_REF!.startsWith('refs/tags/')) {
            tag = tag ? tag : process.env.GITHUB_REF!.split('/')[2]
        } else if (!tag && name) {
            tag = name
        } else if (!tag) {
            throw new Error('A tag is required for GitHub Releases')
        }

        if (overwrite) {
            console.log('Deleting previous release');
            await deleteInitialRelease(tag);
        }
        console.log('Creating new release');
        const release = await createRelease(body, tag, prerelease, name);

        console.log('Uploading assets (if any)');
        for (const artifact_path of artifact_paths) {
            const asset = getAsset(artifact_path);
            await uploadAsset(release.upload_url, asset);
        }
        console.log(`Uploaded release to ${release.html_url}`);
    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
}

run();



function getAsset(path: string): Asset {
    return {
        name: basename(path),
        contentType: getType(path) || 'application/octet-stream',
        contentLength: lstatSync(path).size,
        file: readFileSync(path)
    }
}

async function uploadAsset(url: string, asset: Asset) {
    return api.repos.uploadReleaseAsset({
        url: url,
        headers: {
            ['content-type']: asset.contentType,
            ['content-length']: asset.contentLength
        },
        name: asset.name,
        file: asset.file
    });
}

async function deleteInitialRelease(tag: string): Promise<void> {
    try {
        const release = await api.repos.getReleaseByTag({
            ...github.context.repo,
            tag: tag
        });
        await api.repos.deleteRelease({
            ...github.context.repo,
            release_id: release.data.id
        });
        await api.git.deleteRef({
            ...github.context.repo,
            ref: `tags/${tag}`
        });
    }
    catch (error) {
        if (error.name != 'HttpError' || error.status != 404) {
            throw error;
        }
    }
}

async function createRelease(body?: string, tag?: string, prerelease?: boolean, name?: string): Promise<ReposCreateReleaseResponse> {
    const release = await api.repos.createRelease({
        ...github.context.repo,
        tag_name: tag || 'DEFAULT_RELEASE',
        target_commitish: github.context.sha,
        name: name || tag || 'DEFAULT_RELEASE',
        body: body,
        prerelease: prerelease
    });
    return release.data // {upload_url, html_url, ...}
}
