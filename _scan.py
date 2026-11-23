from pathlib import Path
import re, json
base=Path('src/app/admin')
# remaining alert/confirm in admin excluding redes-sociales
res=[]
for p in base.rglob('*.ts'):
    rel=p.relative_to(base).as_posix()
    if rel.startswith('redes-sociales/'): continue
    t=p.read_text(encoding='utf-8',errors='replace')
    a=len(re.findall(r'\balert\s*\(',t))
    c=len(re.findall(r'\bconfirm\s*\(',t))
    if a or c: res.append((rel,a,c))
for r in sorted(res,key=lambda x:-(x[1]+x[2]))[:20]:
    print(r)
print('total_files',len(res))
