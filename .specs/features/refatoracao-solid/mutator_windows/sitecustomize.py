# Windows sem Developer Mode não cria symlink: diretório vira junction, arquivo vira hardlink.
# is_symlink e unlink passam a reconhecer a junction, para que apagar o worker nunca entre na árvore real.
import os, pathlib, _winapi

_is_symlink = pathlib.Path.is_symlink
_unlink = pathlib.Path.unlink

def symlink_to(self, target, target_is_directory=False):
    target = pathlib.Path(target)
    if target.is_dir():
        _winapi.CreateJunction(str(target), str(self))
    else:
        os.link(target, self)

def is_symlink(self):
    return _is_symlink(self) or self.is_junction()

def unlink(self, missing_ok=False):
    if self.is_junction():
        os.rmdir(self)
    else:
        _unlink(self, missing_ok=missing_ok)

pathlib.Path.symlink_to = symlink_to
pathlib.Path.is_symlink = is_symlink
pathlib.Path.unlink = unlink
