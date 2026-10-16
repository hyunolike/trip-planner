import concurrent.futures, collections, http.client, http.cookies, json, math, os, pathlib, signal, statistics, struct, subprocess, threading, time, traceback, urllib.parse, uuid

OUT = pathlib.Path('/results'); DATA = pathlib.Path('/sizing-data')
OUT.mkdir(exist_ok=True); DATA.mkdir(exist_ok=True)
CG = pathlib.Path('/sys/fs/cgroup')
records, services = [], {}
stop_monitor = threading.Event()
phase = 'startup'
PASSWORD = 'benchmark-only-local-password'

def announce(event, **kw):
    print(json.dumps({'event':event, 'time':time.time(), **kw}), flush=True)

def cmd(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kw).stdout.strip()

def sql(text, db='tripnote'):
    return cmd(['gosu','postgres','psql','-h','127.0.0.1','-d',db,'-At','-v','ON_ERROR_STOP=1','-c',text])

def launch(name, args, env=None):
    log = open(OUT / (name+'.log'), 'w')
    p = subprocess.Popen(args, stdout=log, stderr=subprocess.STDOUT, env=env)
    services[name] = p
    return p

def counters(path):
    try: return {k:int(v) for k,v in (x.split() for x in path.read_text().splitlines())}
    except (FileNotFoundError, ValueError): return {}

def sample():
    current = int((CG/'memory.current').read_text())
    mem = counters(CG/'memory.stat')
    groups = collections.defaultdict(lambda: {'rssKiB':0,'pssKiB':0,'processes':0,'pssCoveredProcesses':0})
    for p in pathlib.Path('/proc').iterdir():
        if not p.name.isdigit(): continue
        try:
            status = dict(x.split(':',1) for x in (p/'status').read_text().splitlines() if ':' in x)
            name = status.get('Name','').strip()
            group = 'java' if name=='java' else 'postgres' if name=='postgres' else 'valkey' if name=='valkey-server' else 'harness_other'
            groups[group]['rssKiB']+=int(status.get('VmRSS','0').strip().split()[0]); groups[group]['processes']+=1
            smap = {}
            try: lines=(p/'smaps_rollup').read_text().splitlines()
            except PermissionError: continue
            for line in lines:
                if ':' in line:
                    k,v=line.split(':',1)
                    if k in ['Rss','Pss']: smap[k]=int(v.strip().split()[0])
            if 'Pss' in smap:
                groups[group]['pssKiB']+=smap['Pss']; groups[group]['pssCoveredProcesses']+=1
        except (FileNotFoundError,PermissionError,ProcessLookupError): pass
    vm = {}
    for line in pathlib.Path('/proc/meminfo').read_text().splitlines():
        k,v=line.split(':',1)
        if k in ['MemTotal','MemAvailable','SwapTotal','SwapFree']: vm[k]=int(v.strip().split()[0])
    return {'time':time.time(),'phase':phase,'cgroupBytes':current,'anonBytes':mem.get('anon'), 'fileBytes':mem.get('file'),'kernelBytes':mem.get('kernel'),'events':counters(CG/'memory.events'),'swapBytes':int((CG/'memory.swap.current').read_text()),'cpu':counters(CG/'cpu.stat'),'groups':dict(groups),'vmKiB':vm,'serviceExitCodes':{k:p.poll() for k,p in services.items()}}

def monitor():
    with open(OUT/'metrics.jsonl','w') as f:
        while not stop_monitor.is_set():
            try:
                row=sample(); records.append(row); f.write(json.dumps(row)+'\n'); f.flush()
            except Exception as e: announce('monitor_error', detail=str(e))
            stop_monitor.wait(1)

