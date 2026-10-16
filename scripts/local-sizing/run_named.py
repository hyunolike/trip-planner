"""Run only synthetic fixtures in fresh Docker volumes; preserve all containers/data."""
import datetime
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import uuid

ROOT = pathlib.Path(__file__).resolve().parent
os.chdir(ROOT)
run_id = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
out = ROOT / 'results' / run_id
out.mkdir(parents=True, exist_ok=False)
container = 'tripnote-sizing-' + run_id
data_volume = container + '-data'
result_volume = container + '-results'
image = 'tripnote-sizing:local'

def capture(args):
    return subprocess.check_output(args, text=True).strip()

assert (ROOT / 'app.jar').is_file(), 'Build the API bootJar and copy it here as app.jar first'
subprocess.run(['docker', 'build', '--platform', 'linux/amd64', '-t', image, '.'], check=True)
(out / 'docker-host.txt').write_text(capture(['docker', 'info', '--format', 'architecture={{.Architecture}} memoryBytes={{.MemTotal}} cpus={{.NCPU}} cgroup={{.CgroupVersion}}']))
(out / 'image.txt').write_text(capture(['docker', 'image', 'inspect', image, '--format', '{{.Id}} {{.Architecture}}']))
for volume in [data_volume, result_volume]:
    subprocess.run(['docker', 'volume', 'create', '--label', 'tripnote.synthetic-sizing=true', volume], check=True)
config = {'run':run_id, 'container':container, 'dataVolume':data_volume, 'resultVolume':result_volume,
          'storage':'two fresh Linux named volumes; no Mac bind mount',
          'phaseSeconds':int(os.environ.get('PHASE_SECONDS','120')),
          'paddingRows':int(os.environ.get('PADDING_ROWS','245760')),
          'sharedMemoryMiB':1664, 'cpuQuota':2, 'swap':False, 'network':'none',
          'sourceSha256':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
                         for name in ['app.jar','Dockerfile','benchmark.py','process_probe.py','HashPassword.java','run_named.py']}}
(out / 'run-config.json').write_text(json.dumps(config, indent=2))
print(json.dumps({'event':'run_configuration', **config}), flush=True)
rc = 1
try:
    rc = subprocess.run(['docker','run','--name',container,'--platform','linux/amd64',
        '--network','none','--memory=1664m','--memory-swap=1664m','--cpus=2','--pids-limit=256',
        '--mount','type=volume,source='+data_volume+',target=/sizing-data',
        '--mount','type=volume,source='+result_volume+',target=/results',
        '-e','PHASE_SECONDS='+str(config['phaseSeconds']),'-e','PADDING_ROWS='+str(config['paddingRows']),image]).returncode
finally:
    inspect = json.loads(capture(['docker','inspect',container]))[0]
    state = {'state':inspect['State'], 'restartCount':inspect['RestartCount'],
             'memory':inspect['HostConfig']['Memory'],'memorySwap':inspect['HostConfig']['MemorySwap'],
             'nanoCpus':inspect['HostConfig']['NanoCpus'], 'mounts':inspect['Mounts']}
    (out/'container-final.json').write_text(json.dumps(state,indent=2))
    names = ['summary.json','partial-summary.json','final-events.json','metrics.jsonl','process-metrics.jsonl',
             'api.log','postgres.log','valkey.log','process_observer.log','failure.txt']
    for phase in ['ready','five_users','five_users_with_backup','ten_users_stress_with_backup']:
        names.extend([phase+'-native.txt',phase+'-heap.txt'])
        if phase!='ready': names.append(phase+'-requests.json')
    exported, unavailable = [], []
    for name in names:
        copy = subprocess.run(['docker','cp',container+':/results/'+name,str(out/name)],capture_output=True,text=True)
        (exported if copy.returncode==0 else unavailable).append(name)
    (out/'export.json').write_text(json.dumps({'exported':exported,'unavailable':unavailable,
        'rawDumps':'retained only in named result volume; deliberately not copied'},indent=2))
    print(json.dumps({'event':'retained','results':str(out),'container':container,
                      'dataVolume':data_volume,'resultVolume':result_volume,'exitCode':rc}),flush=True)
sys.exit(rc)
