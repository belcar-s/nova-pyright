# Download Script
# =====
# This file is not run by the extension. Instead, it is run by
# me to prepare the extension's publishing in the marketplace.

# It downloads Pyright into this folder. The folder name is
# 'primary' if no arguments are passed; otherwise, it's argv[1],
# which I think is the first argument after the script's path.

from os.path import realpath, dirname, join, exists
from os import makedirs, remove
from requests import get
from shutil import rmtree, which, copy, copytree, move
from subprocess import run
from sys import argv
import tarfile
def get_latest_version_number():
    redirect_link = "https://github.com/microsoft/pyright/releases/latest"
    response = get(redirect_link)
    return response.url.split("/")[-1]

parentdir_path = dirname(realpath(__file__)) # the "Pyright Language Server" path
pyright_version = get_latest_version_number()

# =========
print("Downloading Pyright…")
def download(url, output_path):
    if not exists(output_path):
        r = get(url, stream=True)
        if r.ok:
            with open(output_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8 * 1000):
                    f.write(chunk)
        else:
            print("Could not download.")
            print(r)
            raise Exception()
    else:
        print("This file might have already been downloaded.")
        choice = input(f"Use existing file? Y/N >").upper()
        while choice not in ["Y", "N"]:
            choice = input("Type Y or N. >").upper()

        if choice == "N":
            remove(output_path)
            download(url, output_path)
archive_path = join(parentdir_path, "primary.tar.gz")
address = f"https://github.com/microsoft/pyright/archive/refs/tags/{pyright_version}.tar.gz"
download(address, archive_path)

# =========
print("Extracting…")
extractdir_path = join(parentdir_path, "extract_temp") # where the Pyright monorepo is extracted
if not exists(extractdir_path):
    makedirs(extractdir_path)
archive = tarfile.open(archive_path)
archive.extractall(extractdir_path)
archive.close()
remove(archive_path)

# =========
print("Building Pyright…")

# ======
print("(Installing Pyright dependencies…)")
npm_path = which("npm")
if not npm_path:
    npm_path = input("Please enter NPM's path >")

pyright_server_path = join(
    extractdir_path,
    "pyright-" + pyright_version,
    "packages",
    "pyright-internal"
)

run([
    npm_path,
    "install"
], cwd=pyright_server_path)

# ======
print("(Building…)")
run([
    npm_path,
    "run",
    "build"
], cwd=pyright_server_path)

destination_dirname = None
if len(argv) > 3:
    destination_dirname = argv[2]
else:
    destination_dirname = "primary"
print(destination_dirname)

destination_path = join(parentdir_path, destination_dirname)
if exists(destination_path):
    rmtree(destination_path)
copytree(pyright_server_path, destination_path)

rmtree(extractdir_path)

# ======
print("(Doing something confusing…)")
# The 'server.js' file includes a call to 'require'
# with a path to a non-existent package.json. By
# moving the folder, the call succeeds. If this step
# is omitted, the server crashes immediately upon
# execution.

move(
    join(destination_path, "out", "src"),
    join(destination_path, "built")
)

print("Finished!")