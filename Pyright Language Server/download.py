# Download Script
# =====
# This file is not run by the extension. Instead, it is run by
# me to prepare the extension's publishing in the marketplace.

# It downloads Pyright into this folder.

from os.path import realpath, dirname, join, exists
from os import makedirs, remove
from requests import get
from shutil import move, rmtree, which
from subprocess import run
import tarfile
def get_latest_version_number():
    redirect_link = "https://github.com/microsoft/pyright/releases/latest"
    response = get(redirect_link)
    return response.url.split("/")[-1]

parent = dirname(realpath(__file__)) # the "Pyright Language Server" path

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
        choice = input(f"Use {output_path}? Y/N >").upper()
        while choice not in ["Y", "N"]:
            choice = input("Type Y or N. >").upper()

        if choice == "N":
            remove(output_path)
            download(url, output_path)
archive_path = join(parent, "primary.tar.gz")
address = f"https://github.com/microsoft/pyright/archive/refs/tags/{get_latest_version_number()}.tar.gz"
download(address, archive_path)

# =========
print("Extracting…")
extractdir = join(parent, "temporary_primary") # where the Pyright monorepo is extracted
if not exists(extractdir):
    makedirs(extractdir)
archive = tarfile.open(archive_path)
archive.extractall(extractdir)
archive.close()
remove(archive_path)

# =========
print("Downloading ESbuild…")
print("Select architecture 🤖\n" +
      "  1) arm64\n" +
      "  2) x64")
choice = input("Pick one. > ")
while choice not in ["1", "2", "3"]:
    choice = input("Type 1 or 2. > ")
esbuild_addresses = [
    "https://registry.npmjs.org/esbuild-darwin-arm64/-/esbuild-darwin-arm64-0.14.24.tgz", # arm64
    "https://registry.npmjs.org/esbuild-darwin-64/-/esbuild-darwin-64-0.14.24.tgz", # x64
    "https://registry.npmjs.org/esbuild-linux-64/-/esbuild-linux-64-0.14.24.tgz" # secret Linux version
]
esbuild_address = esbuild_addresses[int(choice) - 1]
esbuild_archive_path = join(parent, "esbuild.tgz")
download(esbuild_address, esbuild_archive_path)

# Extraction of ESBuild
# =========
esbuild_extraction_path = join(parent, "esbuild_temp")
if not exists(esbuild_extraction_path):
    makedirs(esbuild_extraction_path)

esbuild_archive = tarfile.open(esbuild_archive_path)
esbuild_archive.extractall(esbuild_extraction_path)
esbuild_archive.close()

esbuild_path = join(parent, "esbuild")
move(join(esbuild_extraction_path, "package", "bin", "esbuild"), esbuild_path)
rmtree(esbuild_extraction_path)

# =========
print("Building Pyright…")

# ======
print("(Installing…)")
npm_path = which("npm")
if not npm_path:
    npm_path = input("Please enter NPM's path >")

# Install Pyright dependencies
run([
  npm_path,
  "install"
],
  cwd=join(extractdir, "pyright-" + get_latest_version_number(), "packages", "pyright-internal"))

# ======
print("(Bundling…)")
pyright_path = join(parent, "primary.js")
run([
    esbuild_path, 
    join(extractdir, "pyright-" + get_latest_version_number(), "packages", "pyright-internal", "src", "nodeMain.ts"),
    "--bundle",
    "--platform=node",
    "--outfile=" + pyright_path
])

print("Finished!")