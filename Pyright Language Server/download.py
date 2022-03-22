# Download Script
# =====
# This file is not run by the extension. Instead, it is run by
# me to prepare the extension's publishing in the marketplace.

# It downloads Pyright into this folder.

from os.path import realpath, dirname, join, exists
from os import makedirs
from requests import get
import tarfile
parent = dirname(realpath(__file__)) # the "Pyright Language Server" path
outputdir = join(parent, "primary")
tempdir = join(parent, "temporary_primary") # where the entire Pyright monorepo is extracted

def get_latest_version_URL():
    redirect_link = "https://github.com/microsoft/pyright/releases/latest"
    response = get(redirect_link)
    return response.url
address = f"{get_latest_version_URL()}.tar.gz"

for directory in [outputdir, tempdir]:
    if not exists(directory):
        makedirs(directory)

r = requests.get(url, stream=True)
filename = join(parent, "primary.tar.gz")
if r.ok:
    with open(filename) as f:
        for chunk in r.iter_content(chunk_size=8 * 1000):
            f.write(chunk)
else:
    print("Could not download Pyright.")

archive = tarfile.open(filename)
archive.extractAll(tempdir)
archive.close()

