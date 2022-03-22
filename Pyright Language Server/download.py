# Download Script
# =====
# This file is not run by the extension. Instead, it is run by
# me to prepare the extension's publishing in the marketplace.

# It downloads Pyright into this folder.

from os.path import realpath, dirname, join, exists
from os import makedirs, remove
from requests import get
from shutil import move, rmtree
from subprocess import run
import tarfile
parent = dirname(realpath(__file__)) # the "Pyright Language Server" path
pyright_path = join(parent, "primary.js")
extractdir = join(parent, "temporary_primary") # where the Pyright monorepo is extracted

def get_latest_version_URL():
    redirect_link = "https://github.com/microsoft/pyright/releases/latest"
    response = get(redirect_link)
    return response.url
address = f"{get_latest_version_URL()}.tar.gz"

if not exists(extractdir):
    makedirs(extractdir)

print("Downloading Pyright…")
def download(url, output_path):
    if not exists(output_path):
        r = requests.get(url, stream=True)
        if r.ok:
            with open(output_path) as f:
                for chunk in r.iter_content(chunk_size=8 * 1000):
                    f.write(chunk)
        else:
            print("Could not download.")
            raise Exception()
    else:
        print("This file might have already been downloaded.")
        choice = input(f"Use {output_path}? Y/N >").upper()
        while choice not in ["Y", "N"]:
            choice = input("Type Y or N. >").upper()

        if choice == "N":
            remove(output_path)
            download(url, output_path)
download(address, join(parent, "primary.tar.gz"))

print("Extracting…")
archive = tarfile.open(archive_path)
archive.extractAll(extractdir)
archive.close()
remove(archive_path)

esbuild_addresses = [
    "https://registry.npmjs.org/esbuild-darwin-arm64/-/esbuild-darwin-arm64-0.14.24.tgz", # arm64
    "https://registry.npmjs.org/esbuild-darwin-64/-/esbuild-darwin-64-0.14.24.tgz" # x64
]
esbuild_path = join(parent, "esbuild")

print("Downloading ESbuild…")
print("Select architecture 🤖\n" +
      "  1) arm64\n" +
      "  2) x64")
choice = input("Pick one. > ")
while choice not in ["1", "2"]:
    choice = input("Type 1 or 2. > ")
esbuild_address = esbuild_addresses[int(choice) - 1]
download(esbuild_address, esbuild_path)

print("Building Pyright…")
run([
    esbuild_path, 
    join(extractdir, "packages", "pyright-internal", "src", "nodeMain.ts"),
    "--bundle",
    "--outfile=" + pyright_path
])
rmtree(extractdir)

print("Finished!")