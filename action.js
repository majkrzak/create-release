require('child_process')
  .execSync(
    'npm install @actions/core @actions/github',
    { cwd: __dirname }
  );
const fs = require('fs');
const core = require('@actions/core');
const github = require('@actions/github');

(async () => {
  try {
    const api = new github.GitHub(core.getInput('token'));

    const name = core.getInput('name');
    const code = core.getInput('code');
    const body = core.getInput('body');
    const prerelease = core.getInput('prerelease') == 'true';
    const recreate = core.getInput('prerelease') == 'true';
    const assets = core.getInput('assets').split(' ').map(asset => asset.split(':'));

    if (recreate) {
      try {
        const release = await api.repos.getReleaseByTag({
          ...github.context.repo,
          tag: code
        });
        await api.repos.deleteRelease({
          ...github.context.repo,
          release_id: release.data.id
        });
        await api.git.deleteRef({
          ...github.context.repo,
          ref: `tags/${code}`
        });
      }
      catch (error) {
        if (error.name != 'HttpError' || error.status != 404) {
          throw error;
        }
      }
    }

    const release = await api.repos.createRelease({
      ...github.context.repo,
      tag_name: code,
      target_commitish: github.context.sha,
      name,
      body,
      prerelease: prerelease
    });

    for (const [source, target, type] of assets) {
      const data = fs.readFileSync(source);
      api.repos.uploadReleaseAsset({
        url: release.data.upload_url,
        headers: {
          ['content-type']: type,
          ['content-length']: data.length
        },
        name: target,
        file: data
      });
    }
  } catch (error) {
    console.error(error);
    core.setFailed(error.message);
  }
})();
