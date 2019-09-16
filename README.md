majkrzak/create-release
=======================

Github Action for handling release creation


Example
-------

```yaml
    - uses: majkrzak/create-release@master
      with:
        token: ${{github.token}}
        name: My lovely release
        code: latest
        prerelease: true
        assets: >
          source.txt:target.txt:text/plain
          another:one:application/json
```
