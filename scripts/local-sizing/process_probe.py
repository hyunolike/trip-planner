"""Read-only per-process supplement; does not require ptrace or extra capabilities."""
import collections,json,pathlib,time
out=pathlib.Path('/results/process-metrics.jsonl')
with out.open('a') as stream:
 while True:
  groups=collections.defaultdict(lambda:{'rssKiB':0,'hwmKiB':0,'swapKiB':0,'processes':0})
  for p in pathlib.Path('/proc').iterdir():
   if not p.name.isdigit(): continue
   try:
    status=dict(x.split(':',1) for x in (p/'status').read_text().splitlines() if ':' in x)
    name=status.get('Name','').strip()
    group='java' if name=='java' else 'postgres' if name=='postgres' else 'valkey' if name=='valkey-server' else 'observer_other'
    for source,target in [('VmRSS','rssKiB'),('VmHWM','hwmKiB'),('VmSwap','swapKiB')]:
     groups[group][target]+=int(status.get(source,'0').strip().split()[0])
    groups[group]['processes']+=1
   except (OSError,ValueError,IndexError): pass
  stream.write(json.dumps({'time':time.time(),'groups':dict(groups)})+'\n');stream.flush()
  time.sleep(1)