class Client:
    def __init__(self): self.cookies={}
    def request(self, method, path, body=None):
        h={'Content-Type':'application/json','Cookie':'; '.join(k+'='+v for k,v in self.cookies.items())}
        if method not in ['GET','HEAD'] and 'XSRF-TOKEN' in self.cookies: h['X-XSRF-TOKEN']=urllib.parse.unquote(self.cookies['XSRF-TOKEN'])
        c=http.client.HTTPConnection('127.0.0.1',8080,timeout=30); started=time.monotonic()
        try:
            c.request(method,path,body=json.dumps(body) if body is not None else None,headers=h); r=c.getresponse(); data=r.read()
            for name,value in r.getheaders():
                if name.lower()=='set-cookie':
                    jar=http.cookies.SimpleCookie(); jar.load(value)
                    for k,v in jar.items(): self.cookies[k]=v.value
            try: parsed=json.loads(data) if data else None
            except ValueError: parsed=None
            return r.status,parsed,(time.monotonic()-started)*1000
        finally: c.close()
    def login(self, index):
        self.request('GET','/api/v1/auth/csrf')
        result=self.request('POST','/api/v1/auth/login',{'email':f'user{index}@benchmark.invalid','password':PASSWORD})
        assert result[0]==200, ('login',result[0],result[1])
        self.request('GET','/api/v1/auth/csrf')
        return result

def snapshot_jvm(label):
    p=services['api']
    for diagnostic,args in [('native',['VM.native_memory','summary','scale=KB']),('heap',['GC.heap_info'])]:
        try: text=cmd(['jcmd',str(p.pid),*args], timeout=30)
        except Exception as e: text='DIAGNOSTIC_UNAVAILABLE '+str(e)
        (OUT/f'{label}-{diagnostic}.txt').write_text(text)

def summarize(items):
    grouped=collections.defaultdict(list)
    for x in items: grouped[x['operation']].append(x)
    result={}
    for k,rows in grouped.items():
        durations=sorted(x['ms'] for x in rows)
        result[k]={'count':len(rows),'errors':sum(x['status']!=x['expected'] for x in rows),'statuses':dict(collections.Counter(str(x['status']) for x in rows)),'p50Ms':statistics.median(durations),'p95Ms':durations[max(0,math.ceil(len(durations)*.95)-1)],'maxMs':max(durations)}
    return result

def workload(users, seconds, with_backup=False):
    samples=[]; lock=threading.Lock(); backups=[]; deadline=time.monotonic()+seconds
    def request(c, op, method, path, body=None, expected=200):
        try: status,data,ms=c.request(method,path,body)
        except Exception as e: status,data,ms=0,None,30000
        with lock: samples.append({'operation':op,'status':status,'expected':expected,'ms':ms,'finishedAtUnix':time.time()})
        return data if status==expected else None
    def worker(index):
        c=Client(); status,_,ms=c.login(index)
        with lock: samples.append({'operation':'argon2_login','status':status,'expected':200,'ms':ms,'finishedAtUnix':time.time()})
        made=request(c,'create_trip','POST','/api/v1/trips',{'title':f'Synthetic {phase} {index}','startDate':'2027-01-01','endDate':'2027-01-03','city':'Synthetic'},201)
        if not made: return
        trip=request(c,'read_trip','GET','/api/v1/trips/'+made['slug'])
        if not trip: return
        day=trip['days'][0]['id']
        stop=request(c,'create_stop','POST',f'/api/v1/days/{day}/stops',{'title':'Synthetic stop','time':'09:00','type':'sight','clientMutationId':str(uuid.uuid4())},201)
        if not stop: return
        while time.monotonic()<deadline:
            request(c,'session_me','GET','/api/v1/me')
            request(c,'read_trip','GET','/api/v1/trips/'+made['slug'])
            updated=request(c,'edit_stop','PATCH','/api/v1/stops/'+stop['id'],{'version':stop['version'],'details':'Synthetic benchmark '+str(time.monotonic())})
            if updated: stop=updated
            request(c,'completion','PUT',f'/api/v1/trips/{made["id"]}/completions/stops/{stop["id"]}',expected=204)
            time.sleep(1)
    def backup():
        started=time.monotonic(); started_at=time.time()
        path=OUT/(phase+'.dump')
        announce('backup_start',phase=phase)
        try:
            cmd(['gosu','postgres','pg_dump','-h','127.0.0.1','-Fc','-Z','0','-d','tripnote','-f',str(path)],timeout=600)
            listing=cmd(['gosu','postgres','pg_restore','--list',str(path)],timeout=30)
            backups.append({'success':True,'seconds':time.monotonic()-started,'startedAtUnix':started_at,'finishedAtUnix':time.time(),'bytes':path.stat().st_size,'listingEntries':len(listing.splitlines())})
        except Exception as e: backups.append({'success':False,'error':str(e),'seconds':time.monotonic()-started})
        announce('backup_complete',phase=phase,result=backups[-1])
    with concurrent.futures.ThreadPoolExecutor(max_workers=users+1) as pool:
        futures=[pool.submit(worker,i) for i in range(users)]
        if with_backup:
            time.sleep(min(10,seconds/4)); futures.append(pool.submit(backup))
        for future in futures: future.result()
    (OUT/(phase+'-requests.json')).write_text(json.dumps(samples))
    return {'durationSeconds':seconds,'users':users,'operations':summarize(samples),'backup':backups}

