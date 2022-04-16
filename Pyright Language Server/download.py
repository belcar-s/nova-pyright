# Download Script
# =====
# This file is run by me to prepare the extension's publishing
# in the marketplace. It is also run by the extension to upgrade
# the bundled version of Pyright.

# It downloads Pyright into this folder. The folder name is
# 'primary' if no arguments are passed; otherwise, it's argv[1],
# which I think is the first argument after the script's path.

import tarfile
from os import makedirs, remove, scandir
from os.path import realpath, dirname, join, exists
from subprocess import run
from shutil import rmtree, which, copytree, move

parentdir_path = dirname(realpath(__file__)) # the "Pyright Language Server" path

# Download `requests`
requests_path = join(parentdir_path, "requests")
requests_extraction_path = join(parentdir_path, "requests_extraction")
if not exists(requests_path):
    requests_tar_path = join(parentdir_path, "requests.tar.gz")
    run([
        "curl",
        "https://github.com/psf/requests/tarball/main",
        "-L",
        "--output",
        requests_tar_path
    ])

    requests_archive = tarfile.open(requests_tar_path)
    requests_archive.extractall(requests_extraction_path)
    requests_archive.close()
    remove(requests_tar_path)

    with scandir(requests_extraction_path) as dirs:
        for dir in dirs:
            # There's only one directory, which has the
            # archive's contents.
            copytree(join(dir.path, "requests"), requests_path)

    rmtree(requests_extraction_path)

from requests import get
from sys import argv
def get_latest_version_number():
    redirect_link = "https://github.com/microsoft/pyright/releases/latest"
    response = get(redirect_link)
    return response.url.split("/")[-1]

destination_dirname = None
if len(argv) > 1:
    destination_dirname = argv[1]
else:
    destination_dirname = "primary"

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
        remove(output_path)
        download(url, output_path)
archive_path = join(parentdir_path, destination_dirname + ".tar.gz")
address = f"https://github.com/microsoft/pyright/archive/refs/tags/{pyright_version}.tar.gz"
download(address, archive_path)

# =========
print("Extracting…")
extractdir_path = join(parentdir_path, destination_dirname + " extraction") # where the Pyright monorepo is extracted
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
    raise Exception("Missing NPM.")

pyright_modules_path = join(
    extractdir_path,
    "pyright-" + pyright_version,
)

run([
    npm_path,
    "install"
], cwd=pyright_modules_path)

# ======
print("(Building…)")
run([
    npm_path,
    "run",
    "build"
], cwd=join(
    pyright_modules_path,
    "packages",
    "pyright"
))

print(destination_dirname)

destination_path = join(parentdir_path, destination_dirname)
if exists(destination_path):
    rmtree(destination_path)
copytree(pyright_modules_path, destination_path)

rmtree(extractdir_path)

print("Finished!")