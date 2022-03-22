# Download Script
# =====
# This file is not run by the extension. Instead, it is run by
# me to prepare the extension's publishing in the marketplace.

# It downloads Pyright into this folder.

from os.path import realpath, dirname, join, exists
from os import makedirs
parent = dirname(realpath(__file__)) # the "Pyright Language Server" path
dir = join(parent, "primary")

def get_latest_version_URL():
    redirect_link = "https://github.com/microsoft/pyright/releases/latest"
    
address = f"{get_latest_version_URL()}.tar.gz"

if not exists(dir):
    makedirs(dir)

