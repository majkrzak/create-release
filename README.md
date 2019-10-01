Andrew-Kulpa/create-release
=======================

Github Action for handling release creation


Build Process
-------------
```
  $ npm install
  $ npm run build
  
  $ git checkout -b releases/v{version_number}
  $ git commit -a -m "prod dependencies"

  $ npm prune --production
  $ git add node_modules
  $ git commit -a -m "prod dependencies"
  $ git push origin releases/v{version_number}
```


Example
-------

```yaml
    - name: Release Executables
      uses: andrew-kulpa/create-release@v1
      with:
        name: Your release name
        tag: windows-build
        prerelease: false
        overwrite: true
        body: The official windows build for this project
        artifacts: |
          concatFiles.exe
          main.exe
        # artifact: main.exe
      env:
        GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```
