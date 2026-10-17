"""Local synthetic fixtures only. API has its own 512MiB / 0.1CPU cgroup.
No cloud commands, host ports or external mail. Retains evidence and volumes.
"""
import json, os, pathlib, subprocess, time, uuid
ROOT = pathlib.Path(__file__).resolve().parent
project = 'tripnote-free-' + uuid.uuid4().hex[:8]
out = ROOT / ('.local-' + project)
out.mkdir()
(out/'executed-run.py').write_text(Path(__file__).read_text())
(out/'executed-compose.yml').write_text((ROOT/'compose.yml').read_text())
(out/'executed-client.py').write_text((ROOT/'smoke_client.py').read_text())
probe_names=[]
compose = ['docker', 'compose', '-p', project, '-f', str(out/'executed-compose.yml')]
def run(args, **kw): return subprocess.run(args, check=True, **kw)
def ready():
    # Keep readiness client CPU/RAM outside the API cgroup too.
    code = """import http.client,json,time
start=time.monotonic()
while time.monotonic()-start<900:
    try:
        c=http.client.HTTPConnection('api',8080,timeout=4)
        c.request('GET','/actuator/health/readiness');r=c.getresponse();r.read();c.close()
        if r.status==200:
            print(json.dumps(round(time.monotonic()-start,2)));break
    except OSError: pass
    time.sleep(4)
else: raise RuntimeError('API not ready within 900s')
"""
    name=project+'-ready-'+uuid.uuid4().hex[:6]
    probe_names.append(name)
    result=subprocess.check_output(['docker','run','--name',name,
        '--network',project+'_isolated','--platform','linux/amd64','--memory','128m',
        '--entrypoint','python3','tripnote-sizing:local','-c',code],text=True)
    return json.loads(result)
def client(phase):
    run(['docker','run','--name',project+'-client-'+phase,'--network',project+'_isolated','--platform','linux/amd64',
        '--mount','type=bind,source='+str(out/'executed-client.py')+',target=/probe.py,readonly',
        '--mount','type=bind,source='+str(out)+',target=/results',
        '--entrypoint','python3','tripnote-sizing:local','/probe.py',phase],stdout=open(out/(phase+'.json'),'w'))
try:
    run(compose+['create'])
    api=project+'-api-1'
    run(['docker','update','--cpu-period','100000','--cpu-quota','10000',api])
    limits=json.loads(subprocess.check_output(['docker','inspect',api],text=True))[0]['HostConfig']
    assert limits['Memory']==536870912 and limits['CpuQuota']==10000 and limits['CpuPeriod']==100000
    run(compose+['start'])
    startup=ready()
    print(json.dumps({'phase':'started','project':project,'seconds':startup}),flush=True)
    # Measure fresh migrated schema, before synthetic users/trips.
    size=subprocess.check_output(compose+['exec','-T','db','psql','-U','tripnote','-d','tripnote','-X','-At','-c',
        "SELECT pg_database_size(current_database()), (SELECT coalesce(sum(pg_total_relation_size(relid)),0) FROM pg_stat_user_tables WHERE schemaname='public');"],text=True).strip()
    client('before')
    api=project+'-api-1'
    # Capture charged memory, OOM counters and CPU throttling before stop.
    stats=subprocess.check_output(['docker','exec',api,'sh','-c','cat /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory.swap.max /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory.events /sys/fs/cgroup/cpu.max /sys/fs/cgroup/cpu.stat'],text=True)
    (out/'cgroup-before.txt').write_text(stats)
    run(compose+['stop','api'])
    run(compose+['start','api'])
    restarted=json.loads(subprocess.check_output(['docker','inspect',api],text=True))[0]['HostConfig']
    assert restarted['CpuQuota']==10000 and restarted['CpuPeriod']==100000
    restart=ready()
    print(json.dumps({'phase':'restarted','project':project,'seconds':restart}),flush=True)
    client('after')
    info=json.loads(subprocess.check_output(['docker','inspect',api],text=True))[0]
    assert info['HostConfig']['Memory']==536870912 and info['HostConfig']['MemorySwap']==536870912
    assert info['HostConfig']['CpuQuota']==10000 and info['HostConfig']['CpuPeriod']==100000
    (out/'summary.json').write_text(json.dumps({'passed':True,'project':project,'extraJavaOptions':os.environ.get('API_EXTRA_JAVA_OPTIONS',''),'startupSeconds':startup,'restartSeconds':restart,
      'freshDatabaseBytesAndPublicRelations':size,'apiMemoryBytes':info['HostConfig']['Memory'],'apiMemorySwapBytes':info['HostConfig']['MemorySwap'],
      'apiCpuQuota':info['HostConfig']['CpuQuota'],'apiCpuPeriod':info['HostConfig']['CpuPeriod'],'oomKilled':info['State']['OOMKilled'],
      'limitations':['API platform '+os.environ.get('API_PLATFORM','linux/amd64')+' on ARM Mac; not Render hardware','external DB/cache outside API cgroup are local Valkey/PostGIS, not Neon/Upstash','HTTP fixture manually retains Secure cookie; public HTTPS/browser flow pending','No synthetic 1.4GB padding and no production data imported']},indent=2))
    print(json.dumps({'passed':True,'results':str(out)}),flush=True)
finally:
    for name in probe_names:
        subprocess.run(['docker','stop',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subprocess.run(compose+['logs','--no-color'],stdout=open(out/'stack.log','w'),stderr=subprocess.STDOUT)
    subprocess.run(compose+['stop'])