def main():
    global phase
    assert not (DATA/'pg'/'PG_VERSION').exists(),'Refusing to overwrite an existing data directory'
    assert (CG/'memory.max').read_text().strip()=='1744830464', 'Expected a shared 1664MiB cgroup limit'
    cmd(['chown','postgres:postgres',str(DATA),str(OUT)])
    for part in ['pg','valkey']:
        (DATA/part).mkdir(exist_ok=False); cmd(['chown','postgres:postgres',str(DATA/part)])
    cmd(['gosu','postgres','initdb','-D',str(DATA/'pg'),'--auth-local=trust','--auth-host=trust'])
    launch('postgres',['gosu','postgres','postgres','-D',str(DATA/'pg'),'-c','listen_addresses=127.0.0.1','-c','shared_buffers=64MB','-c','max_connections=20','-c','work_mem=4MB','-c','max_wal_size=256MB'])
    for _ in range(90):
        try: sql('SELECT 1','postgres'); break
        except Exception: time.sleep(1)
    sql('CREATE DATABASE tripnote','postgres')
    launch('valkey',['gosu','postgres','valkey-server','--bind','127.0.0.1','--dir',str(DATA/'valkey'),'--appendonly','yes','--appendfsync','everysec','--maxmemory','64mb','--maxmemory-policy','noeviction'])
    env=os.environ.copy(); env.update({'DATABASE_URL':'jdbc:postgresql://127.0.0.1:5432/tripnote','DATABASE_USER':'postgres','DATABASE_PASSWORD':'','VALKEY_HOST':'127.0.0.1','TRIPNOTE_SEED_SAMPLES':'false','SERVER_ADDRESS':'127.0.0.1','SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE':'5'})
    started=time.monotonic()
    launch('api',['java','-Xms128m','-Xmx384m','-XX:NativeMemoryTracking=summary','-XX:+UnlockDiagnosticVMOptions','-XX:+PrintNMTStatistics','-jar','/bench/app.jar'],env)
    launch('process_observer',['python3','/bench/process_probe.py'])
    for _ in range(300):
        if services['api'].poll() is not None: raise RuntimeError('API exited before readiness')
        try:
            if Client().request('GET','/actuator/health/readiness')[0]==200: break
        except Exception: pass
        time.sleep(1)
    else: raise RuntimeError('Readiness timeout')
    result={'readinessSeconds':time.monotonic()-started,'phases':{},'sharedMemoryLimitMiB':1664,'hypotheticalHostBudgetMiB':2048,'unmeasuredOsReserveMiB':384,'cpuQuota':2,'swapEnabled':False,'externalNetwork':'none','sourceApiJarSha256':cmd(['sha256sum','/bench/app.jar']).split()[0]}
    announce('ready',seconds=result['readinessSeconds']); snapshot_jvm('ready')
    encoded=cmd(['java','-Xmx128m','-cp','/bench/lib/BOOT-INF/lib/*','/bench/HashPassword.java'])
    assert encoded.startswith('$argon2')
    for i in range(10):
        sql(f"WITH u AS (INSERT INTO users(email,nickname,email_verified_at) VALUES ('user{i}@benchmark.invalid','Synthetic {i}',now()) RETURNING id) INSERT INTO password_credentials(user_id,password_hash) SELECT id,'{encoded}' FROM u")
    phase='dataset_generation'; announce(phase); dataset_started=time.monotonic()
    sql('CREATE TABLE sizing_padding(id bigint PRIMARY KEY,payload bytea)')
    rows=int(os.environ.get('PADDING_ROWS','245760'))
    fixture=DATA/'padding.copy'
    with fixture.open('wb') as stream:
        stream.write(b'PGCOPY\n\xff\r\n\0'+struct.pack('!ii',0,0))
        for i in range(rows):
            stream.write(struct.pack('!hiq',2,8,i)+struct.pack('!i',4096)+os.urandom(4096))
        stream.write(struct.pack('!h',-1))
    os.chmod(fixture,0o644)
    sql(f"COPY sizing_padding FROM '{fixture}' WITH (FORMAT binary)")
    fixture.unlink()
    result['paddingRows']=rows; result['datasetPreparationSeconds']=time.monotonic()-dataset_started; result['databaseBytes']=int(sql("SELECT pg_database_size('tripnote')")); announce('dataset_ready',bytes=result['databaseBytes'],seconds=result['datasetPreparationSeconds'])
    (OUT/'partial-summary.json').write_text(json.dumps({**result,'incomplete':True},indent=2))
    duration=int(os.environ.get('PHASE_SECONDS','120'))
    for label,users,backup in [('five_users',5,False),('five_users_with_backup',5,True),('ten_users_stress_with_backup',10,True)]:
        phase=label; announce('phase_start',phase=phase,users=users,seconds=duration,backup=backup)
        result['phases'][phase]=workload(users,duration,backup)
        (OUT/'partial-summary.json').write_text(json.dumps({**result,'incomplete':True},indent=2))
        snapshot_jvm(phase); announce('phase_complete',phase=phase,result=result['phases'][phase])
    phase='restore_check'; announce(phase)
    sql('CREATE DATABASE sizing_restore','postgres')
    restore_start=time.monotonic()
    cmd(['gosu','postgres','pg_restore','-h','127.0.0.1','--exit-on-error','-d','sizing_restore',str(OUT/'five_users_with_backup.dump')],timeout=600)
    result['restore']={'seconds':time.monotonic()-restore_start,'paddingRows':int(sql('SELECT count(*) FROM sizing_padding','sizing_restore')),'users':int(sql('SELECT count(*) FROM users','sizing_restore'))}
    assert result['restore']['paddingRows']==rows
    result['memoryPeakBytes']=max(r['cgroupBytes'] for r in records); result['finalEvents']=counters(CG/'memory.events'); result['serviceExitCodesBeforeShutdown']={k:p.poll() for k,p in services.items()}; result['restartCountByHarness']=0
    (OUT/'summary.json').write_text(json.dumps(result,indent=2)); announce('complete',summary=result)

if __name__=='__main__':
    monitor_thread=threading.Thread(target=monitor,daemon=True); monitor_thread.start()
    try: main()
    except Exception:
        (OUT/'failure.txt').write_text(traceback.format_exc()); announce('failed',detail=traceback.format_exc()); raise
    finally:
        phase='shutdown'
        for name,p in reversed(list(services.items())):
            if p.poll() is None:
                if name=='postgres':
                    try: cmd(['gosu','postgres','pg_ctl','-D',str(DATA/'pg'),'-m','fast','-w','-t','30','stop'],timeout=35)
                    except Exception: p.send_signal(signal.SIGTERM)
                else: p.send_signal(signal.SIGTERM)
                try: p.wait(timeout=40)
                except subprocess.TimeoutExpired: p.kill(); p.wait()
        stop_monitor.set(); monitor_thread.join(timeout=5)
        (OUT/'final-events.json').write_text(json.dumps(counters(CG/'memory.events')))
