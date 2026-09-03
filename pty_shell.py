#!/usr/bin/env python3
import os
import sys
import pty
import select
import termios
import struct
import fcntl
import signal

def set_terminal_size(fd, cols, rows):
    try:
        winsize = struct.pack("HHHH", int(rows), int(cols), 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
    except Exception as e:
        pass

def main():
    home_dir = os.environ.get("HOME", "/tmp/root")
    os.makedirs(home_dir, exist_ok=True)
    bin_dir = os.path.join(home_dir, "bin")
    os.makedirs(bin_dir, exist_ok=True)

    # Set up basic environment
    os.environ["HOME"] = home_dir
    os.environ["TERM"] = "xterm-256color"
    os.environ["LANG"] = "en_US.UTF-8"
    os.environ["LC_ALL"] = "en_US.UTF-8"
    os.environ["PATH"] = f"{bin_dir}:{os.environ.get('PATH', '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin')}"
    os.environ["PS1"] = "\\[\\033[01;32m\\]yuri@nexus\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]$ "

    # Check shell availability
    shell = "/bin/bash"
    if not os.path.exists(shell):
        shell = "/bin/sh"

    master_fd, slave_fd = pty.openpty()
    set_terminal_size(master_fd, 80, 24)

    pid = os.fork()
    if pid == 0:
        # Child process
        os.close(master_fd)
        os.setsid()
        os.dup2(slave_fd, 0)
        os.dup2(slave_fd, 1)
        os.dup2(slave_fd, 2)
        if slave_fd > 2:
            os.close(slave_fd)
        
        try:
            os.chdir(home_dir)
        except Exception:
            pass

        try:
            os.execvpe(shell, [shell, "--login", "-i"], os.environ)
        except Exception:
            os.execvpe("/bin/sh", ["/bin/sh", "-i"], os.environ)
        sys.exit(1)

    # Parent process
    os.close(slave_fd)

    def handle_sigchld(signum, frame):
        try:
            while True:
                wpid, status = os.waitpid(-1, os.WNOHANG)
                if wpid <= 0:
                    break
                if wpid == pid:
                    sys.exit(0)
        except Exception:
            pass

    signal.signal(signal.SIGCHLD, handle_sigchld)

    in_buffer = b""

    try:
        while True:
            rlist, _, _ = select.select([sys.stdin.fileno(), master_fd], [], [])
            
            if sys.stdin.fileno() in rlist:
                try:
                    data = os.read(sys.stdin.fileno(), 4096)
                    if not data:
                        break
                    
                    in_buffer += data
                    # Check for resize command protocol: \x00resize:cols,rows\x00
                    while b"\x00resize:" in in_buffer:
                        start_idx = in_buffer.find(b"\x00resize:")
                        end_idx = in_buffer.find(b"\x00", start_idx + 8)
                        if end_idx != -1:
                            cmd_raw = in_buffer[start_idx + 8:end_idx].decode("utf-8", errors="ignore")
                            # Remove control sequence from buffer
                            in_buffer = in_buffer[:start_idx] + in_buffer[end_idx + 1:]
                            try:
                                parts = cmd_raw.split(",")
                                if len(parts) == 2:
                                    cols, rows = int(parts[0]), int(parts[1])
                                    set_terminal_size(master_fd, cols, rows)
                            except Exception:
                                pass
                        else:
                            break

                    if in_buffer:
                        os.write(master_fd, in_buffer)
                        in_buffer = b""
                except (OSError, IOError):
                    break

            if master_fd in rlist:
                try:
                    data = os.read(master_fd, 4096)
                    if not data:
                        break
                    sys.stdout.buffer.write(data)
                    sys.stdout.buffer.flush()
                except (OSError, IOError):
                    break
    except Exception:
        pass
    finally:
        try:
            os.close(master_fd)
        except Exception:
            pass
        try:
            os.kill(pid, signal.SIGTERM)
        except Exception:
            pass

if __name__ == "__main__":
    main()
